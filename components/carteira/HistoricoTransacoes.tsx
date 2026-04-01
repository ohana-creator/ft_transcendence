/**
 * Componente: HistoricoTransacoes
 * Lista o histórico de transações da carteira do usuário
 * Exibe tipo, valor, status e data de cada transação
 */

'use client';

import { useI18n } from '@/locales';
import { Transacao } from '@/types';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Heart, 
  Gift,
  Clock,
  CheckCircle2,
  XCircle,
  History
} from 'lucide-react';

interface HistoricoTransacoesProps {
  transacoes: Transacao[];
  onSelectTransacao?: (transacaoId: string) => void;
}

export default function HistoricoTransacoes({ transacoes, onSelectTransacao }: HistoricoTransacoesProps) {
  const { t } = useI18n();
  const c = t.paginas.carteira_pagina;
  const getIconByType = (tipo: Transacao['tipo']) => {
    switch (tipo) {
      case 'contribuicao':
        return <Heart className="w-5 h-5" />;
      case 'transferencia':
        return <ArrowUpRight className="w-5 h-5" />;
      case 'recebimento':
        return <ArrowDownLeft className="w-5 h-5" />;
      case 'cashback':
        return <Gift className="w-5 h-5" />;
    }
  };

  const getColorByType = (_tipo: Transacao['tipo']) => {
    return 'bg-white border-gray-100 text-gray-700';
  };

  const getIconColorByType = (_tipo: Transacao['tipo']) => {
    return 'bg-gray-100 text-gray-500';
  };

  const getStatusIcon = (status: Transacao['status']) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
      case 'pendente':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'falhou':
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTipoLabel = (tipo: Transacao['tipo']) => {
    return t.history.transaction_types[tipo] || tipo;
  };

  const getStatusLabel = (status: Transacao['status']) => {
    return t.history.status[status] || status;
  };

  if (!transacoes || transacoes.length === 0) {
    return (
      <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-lg p-12 border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-vaks-primary/10 rounded-full flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-vaks-light-main-txt dark:text-vaks-dark-main-txt" />
          </div>
          <h3 className="text-xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
            {c.nenhuma}
          </h3>
          <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {c.comece}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-lg p-6 border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-vaks-primary/10 p-2 rounded-lg">
          <History className="w-5 h-5 text-vaks-light-main-txt dark:text-vaks-dark-main-txt" />
        </div>
        <h3 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          {t.history.title}
        </h3>
        <span className="ml-auto text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt bg-vaks-platinum px-3 py-1 rounded-full">
          {transacoes.length}
        </span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {transacoes.map((transacao) => (
          <div
            key={transacao.id}
            onClick={() => onSelectTransacao?.(transacao.id)}
            className={`${getColorByType(transacao.tipo)} border p-4 rounded-lg hover:bg-gray-50 transition-colors ${onSelectTransacao ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-start justify-between gap-4">
              {/* Ícone e Detalhes */}
              <div className="flex items-start gap-4 flex-1">
                <div className={`${getIconColorByType(transacao.tipo)} p-3 rounded-lg flex-shrink-0 mt-0.5`}>
                  {getIconByType(transacao.tipo)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm">
                      {getTipoLabel(transacao.tipo)}
                    </p>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(transacao.status)}
                      <span className="text-xs font-semibold text-gray-600">
                        {getStatusLabel(transacao.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 truncate">
                    {transacao.descricao}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {transacao.criadoEm.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-base font-bold text-gray-800">
                  {transacao.tipo === 'recebimento' || transacao.tipo === 'cashback' ? '+' : '−'}
                  {transacao.valor.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">VAKS</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ver mais */}
      {transacoes.length >= 10 && (
        <button className="w-full mt-4 py-2 text-vaks-primary font-semibold hover:bg-vaks-primary/5 rounded-lg transition-colors">
          {t.common.loading}
        </button>
      )}
    </div>
  );
}
