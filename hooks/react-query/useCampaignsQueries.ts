/**
 * React Query Hooks para Campanhas (Vaquinhas)
 * Alternativa refatorada dos hooks do contexto com cache automático
 */

'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import {
  listCampaigns,
  getCampaignDetails,
  listContributions,
  createCampaign as createCampaignApi,
  contributeToCampaign,
} from '@/utils/campaigns';
import {
  Campaign,
  CampaignsListResponse,
  ListCampaignsParams,
  CreateCampaignPayload,
  ContributePayload,
  Contribution,
} from '@/types/campaigns';
import { ApiError } from '@/utils/api/api';
import { toast } from '@/utils/toast';

/**
 * Query para listar campanhas com cache de 5 minutos
 * Ideal para páginas que mostram listas de campanhas
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useCampaignsList({ page: 1, limit: 10 });
 * ```
 */
export function useCampaignsList(params?: ListCampaignsParams): UseQueryResult<CampaignsListResponse, ApiError> {
  return useQuery<CampaignsListResponse, ApiError>({
    queryKey: ['campaigns', params],
    queryFn: async () => {
      return listCampaigns(params);
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Query para obter detalhes de uma campanha específica com cache de 10 minutos
 * Ideal para páginas de detalhe de campanha
 *
 * @example
 * ```tsx
 * const { data: campaign, isLoading } = useCampaignDetail(campaignId);
 * ```
 */
export function useCampaignDetail(campaignId?: string): UseQueryResult<Campaign, ApiError> {
  return useQuery<Campaign, ApiError>({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      return getCampaignDetails(campaignId);
    },
    enabled: !!campaignId, // Só executa se campaignId existir
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000, // 20 minutos
  });
}

/**
 * Query para listar contribuições de uma campanha
 */
export function useCampaignContributions(campaignId?: string) {
  return useQuery<Contribution[], ApiError>({
    queryKey: ['campaign-contributions', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      return listContributions(campaignId);
    },
    enabled: !!campaignId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Mutation para criar campanha
 * Invalida cache de campanhas após sucesso
 *
 * @example
 * ```tsx
 * const { mutate: createCampaign, isPending } = useCreateCampaign();
 * handleSubmit = () => {
 *   createCampaign(payload, {
 *     onSuccess: (campaign) => {
 *       router.push(`/vaquinhas/${campaign.id}`);
 *     }
 *   });
 * };
 * ```
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCampaignPayload) => createCampaignApi(payload),
    onSuccess: (newCampaign) => {
      // Invalidar lista de campanhas para refetch
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });

      // Adicionar nova campanha ao cache
      queryClient.setQueryData(['campaign', newCampaign.id], newCampaign);

      toast.success('Campanha criada com sucesso!');
    },
    onError: (error: ApiError) => {
      toast.error(`Erro ao criar campanha: ${error.message}`);
    },
  });
}

/**
 * Mutation para contribuir a uma campanha
 * Invalida detalhes e contribuições da campanha após sucesso
 */
export function useContributeToCampaign(campaignId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ContributePayload) => {
      if (!campaignId) throw new Error('Campaign ID is required');
      return contributeToCampaign(campaignId, payload);
    },
    onSuccess: () => {
      // Invalidar detalhes da campanha 
      queryClient.invalidateQueries({
        queryKey: ['campaign', campaignId],
      });

      // Invalidar contribuições
      queryClient.invalidateQueries({
        queryKey: ['campaign-contributions', campaignId],
      });

      // Invalidar lista geral
      queryClient.invalidateQueries({
        queryKey: ['campaigns'],
      });

      toast.success('Contribuição realizada com sucesso!');
    },
    onError: (error: ApiError) => {
      toast.error(`Erro ao contribuir: ${error.message}`);
    },
  });
}
