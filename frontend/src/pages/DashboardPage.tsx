import React, { useState, useMemo } from 'react';
import { useComplaints } from '../hooks/useComplaints';
import { DashboardKpis } from '../components/dashboard/DashboardKpis';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { RecentComplaints } from '../components/dashboard/RecentComplaints';
import { GoogleMapView } from '../components/complaints/GoogleMap';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import type { ComplaintFilters } from '../types/filters';
import type { Complaint } from '../types/complaint';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

function applyFilters(complaints: Complaint[], f: ComplaintFilters): Complaint[] {
  return complaints.filter((c) => {
    if (c.status === 'Rejected / Spam' || c.category === 'Spam / Invalid') return false;
    if (f.categories?.length && !f.categories.includes(c.category)) return false;
    if (f.locations?.length && !f.locations.includes(c.location)) return false;
    if (f.severities?.length && !f.severities.includes(c.severity)) return false;
    if (f.urgencies?.length && !f.urgencies.includes(c.urgency)) return false;
    if (f.dateFrom && new Date(c.created_at) < new Date(f.dateFrom)) return false;
    if (f.dateTo && new Date(c.created_at) > new Date(f.dateTo)) return false;
    return true;
  });
}

const DashboardPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useComplaints();
  const [filters, setFilters] = useState<ComplaintFilters>({});
  const { t } = useI18n();

  const allComplaints = data?.complaints ?? [];
  const filtered = applyFilters(allComplaints, filters);
  const highPriority = filtered.filter(
    (c) => c.severity === 'Critical' || c.urgency === 'Emergency',
  ).length;

  const availableLocations = useMemo(
    () => Array.from(new Set((data?.complaints ?? []).map((c) => c.location).filter(Boolean))),
    [data?.complaints],
  );

  if (isError) {
    return <ErrorState message={t.common.error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-8">
      <div
        className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t.dashboard.pageTitle}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>
            {t.dashboard.pageSubtitle}
          </p>
        </div>
        <button type="button" onClick={() => refetch()} className="btn-secondary" aria-label="Refresh dashboard">
          <RefreshCw className="h-4 w-4" />
          {t.common.retry}
        </button>
      </div>

      <DashboardFilters filters={filters} onChange={setFilters} availableLocations={availableLocations} />

      <DashboardKpis complaints={filtered} loading={isLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GoogleMapView complaints={filtered} highPriorityCount={highPriority} />

        <div className="surface-card p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <LoadingSkeleton key={i} variant="row" />
              ))}
            </div>
          ) : (
            <RecentComplaints complaints={filtered} />
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
