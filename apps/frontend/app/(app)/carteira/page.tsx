'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWalletDashboard, useWalletBalance, useCarteiraData } from '@/hooks/react-query';
import { useI18n } from '@/locales';
import { HistoricoTransacoes } from '@/components/carteira';
import CosmicNebulaMastercard from '@/components/carteira/cursor-wander-card';
import {
  Wallet, Send, ArrowDownToLine, Eye, EyeOff, Copy, Check, ArrowRightLeft,
  History, RefreshCw, CreditCard, ChevronLeft, TrendingUp, TrendingDown,
  Shield, Clock, Sparkles, PlusCircle, Building2, Smartphone, ArrowUpRight, ArrowDownLeft, X,
} from 'lucide-react';
import { VaksMascot } from '@/components/config/mascot';
import { kzsToVaks } from '@/utils/currency';
import { carregarCarteira, getCarteiraData, getWalletTransactionById, transferirVaks, type WalletTransactionDetail } from '@/utils/wallet';
import { toast } from '@/utils/toast';


type SecaoCarteira = 'geral' | 'transferencias' | 'conversor' | 'historico' | 'levantar' | 'cartao' | 'carregar';

interface MenuItem {
  id: SecaoCarteira;
  label: string;
  icone: React.ReactNode;
  descricao: string;
}

