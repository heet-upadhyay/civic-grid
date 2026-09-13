import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  FilePlus2,
  LayoutDashboard,
  BarChart3,
  List,
  Settings,
  Grid3X3,
  MapPinned,
  Search,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  LogIn,
} from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import { useRole } from '../../context/RoleContext';

export interface NavItemDef {
  key: string;
  path: string;
  label: string;
  icon: typeof Home;
  end: boolean;
  /** roles that can see this item; undefined = all */
  roles?: ('citizen' | 'officer' | 'admin')[];
  /** if true, only show when logged OUT */
  guestOnly?: boolean;
  /** if true, only show when logged IN */
  authRequired?: boolean;
}

export const navItemDefs: NavItemDef[] = [
  { key: 'home',      path: '/',          label: 'Home',              icon: Home,         end: true  },
  { key: 'login',     path: '/login',     label: 'Sign In',           icon: LogIn,        end: false, guestOnly: true },
  { key: 'citizen',   path: '/citizen',   label: 'My Portal',         icon: UserCheck,    end: false, roles: ['citizen'], authRequired: true },
  { key: 'submit',    path: '/submit',    label: 'File Grievance',    icon: FilePlus2,    end: false, roles: ['citizen'], authRequired: true },
  { key: 'officer',   path: '/officer',   label: 'Officer Desk',      icon: ShieldCheck,  end: false, roles: ['officer'], authRequired: true },
  { key: 'admin',     path: '/admin',     label: 'Admin Portal',      icon: ShieldAlert,  end: false, roles: ['admin'],   authRequired: true },
  { key: 'dashboard', path: '/dashboard', label: 'Overview Dashboard',icon: LayoutDashboard, end: false },
  { key: 'analytics', path: '/analytics', label: 'AI Analytics',      icon: BarChart3,    end: false },
  { key: 'complaints',path: '/complaints',label: 'All Complaints',    icon: List,         end: false },
  { key: 'map',       path: '/map',       label: 'Grievance Map',     icon: MapPinned,    end: false },
  { key: 'publicTracker', path: '/public-tracker', label: 'Public Grievance Tracker', icon: Search, end: false },
  { key: 'settings',  path: '/settings',  label: 'Settings',          icon: Settings,     end: false },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onNavigate }) => {
  const { t } = useI18n();
  const { user, role } = useRole();

  const visibleItems = navItemDefs.filter((item) => {
    if (item.guestOnly && user) return false;
    if (item.authRequired && !user) return false;
    if (item.roles && !item.roles.includes(role as 'citizen' | 'officer' | 'admin')) return false;
    return true;
  });

  return (
    <aside className={`flex h-full w-full flex-col ${className}`} style={{ backgroundColor: 'var(--color-surface)' }}>
      <div
        className="flex items-center gap-3 border-b px-5 py-4"
        style={{ borderColor: 'var(--color-border)', minHeight: 'var(--header-height)' }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Grid3X3 className="h-4 w-4" style={{ color: 'var(--color-primary-fg)' }} aria-hidden />
        </div>
        <div>
          <span className="font-display text-base font-bold" style={{ color: 'var(--color-text)' }}>CivicGrid</span>
          <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
            {t.nav.brandSubtitle}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Primary">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const label = (t.nav as Record<string, string>)[item.key] || item.label;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'nav-link-active' : 'nav-link'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
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
    </aside>
  );
};
