import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Palette, ShieldCheck, Languages, KeyRound, UserCheck, ShieldAlert, LogIn, User } from 'lucide-react';
import { useTheme, type Theme } from '../theme/useTheme';
import { useI18n } from '../i18n/useI18n';
import { useRole } from '../context/RoleContext';

const THEME_OPTIONS: { value: Theme; key: 'lightTheme' | 'darkTheme' }[] = [
  { value: 'light', key: 'lightTheme' },
  { value: 'dark', key: 'darkTheme' },
];

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, languages, t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t.settings.pageTitle}</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t.settings.pageSubtitle}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Language Selection Card */}
        <div className="surface-card p-6 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
                {t.settings.languageTitle}
              </p>
              <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {t.settings.chooseLanguage}
              </h2>
            </div>
            <Languages className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} />
          </div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t.settings.languageDesc}
          </p>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {languages.map((lang) => {
              const active = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code)}
                  className="relative flex flex-col items-start justify-between rounded-[var(--radius)] border p-3.5 text-left transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    color: active ? 'var(--color-primary-fg)' : 'var(--color-text)',
                    backgroundColor: active ? 'var(--color-primary)' : 'var(--color-background)',
                    borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-base font-bold">{lang.nativeLabel}</span>
                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </div>
                  <span
                    className="mt-1 text-xs font-medium"
                    style={{
                      color: active ? 'color-mix(in srgb, var(--color-primary-fg) 80%, transparent)' : 'var(--color-muted)',
                    }}
                  >
                    {lang.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Card */}
        <div className="surface-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
                {t.settings.appearanceTitle}
              </p>
              <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {t.settings.themeLabel}
              </h2>
            </div>
            <Palette className="h-5 w-5 shrink-0" style={{ color: 'var(--color-muted)' }} />
          </div>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t.settings.appearanceDesc}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            {THEME_OPTIONS.map((option) => {
              const active = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className="relative rounded-[var(--radius)] border px-4 py-3 text-left text-sm font-semibold transition-colors"
                  style={{
                    color: active ? 'var(--color-primary-fg)' : 'var(--color-text)',
                    backgroundColor: active ? 'var(--color-primary)' : 'var(--color-background)',
                    borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                  }}
                >
                  {active && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />}
                  {t.settings[option.key]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Trust Card */}
        <div className="surface-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
                {t.settings.trustTitle}
              </p>
              <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {t.nav.brandSubtitle}
              </h2>
            </div>
            <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: 'var(--color-muted)' }} />
          </div>
          <p className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t.settings.trustDesc}
          </p>
          <p className="mt-4 text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            {t.settings.storageNotice}
          </p>
        </div>

        {/* Account / Role Card — role-aware */}
        <AccountCard />
      </div>
    </div>
  );
};

/** Shows different content depending on login state and role */
const AccountCard: React.FC = () => {
  const { user, isOfficer, isAdmin, isCitizen, logout } = useRole();

  // ── NOT LOGGED IN ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="surface-card p-6 md:col-span-2 border-dashed">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
              Account Access
            </p>
            <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              You are not signed in
            </h2>
          </div>
          <LogIn className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} />
        </div>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Sign in to access your portal, file grievances, and manage your account settings.
        </p>
        <div className="mt-4">
          <Link
            to="/login"
            className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 no-underline"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In / Register</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── CITIZEN ───────────────────────────────────────────────────────────────
  if (isCitizen) {
    return <CitizenAccountCard />;
  }

  // ── OFFICER ───────────────────────────────────────────────────────────────
  if (isOfficer) {
    return <OfficerAccountCard />;
  }

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="surface-card p-6 md:col-span-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#722ed1' }}>
              System Administrator
            </p>
            <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
              {user.name}
            </h2>
          </div>
          <ShieldAlert className="h-5 w-5 shrink-0" style={{ color: '#722ed1' }} />
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
              Email
            </span>
            <span style={{ color: 'var(--color-text)' }}>{user.email}</span>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
              Role
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: 'rgba(114,46,209,0.15)', color: '#722ed1' }}
            >
              <ShieldAlert className="h-3 w-3" /> Admin
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-4 py-2 text-xs font-semibold no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#722ed1', color: '#fff' }}
          >
            <ShieldAlert className="h-4 w-4" />
            Go to Admin Portal
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-[var(--radius)] border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'var(--color-background)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return null;
};

