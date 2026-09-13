import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Complaint } from '../../types/complaint';
import { SeverityBadge } from '../ui/SeverityBadge';
import { UrgencyBadge } from '../ui/UrgencyBadge';
import { CategoryBadge } from '../ui/CategoryBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { MapPin, Clock } from 'lucide-react';

interface ComplaintCardProps {
  complaint: Complaint;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/complaints/${complaint.id}`)}
      className="w-full text-left rounded-[var(--radius-surface)] p-4 transition-all duration-150 hover:shadow-md active:scale-[0.99]"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      aria-label={`View complaint: ${complaint.summary}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <CategoryBadge category={complaint.category} />
        <StatusBadge status={complaint.status ?? 'New'} />
      </div>

      {/* Summary */}
      <p
        className="text-sm font-medium line-clamp-2 mb-3"
        style={{ color: 'var(--color-text)' }}
      >
        {complaint.summary}
      </p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <SeverityBadge severity={complaint.severity} />
        <UrgencyBadge urgency={complaint.urgency} />
        {(complaint.citizen_reports_count ?? 1) > 1 && (
          <span className="rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 px-2 py-0.5 text-[11px] font-bold">
            🔥 {complaint.citizen_reports_count} Reports
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
          <MapPin className="w-3 h-3" />
          {complaint.location}
        </span>
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted)' }}>
          <Clock className="w-3 h-3" />
          {timeAgo(complaint.created_at)}
        </span>
      </div>
    </button>
  );
};
