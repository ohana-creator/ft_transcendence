/**
 * Componente: RealTimeNotification
 * Exibe notificações em tempo real de novas contribuições, metas atingidas, etc.
 * Utiliza WebSocket para receber atualizações
 */

'use client';

import { useEffect, useState } from 'react';
import { NotificacaoRealTime } from '@/types';
import { useWebSocket } from '@/hooks/websocket';
import { X, Heart, Target, ArrowDownLeft } from 'lucide-react';

export default function RealTimeNotification() {
  const [notificacoes, setNotificacoes] = useState<NotificacaoRealTime[]>([]);
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && typeof lastMessage === 'string') {
      // TODO: Parse da mensagem WebSocket
      try {
        const notificacao: NotificacaoRealTime = JSON.parse(lastMessage);
        setNotificacoes((prev) => [notificacao, ...prev].slice(0, 5)); // Manter apenas 5 notificações

        // Auto-remover após 5 segundos
        setTimeout(() => {
          setNotificacoes((prev) => prev.filter((n) => n !== notificacao));
        }, 5000);
      } catch (error) {
      }
    }
  }, [lastMessage]);

  const getIcon = (tipo: NotificacaoRealTime['tipo']) => {
    switch (tipo) {
      case 'nova_contribuicao':
        return <Heart className="w-5 h-5 fill-success text-success" />;
      case 'meta_atingida':
        return <Target className="w-5 h-5 text-warning" />;
      case 'transferencia_recebida':
        return <ArrowDownLeft className="w-5 h-5 text-info" />;
    }
  };

  const removeNotification = (notificacao: NotificacaoRealTime) => {
    setNotificacoes((prev) => prev.filter((n) => n !== notificacao));
  };

  if (notificacoes.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notificacoes.map((notificacao, index) => (
        <div
          key={`${notificacao.tipo}-${notificacao.timestamp}-${index}`}
          className="bg-white shadow-xl rounded-lg p-4 flex items-start gap-3 animate-slide-in border-l-4 border-vaks-primary"
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(notificacao.tipo)}
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-semibold text-vaks-primary">
              {notificacao.mensagem}
            </p>
            {notificacao.contribuicao && (
              <p className="text-xs text-vaks-blue-charcoal mt-1">
                +{notificacao.contribuicao.valor.toFixed(2)} VAKS
              </p>
            )}
          </div>

          <button
            onClick={() => removeNotification(notificacao)}
            className="flex-shrink-0 text-vaks-blue-charcoal hover:text-vaks-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
