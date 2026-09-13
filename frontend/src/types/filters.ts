import type { Severity, Urgency, ComplaintStatus } from './complaint';

export interface ComplaintFilters {
  // Used by dashboard
  categories?: string[];
  locations?: string[];
  severities?: Severity[];
  urgencies?: Urgency[];
  dateFrom?: string;
  dateTo?: string;
  // Used by explorer
  search?: string;
  status?: ComplaintStatus[];
}

export type SortField = 'created_at' | 'severity' | 'urgency' | 'status';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
}

export type ExplorerSort = 'newest' | 'oldest' | 'highest_severity' | 'highest_urgency';
