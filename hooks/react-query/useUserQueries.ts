/**
 * React Query hooks for user searches and data
 * Provides caching and optimistic updates for user-related queries
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api/api';

// Import CACHE_TIMES directly to avoid circular dependencies
const CACHE_TIMES = {
  SHORT: { staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000 }, // 2min / 5min
} as const;

interface UserSearchResult {
  id: string;
  username: string;
  nome: string;
  avatar?: string;
  verificado: boolean;
}

interface UsersSearchResponse {
  users: UserSearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Search for users with caching
 * Uses SHORT cache (2min stale, 5min gc) since user data changes moderately
 */
export function useUserSearch(searchTerm: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['users', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) {
        return { users: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      }

      const response = await api.get<UsersSearchResponse>('/users/search', {
        params: {
          q: searchTerm,
          page: 1,
          limit: 10,
        },
      });

      return (response as any).data || response as UsersSearchResponse;
    },
    enabled: enabled && searchTerm.length >= 2,
    staleTime: CACHE_TIMES.SHORT.staleTime, // 2 minutes
    gcTime: CACHE_TIMES.SHORT.gcTime, // 5 minutes
    // Keep previous results while fetching new ones for better UX
    placeholderData: (previousData) => previousData,
  });
}
