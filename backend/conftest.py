"""
Shared pytest configuration.

Ensures the `civicgrid` package is importable even when the package
has not been installed in editable mode (e.g. bare `pytest` runs).
"""
import sys
import os

# Add the backend root to sys.path so `civicgrid` is importable
_backend_root = os.path.dirname(__file__)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)
