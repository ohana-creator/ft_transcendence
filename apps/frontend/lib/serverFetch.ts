/**
 * Server-side Fetch Utilities
 * Utilitários de fetch para Server Components com estratégias de cache
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type CacheStrategy = 
  | 'force-cache'      // Dados estáticos (membros, textos, configurações)
  | 'no-store'         // Dados em tempo real (nunca cache)
  | 'revalidate';      // Cache com revalidação periódica

interface FetchOptions {
  strategy: CacheStrategy;
  revalidateSeconds?: number;
  tags?: string[];
}

interface ServerFetchConfig extends RequestInit {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

/**
 * Fetch para dados estáticos (force-cache)
 * Use para: configurações, textos, membros estáticos
 */
export async function fetchStatic<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    cache: 'force-cache',
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch para dados em tempo real (no-store)
 * Use para: saldo da carteira, notificações, dados críticos
 */
export async function fetchRealTime<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    cache: 'no-store',
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch com revalidação periódica
 * Use para: listas de campanhas, dados que mudam periodicamente
 */
export async function fetchWithRevalidate<T>(
  endpoint: string,
  revalidateSeconds: number = 60,
  options?: RequestInit
): Promise<T> {
  const config: ServerFetchConfig = {
    ...options,
    next: {
      revalidate: revalidateSeconds,
    },
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch com tags para invalidação on-demand
 * Use para: dados que precisam ser invalidados manualmente via revalidateTag()
 */
export async function fetchWithTags<T>(
  endpoint: string,
  tags: string[],
  revalidateSeconds?: number,
  options?: RequestInit
): Promise<T> {
  const config: ServerFetchConfig = {
    ...options,
    next: {
      tags,
      ...(revalidateSeconds !== undefined && { revalidate: revalidateSeconds }),
    },
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch genérico com estratégia configurável
 */
export async function serverFetch<T>(
  endpoint: string,
  { strategy, revalidateSeconds = 60, tags }: FetchOptions,
  options?: RequestInit
): Promise<T> {
  let config: ServerFetchConfig = { ...options };
  
  switch (strategy) {
    case 'force-cache':
      config.cache = 'force-cache';
      break;
    case 'no-store':
      config.cache = 'no-store';
      break;
    case 'revalidate':
      config.next = {
        revalidate: revalidateSeconds,
        ...(tags && { tags }),
      };
      break;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Fetch autenticado para Server Components
 * Use quando precisar passar o token JWT do servidor
 */
export async function fetchAuthenticated<T>(
  endpoint: string,
  token: string,
  { strategy, revalidateSeconds, tags }: FetchOptions,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  
  return serverFetch<T>(
    endpoint,
    { strategy, revalidateSeconds, tags },
    { ...options, headers }
  );
}

// Constantes para tempos de revalidação comuns
export const REVALIDATE_TIMES = {
  /** 1 minuto - dados que mudam frequentemente */
  FREQUENT: 60,
  /** 5 minutos - dados semi-estáticos */
  MODERATE: 300,
  /** 1 hora - dados que mudam raramente */
  RARE: 3600,
  /** 24 horas - dados praticamente estáticos */
  STATIC: 86400,
} as const;

// Tags comuns para invalidação
export const CACHE_TAGS = {
  CAMPAIGNS: 'campaigns',
  CAMPAIGN_DETAIL: (id: string) => `campaign-${id}`,
  WALLET: 'wallet',
  NOTIFICATIONS: 'notifications',
  USER_PROFILE: 'user-profile',
} as const;
