/**
 * React Query Configuration
 * Configuração centralizada do client de cache
 * 
 * Estratégias de Cache:
 * - Dados estáticos (membros, textos): staleTime longo + force-cache em server
 * - Dados em tempo real (saldo): staleTime curto + refetchOnWindowFocus
 * - Interações do utilizador (filtros, pesquisa): staleTime médio + placeholderData
 */

import { QueryClient } from '@tanstack/react-query';

// Constantes de tempo de cache (em milissegundos)
export const CACHE_TIMES = {
  // Dados críticos/tempo real (saldo, notificações)
  REALTIME: {
    staleTime: 1 * 60 * 1000,  // 1 minuto
    gcTime: 3 * 60 * 1000,     // 3 minutos
  },
  // Dados frequentemente atualizados (contribuições, transações)
  SHORT: {
    staleTime: 2 * 60 * 1000,  // 2 minutos
    gcTime: 5 * 60 * 1000,     // 5 minutos
  },
  // Dados padrão (listas, detalhes)
  MEDIUM: {
    staleTime: 5 * 60 * 1000,  // 5 minutos
    gcTime: 10 * 60 * 1000,    // 10 minutos
  },
  // Dados semi-estáticos (perfis, configurações)
  LONG: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 20 * 60 * 1000,    // 20 minutos
  },
  // Dados praticamente estáticos (textos, membros fixos)
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000,    // 1 hora
  },
} as const;

export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Dados não são "stale" por 5 minutos (padrão MEDIUM)
        staleTime: CACHE_TIMES.MEDIUM.staleTime,
        
        // Cache mantido por 10 minutos mesmo se não estiver em uso
        gcTime: CACHE_TIMES.MEDIUM.gcTime,
        
        // Não revalidar quando a janela recupera foco (evita requisições extras)
        // Hooks específicos podem override (ex: useWalletBalance)
        refetchOnWindowFocus: false,
        
        // Revalidar quando a conexão é restaurada
        refetchOnReconnect: true,
        
        // Não revalidar quando o componente monta (já tem cache)
        refetchOnMount: false,
        
        // Número máximo de tentativas de erro
        retry: 2,
        
        // Delay exponencial entre tentativas: 1000, 2000, 4000ms
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Não tentar novamente em caso de erro em mutations
        retry: 1,
      },
    },
  });
};
