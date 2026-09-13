import React, { useMemo, useCallback, useState } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { AlertTriangle, MapPin, Clock, Tag } from 'lucide-react';
import type { Complaint } from '../../types/complaint';
import { INDIA_CENTER, INDIA_ZOOM, SEVERITY_COLORS } from '../../utils/constants';
import type { Severity } from '../../types/complaint';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface GoogleMapProps {
  complaints: Complaint[];
  highPriorityCount?: number;
  height?: string;
  /** If true, renders full-screen style (no card wrapper) */
  fullScreen?: boolean;
}

/** Severity dot rendered as an AdvancedMarker */
function SeverityDot({ severity }: { severity: string }) {
  const color = SEVERITY_COLORS[severity as Severity] ?? '#94a3b8';
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        backgroundColor: color,
        border: '2.5px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        cursor: 'pointer',
      }}
    />
  );
}

/** Info window content for a complaint */
function ComplaintInfo({ complaint }: { complaint: Complaint }) {
  return (
    <div style={{ maxWidth: 280, fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--color-text)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: SEVERITY_COLORS[complaint.severity as Severity] ?? '#94a3b8',
          }}
        />
        <strong style={{ fontSize: 13, color: 'var(--color-text)' }}>{complaint.category}</strong>
        <span
          style={{
            fontSize: 11,
            padding: '2px 7px',
            borderRadius: 4,
            backgroundColor: 'var(--color-elevated)',
            color: 'var(--color-muted)',
            fontWeight: 600,
          }}
        >
          {complaint.status}
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-text)', margin: '4px 0 8px', lineHeight: 1.4 }}>
        {complaint.summary}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: 'var(--color-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--color-muted)' }}>
          <MapPin size={11} style={{ color: 'var(--color-muted)' }} /> {complaint.location}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--color-muted)' }}>
          <Tag size={11} style={{ color: 'var(--color-muted)' }} /> {complaint.severity}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--color-muted)' }}>
          <Clock size={11} style={{ color: 'var(--color-muted)' }} /> {new Date(complaint.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

/** Fit map bounds to visible markers */
function FitBounds({ positions }: { positions: { lat: number; lng: number }[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || positions.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    positions.forEach((p) => bounds.extend(p));
    if (positions.length === 1) {
      map.setCenter(positions[0]);
      map.setZoom(13);
    } else {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [map, positions]);
  return null;
}

export const GoogleMapView: React.FC<GoogleMapProps> = ({
  complaints,
  highPriorityCount = 0,
  height = '320px',
  fullScreen = false,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only show complaints with valid coordinates and exclude spam/rejected issues
  const geoComplaints = useMemo(
    () =>
      complaints.filter(
        (c) =>
          c.latitude != null &&
          c.longitude != null &&
          c.latitude !== 0 &&
          c.longitude !== 0 &&
          c.status !== 'Rejected / Spam',
      ),
    [complaints],
  );

  const positions = useMemo(
    () => geoComplaints.map((c) => ({ lat: c.latitude!, lng: c.longitude! })),
    [geoComplaints],
  );

  const selectedComplaint = useMemo(
    () => geoComplaints.find((c) => c.id === selectedId) ?? null,
    [geoComplaints, selectedId],
  );

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  if (!MAPS_API_KEY) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] p-8"
        style={{
          height,
          backgroundColor: 'var(--color-elevated)',
          border: '1px solid var(--color-border)',
        }}
      >
        <MapPin className="h-8 w-8" style={{ color: 'var(--color-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--color-muted)' }}>
          Google Maps API key not configured
        </p>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your <code>.env.local</code> file
        </p>
      </div>
    );
  }

  const mapContent = (
    <Map
      defaultCenter={INDIA_CENTER}
      defaultZoom={INDIA_ZOOM}
      mapId="DEMO_MAP_ID"
      gestureHandling="greedy"
      disableDefaultUI={false}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    >
      {geoComplaints.map((c) => (
        <AdvancedMarker
          key={c.id}
          position={{ lat: c.latitude!, lng: c.longitude! }}
          onClick={() => handleMarkerClick(c.id)}
        >
          <SeverityDot severity={c.severity} />
        </AdvancedMarker>
      ))}

      {selectedComplaint && selectedComplaint.latitude != null && selectedComplaint.longitude != null && (
        <InfoWindow
          position={{ lat: selectedComplaint.latitude, lng: selectedComplaint.longitude }}
          onCloseClick={() => setSelectedId(null)}
          pixelOffset={[0, -20]}
        >
          <ComplaintInfo complaint={selectedComplaint} />
        </InfoWindow>
      )}

      <FitBounds positions={positions} />
    </Map>
  );

  if (fullScreen) {
    return <div style={{ width: '100%', height: height === '100%' ? '600px' : height, minHeight: '500px' }}>{mapContent}</div>;
  }

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
          <span>{geoComplaints.length} mapped issues</span>
          {highPriorityCount > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="w-3 h-3" />
              {highPriorityCount} high-priority
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ height }}>{mapContent}</div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-5 px-5 py-2.5"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        {(Object.entries(SEVERITY_COLORS) as [Severity, string][]).map(([severity, color]) => (
          <div key={severity} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted)' }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: color,
                display: 'inline-block',
              }}
            />
            {severity}
          </div>
        ))}
      </div>
    </div>
  );
};
