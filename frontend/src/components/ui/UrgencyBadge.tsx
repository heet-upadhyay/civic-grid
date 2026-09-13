import React from 'react';
import { Clock, Timer, Zap, Siren } from 'lucide-react';
import type { Urgency } from '../../types/complaint';

const urgencyConfig: Record<Urgency, { icon: React.ReactNode; color: string }> = {
  Routine: { icon: <Clock className="w-3.5 h-3.5" />, color: 'var(--color-muted)' },
  Soon: { icon: <Timer className="w-3.5 h-3.5" />, color: '#D98612' },
  Urgent: { icon: <Zap className="w-3.5 h-3.5" />, color: '#E46D3C' },
  Emergency: { icon: <Siren className="w-3.5 h-3.5" />, color: 'var(--color-secondary)' },
};

export const UrgencyBadge: React.FC<{ urgency: Urgency }> = ({ urgency }) => {
  const config = urgencyConfig[urgency];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-2 py-0.5 text-xs font-semibold" style={{ color: config.color, borderColor: `color-mix(in srgb, ${config.color} 45%, transparent)`, backgroundColor: `color-mix(in srgb, ${config.color} 12%, transparent)` }}>
      {config.icon}
      {urgency}
    </span>
  );
};

