'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { ApiClient, api } from '@/utils/api/api';
import {
  DEFAULT_PRIVACY_SETTINGS,
  PrivacySettings,
  readMockPrivacySettings,
  writeMockPrivacySettings,
} from '@/utils/privacy/mockPrivacy';

const USER_KEY = 'vaks_user';
const AVATAR_KEY = 'vaks:avatar';
const DEBUG_LOGIN = process.env.NEXT_PUBLIC_DEBUG_LOGIN === 'true';
const HEARTBEAT_INTERVAL = 30000; // 30 segundos

// ── Types ───────────────────────────────────────────────

interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user?: unknown) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  privacySettings: PrivacySettings | null;
  setPrivacySettings: (settings: PrivacySettings | null) => void;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    if (typeof window === 'undefined') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(padded);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeUserPayload(payload: unknown): User | null {
  if (!payload || typeof payload !== 'object') return null;

  const data = payload as Record<string, unknown>;
  const name =
    asString(data.name) ||
    asString(data.nome) ||
    [asString(data.firstName), asString(data.lastName)].filter(Boolean).join(' ') ||
    undefined;
  const usernameFromName = name?.replace(/\s+/g, '_').toLowerCase();
  const emailRaw = asString(data.email) || asString(data.mail);
  const usernameFromEmail = emailRaw?.split('@')[0];
  const username =
    asString(data.username) ||
    asString(data.login) ||
    asString(data.preferred_username) ||
    asString(data.nickname) ||
    usernameFromName ||
    usernameFromEmail;
  const email = emailRaw;
  const id =
    asString(data.id) ||
    asString(data.userId) ||
    asString(data.sub) ||
    asString(data.uid) ||
    email;
  const avatarUrl =
    asString(data.avatarUrl) ||
    asString(data.avatar) ||
    asString(data.photoUrl) ||
    asString(data.photoURL) ||
    asString(data.picture) ||
    asString(data.image);

  if (!id || !email || !username) return null;

  return {
    id,
    email,
    username,
    name,
    avatarUrl,
  };
}

