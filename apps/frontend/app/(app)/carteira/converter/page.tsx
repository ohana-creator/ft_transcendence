'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRightLeft, Info, TrendingUp, Clock,
  RefreshCw, ChevronDown,
} from 'lucide-react';
import { vaksToKzs, kzsToVaks } from '@/utils/currency';
import { useI18n } from '@/locales';
import 'flag-icons/css/flag-icons.min.css';

const MOEDAS = [
  { codigo: 'KZS', nome: 'Kwanza Angolano', flag: 'fi-ao', taxa: 1000 },
  { codigo: 'USD', nome: 'Dólar Americano', flag: 'fi-us', taxa: 0.92 },
  { codigo: 'EUR', nome: 'Euro', flag: 'fi-eu', taxa: 0.85 },
  { codigo: 'BRL', nome: 'Real Brasileiro', flag: 'fi-br', taxa: 5.10 },
  { codigo: 'GBP', nome: 'Libra Esterlina', flag: 'fi-gb', taxa: 0.73 },
  { codigo: 'ZAR', nome: 'Rand Sul-Africano', flag: 'fi-za', taxa: 16.80 },
];

export default function ConverterPage() {
  const { t } = useI18n();
  const cv = t.paginas.converter;
  const [moedaSelecionada, setMoedaSelecionada] = useState(MOEDAS[0]);
  const [valorOrigem, setValorOrigem] = useState('1000');
  const [direcao, setDirecao] = useState<'moeda-vaks' | 'vaks-moeda'>('moeda-vaks');

  const valorNum = parseFloat(valorOrigem) || 0;

  const valorConvertido = direcao === 'moeda-vaks'
    ? valorNum / moedaSelecionada.taxa
    : valorNum * moedaSelecionada.taxa;

  const inverterDirecao = () => {
    setDirecao(d => d === 'moeda-vaks' ? 'vaks-moeda' : 'moeda-vaks');
    setValorOrigem(valorConvertido.toFixed(4));
  };

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {/* Header */}
      <div className="bg-vaks-light-primary/80 dark:bg-vaks-dark-primary/80 backdrop-blur-md border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 sticky top-0 z-10">
        <div className="w-full px-4 py-3 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-vaks-light-purple-button dark:text-vaks-dark-secondary hover:opacity-80 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">{t.paginas.voltar}</span>
          </Link>
          <div className="h-4 w-px bg-vaks-light-stroke/30 dark:bg-vaks-dark-stroke/20"></div>
          <h1 className="text-lg font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            {cv.titulo}
          </h1>
        </div>
      </div>

      <div className="w-full px-4 py-6">
        <div className="max-w-4xl mx-auto">

          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-2xl mb-4 shadow-lg shadow-purple-200/40">
              <ArrowRightLeft className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-1">
              {cv.conversor_vaks}
            </h2>
            <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-sm">{cv.descricao}</p>
          </div>

          {/* Conversor Principal */}
          <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-4">

              {/* Input Origem */}
              <div className="flex-1 w-full">
                <p className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt uppercase tracking-wider mb-2">
                  {direcao === 'moeda-vaks' ? moedaSelecionada.nome : 'VAKS'}
                </p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-vaks-light-purple-button dark:text-vaks-dark-secondary">
                    {direcao === 'moeda-vaks' ? moedaSelecionada.codigo : 'VAKS'}
                  </span>
                  <input
                    type="number"
                    value={valorOrigem}
                    onChange={e => setValorOrigem(e.target.value)}
                    className="w-full pl-16 pr-4 py-4 border-2 border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 rounded-xl outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-all text-vaks-light-main-txt dark:text-vaks-dark-main-txt text-xl font-bold bg-vaks-light-input/50 dark:bg-vaks-dark-input/50"
                  />
                </div>
              </div>

              {/* Botão Inverter */}
              <button
                onClick={inverterDirecao}
                className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-200/40 hover:scale-110 active:scale-95 transition-all shrink-0"
              >
                <ArrowRightLeft className="w-5 h-5" />
              </button>

              {/* Output Destino */}
              <div className="flex-1 w-full">
                <p className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt uppercase tracking-wider mb-2">
                  {direcao === 'moeda-vaks' ? 'VAKS' : moedaSelecionada.nome}
                </p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-vaks-light-purple-button dark:text-vaks-dark-secondary">
                    {direcao === 'moeda-vaks' ? 'VAKS' : moedaSelecionada.codigo}
                  </span>
                  <div className="w-full pl-16 pr-4 py-4 border-2 border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 rounded-xl bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt text-xl font-bold">
                    {valorConvertido.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Info de taxa */}
            <div className="mt-4 flex items-center gap-2 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              <RefreshCw className="w-3.5 h-3.5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
              <span>1 VAKS = {moedaSelecionada.taxa.toLocaleString('pt-AO')} {moedaSelecionada.codigo}</span>
            </div>

            {/* Banner informativo */}
            <div className="mt-4 bg-vaks-light-input dark:bg-vaks-dark-input border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 rounded-xl p-3 flex items-center gap-3">
              <Info className="w-5 h-5 text-vaks-light-purple-button dark:text-vaks-dark-secondary shrink-0" />
              <p className="text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {cv.info_taxa}
              </p>
            </div>
          </div>

          {/* Seletor de Moedas */}
          <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8 mb-6">
            <p className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt uppercase tracking-wider mb-4">{cv.selecionar_moeda}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {MOEDAS.map(moeda => (
                <button
                  key={moeda.codigo}
                  onClick={() => setMoedaSelecionada(moeda)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    moedaSelecionada.codigo === moeda.codigo
                      ? 'border-vaks-light-purple-button dark:border-vaks-dark-purple-button bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover shadow-md'
                      : 'border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 hover:border-vaks-light-stroke/50 dark:hover:border-vaks-dark-stroke/40 hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input'
                  }`}
                >
                  <span className={`fi ${moeda.flag} text-2xl rounded-sm`}></span>
                  <div>
                    <p className={`text-sm font-bold ${
                      moedaSelecionada.codigo === moeda.codigo ? 'text-vaks-light-main-txt dark:text-vaks-dark-main-txt' : 'text-vaks-light-main-txt dark:text-vaks-dark-main-txt'
                    }`}>
                      {moeda.codigo}
                    </p>
                    <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">{moeda.nome}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Taxas */}
          <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-vaks-light-purple-button dark:text-vaks-dark-secondary" />
                <p className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt uppercase tracking-wider">
                  {cv.tabela_taxas}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">
                <Clock className="w-3.5 h-3.5" />
                {cv.hoje}
              </div>
            </div>
            <div className="divide-y divide-vaks-light-stroke/10 dark:divide-vaks-dark-stroke/10">
              {MOEDAS.map(moeda => (
                <div
                  key={moeda.codigo}
                  className={`flex items-center justify-between py-3.5 px-3 rounded-lg transition-colors ${
                    moedaSelecionada.codigo === moeda.codigo ? 'bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover' : 'hover:bg-vaks-light-input/50 dark:hover:bg-vaks-dark-input/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`fi ${moeda.flag} text-xl rounded-sm`}></span>
                    <div>
                      <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{moeda.codigo}</p>
                      <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">{moeda.nome}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${
                    moedaSelecionada.codigo === moeda.codigo ? 'text-purple-600 dark:text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt' : 'text-vaks-light-main-txt dark:text-vaks-dark-main-txt'
                  }`}>
                    {moeda.codigo} {moeda.taxa.toLocaleString('pt-AO')}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
