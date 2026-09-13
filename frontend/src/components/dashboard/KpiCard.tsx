import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface KpiCardProps {
  title: string;
  value: number;
  maxValue: number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  accentColor?: string;
  glowColor?: string;
  loading?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  accentColor = 'var(--color-primary)',
  loading = false,
}) => {
  if (loading) {
    return <LoadingSkeleton variant="kpi" />;
  }

  const trendPositive = trend && trend.value > 0;
  const trendNeutral = trend && trend.value === 0;

  return (
    <div
      className="flex items-start gap-4 rounded-[var(--radius)] border p-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)]"
        style={{
          backgroundColor: `color-mix(in srgb, ${accentColor} 14%, transparent)`,
          color: accentColor,
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
          {title}
        </p>
        <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
          {value.toLocaleString()}
        </p>

        {trend && (
          <div className="mt-2 flex items-center gap-1.5">
            {trendNeutral ? (
              <Minus className="h-3.5 w-3.5" style={{ color: 'var(--color-muted)' }} />
            ) : trendPositive ? (
              <TrendingUp className="h-3.5 w-3.5" style={{ color: 'var(--color-success)' }} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" style={{ color: 'var(--color-danger)' }} />
            )}
            <span
              className="text-xs"
              style={{
                color: trendNeutral
                  ? 'var(--color-muted)'
                  : trendPositive
                    ? 'var(--color-success)'
                    : 'var(--color-danger)',
              }}
            >
              {trend.value > 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
