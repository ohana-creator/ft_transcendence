/**
 * React Query Hook para Pesquisa com Debounce
 * Otimizado para interações do utilizador (filtros, pesquisa)
 */

'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { listCampaigns } from '@/utils/campaigns';
import { ApiError } from '@/utils/api/api';
import { CampaignsListResponse, ListCampaignsParams } from '@/types/campaigns';

/**
 * Hook de debounce genérico
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para pesquisa de campanhas com debounce
 * - Cache de 2 minutos para resultados de pesquisa
 * - Mantém dados anteriores durante loading (placeholderData)
 * - Debounce de 300ms para evitar muitas requisições
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const { data, isLoading, isFetching } = useCampaignSearch(search, { limit: 10 });
 * 
 * // isFetching = true durante refetch (mostra spinner pequeno)
 * // isLoading = true apenas no primeiro load
 * ```
 */
export function useCampaignSearch(
  searchTerm: string,
  params?: Omit<ListCampaignsParams, 'search'>
) {
  const debouncedSearch = useDebounce(searchTerm, 300);

  const queryParams = useMemo(() => ({
    ...params,
    search: debouncedSearch || undefined,
  }), [debouncedSearch, params]);

  return useQuery<CampaignsListResponse, ApiError>({
    queryKey: ['campaigns', 'search', queryParams],
    queryFn: () => listCampaigns(queryParams),
    // Cache mais curto para pesquisas
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    // Mantém dados anteriores durante refetch (UX melhor)
    placeholderData: keepPreviousData,
    // Só executa quando há termo ou params definidos
    enabled: true,
  });
}

/**
 * Hook para filtros de campanhas
 * Diferente de pesquisa, os filtros são aplicados imediatamente
 * 
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<ListCampaignsParams>({
 *   status: 'ACTIVE',
 *   sortBy: 'createdAt',
 * });
 * const { data } = useCampaignFilters(filters);
 * ```
 */
export function useCampaignFilters(params: ListCampaignsParams) {
  return useQuery<CampaignsListResponse, ApiError>({
    queryKey: ['campaigns', 'filtered', params],
    queryFn: () => listCampaigns(params),
    staleTime: 3 * 60 * 1000, // 3 minutos
    gcTime: 8 * 60 * 1000, // 8 minutos
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook combinado de pesquisa + filtros
 * Útil para páginas com ambos os recursos
 */
export function useCampaignSearchWithFilters(
  searchTerm: string,
  filters: Omit<ListCampaignsParams, 'search'>,
  options?: { debounceMs?: number }
) {
  const { debounceMs = 300 } = options ?? {};
  const debouncedSearch = useDebounce(searchTerm, debounceMs);

  const queryParams = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
  }), [debouncedSearch, filters]);

  return useQuery<CampaignsListResponse, ApiError>({
    queryKey: ['campaigns', 'search-filtered', queryParams],
    queryFn: () => listCampaigns(queryParams),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
