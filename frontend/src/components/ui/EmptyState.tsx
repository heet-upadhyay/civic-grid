import React from 'react';
import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No results found',
  description = "We couldn't find any data matching your criteria.",
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
      <div
        className="w-16 h-16 rounded-[var(--radius-surface)] flex items-center justify-center mb-6"
        style={{ backgroundColor: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
      >
        <SearchX className="w-8 h-8" style={{ color: 'var(--color-muted)' }} />
      </div>
      <h3 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-sm mb-6 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        {description}
      </p>
      {action && (
        <button type="button" onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
};

