"""
Authentication and Authorization module for CivicGrid.
Provides JWT/HMAC token generation, verification, and FastAPI security dependencies.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import time
from typing import Any, Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import database as db

logger = logging.getLogger(__name__)

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "civicgrid_jwt_secret_key_2026_super_secure")
TOKEN_EXPIRE_SECONDS = 86400 * 7  # 7 days

http_bearer = HTTPBearer(auto_error=False)


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64decode(data_str: str) -> bytes:
    padding = 4 - (len(data_str) % 4)
    if padding != 4:
        data_str += "=" * padding
    return base64.urlsafe_b64decode(data_str)


def create_access_token(user_id: str, email: str, role: str, department: str | None = None, ward: str | None = None) -> str:
    """Generate a signed HMAC-SHA256 bearer token containing user identity and role."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "department": department,
        "ward": ward,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRE_SECONDS,
    }
    header = {"alg": "HS256", "typ": "JWT"}
    
    header_b64 = _b64encode(json.dumps(header).encode("utf-8"))
    payload_b64 = _b64encode(json.dumps(payload).encode("utf-8"))
    
    signature_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), signature_input, hashlib.sha256).digest()
    sig_b64 = _b64encode(sig)
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Validate and decode a signed HMAC-SHA256 access token. Returns payload dict or None if invalid/expired."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        
        expected_sig_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), expected_sig_input, hashlib.sha256).digest()
        actual_sig = _b64decode(sig_b64)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
            
        payload = json.loads(_b64decode(payload_b64).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
            
        return payload
    except Exception as exc:
        logger.debug("Token decode failed: %s", exc)
        return None


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer)) -> dict[str, Any]:
    """FastAPI dependency to extract and verify current authenticated user from Bearer header."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = payload.get("sub")
    user = db.get_user_by_id(user_id) if user_id else None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account matching token does not exist or has been disabled.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if user.get("status") == "DISABLED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled by an administrator.",
        )
        
    return user


def get_optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer)) -> dict[str, Any] | None:
    """FastAPI dependency for optional authentication. Returns user dict or None."""
    if not credentials or not credentials.credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        return None
    return db.get_user_by_id(payload["sub"])


def require_roles(*allowed_roles: str) -> Callable:
    """FastAPI dependency factory enforcing allowed user roles."""
    def dependency(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        user_role = current_user.get("role", "CITIZEN").upper()
        allowed_upper = [r.upper() for r in allowed_roles]
        if user_role not in allowed_upper:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {list(allowed_roles)}. Current role: {user_role}.",
            )
        return current_user
    return dependency
