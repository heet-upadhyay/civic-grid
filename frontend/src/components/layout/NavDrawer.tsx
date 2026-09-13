import React, { useEffect } from 'react';
import { X, Grid3X3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { navItemDefs } from './Sidebar';
import { useI18n } from '../../i18n/useI18n';
import { useRole } from '../../context/RoleContext';

interface NavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NavDrawer: React.FC<NavDrawerProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { user, role } = useRole();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const visibleItems = navItemDefs.filter((item) => {
    if (item.guestOnly && user) return false;
    if (item.authRequired && !user) return false;
    if (item.roles && !item.roles.includes(role as 'citizen' | 'officer' | 'admin')) return false;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 transition-all duration-300"
      style={{
        visibility: isOpen ? 'visible' : 'hidden',
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      aria-hidden={!isOpen}
    >
      {/* Darkened backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
        }}
        onClick={onClose}
        onTouchEnd={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel sliding from left */}
      <div
        id="nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="absolute inset-y-0 left-0 flex flex-col shadow-2xl transition-transform duration-300 ease-out"
        style={{
          width: '300px',
          maxWidth: '85vw',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: 'var(--color-border)', minHeight: 'var(--header-height)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <Grid3X3 className="h-5 w-5" style={{ color: 'var(--color-primary-fg)' }} aria-hidden />
            </div>
            <div>
              <span className="font-display text-base font-bold" style={{ color: 'var(--color-text)' }}>
                CivicGrid
              </span>
              <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                {t.nav.brandSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:opacity-80 active:scale-95"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-muted)',
              backgroundColor: 'var(--color-background)',
            }}
            aria-label={t.topbar.menuClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto p-4" aria-label="Mobile Navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const label = (t.nav as Record<string, string>)[item.key] || item.label;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all touch-manipulation ${
                    isActive ? 'nav-link-active' : 'nav-link'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                    : 'transparent',
                  borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                })}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div
          className="border-t p-4 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
        >
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            CivicGrid Platform v1.0
          </p>
        </div>
      </div>
    </div>
  );
};
