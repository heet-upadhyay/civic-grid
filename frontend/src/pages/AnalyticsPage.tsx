import React, { useState } from 'react';
import { useComplaints } from '../hooks/useComplaints';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { CategoryChart } from '../components/dashboard/CategoryChart';
import { SeverityChart } from '../components/dashboard/SeverityChart';
import { UrgencyChart } from '../components/dashboard/UrgencyChart';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import type { ComplaintFilters } from '../types/filters';
import type { Complaint } from '../types/complaint';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { PolicyBriefModal } from '../components/dashboard/PolicyBriefModal';

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

const AnalyticsPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useComplaints();
  const [filters, setFilters] = useState<ComplaintFilters>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useI18n();

  const filtered = applyFilters(data?.complaints ?? [], filters);

  if (isError) {
    return <ErrorState message={t.common.error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{t.analytics.pageTitle}</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>
            {t.analytics.pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => setIsModalOpen(true)} 
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Sparkles className="h-4 w-4" />
            Generate AI Policy Brief
          </button>
          <button type="button" onClick={() => refetch()} className="btn-secondary" aria-label="Refresh analytics">
            <RefreshCw className="h-4 w-4" />
            {t.common.retry}
          </button>
        </div>
      </div>

      <DashboardFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="chart" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="surface-card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              {t.dashboard.chartCategory}
            </h2>
            <CategoryChart complaints={filtered} />
          </div>
          <div className="surface-card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              {t.dashboard.chartSeverity}
            </h2>
            <SeverityChart complaints={filtered} />
          </div>
          <div className="surface-card p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
              {t.dashboard.chartUrgency}
            </h2>
            <UrgencyChart complaints={filtered} />
          </div>
        </div>
      )}
      
      <PolicyBriefModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default AnalyticsPage;
