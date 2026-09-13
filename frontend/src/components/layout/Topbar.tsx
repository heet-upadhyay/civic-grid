import React, { useState } from 'react';
import { Menu, X, Grid3X3, PlusCircle, ShieldCheck, LogOut, UserCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSelector } from '../ui/LanguageSelector';
import { OfficerLoginModal } from '../auth/OfficerLoginModal';
import { useRole } from '../../context/RoleContext';
import { useI18n } from '../../i18n/useI18n';

interface TopbarProps {
  onMenuClick: () => void;
  menuOpen?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, menuOpen = false }) => {
  const location = useLocation();
  const isSubmitPage = location.pathname === '/submit';
  const { t } = useI18n();
  const { user, role, logout } = useRole();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between border-b px-3 sm:px-6"
      style={{
        height: 'var(--header-height)',
        borderColor: 'var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-all active:scale-95 focus:outline-none"
          style={{
            borderColor: menuOpen ? 'var(--color-primary)' : 'var(--color-border)',
            color: menuOpen ? 'var(--color-primary)' : 'var(--color-text)',
            backgroundColor: menuOpen
              ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
              : 'var(--color-background)',
          }}
          aria-label={menuOpen ? t.topbar.menuClose : t.topbar.menuOpen}
          aria-expanded={menuOpen}
          aria-controls="nav-drawer"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Brand logo & title */}
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-base sm:text-lg font-bold no-underline transition-opacity hover:opacity-90"
          style={{ color: 'var(--color-text)' }}
        >
          <div
            className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <Grid3X3 className="h-4 w-4" style={{ color: 'var(--color-primary-fg)' }} aria-hidden />
          </div>
          <span className="font-display font-bold">CivicGrid</span>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick report button — only for authenticated users not already on submit page */}
        {!isSubmitPage && user && (
          <Link
            to="/submit"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: 'var(--color-primary)',
              border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
            }}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            {t.topbar.reportIssue}
          </Link>
        )}

        <LanguageSelector />
        <ThemeToggle />

        {/* Role Badge & Portal Links */}
        {user ? (
          <div className="flex items-center gap-1.5">
            <Link
              to={role === 'admin' ? '/admin' : role === 'officer' ? '/officer' : '/citizen'}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold no-underline"
              style={{
                borderColor: role === 'admin' ? 'rgba(114, 46, 209, 0.4)' : role === 'officer' ? 'rgba(250, 140, 22, 0.4)' : 'color-mix(in srgb, var(--color-primary) 40%, transparent)',
                backgroundColor: role === 'admin' ? 'rgba(114, 46, 209, 0.12)' : role === 'officer' ? 'rgba(250, 140, 22, 0.12)' : 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: role === 'admin' ? '#722ed1' : role === 'officer' ? '#fa8c16' : 'var(--color-primary)',
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{user.name.split(' ')[0]} ({role.toUpperCase()})</span>
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border px-2 py-1 text-[11px] font-semibold transition-opacity hover:opacity-80 flex items-center gap-1"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-muted)',
                backgroundColor: 'var(--color-background)',
              }}
              title="Sign Out"
            >
              <LogOut className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold no-underline transition-all hover:opacity-90 active:scale-95"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text)',
            }}
          >
            <UserCheck className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
            <span className="hidden sm:inline">Sign In / Register</span>
            <span className="sm:hidden">Sign In</span>
          </Link>
        )}
      </div>

      <OfficerLoginModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </header>
  );
};
