/**
 * Hook para Notificações com WebSocket
 * Gerencia notificações REST + tempo real via Socket.io
 * Funciona com graceful fallback se WebSocket não estiver disponível
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { ApiClient } from '@/utils/api/api';
import {
  Notification,
} from '@/types/notifications';
import {
  listNotifications,
  listUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/utils/notifications';

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  connected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotif: (notificationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL?.trim() || '';
const WS_ENABLED = process.env.NEXT_PUBLIC_WS_ENABLED === 'true';
const INVITE_DEBUG = process.env.NEXT_PUBLIC_DEBUG_INVITES === 'true';

function pickMetadataKeys(notification: Notification): string[] {
  return Object.keys((notification.metadata || {}) as Record<string, unknown>).sort();
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Fetch inicial de notificações
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [allNotifs, unreadNotifs] = await Promise.all([
        listNotifications({ page: 1, limit: 50 }).catch(() => ({ notifications: [], meta: { total: 0, page: 1, limit: 50, pages: 0 } })),
        listUnreadNotifications({ page: 1, limit: 100 }).catch(() => ({ notifications: [], meta: { total: 0, page: 1, limit: 100, pages: 0 } })),
      ]);

      if (INVITE_DEBUG) {
      }

      setNotifications(allNotifs.notifications);
      setUnreadCount(unreadNotifs.meta.total);
    } catch (err: any) {
      setError(null); // Não mostrar erro ao utilizador
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Conectar ao WebSocket (apenas se habilitado)
  useEffect(() => {
    const token = ApiClient.getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Fetch inicial sempre
    fetchNotifications();

    // WebSocket opcional
    if (!WS_ENABLED) {
      return;
    }

    if (!WS_URL) {
      return;
    }

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    try {
      // Conectar ao WebSocket
      const socket = io(`${WS_URL}/notifications`, {
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 5000,
      });

      socket.on('connect', () => {
        setConnected(true);
        reconnectAttempts = 0;
      });

      socket.on('notification', (notification: Notification) => {
        // Adicionar ao topo da lista
        setNotifications(prev => [notification, ...prev]);
        
        // Incrementar contador se não lida
        if (!notification.read) {
          setUnreadCount(prev => prev + 1);
        }
      });

      socket.on('connect_error', (err: any) => {
        reconnectAttempts++;
        if (reconnectAttempts === 1) {
        }
        setConnected(false);
        
        // Após tentativas máximas, desiste silenciosamente
        if (reconnectAttempts >= maxReconnectAttempts) {
          socket.disconnect();
        }
      });

      socket.on('disconnect', (reason: string) => {
        setConnected(false);
        if (reason !== 'io client disconnect') {
        }
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      setConnected(false);
    }
  }, [fetchNotifications]);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      throw new Error(err?.message || 'Erro ao marcar como lida');
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      
      setUnreadCount(0);
    } catch (err: any) {
      throw new Error(err?.message || 'Erro ao marcar todas como lidas');
    }
  }, []);

  // Eliminar notificação
  const deleteNotif = useCallback(async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      
      const wasUnread = notifications.find(n => n.id === notificationId)?.read === false;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      throw new Error(err?.message || 'Erro ao eliminar notificação');
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    connected,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    refetch: fetchNotifications,
  };
}
