import React, { useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { AlertTriangle, MapPin, Clock, Tag } from 'lucide-react';

import type { Complaint } from '../../types/complaint';
import { INDIA_CENTER, INDIA_ZOOM, SEVERITY_COLORS } from '../../utils/constants';
import type { Severity } from '../../types/complaint';

interface GoogleMapProps {
  complaints: Complaint[];
  highPriorityCount?: number;
  height?: string;
  fullScreen?: boolean;
}

/* Automatically fit the map around all complaint locations */
function FitBounds({
  positions,
}: {
  positions: { lat: number; lng: number }[];
}) {
  const map = useMap();

  React.useEffect(() => {
    if (!positions.length) return;

    if (positions.length === 1) {
      map.setView(
        [positions[0].lat, positions[0].lng],
        13
      );
      return;
    }

    const bounds = positions.map((p) => [
      p.lat,
      p.lng,
    ] as [number, number]);

    map.fitBounds(bounds, {
      padding: [40, 40],
    });
  }, [map, positions]);

  return null;
}

/* Complaint popup */
function ComplaintInfo({
  complaint,
}: {
  complaint: Complaint;
}) {
  return (
    <div
      style={{
        width: 250,
        fontFamily: "'IBM Plex Sans', sans-serif",
        color: '#111827',
      }}
    >
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
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor:
              SEVERITY_COLORS[
                complaint.severity as Severity
              ] ?? '#94a3b8',
          }}
        />

        <strong style={{ fontSize: 13 }}>
          {complaint.category}
        </strong>

        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            background: '#f1f5f9',
            color: '#64748b',
            fontWeight: 600,
          }}
        >
          {complaint.status}
        </span>
      </div>

      <p
        style={{
          fontSize: 12,
          margin: '6px 0 10px',
          lineHeight: 1.4,
        }}
      >
        {complaint.summary}
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 11,
          color: '#64748b',
        }}
      >
        <span>
          <MapPin size={11} /> {complaint.location}
        </span>

        <span>
          <Tag size={11} /> {complaint.severity}
        </span>

        <span>
          <Clock size={11} />{' '}
          {new Date(
            complaint.created_at
          ).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

export const GoogleMapView: React.FC<GoogleMapProps> = ({
  complaints,
  highPriorityCount = 0,
  height = '320px',
  fullScreen = false,
}) => {
  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  /* Only complaints having valid coordinates */
  const geoComplaints = useMemo(
    () =>
      complaints.filter(
        (c) =>
          c.latitude != null &&
          c.longitude != null &&
          c.latitude !== 0 &&
          c.longitude !== 0 &&
          c.status !== 'Rejected / Spam'
      ),
    [complaints]
  );

  const positions = useMemo(
    () =>
      geoComplaints.map((c) => ({
        lat: c.latitude!,
        lng: c.longitude!,
      })),
    [geoComplaints]
  );

  const selectedComplaint = useMemo(
    () =>
      geoComplaints.find(
        (c) => c.id === selectedId
      ) ?? null,
    [geoComplaints, selectedId]
  );

  const mapContent = (
    <MapContainer
      center={[
        INDIA_CENTER.lat,
        INDIA_CENTER.lng,
      ]}
      zoom={INDIA_ZOOM}
      scrollWheelZoom={true}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '500px',
      }}
    >
      {/* FREE OpenStreetMap tiles */}
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Complaint markers */}
      {geoComplaints.map((complaint) => {
        const color =
          SEVERITY_COLORS[
            complaint.severity as Severity
          ] ?? '#94a3b8';

        return (
          <CircleMarker
            key={complaint.id}
            center={[
              complaint.latitude!,
              complaint.longitude!,
            ]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: color,
              fillOpacity: 0.95,
            }}
            eventHandlers={{
              click: () =>
                setSelectedId(
                  complaint.id
                ),
            }}
          >
            <Popup>
              <ComplaintInfo
                complaint={complaint}
              />
            </Popup>
          </CircleMarker>
        );
      })}

      <FitBounds positions={positions} />
    </MapContainer>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          width: '100%',
          height:
            height === '100%'
              ? '600px'
              : height,
          minHeight: '500px',
        }}
      >
        {mapContent}
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[var(--radius)]"
      style={{
        border:
          '1px solid var(--color-border)',
        backgroundColor:
          'var(--color-surface)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          borderBottom:
            '1px solid var(--color-border)',
        }}
      >
        <h3
          className="text-sm font-semibold"
          style={{
            color: 'var(--color-text)',
          }}
        >
          Complaint Locations
        </h3>

        <div
          className="flex items-center gap-3 text-xs"
          style={{
            color: 'var(--color-muted)',
          }}
        >
          <span>
            {geoComplaints.length} mapped issues
          </span>

          {highPriorityCount > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="w-3 h-3" />
              {highPriorityCount} high-priority
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ height }}>
        {mapContent}
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-5 px-5 py-2.5"
        style={{
          borderTop:
            '1px solid var(--color-border)',
        }}
      >
        {(
          Object.entries(
            SEVERITY_COLORS
          ) as [Severity, string][]
        ).map(([severity, color]) => (
          <div
            key={severity}
            className="flex items-center gap-1.5 text-xs"
            style={{
              color: 'var(--color-muted)',
            }}
          >
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