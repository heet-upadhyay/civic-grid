import React from 'react';
import { useTheme } from '../../theme/useTheme';

type SkeletonVariant = 'kpi' | 'row' | 'chart' | 'card';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  rows?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'row', rows = 1 }) => {
  const { isDark } = useTheme();
  const base = 'rounded-[var(--radius-control)]';
  const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r';
  const shimmerGradient = isDark 
    ? 'before:from-transparent before:via-white/5 before:to-transparent bg-[color-mix(in_srgb,var(--color-elevated)_80%,transparent)]' 
    : 'before:from-transparent before:via-black/5 before:to-transparent bg-[color-mix(in_srgb,var(--color-elevated)_80%,transparent)]';

  if (variant === 'kpi') {
    return (
      <div
        className="rounded-[var(--radius-surface)] p-5 space-y-4"
        style={{ border: '1px solid var(--color-border)' }}
        aria-hidden="true"
      >
        <div className="flex justify-between">
          <div className={`h-3 w-24 ${base} ${shimmer} ${shimmerGradient}`} />
          <div className={`h-8 w-8 rounded-lg ${shimmer} ${shimmerGradient}`} />
        </div>
        <div className={`h-8 w-20 ${base} ${shimmer} ${shimmerGradient}`} />
        <div className={`h-3 w-16 ${base} ${shimmer} ${shimmerGradient}`} />
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div
        className="rounded-[var(--radius-surface)] p-5"
        style={{ border: '1px solid var(--color-border)' }}
        aria-hidden="true"
      >
        <div className={`h-4 w-28 mb-4 ${base} ${shimmer} ${shimmerGradient}`} />
        <div className={`h-48 w-full ${base} ${shimmer} ${shimmerGradient}`} />
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className="rounded-[var(--radius-surface)] p-4 space-y-4"
        style={{ border: '1px solid var(--color-border)' }}
        aria-hidden="true"
      >
        <div className="flex justify-between">
          <div className="flex gap-2">
            <div className={`h-5 w-16 ${base} ${shimmer} ${shimmerGradient}`} />
            <div className={`h-5 w-16 ${base} ${shimmer} ${shimmerGradient}`} />
          </div>
          <div className={`h-4 w-12 ${base} ${shimmer} ${shimmerGradient}`} />
        </div>
        <div className="space-y-2">
          <div className={`h-4 w-full ${base} ${shimmer} ${shimmerGradient}`} />
          <div className={`h-4 w-3/4 ${base} ${shimmer} ${shimmerGradient}`} />
        </div>
        <div className="flex justify-between pt-2">
          <div className="flex gap-2">
            <div className={`h-5 w-16 ${base} ${shimmer} ${shimmerGradient}`} />
            <div className={`h-5 w-16 ${base} ${shimmer} ${shimmerGradient}`} />
          </div>
          <div className={`h-4 w-16 ${base} ${shimmer} ${shimmerGradient}`} />
        </div>
      </div>
    );
  }

  // row variant (default)
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-surface)] p-4 flex items-center gap-4"
          style={{ border: '1px solid var(--color-border)' }}
          aria-hidden="true"
        >
          <div className={`w-10 h-10 rounded-full flex-shrink-0 ${shimmer} ${shimmerGradient}`} />
          <div className="flex-1 space-y-2.5">
            <div className={`h-4 w-2/3 ${base} ${shimmer} ${shimmerGradient}`} />
            <div className={`h-3 w-1/3 ${base} ${shimmer} ${shimmerGradient}`} />
          </div>
          <div className={`h-6 w-20 ${base} ${shimmer} ${shimmerGradient}`} />
        </div>
      ))}
    </>
  );
};
