import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Complaint } from '../../types/complaint';
import { MapPin, Clock } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

interface RecentComplaintsProps {
  complaints: Complaint[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const RecentComplaints: React.FC<RecentComplaintsProps> = ({ complaints }) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const sorted = [...complaints].sort((a, b) => {
    const aPriority = a.severity === 'Critical' || a.urgency === 'Emergency' ? 1 : 0;
    const bPriority = b.severity === 'Critical' || b.urgency === 'Emergency' ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const recent = sorted.slice(0, 8);

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
        {t.dashboard.recentTitle}
      </h3>

      {recent.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          {t.dashboard.noComplaints}
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {recent.map((c) => (
            <li key={c.id} style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => navigate(`/complaints/${c.id}`)}
                className="w-full rounded-[var(--radius)] px-2 py-3 text-left transition-colors hover:bg-[var(--color-background)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                aria-label={`View complaint: ${c.summary}`}
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {c.category}
                    <span className="font-normal" style={{ color: 'var(--color-muted)' }}>
                      {' '}
                      / {c.subcategory}
                    </span>
                  </span>
                  <span
                    className="flex shrink-0 items-center gap-1 text-xs"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    <Clock className="h-3 w-3" />
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p className="line-clamp-1 text-sm" style={{ color: 'var(--color-text)' }}>
                  {c.summary}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
                  <MapPin className="h-3 w-3" />
                  {c.location}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
