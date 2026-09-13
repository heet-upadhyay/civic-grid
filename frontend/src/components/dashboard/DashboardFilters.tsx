import React, { useState } from 'react';
import { Select, DatePicker } from 'antd';
import { X, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, SEVERITY_LEVELS, URGENCY_LEVELS } from '../../utils/constants';
import type { ComplaintFilters } from '../../types/filters';

const { RangePicker } = DatePicker;

interface DashboardFiltersProps {
  filters: ComplaintFilters;
  onChange: (filters: ComplaintFilters) => void;
  availableLocations?: string[];
}

const hasActiveFilters = (f: ComplaintFilters) =>
  (f.categories?.length ?? 0) > 0 ||
  (f.locations?.length ?? 0) > 0 ||
  (f.severities?.length ?? 0) > 0 ||
  (f.urgencies?.length ?? 0) > 0 ||
  !!f.dateFrom ||
  !!f.dateTo;

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({ filters, onChange, availableLocations }) => {
  const [expanded, setExpanded] = useState(false);
  const active = hasActiveFilters(filters);

  const clear = () => onChange({ categories: [], locations: [], severities: [], urgencies: [] });

  return (
    <div
      className="rounded-[var(--radius-surface)] p-4"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80 rounded-[var(--radius-control)]"
          style={{ color: 'var(--color-text)' }}
          aria-expanded={expanded}
          aria-controls="filter-panel"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {active && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius)] text-xs" style={{ color: 'var(--color-primary-fg)', backgroundColor: 'var(--color-primary)' }}>
              !
            </span>
          )}
        </button>
        {active && (
          <button
            onClick={clear}
            className="flex items-center gap-1 text-xs transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
            style={{ color: 'var(--color-muted)' }}
            aria-label="Clear all filters"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {/* Active chips */}
      {active && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {filters.categories?.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-[var(--radius)] px-2 py-0.5 text-xs"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-structure) 12%, transparent)', color: 'var(--color-structure)', border: '1px solid color-mix(in srgb, var(--color-structure) 35%, transparent)' }}
            >
              {cat}
              <button
                onClick={() => onChange({ ...filters, categories: filters.categories?.filter((c) => c !== cat) })}
                aria-label={`Remove ${cat} filter`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {filters.severities?.map((sev) => (
            <span
              key={sev}
              className="inline-flex items-center gap-1 rounded-[var(--radius)] px-2 py-0.5 text-xs"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-secondary) 12%, transparent)', color: 'var(--color-secondary)', border: '1px solid color-mix(in srgb, var(--color-secondary) 35%, transparent)' }}
            >
              {sev}
              <button
                onClick={() => onChange({ ...filters, severities: filters.severities?.filter((s) => s !== sev) })}
                aria-label={`Remove ${sev} severity filter`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Expanded controls */}
      {expanded && (
        <div id="filter-panel" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Category</label>
            <Select
              mode="multiple"
              value={filters.categories ?? []}
              onChange={(v) => onChange({ ...filters, categories: v })}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              placeholder="All categories"
              size="small"
              className="w-full"
              maxTagCount="responsive"
              aria-label="Filter by category"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Location</label>
            <Select
              mode="multiple"
              value={filters.locations ?? []}
              onChange={(v) => onChange({ ...filters, locations: v })}
              options={(availableLocations ?? []).map((loc: string) => ({ value: loc, label: loc }))}
              placeholder="All locations"
              size="small"
              className="w-full"
              maxTagCount="responsive"
              aria-label="Filter by location"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Severity</label>
            <Select
              mode="multiple"
              value={filters.severities ?? []}
              onChange={(v) => onChange({ ...filters, severities: v })}
              options={SEVERITY_LEVELS.map((s) => ({ value: s, label: s }))}
              placeholder="All severities"
              size="small"
              className="w-full"
              aria-label="Filter by severity"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Urgency</label>
            <Select
              mode="multiple"
              value={filters.urgencies ?? []}
              onChange={(v) => onChange({ ...filters, urgencies: v })}
              options={URGENCY_LEVELS.map((u) => ({ value: u, label: u }))}
              placeholder="All urgencies"
              size="small"
              className="w-full"
              aria-label="Filter by urgency"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>Date Range</label>
            <RangePicker
              size="small"
              className="w-full"
              onChange={(dates) => {
                onChange({
                  ...filters,
                  dateFrom: dates?.[0]?.toISOString(),
                  dateTo: dates?.[1]?.toISOString(),
                });
              }}
              aria-label="Filter by date range"
            />
          </div>
        </div>
      )}
    </div>
  );
};
