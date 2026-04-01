/**
 * API Client para Notificações
 * Funções para consumir a API de notificações REST
 */

import { api } from '@/utils/api/api';
import {
  Notification,
  NotificationsListResponse,
  ListNotificationsParams,
  MarkAllReadResponse,
  DeleteNotificationResponse,
  WebSocketInfo,
} from '@/types/notifications';

// ──── NOTIFICAÇÕES ──────────────────────────────────────

/**
 * Obter informações de conexão WebSocket
 */
export async function getWebSocketInfo(): Promise<WebSocketInfo> {
  return api.get<WebSocketInfo>('/notifications/ws');
}

/**
 * Listar todas as notificações (lidas e não lidas)
 */
export async function listNotifications(
  params?: ListNotificationsParams
): Promise<NotificationsListResponse> {
  return api.get<NotificationsListResponse>('/notifications', { params: params as Record<string, string | number | boolean | null | undefined> });
}

/**
 * Listar apenas notificações não lidas
 */
export async function listUnreadNotifications(
  params?: ListNotificationsParams
): Promise<NotificationsListResponse> {
  return api.get<NotificationsListResponse>('/notifications/unread', { params: params as Record<string, string | number | boolean | null | undefined> });
}

/**
 * Marcar uma notificação específica como lida
 */
export async function markNotificationAsRead(notificationId: string): Promise<Notification> {
  return api.put<Notification>(`/notifications/${notificationId}/read`);
}

/**
 * Marcar todas as notificações como lidas
 */
export async function markAllNotificationsAsRead(): Promise<MarkAllReadResponse> {
  return api.put<MarkAllReadResponse>('/notifications/read-all');
}

/**
 * Eliminar uma notificação
 */
export async function deleteNotification(notificationId: string): Promise<DeleteNotificationResponse> {
  return api.delete<DeleteNotificationResponse>(`/notifications/${notificationId}`);
}

// ──── TYPES RE-EXPORT ───────────────────────────────────

export type {
  Notification,
  NotificationType,
  NotificationMetadata,
  NotificationsListResponse,
  ListNotificationsParams,
  PaginationMeta,
} from '@/types/notifications';
