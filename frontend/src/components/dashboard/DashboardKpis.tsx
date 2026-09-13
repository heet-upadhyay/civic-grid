import React from 'react';
import { FileText, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { Complaint } from '../../types/complaint';
import { useI18n } from '../../i18n/useI18n';

interface DashboardKpisProps {
  complaints: Complaint[];
  loading?: boolean;
}

/** Calculate real week-over-week trend from complaint created_at timestamps */
function computeTrend(complaints: Complaint[], filterFn?: (c: Complaint) => boolean) {
  const items = filterFn ? complaints.filter(filterFn) : complaints;
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  const thisWeekCount = items.filter(
    (c) => now - new Date(c.created_at).getTime() <= sevenDaysMs,
  ).length;

  const lastWeekCount = items.filter((c) => {
    const age = now - new Date(c.created_at).getTime();
    return age > sevenDaysMs && age <= fourteenDaysMs;
  }).length;

  if (lastWeekCount === 0) {
    if (thisWeekCount > 0) {
      return { value: 100, label: 'this week (new platform)' };
    }
    return { value: 0, label: 'this week' };
  }

  const pctChange = Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
  return { value: pctChange, label: 'vs previous week' };
}

export const DashboardKpis: React.FC<DashboardKpisProps> = ({ complaints, loading }) => {
  const { t } = useI18n();
  const genuineList = complaints.filter((c) => c.status !== 'Rejected / Spam' && c.category !== 'Spam / Invalid');
  const total = genuineList.length;
  const urgent = genuineList.filter((c) => c.urgency === 'Urgent' || c.urgency === 'Emergency').length;
  const critical = genuineList.filter((c) => c.severity === 'Critical').length;
  const resolved = genuineList.filter((c) => c.status === 'Resolved').length;

  const totalTrend = computeTrend(genuineList);
  const urgentTrend = computeTrend(genuineList, (c) => c.urgency === 'Urgent' || c.urgency === 'Emergency');
  const criticalTrend = computeTrend(genuineList, (c) => c.severity === 'Critical');
  const resolvedTrend = computeTrend(genuineList, (c) => c.status === 'Resolved');

  return (
    <div className="surface-card p-6">
      <h2 className="mb-6 text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
        {t.analytics.trendsTitle}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t.dashboard.kpiTotal}
          value={total}
          icon={FileText}
          maxValue={Math.max(total * 1.5, 100)}
          trend={totalTrend}
          accentColor="var(--color-primary)"
          loading={loading}
        />
        <KpiCard
          title={t.common.urgent}
          value={urgent}
          icon={AlertTriangle}
          maxValue={total || 1}
          trend={urgentTrend}
          accentColor="var(--color-warning)"
          loading={loading}
        />
        <KpiCard
          title={t.common.critical}
          value={critical}
          icon={Zap}
          maxValue={total || 1}
          trend={criticalTrend}
          accentColor="var(--color-danger)"
          loading={loading}
        />
        <KpiCard
          title={t.dashboard.kpiResolved}
          value={resolved}
          icon={CheckCircle2}
          maxValue={total || 1}
          trend={resolvedTrend}
          accentColor="var(--color-success)"
          loading={loading}
        />
      </div>
    </div>
  );
};