function CarteiraContent() {
  // Use React Query for wallet data with caching
  const walletDashboard = useWalletDashboard();
  const { data: carteiraData } = useCarteiraData();
  const { refetch: refetchBalance } = useWalletBalance();
  
  const { t } = useI18n();
  const cp = t.paginas.carteira_pagina;
  const router = useRouter();
  const searchParams = useSearchParams();
  const secaoInicial = searchParams.get('secao') as SecaoCarteira | null;
  const [secao, setSecao] = useState<SecaoCarteira>(secaoInicial || 'geral');
  const [saldoVisivel, setSaldoVisivel] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [vaksInput, setVaksInput] = useState('');
  const [kzsInput, setKzsInput] = useState('');
  const [carregarMetodo, setCarregarMetodo] = useState<'referencia' | 'multicaixa' | 'visa' | null>(null);
  const [carregarValor, setCarregarValor] = useState('');
  const [carregarLoading, setCarregarLoading] = useState(false);
  const [carregamentoPendente, setCarregamentoPendente] = useState(false);
  const [carregarErro, setCarregarErro] = useState<string | null>(null);
  const [saldoLoading, setSaldoLoading] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferValor, setTransferValor] = useState('');
  const [transferNota, setTransferNota] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  
  // Extract wallet data
  const loading = walletDashboard.isLoading;
  
  // Create carteira object from React Query data
  const carteira = carteiraData || {
    saldo: walletDashboard.balance,
    saldoPendente: 0,
    transacoes: walletDashboard.transactions,
    usuarioId: '',
  };
  
  const atualizarCarteira = async () => {
    await walletDashboard.refetch();
  };
  
  const atualizarSaldo = async () => {
    setSaldoLoading(true);
    await refetchBalance();
    setSaldoLoading(false);
  };
  const [transferErro, setTransferErro] = useState<string | null>(null);
  const [txDetalheOpen, setTxDetalheOpen] = useState(false);
  const [txDetalheLoading, setTxDetalheLoading] = useState(false);
  const [txDetalheErro, setTxDetalheErro] = useState<string | null>(null);
  const [txDetalhe, setTxDetalhe] = useState<WalletTransactionDetail | null>(null);

  const VALORES_RAPIDOS_KZS = [100, 500, 1000, 2000, 5000, 10000];

  const copiarId = () => {
    navigator.clipboard.writeText(
      `VAKS-${carteira?.usuarioId?.substring(0, 8) || 'XXXXXXXX'}`
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleVaksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setVaksInput(valor);
    if (valor === '' || valor === '0') {
      setKzsInput('');
    } else {
      const vaks = parseFloat(valor);
      const kzs = vaks * 1000;
      setKzsInput(kzs.toFixed(2));
    }
  };

  const handleKzsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setKzsInput(valor);
    if (valor === '' || valor === '0') {
      setVaksInput('');
    } else {
      const kzs = parseFloat(valor);
      const vaks = kzs / 1000;
      setVaksInput(vaks.toFixed(2));
    }
  };

  useEffect(() => {
    // Cleanup on unmount - no longer needed
  }, []);

  const abrirCheckout = async (
    checkoutUrl: string,
    preOpenedWindow: Window | null
  ): Promise<boolean> => {
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

      return true;
    } catch (error: unknown) {
      const errorCode = error instanceof Error ? error.message : '';
      const msg = errorCode === 'PLACEHOLDER_DOMAIN'
        ? cp.erro_checkout_placeholder
        : cp.erro_checkout_url;
      setCarregarErro(msg);
      toast.error(cp.erro_checkout, msg);
      return false;
    }
  };

  // Simplified topup confirmation - use React Query invalidation instead of polling
  const confirmarTopupComCache = async () => {
    setCarregamentoPendente(true);
    
    // Wait for backend auto-confirmation (typically 1.5s)
    setTimeout(async () => {
      await atualizarCarteira();
      setCarregamentoPendente(false);
      toast.success(cp.saldo_atualizado);
    }, 2000);
  };

  const handleCarregarCarteira = async () => {
    setCarregarErro(null);
    setCarregamentoPendente(false);

    const valor = parseFloat(carregarValor) || 0;
    if (!carregarMetodo || valor <= 0) {
      setCarregarErro(cp.erro_carregar_campos);
      return;
    }

    setCarregarLoading(true);

    try {
      const result = await carregarCarteira({
        amountKzs: valor,
        method: carregarMetodo,
        mode: 'checkout',
      });
      const status = (result.status || '').toUpperCase();
      const concluido = status === 'COMPLETED' || status === 'PAID' || status === 'SUCCESS';

      if (result.checkoutUrl) {
        const abriuCheckout = await abrirCheckout(result.checkoutUrl, null);
        if (!abriuCheckout) {
          setCarregarLoading(false);
          return;
        }
      }

      if (concluido) {
        toast.success(cp.carregamento_confirmado);
      } else {
        toast.info(cp.carregamento_criado, cp.carregamento_aguardar);
      }
      setCarregarValor('');
      setCarregarMetodo(null);
      await atualizarCarteira();

      if (!concluido) {
        setCarregamentoPendente(true);
        // Use React Query cache invalidation instead of polling
        void confirmarTopupComCache();
      }
    } catch (err: unknown) {
      const maybeError = err as { status?: number; message?: string };
      const endpointUnavailable = maybeError?.status === 404;
      const message = endpointUnavailable
        ? cp.erro_endpoint_indisponivel
        : (maybeError?.message || cp.erro_iniciar_carregamento);

      setCarregarErro(message);
      toast.error(cp.erro_carregar_carteira, message);
    } finally {
      setCarregarLoading(false);
    }
  };

  const handleAtualizarSaldo = async () => {
    setSaldoLoading(true);
    try {
      await atualizarSaldo();
      toast.success(cp.saldo_atualizado_curto);
    } catch {
      toast.error(cp.erro_atualizar_saldo, cp.erro_atualizar_saldo_desc);
    } finally {
      setSaldoLoading(false);
    }
  };

  const handleTransferencia = async () => {
    setTransferErro(null);

    const recipient = transferRecipient.trim();
    const amount = parseFloat(transferValor) || 0;

    if (!recipient || amount <= 0) {
      setTransferErro(cp.erro_transferir_campos);
      return;
    }

    setTransferLoading(true);
    try {
      await transferirVaks({
        recipient,
        amount,
        note: transferNota.trim() || undefined,
      });

      toast.success(cp.transferencia_sucesso);
      setTransferRecipient('');
      setTransferValor('');
      setTransferNota('');
      await atualizarCarteira();
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string | string[] };
      const rawMessage = Array.isArray(apiError?.message)
        ? apiError.message[0]
        : apiError?.message;

      const recipientNotFound =
        apiError?.status === 404
        || (typeof rawMessage === 'string' && /USER_NOT_FOUND|RECIPIENT_USER_NOT_FOUND|RECIPIENT_WALLET_NOT_FOUND/i.test(rawMessage));

      const message = recipientNotFound
        ? 'Destinatario invalido ou nao encontrado.'
        : (rawMessage || t.common.error_get_data);

      setTransferErro(message);
      toast.error(t.common.error, message);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleOpenTxDetalhe = async (transacaoId: string) => {
    setTxDetalheOpen(true);
    setTxDetalheLoading(true);
    setTxDetalheErro(null);
    setTxDetalhe(null);

    try {
      const detalhe = await getWalletTransactionById(transacaoId);
      setTxDetalhe(detalhe);
    } catch (err: unknown) {
      const maybeError = err as { message?: string };
      setTxDetalheErro(maybeError?.message || t.common.error_get_data);
    } finally {
      setTxDetalheLoading(false);
    }
  };

  const closeTxDetalhe = () => {
    setTxDetalheOpen(false);
    setTxDetalhe(null);
    setTxDetalheErro(null);
  };

  const saldo = carteira?.saldo ?? 0;
  const pendente = carteira?.saldoPendente ?? 0;
  const disponivel = saldo - pendente;

  const totalEnviado = carteira?.transacoes
    ?.filter((t: any) => t.tipo === 'transferencia' || t.tipo === 'contribuicao')
    .reduce((s: number, t: any) => s + t.valor, 0) ?? 0;

  const totalRecebido = carteira?.transacoes
    ?.filter((t: any) => t.tipo === 'recebimento' || t.tipo === 'cashback')
    .reduce((s: number, t: any) => s + t.valor, 0) ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200/40 animate-pulse">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2 text-center">
            <div className="h-3 w-28 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-2 w-20 bg-gray-100 rounded-full animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  const MENU_ITEMS: MenuItem[] = [
    { id: 'geral', label: cp.menu.minha_carteira, icone: <Wallet className="w-4 h-4" />, descricao: cp.menu.visao_geral },
    { id: 'carregar', label: cp.menu.carregar, icone: <PlusCircle className="w-4 h-4" />, descricao: cp.menu.adicionar_fundos },
    { id: 'transferencias', label: cp.menu.transferencias, icone: <Send className="w-4 h-4" />, descricao: cp.menu.enviar_vaks },
    { id: 'conversor', label: cp.menu.conversor, icone: <ArrowRightLeft className="w-4 h-4" />, descricao: 'VAKS / KZS' },
    { id: 'levantar', label: cp.menu.levantar, icone: <ArrowDownToLine className="w-4 h-4" />, descricao: cp.menu.sacar_vaks },
    { id: 'cartao', label: cp.menu.cartao_virtual, icone: <CreditCard className="w-4 h-4" />, descricao: cp.menu.gerir_cartao },
    { id: 'historico', label: cp.menu.historico, icone: <History className="w-4 h-4" />, descricao: cp.menu.transacoes },
  ];

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {/* Header */}
      <div className="bg-vaks-light-primary dark:bg-vaks-dark-primary border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.titulo}</h1>
                <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.descricao}</p>
              </div>
            </div>
            <button
              onClick={handleAtualizarSaldo}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 hover:from-purple-700 hover:via-purple-800 hover:to-purple-900 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-purple-200/40"
            >
              <RefreshCw className={`w-4 h-4 ${saldoLoading ? 'animate-spin' : ''}`} />
              {cp.atualizar}
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Saldo Card + Mascote lado a lado */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Saldo */}
              <div className="w-full lg:w-1/2">
                <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-700 to-purple-900 rounded-3xl p-8 text-white shadow-2xl shadow-purple-500/60 ring-1 ring-purple-400/30">
                  {/* Brilhos */}
                  <div className="absolute -top-12 -right-12 w-56 h-56 bg-purple-400/30 rounded-full blur-3xl" />
                  <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-20 bg-white/5 rounded-full blur-2xl rotate-12" />
                  <div className="absolute top-4 left-1/3 w-24 h-24 bg-pink-400/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-white/60" />
                        <span className="text-sm text-white/70 font-medium">{cp.saldo_total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSaldoVisivel(v => !v)}
                          className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-white"
                        >
                          {saldoVisivel ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={copiarId}
                          className="p-2 rounded-xl hover:bg-white/10 transition-all text-white/40 hover:text-white"
                        >
                          {copiado ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-4xl font-extrabold">
                        {saldoVisivel ? saldo.toLocaleString('pt-AO', { minimumFractionDigits: 2 }) : '--------'}
                      </span>
                      <span className="text-lg font-medium text-white/50 ml-2">VAKS</span>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-300" />
                        <span className="text-xs text-white/60">{cp.disponivel}: {saldoVisivel ? disponivel.toFixed(2) : '---'}</span>
                      </div>
                      {pendente > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-amber-300" />
                          <span className="text-xs text-white/60">{cp.pendente}: {saldoVisivel ? pendente.toFixed(2) : '---'}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 font-mono">
                          VAKS-{carteira?.usuarioId?.substring(0, 8).toUpperCase() ?? 'XXXXXXXX'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mascote Vaksy - hidden on mobile */}
              <div className="hidden lg:flex w-full lg:w-1/2 items-center justify-center">
                <VaksMascot width={200} height={200} />
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              <div className="group rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card p-6 shadow-md dark:shadow-vaks-dark-purple-card-hover hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex w-10 h-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 px-3 py-1 rounded-full">{cp.recebido}</span>
                </div>
                <p className="text-2xl font-extrabold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">+{totalRecebido.toFixed(2)}</p>
                <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{cp.vaks_recebidos}</p>
              </div>

              <div className="group rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card p-6 shadow-md dark:shadow-vaks-dark-purple-card-hover hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex w-10 h-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/15 px-3 py-1 rounded-full">{cp.enviado}</span>
                </div>
                <p className="text-2xl font-extrabold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">-{totalEnviado.toFixed(2)}</p>
                <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{cp.vaks_enviados}</p>
              </div>

              <div className="group rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card p-6 shadow-md dark:shadow-vaks-dark-purple-card-hover hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex w-10 h-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-500">{cp.ativa}</span>
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.segura}</p>
                <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{cp.carteira_protegida}</p>
              </div>
            </div>

            {/* Section Content */}
            <div>
              {/* Seccao: Minha Carteira */}
              {secao === 'geral' && (
                <div className="space-y-6">
                  {/* ── Património + Movimentos (dashboard-style grid) ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Património Card */}
                    <div className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card overflow-hidden shadow-md dark:shadow-vaks-dark-purple-card-hover">
                      <div className="flex items-center justify-between border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 px-5 py-4">
                        <h3 className="text-lg font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                          {cp.patrimonio}
                        </h3>
                      </div>
                      <div className="p-5 space-y-4">
                        {/* Activos */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.ativos_label}</p>
                            <p className="text-sm font-bold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                              {saldoVisivel ? saldo.toLocaleString('pt-AO', { minimumFractionDigits: 2 }) : '••••'} VAKS
                            </p>
                          </div>
                        </div>
                        {/* Pendente */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                            <History className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.pendente}</p>
                            <p className="text-sm font-bold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                              {saldoVisivel ? pendente.toLocaleString('pt-AO', { minimumFractionDigits: 2 }) : '••••'} VAKS
                            </p>
                          </div>
                        </div>
                        {/* Disponível */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.disponivel_label}</p>
                            <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                              {saldoVisivel ? disponivel.toLocaleString('pt-AO', { minimumFractionDigits: 2 }) : '••••'} VAKS
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Movimentos Recentes Card */}
                    <div className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card overflow-hidden shadow-md dark:shadow-vaks-dark-purple-card-hover">
                      <div className="flex items-center justify-between border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 px-5 py-4">
                        <h3 className="text-lg font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                          {cp.movimentos_recentes}
                        </h3>
                        <button
                          onClick={() => setSecao('historico')}
                          className="text-[11px] font-medium text-vaks-light-purple-button dark:text-vaks-dark-secondary hover:underline"
                        >
                          {cp.ver_tudo}
                        </button>
                      </div>
                      <div className="divide-y divide-vaks-light-stroke/10 dark:divide-vaks-dark-stroke/10">
                        {(carteira?.transacoes ?? []).length > 0 ? (
                          (carteira?.transacoes ?? []).slice(0, 4).map((tx: any, i: number) => {
                            const isNegative = tx.tipo === 'transferencia' || tx.tipo === 'contribuicao';
                            return (
                              <div
                                key={tx.id ?? i}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-vaks-light-primary/50 dark:hover:bg-vaks-dark-primary/30 transition-colors"
                              >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  isNegative
                                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400'
                                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                                }`}>
                                  {isNegative ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                                    {tx.descricao ?? tx.tipo}
                                  </p>
                                  <p className="text-[10px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                                    {new Date(tx.criadoEm ?? tx.data ?? Date.now()).toLocaleDateString('pt-AO')}
                                  </p>
                                </div>
                                <span className={`text-xs font-semibold tabular-nums ${
                                  !isNegative ? 'text-emerald-600 dark:text-emerald-400' : 'text-vaks-light-main-txt dark:text-vaks-dark-main-txt'
                                }`}>
                                  {isNegative ? '-' : '+'}{tx.valor?.toLocaleString('pt-AO')} <span className="text-[10px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">VAKS</span>
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <History className="h-8 w-8 text-vaks-light-alt-txt/40 dark:text-vaks-dark-alt-txt/40 mb-2" />
                            <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.nenhuma}</p>
                            <p className="text-[10px] text-vaks-light-alt-txt/60 dark:text-vaks-dark-alt-txt/60 mt-0.5">{cp.comece}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info da Carteira Card */}
                  <div className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card overflow-hidden shadow-md dark:shadow-vaks-dark-purple-card-hover">
                    <div className="border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 px-5 py-4">
                      <h3 className="text-lg font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.info_carteira}</h3>
                      <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">{cp.info_carteira_desc}</p>
                    </div>
                    <div className="divide-y divide-vaks-light-stroke/10 dark:divide-vaks-dark-stroke/10">
                      {[
                        { label: cp.id_carteira, value: `VAKS-${carteira?.usuarioId?.substring(0, 8).toUpperCase() ?? '...'}`, isId: true, icon: <CreditCard className="w-4 h-4" /> },
                        { label: cp.status, value: cp.ativa, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/15', icon: <Shield className="w-4 h-4" /> },
                        { label: cp.verificacao, value: cp.nao_verificada, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/15', icon: <Eye className="w-4 h-4" /> },
                        { label: cp.data_criacao, value: '...', color: 'text-vaks-light-alt-txt bg-vaks-light-input dark:text-vaks-dark-alt-txt dark:bg-vaks-dark-input', icon: <Clock className="w-4 h-4" /> },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-vaks-light-primary/50 dark:hover:bg-vaks-dark-primary/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                              {row.icon}
                            </div>
                            <span className="text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{row.label}</span>
                          </div>
                          {row.isId ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt bg-vaks-light-input dark:bg-vaks-dark-input px-3 py-1 rounded-lg">{row.value}</span>
                              <button onClick={copiarId} className="p-1.5 rounded-lg text-vaks-light-alt-txt hover:text-purple-600 hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input transition-all">
                                {copiado ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                          ) : (
                            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${row.color}`}>{row.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Seccao: Transferencias */}
              {secao === 'transferencias' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.transferencias_titulo}</h3>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{cp.transferencias_desc}</p>
                  </div>
                  <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8">
                    <div className="space-y-5">
                      {transferErro && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {transferErro}
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">{cp.destinatario}</label>
                        <input
                          type="text"
                          value={transferRecipient}
                          onChange={(e) => setTransferRecipient(e.target.value)}
                          placeholder={cp.placeholder_destinatario || 'utilizador@exemplo.com'}
                          className="w-full rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">{cp.valor}</label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={transferValor}
                            onChange={(e) => setTransferValor(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 pr-16 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">VAKS</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">{cp.descricao_opcional}</label>
                        <input
                          type="text"
                          value={transferNota}
                          onChange={(e) => setTransferNota(e.target.value)}
                          placeholder={cp.placeholder_descricao}
                          className="w-full rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow"
                        />
                      </div>
                      <button
                        onClick={handleTransferencia}
                        disabled={transferLoading || !transferRecipient || !transferValor}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 dark:from-purple-600 dark:via-purple-700 dark:to-purple-800 px-4 py-3.5 text-sm font-bold shadow-lg shadow-purple-200/40 text-white hover:opacity-90 transition-opacity mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4" />
                        {transferLoading ? cp.a_processar : cp.enviar_transferencia}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Seccao: Conversor */}
              {secao === 'conversor' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.conversor_titulo}</h3>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{cp.conversor_desc}</p>
                  </div>
                  <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8">
                    <div className="space-y-5">
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">VAKS</label>
                        <input type="number" placeholder="0.00" value={vaksInput} onChange={handleVaksChange} className="w-full rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow" />
                      </div>
                      <div className="flex justify-center">
                        <div className="flex w-12 h-12 items-center justify-center rounded-2xl bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white">
                          <ArrowRightLeft className="w-5 h-5 rotate-90" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">Kwanza (KZS)</label>
                        <input type="number" placeholder="0.00" value={kzsInput} onChange={handleKzsChange} className="w-full rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow" />
                      </div>
                      <div className="pt-4 border-t border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15">
                        <div className="flex items-center gap-3 rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5">
                          <div className="flex w-10 h-10 items-center justify-center rounded-2xl bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white">
                            <ArrowRightLeft className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.taxa_cambio}</p>
                            {vaksInput && (
                              <p className="text-xs text-vaks-light-purple-button dark:text-vaks-dark-secondary font-semibold mt-0.5">
                                {vaksInput} VAKS = {kzsInput} KZS
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seccao: Carregar Carteira */}
              {secao === 'carregar' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.carregar_titulo}</h3>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{cp.carregar_desc}</p>
                  </div>
                  <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8">
                    <div className="space-y-5">
                      {/* Método de pagamento */}
                      <div>
                        <label className="text-xs font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">{cp.carregar_metodo}</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { id: 'referencia' as const, icon: Building2, nome: cp.carregar_referencia, desc: cp.carregar_referencia_desc },
                            { id: 'multicaixa' as const, icon: Smartphone, nome: cp.carregar_multicaixa, desc: cp.carregar_multicaixa_desc },
                            { id: 'visa' as const, icon: CreditCard, nome: cp.carregar_visa, desc: cp.carregar_visa_desc },
                          ].map((m) => {
                            const Icon = m.icon;
                            const isActive = carregarMetodo === m.id;
                            return (
                              <button
                                key={m.id}
                                onClick={() => setCarregarMetodo(m.id)}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all ${
                                  isActive
                                    ? 'bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white ring-2 ring-vaks-light-purple-button/30 dark:ring-vaks-dark-purple-button/30'
                                    : 'bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover'
                                }`}
                              >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate">{m.nome}</p>
                                  <p className={`text-[10px] truncate ${isActive ? 'text-white/70' : 'text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt'}`}>{m.desc}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* Valor */}
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">{cp.carregar_valor}</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={carregarValor}
                          onChange={(e) => setCarregarValor(e.target.value)}
                          className="w-full rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow"
                        />
                      </div>
                      {/* Valores rápidos */}
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">{cp.carregar_valores_rapidos}</label>
                        <div className="flex flex-wrap gap-2">
                          {VALORES_RAPIDOS_KZS.map((v) => (
                            <button
                              key={v}
                              onClick={() => setCarregarValor(v.toString())}
                              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                                carregarValor === v.toString()
                                  ? 'bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white'
                                  : 'bg-vaks-light-input dark:bg-vaks-dark-input text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover'
                              }`}
                            >
                              {v.toLocaleString('pt-AO')} KZS
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Resumo */}
                      {carregarValor && (
                        <div className="rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 flex items-center justify-between">
                          <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.carregar_recebe}</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {kzsToVaks(parseFloat(carregarValor) || 0).toFixed(2)} VAKS
                          </span>
                        </div>
                      )}
                      {carregarErro && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {carregarErro}
                        </div>
                      )}
                      <button
                        onClick={handleCarregarCarteira}
                        disabled={carregarLoading || !carregarMetodo || !carregarValor}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 dark:from-purple-600 dark:via-purple-700 dark:to-purple-800 px-4 py-3.5 text-sm font-bold shadow-lg shadow-purple-200/40 text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-1"
                      >
                        {carregarLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                        {carregarLoading ? cp.a_processar : cp.carregar_btn}
                      </button>
                      {carregamentoPendente && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Pagamento pendente de confirmacao. Podes continuar a usar a pagina enquanto atualizamos o saldo automaticamente.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Seccao: Levantar para Banco */}
              {secao === 'levantar' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.levantar_titulo}</h3>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{cp.levantar_desc}</p>
                  </div>
                  <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover p-8">
                    <div className="space-y-5">
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">{cp.valor}</label>
                        <div className="relative">
                          <input type="number" placeholder="0.00" className="w-full rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 pr-16 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow" />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">VAKS</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-2 block">{cp.selecionar_conta}</label>
                        <select className="w-full rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow">
                          <option>{cp.placeholder_conta}</option>
                          <option>BCI - ****1234</option>
                        </select>
                      </div>
                      <button className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 dark:from-purple-600 dark:via-purple-700 dark:to-purple-800 px-4 py-3.5 text-sm font-bold shadow-lg shadow-purple-200/40 text-white hover:opacity-90 transition-opacity mt-2">
                        <ArrowDownToLine className="h-4 w-4" />
                        {cp.solicitar_levantamento}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Seccao: Cartao Virtual */}
              {secao === 'cartao' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.cartao_titulo}</h3>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">{cp.cartao_desc}</p>
                  </div>

                  <div className="flex flex-col items-center gap-6">
                    <CosmicNebulaMastercard
                      cardholderName={carteira?.usuarioId ? `VAKS-${carteira.usuarioId.substring(0, 8).toUpperCase()}` : 'VAKS CARDHOLDER'}
                      width="450px"
                      height="280px"
                      theme={{
                        primaryColor: "#7C3AED",
                        secondaryColor: "#7144B7",
                        glowColor: "rgba(124, 58, 237, 0.6)",
                      }}
                      logoText={{ topText: "VAKS", bottomText: "CARD" }}
                    />

                    <div className="w-full max-w-md space-y-4">
                      <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover overflow-hidden">
                        <div className="border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 px-6 py-4">
                          <h4 className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.detalhes_cartao}</h4>
                        </div>
                        <div className="divide-y divide-vaks-light-stroke/10 dark:divide-vaks-dark-stroke/10">
                          <div className="flex justify-between items-center px-6 py-3.5">
                            <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.numero}</span>
                            <span className="text-xs font-mono font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">**** **** **** 1234</span>
                          </div>
                          <div className="flex justify-between items-center px-6 py-3.5">
                            <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.validade}</span>
                            <span className="text-xs font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">12/26</span>
                          </div>
                          <div className="flex justify-between items-center px-6 py-3.5">
                            <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">Status</span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/15 px-3 py-1 rounded-lg">{cp.ativa}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 dark:from-purple-600 dark:via-purple-700 dark:to-purple-800 px-4 py-3.5 text-sm font-bold shadow-lg shadow-purple-200/40 text-white hover:opacity-90 transition-opacity">
                          {cp.bloquear}
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3.5 text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover transition-colors">
                          {cp.definicoes}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seccao: Historico */}
              {secao === 'historico' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-extrabold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.historico_titulo}</h3>
                    <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{cp.historico_desc}</p>
                  </div>
                  <div className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card shadow-md dark:shadow-vaks-dark-purple-card-hover overflow-hidden">
                    <HistoricoTransacoes
                      transacoes={carteira?.transacoes ?? []}
                      onSelectTransacao={handleOpenTxDetalhe}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Lado Direito - hidden on mobile */}
          <div className="hidden lg:block w-72 flex-shrink-0 self-stretch">
            <div className="rounded-3xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card overflow-hidden shadow-md dark:shadow-vaks-dark-purple-card-hover sticky top-8 h-full">
              <div className="border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 p-6">
                <h2 className="text-base font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{cp.menu_titulo}</h2>
                <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">{cp.menu_desc}</p>
              </div>
              <nav className="p-3">
                {MENU_ITEMS.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSecao(item.id)}
                    className={`w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl text-left transition-all duration-200 mb-1 ${
                      secao === item.id
                        ? 'bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white'
                        : 'hover:bg-vaks-light-primary/50 dark:hover:bg-vaks-dark-primary/30 text-vaks-light-main-txt dark:text-vaks-dark-main-txt'
                    }`}
                  >
                    <div className={`flex-shrink-0 ${secao === item.id ? 'text-white' : 'text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt'}`}>
                      {item.icone}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${secao === item.id ? 'text-white' : ''}`}>{item.label}</div>
                      <div className={`text-[10px] mt-0.5 ${secao === item.id ? 'text-white/70' : 'text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt'}`}>{item.descricao}</div>
                    </div>
                    {secao === item.id && <ChevronLeft className="w-4 h-4 text-white/70 flex-shrink-0" />}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {txDetalheOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closeTxDetalhe}>
          <div
            className="w-full max-w-xl rounded-2xl border border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{t.headings.transaction_detail}</h3>
              <button onClick={closeTxDetalhe} className="rounded-lg p-2 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input">
                <X className="h-4 w-4" />
              </button>
            </div>

            {txDetalheLoading && (
              <div className="py-10 text-center text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                A carregar detalhe...
              </div>
            )}

            {txDetalheErro && !txDetalheLoading && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {txDetalheErro}
              </div>
            )}

            {txDetalhe && !txDetalheLoading && !txDetalheErro && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.labels.id}</span><span className="font-mono text-right text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{txDetalhe.id}</span></div>
                <div className="flex justify-between gap-4"><span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.labels.type}</span><span className="font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{txDetalhe.type}</span></div>
                <div className="flex justify-between gap-4"><span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.labels.status}</span><span className="font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{txDetalhe.status}</span></div>
                <div className="flex justify-between gap-4"><span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.labels.value}</span><span className="font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{txDetalhe.amount.toFixed(2)} VAKS</span></div>
                <div className="flex justify-between gap-4"><span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.labels.origin}</span><span className="font-mono text-right text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{txDetalhe.fromWalletId || 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.labels.destination}</span><span className="font-mono text-right text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{txDetalhe.toWalletId || 'N/A'}</span></div>
                <div className="flex justify-between gap-4"><span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.labels.created_at}</span><span className="text-right text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{new Date(txDetalhe.createdAt).toLocaleString('pt-AO')}</span></div>
                <div>
                  <span className="text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.labels.metadata}</span>
                  <pre className="mt-1 max-h-40 overflow-auto rounded-xl bg-vaks-light-input dark:bg-vaks-dark-input p-3 text-xs text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
{JSON.stringify(txDetalhe.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CarteiraPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vaks-cobalt"></div></div>}>
      <CarteiraContent />
    </Suspense>
  );
}
