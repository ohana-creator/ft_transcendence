/**
 * Serviço de API para Campanhas (Vaquinhas)
 * Funções para interagir com o campaign-service
 */

import { campaignsApi } from '@/utils/api/api';
import {
  Campaign,
  CampaignMember,
  Invitation,
  Contribution,
  CampaignsListResponse,
  MembersListResponse,
  ContributeResponse,
  CreateCampaignPayload,
  UpdateCampaignPayload,
  ContributePayload,
  InvitePayload,
  ListCampaignsParams,
  ListMembersParams,
  CampaignStatus,
} from '@/types/campaigns';

// ──── CAMPANHAS ────────────────────────────────────────

/**
 * Listar campanhas
 * Retorna campanhas públicas + privadas onde o utilizador é membro
 */
export async function listCampaigns(params?: ListCampaignsParams): Promise<CampaignsListResponse> {
  return campaignsApi.get<CampaignsListResponse>('/campaigns', { params });
}

/**
 * Listar campanhas privadas do utilizador
 */
export async function listPrivateCampaigns(
  page: number = 1,
  limit: number = 20,
  status: CampaignStatus = 'ACTIVE'
): Promise<CampaignsListResponse> {
  return campaignsApi.get<CampaignsListResponse>('/campaigns', {
    params: { page, limit, status },
  });
}

/**
 * Listar campanhas públicas
 */
export async function listPublicCampaigns(
  params?: ListCampaignsParams
): Promise<CampaignsListResponse> {
  return campaignsApi.get<CampaignsListResponse>('/campaigns', { params });
}

/**
 * Obter detalhes de uma campanha
 */
export async function getCampaignDetails(campaignId: string): Promise<Campaign> {
  return campaignsApi.get<Campaign>(`/campaigns/${campaignId}`);
}

/**
 * Criar nova campanha
 */
export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  return campaignsApi.post<Campaign>('/campaigns', payload);
}

/**
 * Atualizar configurações da campanha
 * Apenas owner ou SUDO pode fazer isso
 */
export async function updateCampaign(
  campaignId: string,
  payload: UpdateCampaignPayload
): Promise<Campaign> {
  return campaignsApi.put<Campaign>(`/campaigns/${campaignId}`, payload);
}

/**
 * Fechar/cancelar campanha
 * Apenas owner pode fazer isso
 */
export async function closeCampaign(campaignId: string): Promise<Campaign> {
  return campaignsApi.delete<Campaign>(`/campaigns/${campaignId}`);
}

// ──── CONTRIBUIÇÕES ────────────────────────────────────

/**
 * Contribuir para uma campanha
 * Utilizador deve ter saldo suficiente
 */
export async function contributeToCampaign(
  campaignId: string,
  payload: ContributePayload
): Promise<ContributeResponse> {
  const requestPayload = {
    amount: payload.amount,
    message: payload.message,
    isAnonymous: payload.isAnonymous,
    anonimo: payload.isAnonymous,
  };

  return campaignsApi.post<ContributeResponse>(
    `/campaigns/${campaignId}/contribute`,
    requestPayload
  );
}

/**
 * Listar contribuições de uma campanha
 * Retorna histórico de todas as contribuições
 */
export async function listContributions(
  campaignId: string,
  params?: { page?: number; limit?: number }
): Promise<Contribution[]> {
  return campaignsApi.get<Contribution[]>(
    `/campaigns/${campaignId}/contributions`,
    { params }
  );
}

// ──── MEMBROS ──────────────────────────────────────────

/**
 * Listar membros de uma campanha
 */
export async function listMembers(
  campaignId: string,
  params?: ListMembersParams
): Promise<MembersListResponse> {
  return campaignsApi.get<MembersListResponse>(
    `/campaigns/${campaignId}/members`,
    { params }
  );
}

/**
 * Promover membro a SUDO
 * Apenas owner ou SUDO pode fazer isso
 */
export async function promoteMember(
  campaignId: string,
  userId: string
): Promise<CampaignMember> {
  return campaignsApi.post<CampaignMember>(
    `/campaigns/${campaignId}/members/${userId}/promote`
  );
}

/**
 * Remover membro da campanha
 * Apenas owner ou SUDO pode fazer isso
 */
export async function removeMember(
  campaignId: string,
  userId: string
): Promise<void> {
  return campaignsApi.delete(`/campaigns/${campaignId}/members/${userId}`);
}

// ──── CONVITES ────────────────────────────────────────

/**
 * Enviar convite para novo membro
 * Apenas owner ou SUDO podem fazer isso
 */
export async function sendInvite(
  campaignId: string,
  payload: InvitePayload
): Promise<Invitation> {
  return campaignsApi.post<Invitation>(
    `/campaigns/${campaignId}/invite`,
    payload
  );
}

/**
 * Listar convites de uma campanha
 */
export async function listInvites(campaignId: string): Promise<Invitation[]> {
  return campaignsApi.get<Invitation[]>(`/campaigns/${campaignId}/invitations`);
}

/**
 * Aceitar convite para campanha
 */
export async function acceptInvite(inviteId: string): Promise<Invitation> {
  return campaignsApi.post<Invitation>(`/invitations/${inviteId}/accept`);
}

/**
 * Rejeitar convite para campanha
 */
export async function rejectInvite(inviteId: string): Promise<Invitation> {
  return campaignsApi.post<Invitation>(`/invitations/${inviteId}/reject`);
}

// ──── TYPES RE-EXPORT ─────────────────────────────────

export type {
  Campaign,
  CampaignMember,
  Invitation,
  Contribution,
  CampaignsListResponse,
  MembersListResponse,
  ContributeResponse,
  CreateCampaignPayload,
  UpdateCampaignPayload,
  ContributePayload,
  InvitePayload,
  ListCampaignsParams,
  CampaignStatus,
  MemberRole,
  InvitationStatus,
} from '@/types/campaigns';