/** Citizen-specific: show profile + change password form */
const CitizenAccountCard: React.FC = () => {
  const { t } = useI18n();
  const { user, logout, changeUserPassword } = useRole();
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setError(t.settings.errorFillBoth);
      return;
    }
    if (newPassword.length < 6) {
      setError(t.settings.errorMinChar);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.settings.errorMismatch);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await changeUserPassword(oldPassword, newPassword);
    setLoading(false);

    if (res.success) {
      setMessage(res.message || t.settings.successPasswordChange);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || t.settings.errorChangeFailed);
    }
  };

  return (
    <div className="surface-card p-6 md:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>
            {t.settings.citizenAccountTitle}
          </p>
          <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {user?.name}
          </h2>
        </div>
        <UserCheck className="h-5 w-5 shrink-0" style={{ color: 'var(--color-primary)' }} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
            Email
          </span>
          <span style={{ color: 'var(--color-text)' }}>{user?.email}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
            Role
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: 'var(--color-primary)' }}
          >
            <User className="h-3 w-3" /> {t.settings.citizenRoleLabel}
          </span>
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <Link
          to="/citizen"
          className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5 no-underline"
        >
          <UserCheck className="h-4 w-4" />
          {t.settings.citizenPortalLink}
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-[var(--radius)] border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'var(--color-background)' }}
        >
          {t.settings.signOut}
        </button>
      </div>

      <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          {t.settings.changePasswordTitle}
        </p>
        <form onSubmit={handleChangePassword} className="max-w-lg space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
              {t.settings.currentPassword}
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Current password"
              className="w-full rounded-lg border py-2 px-3 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
                {t.settings.newPassword}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.settings.newPasswordPlaceholder}
                className="w-full rounded-lg border py-2 px-3 text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
                {t.settings.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.settings.confirmPasswordPlaceholder}
                className="w-full rounded-lg border py-2 px-3 text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}

          {message && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
              {message}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary text-xs py-2 px-4">
            {loading ? t.settings.updatingPassword : t.settings.updatePasswordBtn}
          </button>
        </form>
      </div>
    </div>
  );
};

/** Officer-specific: show profile + change password form */
const OfficerAccountCard: React.FC = () => {
  const { t } = useI18n();
  const { user, officerProfile, logout, changeOfficerPassword } = useRole();
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setError(t.officer.errorFillBoth);
      return;
    }
    if (newPassword.length < 6) {
      setError(t.officer.errorMinChar);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.officer.errorMismatch);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await changeOfficerPassword(oldPassword, newPassword);
    setLoading(false);

    if (res.success) {
      setMessage(res.message || t.officer.successPasswordChange);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || t.officer.errorChangeFailed);
    }
  };

  return (
    <div className="surface-card p-6 md:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-accent)' }}>
            {t.officer.portalTitle}
          </p>
          <h2 className="mt-2 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {user?.name} — {officerProfile?.department || 'General Department'}
          </h2>
        </div>
        <KeyRound className="h-5 w-5 shrink-0" style={{ color: 'var(--color-accent)' }} />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
            Officer ID
          </span>
          <span style={{ color: 'var(--color-text)' }}>{officerProfile?.officer_id || user?.id}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
            Email
          </span>
          <span style={{ color: 'var(--color-text)' }}>{user?.email}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
            Ward
          </span>
          <span style={{ color: 'var(--color-text)' }}>{user?.ward || '—'}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          to="/officer"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] px-4 py-2 text-xs font-semibold no-underline transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
        >
          <ShieldCheck className="h-4 w-4" />
          Go to Officer Desk
        </Link>
        <button
          type="button"
          onClick={logout}
          className="rounded-[var(--radius)] border px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', backgroundColor: 'var(--color-background)' }}
        >
          Sign Out
        </button>
      </div>

      {/* Change Password */}
      <div className="mt-6 border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
          {t.officer.changePasswordTitle}
        </p>
        <form onSubmit={handleChangePassword} className="max-w-lg space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
              {t.officer.currentPassword}
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border py-2 px-3 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
                {t.officer.newPassword}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.officer.newPasswordPlaceholder}
                className="w-full rounded-lg border py-2 px-3 text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-muted)' }}>
                {t.officer.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.officer.confirmPasswordPlaceholder}
                className="w-full rounded-lg border py-2 px-3 text-sm"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          )}

          {message && (
            <p className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
              {message}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary text-xs py-2 px-4">
            {loading ? t.officer.updatingPassword : t.officer.updatePasswordBtn}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
