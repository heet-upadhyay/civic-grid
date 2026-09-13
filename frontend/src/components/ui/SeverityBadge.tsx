import React from 'react';
import { AlertOctagon, AlertTriangle, ArrowUpCircle, Info } from 'lucide-react';
import type { Severity } from '../../types/complaint';

const severityConfig: Record<Severity, { icon: React.ReactNode; color: string }> = {
  Low: { icon: <Info className="w-3.5 h-3.5" />, color: 'var(--color-muted)' },
  Medium: { icon: <ArrowUpCircle className="w-3.5 h-3.5" />, color: '#D98612' },
  High: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: '#E46D3C' },
  Critical: { icon: <AlertOctagon className="w-3.5 h-3.5" />, color: 'var(--color-secondary)' },
};

export const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
  const config = severityConfig[severity];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-2 py-0.5 text-xs font-semibold" style={{ color: config.color, borderColor: `color-mix(in srgb, ${config.color} 45%, transparent)`, backgroundColor: `color-mix(in srgb, ${config.color} 12%, transparent)` }}>
      {config.icon}
      {severity}
    </span>
  );
};

