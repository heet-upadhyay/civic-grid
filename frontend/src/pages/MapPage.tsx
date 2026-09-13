import React from 'react';
import { useComplaints } from '../hooks/useComplaints';
import { GoogleMapView } from '../components/complaints/GoogleMap';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { RefreshCw, Map } from 'lucide-react';
import { SEVERITY_COLORS } from '../utils/constants';
import type { Severity } from '../types/complaint';
import { useI18n } from '../i18n/useI18n';

const MapPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useComplaints();
  const { t } = useI18n();

  const allComplaints = data?.complaints ?? [];
  const geoComplaints = allComplaints.filter(
    (c) => c.latitude != null && c.longitude != null,
  );

  if (isError) {
    return <ErrorState message={t.common.error} onRetry={() => refetch()} />;
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b pb-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
            >
              <Map className="h-4.5 w-4.5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Map View
            </h1>
          </div>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--color-muted)' }}>
            Geographic view of all reported civic issues across India
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats chips */}
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              {allComplaints.length} total
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                color: 'var(--color-success)',
              }}
            >
              {geoComplaints.length} mapped
            </span>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            className="btn-secondary"
            aria-label="Refresh map data"
          >
            <RefreshCw className="h-4 w-4" />
            {t.common.retry}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div
        className="flex items-center gap-5 rounded-lg px-4 py-2.5"
        style={{ backgroundColor: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>
          Severity:
        </span>
        {(Object.entries(SEVERITY_COLORS) as [Severity, string][]).map(([severity, color]) => (
          <div key={severity} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: color,
                display: 'inline-block',
                border: '1.5px solid white',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
              }}
            />
            {severity}
          </div>
        ))}
      </div>

      {/* Map container */}
      {isLoading ? (
        <div className="h-[600px] w-full">
          <LoadingSkeleton variant="card" />
        </div>
      ) : (
        <div
          className="h-[600px] w-full rounded-[var(--radius)] overflow-hidden"
          style={{ border: '1px solid var(--color-border)', height: '600px' }}
        >
          <GoogleMapView
            complaints={allComplaints}
            fullScreen
            height="600px"
          />
        </div>
      )}
    </div>
  );
};

export default MapPage;
