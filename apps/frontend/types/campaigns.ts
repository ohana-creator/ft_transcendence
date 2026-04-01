/**
 * Tipos para a API de Campanhas (Vaquinhas)
 * Correspondem aos modelos do campaign-service
 */

// ── Enums ───────────────────────────────────────────────

export type CampaignStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type MemberRole = 'SUDO' | 'VAKER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

// ── Campaign ────────────────────────────────────────────

export interface Campaign {
  id: string;
  title: string;
  description: string;
  isPrivate: boolean;
  goalAmount: number | null;
  goalVisible: boolean;
  currentAmount: number;
  deadline: string | null;
  ownerId: string;
  ownerUsername: string;
  status: CampaignStatus;
  createdAt: string;
  closedAt: string | null;
  members?: CampaignMember[];
  _count?: {
    members: number;
  };
}

// ── Campaign Member ─────────────────────────────────────

export interface CampaignMember {
  id: string;
  campaignId: string;
  userId: string;
  username: string;
  role: MemberRole;
  joinedAt: string;
}

// ── Invitation ──────────────────────────────────────────

export interface Invitation {
  id: string;
  campaignId: string;
  invitedUserId: string | null;
  invitedEmail: string | null;
  inviterId: string;
  inviterName: string;
  status: InvitationStatus;
  createdAt: string;
  respondedAt: string | null;
  campaign?: Campaign;
}

// ── Contribution ────────────────────────────────────────

export interface Contribution {
  id: string;
  campaignId: string;
  userId: string;
  username: string;
  amount: number;
  message: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

// ── Request Payloads ────────────────────────────────────

export interface CreateCampaignPayload {
  title: string;
  description: string;
  isPrivate?: boolean;
  goalAmount?: number;
  goalVisible?: boolean;
  deadline?: string;
  imageUrl?: string;
}

export interface UpdateCampaignPayload {
  title?: string;
  description?: string;
  isPrivate?: boolean;
  goalAmount?: number;
  goalVisible?: boolean;
  deadline?: string;
}

export interface ContributePayload {
  amount: number;
  message?: string;
  isAnonymous?: boolean;
}

export interface InvitePayload {
  userId?: string;
  email?: string;
}

// ── Sort Options ────────────────────────────────────────

export type CampaignSortField = 'createdAt' | 'currentAmount' | 'deadline' | 'goalAmount';
export type SortOrder = 'ASC' | 'DESC';

// ── Query Parameters ────────────────────────────────────

export interface ListCampaignsParams {
  [key: string]: string | number | boolean | undefined;
  search?: string;
  status?: CampaignStatus;
  sortBy?: CampaignSortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
  // Advanced filters
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
  isPrivate?: boolean;
}

export interface ListMembersParams {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
}

// ── Response Types ──────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CampaignsListResponse {
  campaigns: Campaign[];
  meta: PaginationMeta;
}

export interface MembersListResponse {
  members: CampaignMember[];
  meta: PaginationMeta;
}

export interface ContributeResponse {
  success: boolean;
  currentAmount: number;
}

// ── Helper Types ────────────────────────────────────────

export interface CampaignWithMembers extends Campaign {
  members: CampaignMember[];
}

export interface UserCampaignRole {
  isMember: boolean;
  isOwner: boolean;
  isSudo: boolean;
  role: MemberRole | null;
}

// Calcula o papel do utilizador numa campanha
export function getUserCampaignRole(campaign: Campaign, userId: string): UserCampaignRole {
  const isOwner = campaign.ownerId === userId;
  const member = campaign.members?.find(m => m.userId === userId);
  const isMember = !!member;
  const isSudo = member?.role === 'SUDO' || isOwner;

  return {
    isMember,
    isOwner,
    isSudo,
    role: member?.role ?? null,
  };
}

// Calcula a percentagem de progresso
export function getCampaignProgress(campaign: Campaign): number {
  if (!campaign.goalAmount || campaign.goalAmount <= 0) return 0;
  return Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100);
}

// Verifica se a campanha está ativa
export function isCampaignActive(campaign: Campaign): boolean {
  if (campaign.status !== 'ACTIVE') return false;
  if (campaign.deadline) {
    return new Date(campaign.deadline) > new Date();
  }
  return true;
}
