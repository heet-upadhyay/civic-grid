import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Select } from 'antd';
import { useComplaints } from '../hooks/useComplaints';
import { ComplaintTable } from '../components/complaints/ComplaintTable';
import { ComplaintCard } from '../components/complaints/ComplaintCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { CATEGORIES, SEVERITY_LEVELS, URGENCY_LEVELS } from '../utils/constants';
import type { Complaint, Severity, Urgency } from '../types/complaint';
import type { ExplorerSort } from '../types/filters';
import { useI18n } from '../i18n/useI18n';

import { useRole } from '../context/RoleContext';
import { updateComplaintStatus, deleteComplaint } from '../api/complaints';
import { ShieldAlert, Trash2, CheckCircle } from 'lucide-react';

const SEVERITY_RANK: Record<Severity, number> = { Low: 1, Medium: 2, High: 3, Critical: 4 };
const URGENCY_RANK: Record<Urgency, number> = { Routine: 1, Soon: 2, Urgent: 3, Emergency: 4 };

function applySort(list: Complaint[], sort: ExplorerSort): Complaint[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'highest_severity':
        return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      case 'highest_urgency':
        return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
    }
  });
}

const ComplaintsPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useComplaints();
  const { isOfficer } = useRole();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'genuine' | 'spam'>('genuine');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<string[]>([]);
  const [location, setLocation] = useState<string[]>([]);
  const [sort, setSort] = useState<ExplorerSort>('newest');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const spamComplaints = useMemo(
    () => (data?.complaints ?? []).filter((c) => c.status === 'Rejected / Spam' || c.category === 'Spam / Invalid'),
    [data?.complaints],
  );
  const genuineComplaints = useMemo(
    () => (data?.complaints ?? []).filter((c) => c.status !== 'Rejected / Spam' && c.category !== 'Spam / Invalid'),
    [data?.complaints],
  );

  const filtered = useMemo(() => {
    let list = activeTab === 'spam' ? spamComplaints : genuineComplaints;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.summary.toLowerCase().includes(q) || c.raw_text.toLowerCase().includes(q),
      );
    }
    if (category.length) list = list.filter((c) => category.includes(c.category));
    if (severity.length) list = list.filter((c) => severity.includes(c.severity));
    if (urgency.length) list = list.filter((c) => urgency.includes(c.urgency));
    if (location.length) list = list.filter((c) => location.includes(c.location));
    return applySort(list, sort);
  }, [activeTab, spamComplaints, genuineComplaints, search, category, severity, urgency, location, sort]);

  const handleRestore = async (id: string) => {
    setActionLoadingId(id);
    try {
      await updateComplaintStatus(id, 'New');
      await refetch();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this spam complaint?')) return;
    setActionLoadingId(id);
    try {
      await deleteComplaint(id);
      await refetch();
    } finally {
      setActionLoadingId(null);
    }
  };

  const locationOptions = useMemo(
    () =>
      Array.from(new Set((data?.complaints ?? []).map((c) => c.location).filter(Boolean))).map(
        (loc) => ({ value: loc, label: loc }),
      ),
    [data],
  );

  const hasFilters = search || category.length || severity.length || urgency.length || location.length;
  const clearAll = () => {
    setSearch('');
    setCategory([]);
    setSeverity([]);
    setUrgency([]);
    setLocation([]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">{t.complaints.pageTitle}</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>
          {t.complaints.pageSubtitle}
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-4 w-4" style={{ color: 'var(--color-muted)' }} />
            </div>
            <input
              type="search"
              placeholder={t.complaints.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search complaints"
              className="field-input pl-11"
            />
          </div>

          <Select
            value={sort}
            onChange={(v) => setSort(v as ExplorerSort)}
            options={[
              { value: 'newest', label: t.complaints.sortNewest },
              { value: 'oldest', label: t.complaints.sortOldest },
              { value: 'highest_severity', label: t.complaints.sortSeverity },
              { value: 'highest_urgency', label: t.complaints.sortUrgency },
            ]}
            size="large"
            className="w-full sm:w-56"
            aria-label="Sort complaints"
            suffixIcon={<SlidersHorizontal className="h-4 w-4" style={{ color: 'var(--color-muted)' }} />}
          />
        </div>

        <div
          className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border p-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>
            {t.common.filter}
          </span>
          <Select
            mode="multiple"
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            placeholder={t.complaints.allCategories}
            className="min-w-[140px]"
            maxTagCount={1}
            aria-label="Filter by category"
          />
          <Select
            mode="multiple"
            value={severity}
            onChange={setSeverity}
            options={SEVERITY_LEVELS.map((s) => ({ value: s, label: s }))}
            placeholder={t.complaints.allSeverities}
            className="min-w-[140px]"
            maxTagCount={1}
            aria-label="Filter by severity"
          />
          <Select
            mode="multiple"
            value={urgency}
            onChange={setUrgency}
            options={URGENCY_LEVELS.map((u) => ({ value: u, label: u }))}
            placeholder={t.common.urgent}
            className="min-w-[140px]"
            maxTagCount={1}
            aria-label="Filter by urgency"
          />
          <Select
            mode="multiple"
            value={location}
            onChange={setLocation}
            options={locationOptions}
            placeholder={t.complaints.allLocations}
            className="min-w-[140px]"
            maxTagCount={1}
            aria-label="Filter by location"
          />
          {hasFilters && (
            <button type="button" onClick={clearAll} className="btn-secondary ml-auto !px-3 !py-1.5 text-xs">
              {t.common.reset}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 border-b pb-1" style={{ borderColor: 'var(--color-border)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('genuine')}
          className={`pb-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'genuine'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <span>Active Genuine Complaints</span>
          <span className="rounded-full bg-[var(--color-surface)] border px-2 py-0.5 text-xs">
            {genuineComplaints.length}
          </span>
        </button>

        {isOfficer && (
          <button
            type="button"
            onClick={() => setActiveTab('spam')}
            className={`pb-2.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'spam'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <span>Spam Vault 🚩</span>
            <span className="rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 text-xs">
              {spamComplaints.length}
            </span>
          </button>
        )}
      </div>

      {!isLoading && !isError && (
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {filtered.length} {t.complaints.resultsCount} {activeTab === 'spam' ? '(Quarantine Vault)' : ''}
        </p>
      )}

      {isError ? (
        <ErrorState message={t.common.error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <LoadingSkeleton key={i} variant="row" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={activeTab === 'spam' ? 'No Spam Complaints Isolated' : t.complaints.emptyTitle}
          description={activeTab === 'spam' ? 'No inappropriate or spam submissions are currently quarantined.' : t.complaints.emptyDesc}
          action={hasFilters ? { label: t.common.reset, onClick: clearAll } : undefined}
        />
      ) : activeTab === 'spam' ? (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="surface-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-l-red-500"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-red-600 dark:text-red-400">{c.id}</span>
                  <span className="rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                    Flagged as Spam
                  </span>
                  <span className="text-xs text-[var(--color-muted)]">{c.location}</span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  "{c.raw_text}"
                </p>
                <p className="text-xs italic" style={{ color: 'var(--color-muted)' }}>
                  {c.summary}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={actionLoadingId === c.id}
                  onClick={() => handleRestore(c.id)}
                  className="btn-secondary flex-1 sm:flex-initial text-xs !py-1.5 flex items-center justify-center gap-1 text-emerald-600 hover:bg-emerald-500/10"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  Restore as Genuine
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === c.id}
                  onClick={() => handleDelete(c.id)}
                  className="btn-secondary flex-1 sm:flex-initial text-xs !py-1.5 flex items-center justify-center gap-1 text-red-600 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <ComplaintTable complaints={filtered} loading={isLoading} />
          </div>
          <div className="space-y-3 md:hidden">
            {filtered.map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ComplaintsPage;
