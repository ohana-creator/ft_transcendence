/**
 * React Query Hooks para Carteira (Wallet)
 * Cache otimizado para saldo, transações e operações
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api/api';
import {
  getCarteiraData,
  getWalletBalance,
  getWalletTransactionById,
  transferirVaks,
  carregarCarteira,
} from '@/utils/wallet';
import { ApiError } from '@/utils/api/api';
import { toast } from '@/utils/toast';

/**
 * Query para obter saldo da carteira com cache curto (1 minuto)
 * Saldo é crítico, então cache é menor que outros endpoints
 *
 * @example
 * ```tsx
 * const { data: balance, isLoading } = useWalletBalance();
 * ```
 */
export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: async () => {
      return getWalletBalance();
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 3 * 60 * 1000, // 3 minutos
    refetchOnWindowFocus: true, // Always refetch when window regains focus
  });
}

/**
 * Query para obter dados completos da carteira (saldo + transações)
 */
export function useCarteiraData() {
  return useQuery({
    queryKey: ['wallet', 'data'],
    queryFn: getCarteiraData,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: true,
  });
}

/**
 * Query para histórico de transações com cache de 5 minutos
 * Usa getCarteiraData que já inclui transações
 */
export function useWalletTransactionHistory(limit: number = 20, offset: number = 0) {
  return useQuery({
    queryKey: ['wallet', 'transactions', limit, offset],
    queryFn: async () => {
      const data = await getCarteiraData();
      // Aplicar paginação manualmente nas transações
      return data.transacoes.slice(offset, offset + limit);
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Mutation para criar topup
 * Não invalida automaticamente - retorna checkoutUrl para redirecionar
 */
export function useCreateTopup() {
  return useMutation({
    mutationFn: (amount: number) =>
      carregarCarteira({
        amountKzs: amount,
        method: 'referencia',
        mode: 'checkout',
      }),
    onSuccess: (data) => {
      toast.success('Redirecionando para checkout...');
    },
    onError: (error: ApiError) => {
      toast.error(`Erro ao criar topup: ${error.message}`);
    },
  });
}

/**
 * Mutation para confirmar status do topup (polling)
 * Invalida saldo após sucesso
 */
export function useConfirmTopupStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const tx = await getWalletTransactionById(transactionId);
      return tx.status;
    },
    onSuccess: (status) => {
      if (status === 'COMPLETED') {
        // Invalidar saldo para refetch imediato
        queryClient.invalidateQueries({
          queryKey: ['wallet', 'balance'],
        });

        queryClient.invalidateQueries({
          queryKey: ['wallet', 'data'],
        });

        toast.success('Saldo carregado com sucesso!');
      }
    },
  });
}

/**
 * Mutation para transferir VAKS via email/UUID
 * Invalida saldo e transações após sucesso
 */
export function useTransferVaks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ destinatario, amount, message }: {
      destinatario: string; // email ou UUID
      amount: number;
      message?: string;
    }) => transferirVaks({ 
      recipient: destinatario, 
      amount, 
      note: message 
    }),
    onSuccess: () => {
      // Invalidar dados financeiros
      queryClient.invalidateQueries({
        queryKey: ['wallet'],
      });

      toast.success('Transferência realizada com sucesso!');
    },
    onError: (error: ApiError) => {
      toast.error(`Erro na transferência: ${error.message}`);
    },
  });
}

/**
 * Custom hook que combina saldo + transações
 * Útil para dashboard da carteira
 */
export function useWalletDashboard() {
  const balance = useWalletBalance();
  const transactions = useWalletTransactionHistory(10, 0);

  return {
    balance: balance.data?.balance || 0,
    currency: balance.data?.currency || 'VAKS',
    transactions: transactions.data || [],
    isLoading: balance.isLoading || transactions.isLoading,
    error: balance.error || transactions.error,
    refetch: () => {
      balance.refetch();
      transactions.refetch();
    },
  };
}