// ── Context ─────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [privacySettings, setPrivacySettingsState] = useState<PrivacySettings | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const setPrivacySettings = useCallback((settings: PrivacySettings | null) => {
    setPrivacySettingsState(settings);

    if (!settings || !user?.id) return;
    writeMockPrivacySettings(user.id, settings);
  }, [user?.id]);

  // Enviar heartbeat para manter status online
  const sendHeartbeat = useCallback(async () => {
    if (!ApiClient.isAuthenticated()) return;
    try {
      await api.post('/users/heartbeat', {
        userId: user?.id,
        username: user?.username,
        email: user?.email,
      });
    } catch {
      // Silenciosamente ignora erros de heartbeat (endpoint pode não existir)
    }
  }, [user?.email, user?.id, user?.username]);

  // Iniciar heartbeat quando autenticado
  useEffect(() => {
    if (isAuthenticated) {
      // Enviar heartbeat imediatamente
      sendHeartbeat();
      
      // Configurar intervalo para enviar heartbeat a cada 30 segundos
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
      
      // Enviar heartbeat quando a janela ganha foco (utilizador voltou)
      const handleFocus = () => sendHeartbeat();
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          sendHeartbeat();
        }
      };
      
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isAuthenticated, sendHeartbeat]);

  const withStoredAvatar = useCallback((userData: User | null): User | null => {
    if (!userData || typeof window === 'undefined') return userData;

    const storedAvatar = localStorage.getItem(AVATAR_KEY);
    if (!storedAvatar) return userData;
    if (userData.avatarUrl) return userData;

    return { ...userData, avatarUrl: storedAvatar };
  }, []);

  const setUser = useCallback((userData: User | null) => {
    const normalizedUser = withStoredAvatar(userData);
    setUserState(normalizedUser);

    if (typeof window === 'undefined') return;
    if (normalizedUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [withStoredAvatar]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get<{
        success?: boolean;
        data?: Record<string, unknown> & { user?: Record<string, unknown> };
      }>('/auth/me');

      const rawUser = response?.data?.user || response?.data;
      const normalizedUser = normalizeUserPayload(rawUser);
      setUser(normalizedUser);

      if (normalizedUser?.id) {
        setPrivacySettingsState(readMockPrivacySettings(normalizedUser.id));
      } else {
        setPrivacySettingsState(DEFAULT_PRIVACY_SETTINGS);
      }
    } catch {
      // Não limpar sessão aqui para evitar logout falso por falha transitória.
    }
  }, [setUser]);

  // Check for existing token on mount
  useEffect(() => {
    const hasToken = ApiClient.isAuthenticated();
    setIsAuthenticated(hasToken);

    if (typeof window !== 'undefined') {
      if (!hasToken) {
        localStorage.removeItem(USER_KEY);
        setPrivacySettingsState(null);
      } else {
        const persistedUser = localStorage.getItem(USER_KEY);
        if (persistedUser) {
          try {
            const parsed = JSON.parse(persistedUser) as User;
            const normalized = withStoredAvatar(parsed);
            setUserState(normalized);
            if (normalized) {
              localStorage.setItem(USER_KEY, JSON.stringify(normalized));
              setPrivacySettingsState(readMockPrivacySettings(normalized.id));
            }
          } catch {
            localStorage.removeItem(USER_KEY);
          }
        } else {
          void fetchCurrentUser();
        }
      }

      const handleAuthLogout = () => {
        setIsAuthenticated(false);
        setUserState(null);
        setPrivacySettingsState(DEFAULT_PRIVACY_SETTINGS);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(AVATAR_KEY);
      };

      const handleAvatarUpdated = (event: Event) => {
        const customEvent = event as CustomEvent<{ avatarUrl?: string }>;
        const avatarUrl = customEvent.detail?.avatarUrl;
        if (!avatarUrl) return;

        setUserState((prev) => {
          if (!prev) return prev;
          const next = { ...prev, avatarUrl };
          localStorage.setItem(USER_KEY, JSON.stringify(next));
          return next;
        });
      };

      const handleStorage = (event: StorageEvent) => {
        if (event.key !== AVATAR_KEY || !event.newValue) return;

        setUserState((prev) => {
          if (!prev) return prev;
          const next = { ...prev, avatarUrl: event.newValue || undefined };
          localStorage.setItem(USER_KEY, JSON.stringify(next));
          return next;
        });
      };

      window.addEventListener('auth:logout', handleAuthLogout);
      window.addEventListener('avatar:updated', handleAvatarUpdated as EventListener);
      window.addEventListener('storage', handleStorage);

      setIsLoading(false);

      return () => {
        window.removeEventListener('auth:logout', handleAuthLogout);
        window.removeEventListener('avatar:updated', handleAvatarUpdated as EventListener);
        window.removeEventListener('storage', handleStorage);
      };
    }

    setIsLoading(false);

    // TODO: Fetch user profile if token exists
  }, [fetchCurrentUser, withStoredAvatar]);

  const login = useCallback((token: string, userData?: unknown) => {
    ApiClient.setToken(token);
    setIsAuthenticated(true);
    const normalizedUser = normalizeUserPayload(userData) || normalizeUserPayload(decodeTokenPayload(token));
    if (normalizedUser) {
      setUser(normalizedUser);
      setPrivacySettingsState(readMockPrivacySettings(normalizedUser.id));
      void fetchCurrentUser();
      return;
    }
    setPrivacySettingsState(DEFAULT_PRIVACY_SETTINGS);
    void fetchCurrentUser();
  }, [fetchCurrentUser, setUser]);

  const logout = useCallback(() => {
    ApiClient.removeToken();
    setIsAuthenticated(false);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AVATAR_KEY);
    }
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }, [setUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setUser,
    privacySettings,
    setPrivacySettings,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
