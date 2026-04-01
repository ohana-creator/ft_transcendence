/**
 * Componente: HistoricoContribuicoes
 * Lista o histórico de contribuições de uma vaquinha
 * Exibe doadores, valores e mensagens
 */

'use client';

import { Contribuicao } from '@/types';
import { Heart, MessageCircle } from 'lucide-react';
import { useI18n } from '@/locales';

interface HistoricoContribuicoesProps {
  contribuicoes: Contribuicao[];
}

export default function HistoricoContribuicoes({ contribuicoes }: HistoricoContribuicoesProps) {
  const { t } = useI18n();
  const dt = t.vaquinhas.detalhe;

  if (!contribuicoes || contribuicoes.length === 0) {
    return (
      <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-lg p-6 border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15">
        <h3 className="text-xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-4">
          {dt.historico_titulo}
        </h3>
        <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-center py-8">
          {dt.nenhuma_contribuicao}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-lg p-6 border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15">
      <h3 className="text-xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-6 flex items-center gap-2">
        <Heart className="w-5 h-5 text-vaks-light-purple-button dark:text-vaks-dark-purple-button" />
        {dt.historico_titulo} ({contribuicoes.length})
      </h3>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {contribuicoes.map((contrib) => (
          <div
            key={contrib.id}
            className="border-l-4 border-vaks-light-purple-button dark:border-vaks-dark-purple-button bg-vaks-light-input dark:bg-vaks-dark-input p-4 rounded-r-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {contrib.anonimo ? dt.anonimo : contrib.usuario.nome}
                </p>
                <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                  {new Date(contrib.criadoEm).toLocaleDateString('pt-AO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                +{contrib.valor.toFixed(2)} VAKS
              </span>
            </div>

            {contrib.mensagem && (
              <div className="flex items-start gap-2 mt-3 pt-3 border-t border-vaks-light-stroke/10 dark:border-vaks-dark-stroke/10">
                <MessageCircle className="w-4 h-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5 shrink-0" />
                <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt italic">
                  &ldquo;{contrib.mensagem}&rdquo;
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
