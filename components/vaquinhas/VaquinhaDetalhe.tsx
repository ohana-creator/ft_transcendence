/**
 * Componente: VaquinhaDetalhe
 * Exibe informações detalhadas de uma vaquinha
 * Inclui imagem, descrição completa, progresso e criador
 */

'use client';

import Image from 'next/image';
import { Vaquinha } from '@/types';
import ProgressBar from './ProgressBar';
import { Calendar, User, Target, Heart } from 'lucide-react';
import { useI18n } from '@/locales';

interface VaquinhaDetalheProps {
  vaquinha: Vaquinha;
}

export default function VaquinhaDetalhe({ vaquinha }: VaquinhaDetalheProps) {
  const { t } = useI18n();
  const dt = t.vaquinhas.detalhe;
  const progresso = (vaquinha.arrecadado / vaquinha.meta) * 100;
  const faltam = vaquinha.meta - vaquinha.arrecadado;

  return (
    <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-lg overflow-hidden border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15">
      {/* Banner da vaquinha */}
      {vaquinha.imagemUrl && (
        <div className="relative h-72 sm:h-96 w-full">
          <Image
            src={vaquinha.imagemUrl}
            alt={vaquinha.titulo}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}

      <div className="p-6 sm:p-8">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="text-xs font-semibold text-vaks-light-purple-button dark:text-vaks-dark-purple-button bg-vaks-light-input dark:bg-vaks-dark-input px-3 py-1 rounded-full">
              {vaquinha.categoria}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mt-4 mb-2">
              {vaquinha.titulo}
            </h1>
          </div>
          {!vaquinha.publica && (
            <span className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold">
              {dt.privada}
            </span>
          )}
        </div>

        {/* Criador e data */}
        <div className="flex items-center gap-6 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-6">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{dt.criado_por} <strong className="text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{vaquinha.criador.nome}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(vaquinha.criadoEm).toLocaleDateString('pt-AO')}</span>
          </div>
        </div>

        {/* Progresso */}
        <div className="bg-vaks-light-input dark:bg-vaks-dark-input rounded-2xl p-6 mb-6">
          <ProgressBar progress={progresso} className="mb-4" size="lg" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {vaquinha.arrecadado.toFixed(2)}
              </p>
              <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{dt.vaks_arrecadados}</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-vaks-light-purple-button dark:text-vaks-dark-purple-button">
                {vaquinha.meta.toFixed(2)}
              </p>
              <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{dt.meta}</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-500">
                {faltam > 0 ? faltam.toFixed(2) : '0.00'}
              </p>
              <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{dt.faltam}</p>
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-4">{dt.sobre}</h2>
          <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed whitespace-pre-wrap">
            {vaquinha.descricao}
          </p>
        </div>

        {/* Beneficiário se houver */}
        {vaquinha.beneficiario && (
          <div className="mt-6 p-4 bg-vaks-light-input dark:bg-vaks-dark-input rounded-xl">
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              <strong className="text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{dt.beneficiario}:</strong> {vaquinha.beneficiario}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
