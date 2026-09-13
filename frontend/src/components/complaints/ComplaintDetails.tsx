import React, { useState } from 'react';
import { Copy, Check, ArrowLeft, Bot, ShieldAlert, Navigation, MapPin, Lock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Complaint, ComplaintStatus } from '../../types/complaint';
import { SeverityBadge } from '../ui/SeverityBadge';
import { UrgencyBadge } from '../ui/UrgencyBadge';
import { CategoryBadge } from '../ui/CategoryBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { TTSButton } from '../ui/TTSButton';
import { OfficerLoginModal } from '../auth/OfficerLoginModal';
import { useRole } from '../../context/RoleContext';
import { updateComplaintStatus } from '../../api/complaints';
import { STATUS_OPTIONS } from '../../utils/constants';
import { useI18n } from '../../i18n/useI18n';

interface ComplaintDetailsProps {
  complaint: Complaint;
}

const STATUS_ORDER: ComplaintStatus[] = ['New', 'Under Review', 'Assigned', 'In Progress', 'Resolved'];

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const ComplaintDetails: React.FC<ComplaintDetailsProps> = ({ complaint: initialComplaint }) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { isOfficer, officerProfile } = useRole();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [complaint, setComplaint] = useState(initialComplaint);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(complaint.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (newStatus === complaint.status || updating) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const updated = await updateComplaintStatus(complaint.id, newStatus);
      setComplaint(updated);
    } catch {
      setUpdateError(t.common.error);
    } finally {
      setUpdating(false);
    }
  };

  const currentStatusIndex = STATUS_ORDER.indexOf(complaint.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back nav & Header */}
      <div>
        <button
          onClick={() => navigate('/complaints')}
          className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70 focus:outline-none mb-6"
          style={{ color: 'var(--color-muted)' }}
          aria-label="Back to complaints list"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.details.backLink}
        </button>
        <div
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <p className="mb-1 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              {complaint.id}
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              {t.details.complaintHeader}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {(complaint.citizen_reports_count ?? 1) > 1 && (
              <span className="rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                <span>🔥 Endorsed by {complaint.citizen_reports_count} citizens at this location</span>
              </span>
            )}
            <StatusBadge status={complaint.status} />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content (Left) */}
        <div className="flex-1 space-y-6">
          {/* Metadata Strip */}
          <div
            className="rounded-xl p-4 flex flex-wrap gap-x-8 gap-y-4 text-sm"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>
                {t.submit.complaintId}
              </p>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                  {complaint.id}
                </span>
                <button
                  onClick={handleCopy}
                  aria-label="Copy complaint ID"
                  className="p-1.5 rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]"
                >
                  {copied
                    ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
                    : <Copy className="w-3.5 h-3.5" style={{ color: 'var(--color-muted)' }} />
                  }
                </button>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>
                {t.details.submittedOn}
              </p>
              <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                {formatFullDate(complaint.created_at)}
              </p>
            </div>
            {complaint.updated_at !== complaint.created_at && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted)' }}>
                  {t.details.statusLabel}
                </p>
                <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                  {formatFullDate(complaint.updated_at)}
                </p>
              </div>
            )}
          </div>

          {/* Citizen Report */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                <ShieldAlert className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                {t.details.citizenVoice}
              </h2>
              <TTSButton text={complaint.raw_text || complaint.summary} sourceLanguage={complaint.detected_language} />
            </div>
            <div
              className="rounded-xl p-6 relative overflow-hidden"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
              <p className="text-base leading-relaxed italic pl-2" style={{ color: 'var(--color-text)' }}>
                "{complaint.raw_text}"
              </p>

              {(complaint.image_url || complaint.image_analysis) && (
                <div
                  className="mt-5 rounded-lg border p-4 text-left not-italic"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
                  }}
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
                    <span>📸 {t.photo.visionAnalysisTitle}</span>
                  </p>
                  {complaint.image_url && (
                    <img
                      src={complaint.image_url}
                      alt={t.photo.evidenceAlt}
                      className="mb-3 max-h-56 rounded-lg object-cover border"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                  )}
                  {complaint.image_analysis && (
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                      "{complaint.image_analysis}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Additional Citizen Reports Timeline */}
          {(() => {
            let updates: Array<{ text: string; created_at: string; image_url?: string }> = [];
            if (complaint.additional_updates) {
              if (typeof complaint.additional_updates === 'string') {
                try { updates = JSON.parse(complaint.additional_updates); } catch { updates = []; }
              } else if (Array.isArray(complaint.additional_updates)) {
                updates = complaint.additional_updates;
              }
            }
            if (updates.length === 0) return null;
            return (
              <section>
                <h2 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--color-text)' }}>
                  <span>👥 Additional Citizen Endorsements & Updates ({updates.length})</span>
                </h2>
                <div className="space-y-3">
                  {updates.map((up, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border p-4 text-left"
                      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[var(--color-primary)]">
                          Complementary Citizen Report #{idx + 1}
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">
                          {formatFullDate(up.created_at)}
                        </span>
                      </div>
                      <p className="text-sm italic text-[var(--color-text)] mb-2">
                        "{up.text}"
                      </p>
                      {up.image_url && (
                        <img
                          src={up.image_url}
                          alt={t.photo.evidenceAlt}
                          className="max-h-48 rounded-lg object-cover border mt-2"
                          style={{ borderColor: 'var(--color-border)' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Status Timeline */}
          <section>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--color-text)' }}>
              <Navigation className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
              {t.analytics.statusDistribution}
            </h2>
            <div
              className="rounded-xl p-4 sm:p-6"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div
                className="flex items-center gap-0 overflow-x-auto pb-3 -mx-1 px-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {STATUS_ORDER.map((status, index) => {
                  const isDone = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  return (
                    <React.Fragment key={status}>
                      <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
                          style={{
                            backgroundColor: isDone ? 'var(--color-primary)' : 'var(--color-elevated)',
                            color: isDone ? 'var(--color-primary-fg)' : 'var(--color-muted)',
                            transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                            boxShadow: isCurrent ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent)' : 'none',
                          }}
                        >
                          {index + 1}
                        </div>
                        <span
                          className="text-center text-[10px] font-semibold leading-tight"
                          style={{ color: isDone ? 'var(--color-text)' : 'var(--color-muted)', maxWidth: '72px' }}
                        >
                          {status}
                        </span>
                      </div>
                      {index < STATUS_ORDER.length - 1 && (
                        <div
                          className="h-px flex-1 min-w-[16px] mx-1 mb-4 transition-colors"
                          style={{ backgroundColor: index < currentStatusIndex ? 'var(--color-primary)' : 'var(--color-border)' }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Admin: Update Status */}
          <section>
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--color-text)' }}>
              {t.details.updateStatusTitle}
            </h2>
            {isOfficer ? (
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {t.officer.actionLabel}
                  </p>
                  <span className="text-xs font-mono px-2 py-0.5 rounded border" style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                    {officerProfile?.officer_id || 'OFFICER-2026'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(status)}
                      disabled={updating || status === complaint.status}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                      style={{
                        backgroundColor: status === complaint.status
                          ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                          : 'var(--color-background)',
                        color: status === complaint.status ? 'var(--color-primary)' : 'var(--color-text)',
                        border: `1px solid ${status === complaint.status ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        opacity: updating ? 0.5 : 1,
                        cursor: status === complaint.status || updating ? 'default' : 'pointer',
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                {updateError && (
                  <p className="mt-3 text-xs" style={{ color: 'var(--color-danger)' }}>{updateError}</p>
                )}
              </div>
            ) : (
              <div
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border p-5"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-surface))',
                  borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
                  >
                    <Lock className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                      {t.officer.statusControlHeader}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                      {t.officer.statusControlDesc}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  className="btn-primary shrink-0 text-xs py-2 px-3.5 flex items-center gap-1.5"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{t.officer.signInLabel}</span>
                </button>
              </div>
            )}
          </section>
        </div>

        <OfficerLoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

        {/* AI Sidebar (Right) */}
        <div className="w-full lg:w-80 space-y-6">
          <div
            className="overflow-hidden rounded-xl"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="flex items-center gap-2 border-b p-4"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-elevated)' }}
            >
              <Bot className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {t.details.aiAnalysis}
              </h2>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                  {t.submit.assignedCategory}
                </p>
                <div className="flex flex-col gap-2">
                  <CategoryBadge category={complaint.category} />
                  <span className="text-sm font-medium pl-1" style={{ color: 'var(--color-text)' }}>{complaint.subcategory}</span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                  {t.submit.assignedSeverity} / {t.submit.assignedUrgency}
                </p>
                <div className="flex gap-2">
                  <SeverityBadge severity={complaint.severity} />
                  <UrgencyBadge urgency={complaint.urgency} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                  {t.submit.locationLabel}
                </p>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{complaint.location}</p>
                    {complaint.affected_facility && complaint.affected_facility !== 'Unknown' && (
                      <p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>
                        {t.details.facilityLabel}: {complaint.affected_facility}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {complaint.tracking_token && (
                <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
                    Public Tracking Token
                  </p>
                  <div className="flex items-center justify-between bg-[#0F1229] border border-[#2A2F5C] rounded-lg p-2 text-xs font-mono text-slate-200">
                    <span>{complaint.tracking_token}</span>
                    <button
                      onClick={() => navigate(`/track/${complaint.tracking_token}`)}
                      className="text-[11px] text-amber-400 hover:underline font-sans"
                    >
                      Track Portal ↗
                    </button>
                  </div>
                </div>
              )}

              {complaint.sla_deadline && (
                <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                    Target SLA Resolution Deadline
                  </p>
                  <p className="text-xs font-mono font-medium text-amber-300">
                    {new Date(complaint.sla_deadline).toLocaleString()}
                  </p>
                </div>
              )}

              {complaint.summary && (
                <div className="border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                    {t.submit.extractedSummary}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{complaint.summary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
