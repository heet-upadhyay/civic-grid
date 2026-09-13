import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message = "System encountered an unexpected error while retrieving data.", 
  onRetry 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
      <div 
        className="w-16 h-16 rounded-[var(--radius-surface)] flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid color-mix(in srgb, var(--color-secondary) 45%, transparent)' }}
      >
        <AlertTriangle className="w-8 h-8" style={{ color: 'var(--color-secondary)' }} />
      </div>
      <h3 className="text-xl font-semibold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>Connection Interrupted</h3>
      <p className="text-sm max-w-sm mb-6 leading-relaxed" style={{ color: 'var(--color-muted)' }}>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
};

