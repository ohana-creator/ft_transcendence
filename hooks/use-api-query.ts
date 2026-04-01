/**
 * Hook Wrapper para React Query
 * Facilita usar React Query com o ApiClient existente
 */

'use client';

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { ApiClient, ApiError } from '@/utils/api/api';
import { api } from '@/utils/api/api';

interface UseApiQueryOptions<TData = unknown> extends Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'> {
  /**
   * Endpoint da API (ex: '/campaigns', '/users/me')
   */
  endpoint: string;

  /**
   * Query parameters (ex: { page: 1, limit: 20 })
   */
  params?: Record<string, string | number | boolean | undefined | null>;

  /**
   * Instância do ApiClient (padrão: api global)
   */
  client?: ApiClient;

  /**
   * Desabilitar a query (útil para queries condicionais)
   */
  enabled?: boolean;
}

/**
 * Hook para fazer requisições GET com caching automático via React Query
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useApiQuery<Campaign[]>({
 *   endpoint: '/campaigns',
 *   params: { page: 1, limit: 10 },
 *   staleTime: 5 * 60 * 1000,
 * });
 * ```
 */
export function useApiQuery<TData = unknown>(
  options: UseApiQueryOptions<TData>
): UseQueryResult<TData, ApiError> {
  const {
    endpoint,
    params,
    client = api,
    enabled = true,
    ...queryOptions
  } = options;

  // Key única baseada em endpoint + params
  const queryKey = [endpoint, params];

  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: async () => {
      return client.get<TData>(endpoint, { params });
    },
    enabled,
    ...queryOptions,
  });
}
