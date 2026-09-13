import React from 'react';
import { CheckCircle2, LayoutDashboard, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Complaint } from '../../types/complaint';
import { SeverityBadge } from '../ui/SeverityBadge';
import { UrgencyBadge } from '../ui/UrgencyBadge';
import { CategoryBadge } from '../ui/CategoryBadge';
import { useI18n } from '../../i18n/useI18n';

interface SubmissionSuccessProps {
  complaint: Complaint;
  onReset: () => void;
}

export const SubmissionSuccess: React.FC<SubmissionSuccessProps> = ({ complaint, onReset }) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="space-y-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-[var(--radius)] border"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-success) 40%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
          }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: 'var(--color-success)' }} />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
            {t.submit.successTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--color-muted)' }}>
            {t.submit.successSubtitle}
          </p>
        </div>
      </div>

      <div className="surface-card p-6 text-left">
        {complaint.is_duplicate && (
          <div
            className="mb-6 rounded-[var(--radius)] border p-4 text-left flex items-start gap-3"
            style={{
              borderColor: 'color-mix(in srgb, #3b82f6 40%, transparent)',
              backgroundColor: 'color-mix(in srgb, #3b82f6 8%, var(--color-background))',
            }}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#2563eb' }}>
                <span>ℹ️ Issue Already Registered for this Location</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text)' }}>
                An active complaint {complaint.duplicate_of_id ? `[${complaint.duplicate_of_id}]` : ''} is already being tracked for this issue at <strong>{complaint.location}</strong>. We have linked your submission to boost its municipal dispatch priority!
              </p>
            </div>
          </div>
        )}
        <div
          className="mb-6 flex flex-wrap items-center gap-2 border-b pb-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {t.submit.formTitle}
          </h3>
          <span
            className="ml-auto rounded-[var(--radius)] border px-2 py-1 text-xs font-medium"
            style={{
              color: 'var(--color-primary)',
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-background)',
            }}
          >
            {t.submit.complaintId}: {complaint.id.split('-')[0]}
          </span>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <CategoryBadge category={complaint.category} />
          <SeverityBadge severity={complaint.severity} />
          <UrgencyBadge urgency={complaint.urgency} />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              {t.submit.assignedCategory}
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {complaint.category}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              Subcategory
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {complaint.subcategory}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              {t.submit.locationLabel}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
              {complaint.location}
            </p>
          </div>
          {complaint.affected_facility && (
            <div className="col-span-2 sm:col-span-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
                {t.details.facilityLabel}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                {complaint.affected_facility}
              </p>
            </div>
          )}
        </div>

        {complaint.summary && (
          <div
            className="mt-6 rounded-[var(--radius)] border p-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              {t.submit.extractedSummary}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
              {complaint.summary}
            </p>
          </div>
        )}

        {(complaint.image_url || complaint.image_analysis) && (
          <div
            className="mt-4 rounded-[var(--radius)] border p-4"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-background))',
            }}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--color-primary)' }}>
              <span>📸 {t.photo.visionAnalysisTitle}</span>
            </p>
            {complaint.image_url && (
              <img
                src={complaint.image_url}
                alt={t.photo.evidenceAlt}
                className="mb-3 max-h-48 rounded-lg object-cover border"
                style={{ borderColor: 'var(--color-border)' }}
              />
            )}
            {complaint.image_analysis && (
              <p className="text-xs italic" style={{ color: 'var(--color-text)' }}>
                "{complaint.image_analysis}"
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => navigate('/dashboard')} className="btn-primary flex-1">
          <LayoutDashboard className="h-4 w-4" />
          {t.landing.viewDashboardCta}
        </button>
        <button type="button" onClick={onReset} className="btn-secondary flex-1">
          <RotateCcw className="h-4 w-4" />
          {t.submit.submitAnother}
        </button>
      </div>
    </div>
  );
};
