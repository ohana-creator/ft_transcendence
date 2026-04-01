/**
 * Tipos para API de Notificações
 * Baseado na documentação notifications-api.md
 */

// ── Enums ───────────────────────────────────────────────

export type NotificationType =
  | 'CAMPAIGN_CONTRIBUTION'    // Alguém contribuiu para uma campanha
  | 'CAMPAIGN_INVITE'           // Convite para participar numa campanha
  | 'WALLET_TRANSFER_SENT'      // Transferência VAKS enviada
  | 'WALLET_TRANSFER_RECEIVED'  // Transferência VAKS recebida
  | 'CAMPAIGN_GOAL_REACHED'     // Campanha atingiu objetivo
  | 'CAMPAIGN_CLOSED'           // Campanha foi fechada/cancelada
  | 'MEMBER_PROMOTED';          // Promovido a SUDO numa campanha

// ── Notification ────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: NotificationMetadata;
  read: boolean;
  createdAt: string;
}

// ── Metadata por Tipo ───────────────────────────────────

export type NotificationMetadata =
  | CampaignContributionMetadata
  | CampaignInviteMetadata
  | WalletTransferMetadata
  | CampaignGoalReachedMetadata
  | CampaignClosedMetadata
  | MemberPromotedMetadata
  | Record<string, any>; // Fallback para metadata genérica

export interface CampaignContributionMetadata {
  campaignId: string;
  campaignTitle: string;
  contributorId: string;
  contributorUsername: string;
  amount: number;
}

export interface CampaignInviteMetadata {
  campaignId: string;
  campaignTitle: string;
  inviterId: string;
  inviterUsername: string;
}

export interface WalletTransferMetadata {
  transactionId: string;
  senderId?: string;
  senderUsername?: string;
  recipientId?: string;
  recipientUsername?: string;
  amount: number;
}

export interface CampaignGoalReachedMetadata {
  campaignId: string;
  campaignTitle: string;
  goalAmount: number;
  currentAmount: number;
}

export interface CampaignClosedMetadata {
  campaignId: string;
  campaignTitle: string;
  reason?: string;
}

export interface MemberPromotedMetadata {
  campaignId: string;
  campaignTitle: string;
}

// ── Query Parameters ────────────────────────────────────

export interface ListNotificationsParams {
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

export interface NotificationsListResponse {
  notifications: Notification[];
  meta: PaginationMeta;
}

export interface MarkAllReadResponse {
  updated: number;
}

export interface DeleteNotificationResponse {
  deleted: boolean;
}

// ── WebSocket Types ─────────────────────────────────────

export interface WebSocketInfo {
  namespace: string;
  event: string;
  auth: {
    method: string;
    handshakeAuth: string;
    handshakeHeader: string;
  };
  exampleClient: string;
}
