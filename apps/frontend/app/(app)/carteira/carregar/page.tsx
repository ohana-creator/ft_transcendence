'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, PlusCircle, CreditCard, Smartphone, Building2,
  CheckCircle2, Loader2, Shield, Zap, Clock,
} from 'lucide-react';
import { kzsToVaks, vaksToKzs } from '@/utils/currency';
import { useI18n } from '@/locales';
import { carregarCarteira, type TopupResult } from '@/utils/wallet';
import { toast } from '@/utils/toast';

const VALORES_RAPIDOS_KZS = [100, 500, 1000, 2000, 5000, 10000];

type MetodoPagamento = 'referencia' | 'multicaixa' | 'visa' | null;

export default function CarregarPage() {
  const { t } = useI18n();
  const cr = t.paginas.carregar;
  const [metodo, setMetodo] = useState<MetodoPagamento>(null);
  const [valor, setValor] = useState('');
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [topupInfo, setTopupInfo] = useState<TopupResult | null>(null);

  const walletTopupUiLog = (step: string, payload?: unknown) => {
    if (payload !== undefined) {
      return;
    }
  };

  const valorNum = parseFloat(valor) || 0;
  const vaksEquivalente = kzsToVaks(valorNum);
  const topupStatus = (topupInfo?.status || '').toUpperCase();
  const topupConcluido = topupStatus === 'COMPLETED' || topupStatus === 'PAID' || topupStatus === 'SUCCESS';

  const abrirCheckout = async (
    checkoutUrl: string,
    preOpenedWindow: Window | null
  ): Promise<boolean> => {
    walletTopupUiLog('abrirCheckout:start', { checkoutUrl });
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      const url = new URL(checkoutUrl, origin);
      const blockedHosts = new Set(['seu-dominio.com', 'www.seu-dominio.com', 'example.com', 'www.example.com']);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('INVALID_PROTOCOL');
      }

      if (blockedHosts.has(url.hostname.toLowerCase())) {
        throw new Error('PLACEHOLDER_DOMAIN');
      }

      if (typeof window !== 'undefined') {
        // Redireciona na mesma aba (sem popup)
        window.location.assign(url.toString());
      }

      walletTopupUiLog('abrirCheckout:success', {
        finalUrl: url.toString(),
      });

      return true;
    } catch (error: unknown) {
      const errorCode = error instanceof Error ? error.message : '';
      const msg = errorCode === 'PLACEHOLDER_DOMAIN'
        ? 'O backend devolveu um dominio placeholder (seu-dominio.com). Ajusta a URL de checkout no wallet-service.'
        : 'URL de checkout invalida recebida do backend.';
      if (preOpenedWindow && !preOpenedWindow.closed) {
        preOpenedWindow.close();
      }
      setErro(msg);
      toast.error('Erro no checkout', msg);
      walletTopupUiLog('abrirCheckout:error', {
        errorCode,
        message: msg,
        raw: error,
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    walletTopupUiLog('handleSubmit:start', {
      metodo,
      valor,
      valorNum,
      vaksEquivalente,
    });

    if (!metodo || !valorNum || valorNum <= 0) {
      setErro('Seleciona um metodo e um valor valido para continuar.');
      walletTopupUiLog('handleSubmit:validation-error', {
        metodo,
        valorNum,
      });
      return;
    }

    setLoading(true);
    try {
      const result = await carregarCarteira({
        amountKzs: valorNum,
        method: metodo,
        mode: 'checkout',
      });
      walletTopupUiLog('handleSubmit:service-result', result);
      const resultStatus = (result.status || '').toUpperCase();
      const resultConcluido = resultStatus === 'COMPLETED' || resultStatus === 'PAID' || resultStatus === 'SUCCESS';

      if (result.checkoutUrl) {
        await abrirCheckout(result.checkoutUrl, null);
      }

      if (resultConcluido) {
        toast.success('Carregamento confirmado com sucesso.');
      } else {
        toast.info('Pedido de carregamento criado.', 'O saldo atualiza depois da confirmacao do pagamento.');
      }
      setTopupInfo(result);
      setSucesso(true);
      walletTopupUiLog('handleSubmit:success', {
        status: result.status,
        concluido: resultConcluido,
        checkoutUrl: result.checkoutUrl,
        reference: result.reference,
      });
    } catch (err: unknown) {
      const maybeError = err as { status?: number; message?: string };
      const endpointUnavailable = maybeError?.status === 404;
      const message = endpointUnavailable
        ? 'Endpoint publico de carregamento ainda nao disponivel no backend (/wallet/topup).'
        : (maybeError?.message || 'Nao foi possivel iniciar o carregamento.');

      setErro(message);
      toast.error('Erro ao carregar carteira', message);
      walletTopupUiLog('handleSubmit:error', {
        status: maybeError?.status,
        message,
        raw: err,
      });
    } finally {
      setLoading(false);
      walletTopupUiLog('handleSubmit:done');
    }
  };

  const resetar = () => {
    setSucesso(false);
    setMetodo(null);
    setValor('');
    setErro(null);
    setTopupInfo(null);
  };

  const metodos = [
    {
      id: 'referencia' as MetodoPagamento,
      icon: Building2,
      nome: cr.referencia,
      desc: cr.referencia_desc,
      color: 'text-purple-600 dark:text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt',
      bg: 'bg-purple-100 dark:bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover0/15',
    },
    {
      id: 'multicaixa' as MetodoPagamento,
      icon: Smartphone,
      nome: cr.multicaixa,
      desc: cr.multicaixa_desc,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-500/15',
    },
    {
      id: 'visa' as MetodoPagamento,
      icon: CreditCard,
      nome: cr.visa,
      desc: cr.visa_desc,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-500/15',
    },
  ];

  if (sucesso) {
    return (
      <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center px-6">
        <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-xl dark:shadow-vaks-dark-purple-card-hover p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">{cr.sucesso_titulo}</h2>
          <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2">
            {cr.sucesso_desc} <span className="font-bold text-vaks-light-purple-button dark:text-vaks-dark-secondary">{vaksEquivalente.toFixed(2)} VAKS</span>
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
            {topupConcluido
              ? 'Pagamento confirmado. O saldo deve aparecer na carteira em instantes.'
              : 'Pedido criado com sucesso. O saldo e o historico so atualizam apos a confirmacao do pagamento.'}
          </p>
          <p className="text-sm text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70 mb-8">≈ {valorNum.toLocaleString('pt-AO')} KZS</p>
          {(topupInfo?.reference || topupInfo?.expiresAt) && (
            <div className="mb-6 rounded-xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3 text-left text-xs">
              {topupInfo?.reference && (
                <p className="text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  Referencia: <span className="font-semibold">{topupInfo.reference}</span>
                </p>
              )}
              {topupInfo?.expiresAt && (
                <p className="mt-1 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                  Expira em: {new Date(topupInfo.expiresAt).toLocaleString('pt-AO')}
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={resetar}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-200"
            >
              {cr.novo_carregamento}
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
            {cr.titulo}
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
                <PlusCircle className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-1">
                {cr.titulo}
              </h2>
              <p className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt text-sm">{cr.descricao}</p>
            </div>

            <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8">
              <form onSubmit={handleSubmit} className="space-y-6">

                {erro && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {erro}
                  </div>
                )}

                {/* Método de Pagamento */}
                <div>
                  <p className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt uppercase tracking-wider mb-3">{cr.metodo_pagamento}</p>
                  <div className="space-y-2">
                    {metodos.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodo(m.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                          metodo === m.id
                            ? 'border-vaks-light-purple-button dark:border-vaks-dark-purple-button bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover shadow-md'
                            : 'border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 hover:border-vaks-light-stroke/50 dark:hover:border-vaks-dark-stroke/40 hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input'
                        }`}
                      >
                        <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center shrink-0`}>
                          <m.icon className={`w-5 h-5 ${m.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{m.nome}</p>
                          <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70 truncate">{m.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          metodo === m.id ? 'border-vaks-light-purple-button dark:border-vaks-dark-purple-button bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button' : 'border-vaks-light-stroke/50 dark:border-vaks-dark-stroke/30'
                        }`}>
                          {metodo === m.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valor a carregar */}
                <div>
                  <label className="block text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-2">
                    {cr.valor_carregar}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">KZS</span>
                    <input
                      type="number"
                      step="1"
                      min="100"
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      placeholder="0"
                      required
                      className="w-full pl-14 pr-20 py-3.5 border-2 border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 rounded-xl outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-all text-vaks-light-main-txt dark:text-vaks-dark-main-txt text-lg font-semibold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">VAKS</span>
                  </div>
                  {valorNum > 0 && (
                    <p className="text-sm text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70 mt-2 flex items-center gap-1">
                      ≈ <span className="font-semibold text-vaks-light-purple-button dark:text-vaks-dark-secondary">{vaksEquivalente.toFixed(2)} VAKS</span>
                    </p>
                  )}
                </div>

                {/* Valores rápidos */}
                <div>
                  <p className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt uppercase tracking-wider mb-3">{cr.valores_rapidos}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {VALORES_RAPIDOS_KZS.map(v => (
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
                        {v.toLocaleString('pt-AO')} KZS
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botão de Carregar */}
                <button
                  type="submit"
                  disabled={loading || !metodo || !valor}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-bold text-base hover:from-purple-700 hover:to-purple-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-200/40 active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {cr.a_processar}
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      {cr.carregar_btn} {valor ? `${parseFloat(valor).toLocaleString('pt-AO')} KZS` : ''}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Painel lateral — 2 colunas */}
          <div className="lg:col-span-2 lg:mt-[160px] space-y-6">

            {/* Resumo */}
            <div className="bg-gradient-to-br from-purple-500 via-purple-700 to-purple-900 rounded-3xl p-8 text-white shadow-2xl shadow-purple-500/60 ring-1 ring-purple-400/30">
              <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wider mb-4">{cr.resumo}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">{cr.metodo}</span>
                  <span className="text-sm font-semibold">
                    {metodo ? metodos.find(m => m.id === metodo)?.nome : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">{cr.valor}</span>
                  <span className="font-bold text-lg">
                    {valorNum > 0 ? `${valorNum.toLocaleString('pt-AO')} KZS` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm opacity-70">{cr.recebe}</span>
                  <span className="text-sm font-semibold">
                    {valorNum > 0 ? `${vaksEquivalente.toFixed(2)} VAKS` : '—'}
                  </span>
                </div>
                <div className="border-t border-white/20 pt-3 flex justify-between">
                  <span className="text-sm opacity-70">{cr.taxa}</span>
                  <span className="text-sm font-bold text-emerald-300">{cr.gratis}</span>
                </div>
              </div>
            </div>

            {/* Garantias */}
            <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8 space-y-4">
              <h3 className="text-sm font-semibold text-vaks-light-purple-button dark:text-vaks-dark-secondary uppercase tracking-wider">{cr.garantias}</h3>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-purple-100 dark:bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover0/15 rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cr.instantaneo}</p>
                  <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">{cr.instantaneo_desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cr.seguro}</p>
                  <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">{cr.seguro_desc}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-100 dark:bg-amber-500/15 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cr.suporte}</p>
                  <p className="text-xs text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70">{cr.suporte_desc}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
