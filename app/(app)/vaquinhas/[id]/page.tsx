/**
 * Página: Detalhe da Vaquinha
 * Exibe informações detalhadas de uma vaquinha específica
 * Mostra progresso, histórico de doações e permite contribuições
 * Suporta vaquinhas públicas e privadas
 */

'use client';

import { use } from 'react';
import { useVaquinhaDetalhe } from '@/hooks/vaquinhas';
import { VaquinhaDetalhe, ContribuicaoForm, HistoricoContribuicoes } from '@/components/vaquinhas';
import { useI18n } from '@/locales';
import { VaquinhaNaoEncontrada } from '@/components/vaquinhas/vaquinha-nao-encontrada';
import { PageTransition } from '@/components';

export default function VaquinhaPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const { vaquinha, contribuicoes, loading, error } = useVaquinhaDetalhe(id);
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center">
        <p>{t.vaquinhas.detalhe.carregando}</p>
      </div>
    );
  }

  if (error || !vaquinha) {
    return (
      <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center">
        <VaquinhaNaoEncontrada />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      <PageTransition>
        <div className="container mx-auto px-4 py-8">
          {/* TODO: Implementar componente VaquinhaDetalhe */}
          <VaquinhaDetalhe vaquinha={vaquinha} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Formulário de contribuição */}
            <div className="lg:col-span-2">
              <ContribuicaoForm vaquinhaId={id} />
            </div>

            {/* Histórico de contribuições */}
            <div>
              <HistoricoContribuicoes contribuicoes={contribuicoes || []} />
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}