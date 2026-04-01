import { useCallback, useEffect, useState } from 'react';
import type { Transacao } from '@/types';
import { getCarteiraData, getWalletBalance } from '@/utils/wallet';

interface CarteiraData {
  saldo: number;
  moeda: string;
  usuarioId: string | null;
  saldoPendente: number;
  transacoes: Transacao[];
}

/**
 * Hook para gestão de estado da carteira.
 *
 * O backend retorna balance como string (e.g., "150"), que é normalizado
 * para número via toNumber() em getWalletBalance() e getCarteiraData().
 *
 * Fluxo de topup:
 * 1. POST /wallet/topup → retorna status PENDING
 * 2. Backend auto-confirma em ~1.5s → status COMPLETED + DEPOSIT transaction
 * 3. atualizarSaldo() chamado no polling de app/(app)/carteira/page.tsx
 * 4. Balance atualiza imediatamente (toNumber já trata string)
 * 5. Transações sincronizam via getCarteiraData() se necessário
 */
export function useCarteira() {
  const [carteira, setCarteira] = useState<CarteiraData>({
    saldo: 0,
    moeda: 'VAKS',
    usuarioId: null,
    saldoPendente: 0,
    transacoes: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletHookLog = (step: string, payload?: unknown) => {
    if (payload !== undefined) {
      return;
    }
  };

  const atualizarCarteira = useCallback(async () => {
    walletHookLog('atualizarCarteira:start');
    setLoading(true);
    setError(null);
    try {
      const data = await getCarteiraData();
      walletHookLog('atualizarCarteira:success', {
        saldo: data.saldo,
        saldoPendente: data.saldoPendente,
        transacoes: data.transacoes.length,
      });
      setCarteira({
        saldo: data.saldo,
        moeda: 'VAKS',
        usuarioId: data.usuarioId,
        saldoPendente: data.saldoPendente,
        transacoes: data.transacoes,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar carteira';
      setError(message);
      setCarteira({
        saldo: 0,
        moeda: 'VAKS',
        usuarioId: null,
        saldoPendente: 0,
        transacoes: [],
      });
    } finally {
      setLoading(false);
      walletHookLog('atualizarCarteira:done');
    }
  }, []);

  const atualizarSaldo = useCallback(async () => {
    walletHookLog('atualizarSaldo:start');
    try {
      const data = await getWalletBalance();
      walletHookLog('atualizarSaldo:success', data);
      setCarteira((prev) => ({
        ...prev,
        saldo: data.balance,
        moeda: data.currency || 'VAKS',
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar saldo';
      setError(message);
    }
  }, []);

  // Load wallet data on mount
  useEffect(() => {
    atualizarCarteira();
  }, []); // ← Remove atualizarCarteira das dependências para evitar loop

  return { carteira, loading, error, atualizarCarteira, atualizarSaldo };
}
