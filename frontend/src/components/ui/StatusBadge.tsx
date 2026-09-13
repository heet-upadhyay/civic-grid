import React from 'react';
import type { ComplaintStatus } from '../../types/complaint';

const statusStyles: Record<ComplaintStatus, { color: string; background: string }> = {
  'New': { color: 'var(--color-muted)', background: 'color-mix(in srgb, var(--color-muted) 12%, transparent)' },
  'Under Review': { color: 'var(--color-structure)', background: 'color-mix(in srgb, var(--color-structure) 12%, transparent)' },
  'Assigned': { color: 'var(--color-primary)', background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' },
  'In Progress': { color: 'var(--color-structure)', background: 'color-mix(in srgb, var(--color-structure) 12%, transparent)' },
  'Resolved': { color: '#71A878', background: 'color-mix(in srgb, #71A878 12%, transparent)' },
  'Rejected / Spam': { color: 'var(--color-danger)', background: 'color-mix(in srgb, var(--color-danger) 14%, transparent)' },
};

export const StatusBadge: React.FC<{ status: ComplaintStatus }> = ({ status }) => {
  const style = statusStyles[status] || statusStyles.New;
  return (
    <span className="rounded-[var(--radius)] border px-2.5 py-0.5 text-xs font-semibold" style={{ color: style.color, backgroundColor: style.background, borderColor: `color-mix(in srgb, ${style.color} 45%, transparent)` }}>
      {status}
    </span>
  );
};
