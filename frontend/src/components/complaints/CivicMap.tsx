import React from 'react';
import { Map, AlertTriangle } from 'lucide-react';

interface CivicMapProps {
  totalComplaints?: number;
  highPriorityCount?: number;
}

export const CivicMap: React.FC<CivicMapProps> = ({
  totalComplaints = 0,
  highPriorityCount = 0,
}) => {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius)]"
      style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Complaint Locations
        </h3>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>{totalComplaints} reported issues</span>
          {highPriorityCount > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="w-3 h-3" />
              {highPriorityCount} high-priority
            </span>
          )}
        </div>
      </div>

      {/* Map placeholder */}
      <div
        className="relative h-64 flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: 'var(--color-elevated)' }}
        aria-label="Map visualization placeholder — Leaflet/MapLibre integration coming soon"
      >
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(var(--color-border) 1px, transparent 1px),
              linear-gradient(90deg, var(--color-border) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Center content */}
        <div className="relative flex flex-col items-center gap-2 text-center px-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[var(--radius)]"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <Map className="w-6 h-6" style={{ color: 'var(--color-muted)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
            Map visualization
          </p>
          <p className="text-xs max-w-48" style={{ color: 'var(--color-muted)' }}>
            Geographic complaint distribution will appear here. Ready for Leaflet integration.
          </p>
        </div>
      </div>
    </div>
  );
};
