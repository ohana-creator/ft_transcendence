'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Send, User, DollarSign, MessageSquare,
  CheckCircle2, Loader2, Shield, Clock, Zap,
} from 'lucide-react';
import { vaksToKzs } from '@/utils/currency';
import { useI18n } from '@/locales';

const VALORES_RAPIDOS = [10, 25, 50, 100, 250, 500];

export default function TransferirPage() {
  const { t } = useI18n();
  const tr = t.paginas.transferir;
  const [destinatario, setDestinatario] = useState('');
  const [valor, setValor] = useState('');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const valorNum = parseFloat(valor) || 0;
  const kzsEquivalente = vaksToKzs(valorNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setSucesso(true);
  };

  const resetar = () => {
    setSucesso(false);
    setDestinatario('');
    setValor('');
    setNota('');
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center px-6">
        <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-xl dark:shadow-vaks-dark-purple-card-hover p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">{tr.sucesso_titulo}</h2>
          <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2">
            {tr.sucesso_desc} <span className="font-bold text-vaks-light-purple-button dark:text-vaks-dark-secondary">{parseFloat(valor).toFixed(2)} VAKS</span> {tr.sucesso_para}
          </p>
          <p className="font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-6">{destinatario}</p>
          <p className="text-sm text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70 mb-8">≈ {kzsEquivalente.toLocaleString('pt-AO')} KZS</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={resetar}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-200"
            >
              {tr.nova_transferencia}
            </button>
            <Link
              href="/dashboard"
              className="w-full py-3 border-2 border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 text-vaks-light-purple-button dark:text-vaks-dark-secondary rounded-2xl font-semibold hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input transition-colors text-center"
            >
              {t.paginas.voltar}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            {tr.titulo}
          </h1>
        </div>
      </div>

      <div className="w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Formulário — 3 colunas */}
          <div className="lg:col-span-3">
            {/* Hero */}
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-purple-100 dark:bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover0/15 rounded-2xl mb-4">
                <Send className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-1">
                {tr.enviar_vaks}
              </h2>
              <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-sm">{tr.descricao}</p>
            </div>

            <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Destinatário */}
                <div>
                  <label className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
                    {tr.destinatario}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
                    <input
                      type="text"
                      value={destinatario}
                      onChange={e => setDestinatario(e.target.value)}
                      placeholder={tr.placeholder_destinatario}
                      required
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 rounded-xl outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-all text-vaks-light-main-txt dark:text-vaks-dark-main-txt"
                    />
                  </div>
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
                    {tr.valor}
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-12 pr-20 py-3.5 border-2 border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 rounded-xl outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-all text-vaks-light-main-txt dark:text-vaks-dark-main-txt text-lg font-semibold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">VAKS</span>
                  </div>
                  {valorNum > 0 && (
                    <p className="text-sm text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70 mt-2 flex items-center gap-1">
                      ≈ <span className="font-semibold text-vaks-light-purple-button dark:text-vaks-dark-secondary">{kzsEquivalente.toLocaleString('pt-AO')} KZS</span>
                    </p>
                  )}
                </div>

                {/* Valores rápidos */}
                <div>
                  <p className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt uppercase tracking-wider mb-3">{tr.valores_rapidos}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {VALORES_RAPIDOS.map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValor(v.toString())}
                        className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          valor === v.toString()
                            ? 'bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white border-vaks-light-purple-button dark:border-vaks-dark-purple-button shadow-md'
                            : 'bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 hover:border-vaks-light-stroke/50 dark:hover:border-vaks-dark-stroke/40 hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input'
                        }`}
                      >
                        {v} VAKS
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nota opcional */}
                <div>
                  <label className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
                    {tr.nota} <span className="text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70 font-normal">({tr.opcional})</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-3.5 w-5 h-5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
                    <textarea
                      value={nota}
                      onChange={e => setNota(e.target.value)}
                      placeholder={tr.placeholder_nota}
                      rows={3}
                      className="w-full pl-12 pr-4 py-3 border-2 border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 rounded-xl outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-all text-vaks-light-main-txt dark:text-vaks-dark-main-txt resize-none"
                    />
                  </div>
                </div>

                {/* Botão de Enviar */}
                <button
                  type="submit"
                  disabled={loading || !destinatario || !valor}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-base hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-200/40 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {tr.a_processar}
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      {tr.transferir_btn} {valor ? `${parseFloat(valor).toFixed(2)} VAKS` : ''}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Painel lateral — 2 colunas */}
          <div className="lg:col-span-2 lg:mt-[160px] space-y-6">

            {/* Resumo da transferência */}
            <div className="bg-gradient-to-br from-purple-500 via-purple-700 to-purple-900 rounded-3xl p-8 text-white shadow-2xl shadow-purple-500/60 ring-1 ring-purple-400/30">
              <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wider mb-4">{tr.resumo}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">{tr.para}</span>
                  <span className="text-sm font-semibold truncate max-w-[160px]">{destinatario || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">{tr.valor}</span>
                  <span className="font-bold text-lg">{valorNum > 0 ? `${valorNum.toFixed(2)} VAKS` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">{tr.equivalente}</span>
                  <span className="text-sm font-semibold">{valorNum > 0 ? `${kzsEquivalente.toLocaleString('pt-AO')} KZS` : '—'}</span>
                </div>
                <div className="border-t border-white/20 pt-3 flex justify-between">
                  <span className="text-sm opacity-70">{tr.taxa}</span>
                  <span className="text-sm font-bold text-emerald-300">{tr.gratis}</span>
                </div>
              </div>
            </div>

            {/* Garantias */}
            <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8 space-y-4">
              <h3 className="text-sm font-semibold text-vaks-light-purple-button dark:text-vaks-dark-secondary uppercase tracking-wider">{tr.garantias}</h3>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-purple-100 dark:bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover0/15 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{tr.instantaneo}</p>
                  <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">{tr.instantaneo_desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{tr.seguro}</p>
                  <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">{tr.seguro_desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-100 dark:bg-amber-500/15 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{tr.irreversivel}</p>
                  <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">{tr.irreversivel_desc}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
