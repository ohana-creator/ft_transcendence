/**
 * Centralized pagination configuration
 * All pagination limits should reference these constants
 */

export const PAGINATION_DEFAULTS = {
  /** Default page size for campaigns list */
  CAMPAIGNS: 50,
  /** Default page size for campaign members */
  MEMBERS: 100,
  /** Default page size for notifications (unread) */
  NOTIFICATIONS_UNREAD: 100,
  /** Default page size for notifications (all) */
  NOTIFICATIONS_ALL: 50,
  /** Default page size for wallet transactions */
  TRANSACTIONS: 50,
  /** Default page size for dashboard operations */
  DASHBOARD_OPERATIONS: 10,
  /** Default page size for contribution history */
  CONTRIBUTIONS: 100,
  /** Default page size for friends list */
  FRIENDS: 50,
  /** Maximum items for infinite scroll */
  MAX_ITEMS: 500,
} as const;

export const SORT_DEFAULTS = {
  /** Available sort fields for campaigns */
  CAMPAIGN_FIELDS: ['createdAt', 'currentAmount', 'deadline', 'progress', 'contributorsCount'] as const,
  /** Available sort orders */
  ORDER: ['ASC', 'DESC'] as const,
  /** Default sort field */
  DEFAULT_FIELD: 'createdAt' as const,
  /** Default sort order */
  DEFAULT_ORDER: 'DESC' as const,
} as const;

export const FILTER_DEFAULTS = {
  /** Debounce delay for search input (ms) */
  SEARCH_DEBOUNCE: 300,
  /** Minimum search query length */
  MIN_SEARCH_LENGTH: 2,
  /** Maximum number of active filters */
  MAX_ACTIVE_FILTERS: 10,
} as const;

export type SortField = typeof SORT_DEFAULTS.CAMPAIGN_FIELDS[number];
export type SortOrder = typeof SORT_DEFAULTS.ORDER[number];

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
}
