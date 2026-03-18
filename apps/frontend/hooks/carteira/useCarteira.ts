import { useState } from 'react';
import type { Transacao, Carteira as CarteiraType } from '@/types';

interface CarteiraData {
  saldo: number;
  moeda: string;
  usuarioId: string | null;
  saldoPendente: number;
  transacoes: Transacao[];
}

export function useCarteira() {
  const [carteira, setCarteira] = useState<CarteiraData>({
    saldo: 0,
    moeda: 'VAKS',
    usuarioId: null,
    saldoPendente: 0,
    transacoes: [],
  });
  const [loading, setLoading] = useState(false);

  const atualizarCarteira = async () => {
    setLoading(true);
    // TODO: Implementar
    setLoading(false);
  };

  return { carteira, loading, atualizarCarteira };
}
