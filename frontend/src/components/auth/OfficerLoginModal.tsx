import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, KeyRound, User, Sparkles, Loader2 } from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useI18n } from '../../i18n/useI18n';

interface OfficerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficerLoginModal: React.FC<OfficerLoginModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { loginAsOfficer } = useRole();
  const [officerId, setOfficerId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFillDemo = () => {
    setOfficerId('OFFICER-2026');
    setPassword('password123');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId.trim() || !password) {
      setError(t.officer.errorRequired);
      return;
    }

    setLoading(true);
    setError(null);
    const res = await loginAsOfficer(officerId.trim(), password);
    setLoading(false);

    if (res.success) {
      onClose();
      setOfficerId('');
      setPassword('');
    } else {
      setError(res.error || t.officer.errorFailed);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="officer-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl transition-all"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, transparent)' }}
            >
              <ShieldCheck className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 id="officer-modal-title" className="font-display text-base font-bold" style={{ color: 'var(--color-text)' }}>
                {t.officer.signInTitle}
              </h2>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                {t.officer.signInSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Quick Demo Helper Button */}
          <div
            className="flex items-center justify-between rounded-xl border p-3"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-accent) 8%, transparent)',
              borderColor: 'color-mix(in srgb, var(--color-accent) 25%, transparent)',
            }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text)' }}>
              <Sparkles className="h-4 w-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
              <span>{t.officer.demoNotice}</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: '#ffffff',
              }}
            >
              {t.officer.autoFillDemo}
            </button>
          </div>

          {/* Officer ID */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-muted)' }}>
              {t.officer.idLabel}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-muted)' }} />
              <input
                type="text"
                value={officerId}
                onChange={(e) => setOfficerId(e.target.value)}
                placeholder={t.officer.idPlaceholder}
                disabled={loading}
                className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm transition-colors focus:outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--color-muted)' }}>
              {t.officer.passwordLabel}
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm transition-colors focus:outline-none"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                }}
              />
            </div>
          </div>

          {error && (
            <div
              className="rounded-lg border p-3 text-xs"
              style={{
                borderColor: 'var(--color-danger)',
                backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
                color: 'var(--color-danger)',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t.officer.authenticating}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t.officer.signInBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
