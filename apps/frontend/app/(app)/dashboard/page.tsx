'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, CreditCard, Send, ArrowDownToLine, ArrowRightLeft,
  HandCoins, Receipt, Landmark, ChevronRight, ArrowUpRight, ArrowDownLeft,
  TrendingUp, Plus, Globe, Lock, Wallet, History, Zap, Hand,
} from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/locales";
import CosmicNebulaMastercard from "@/components/carteira/cursor-wander-card";
import  OperacoesFrequentes from "@/components/dashboard/operacoes-frequentes";
import { useAuth } from "@/contexts/auth";
import { api } from "@/utils/api/api";
import { transferirVaks } from "@/utils/wallet";
import { toast } from "@/utils/toast";
import { useAllVaquinhas } from "@/hooks/vaquinhas/useVaquinhas";

type DashboardTxType = "contribuicao" | "recebimento" | "transferencia";

interface DashboardTransaction {
  id: string;
  tipo: DashboardTxType;
  nome: string;
  valor: number;
  data: string;
  status?: string;
}

interface WalletResponse {
  id: string;
  balance: string | number;
}

interface WalletTxApi {
  id: string;
  fromWalletId: string | null;
  toWalletId: string | null;
  amount: string | number;
  type: "P2P_TRANSFER" | "CAMPAIGN_CONTRIBUTION" | "CAMPAIGN_WITHDRAWAL" | "DEPOSIT";
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface WalletTransactionsResponse {
  data: WalletTxApi[];
}

const TIPO_ICON = {
  contribuicao: <ArrowUpRight className="h-4 w-4" />,
  recebimento: <ArrowDownLeft className="h-4 w-4" />,
  transferencia: <ArrowUpRight className="h-4 w-4" />,
};

const TIPO_COLOR = {
  contribuicao: "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  recebimento: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  transferencia: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
};

/* ── Animations ───────────────────────────────────────────────── */

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/* ── Frequent Operations ──────────────────────────────────────── */

const operacoesFrequentesData = [
  { icon: Send, key: "op_transferir" as const, href: "/carteira/transferir", color: "bg-purple-500" },
  { icon: ArrowDownToLine, key: "op_carregar" as const, href: "/carteira/carregar", color: "bg-emerald-500" },
  { icon: ArrowRightLeft, key: "op_converter" as const, href: "/carteira/converter", color: "bg-sky-500" },
  { icon: HandCoins, key: "op_contribuir" as const, href: "/vaquinhas", color: "bg-amber-500" },
  { icon: Plus, key: "op_nova_vaquinha" as const, href: "/vaquinhas/privadas/criar", color: "bg-pink-500" },
  { icon: Receipt, key: "op_historico" as const, href: "/carteira?secao=historico", color: "bg-indigo-500" },
];

/* ── Quick Links ──────────────────────────────────────────────── */

const linksRapidosData = [
  { icon: Send, key: "link_transferencias" as const, href: "/carteira/transferir" },
  { icon: ArrowDownToLine, key: "op_carregar" as const, href: "/carteira/carregar" },
  { icon: Wallet, key: "link_carteira" as const, href: "/carteira" },
  { icon: Landmark, key: "link_converter" as const, href: "/carteira/converter" },
];

/* ── Component ────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [saldoVisivel, setSaldoVisivel] = useState(false);
  const [destinatario, setDestinatario] = useState("");
  const [montante, setMontante] = useState("");
  const [saldo, setSaldo] = useState(0);
  const [saldoPendente, setSaldoPendente] = useState(0);
  const [transacoes, setTransacoes] = useState<DashboardTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);

  const { vaquinhas, loading: vaquinhasLoading } = useAllVaquinhas();

  const userName = user?.username || "Utilizador";
  const disponivel = Math.max(0, saldo - saldoPendente);
  const d = t.dashboard;
  
  // Labels dinâmicos para transações
  const TIPO_LABEL = {
    contribuicao: t.dashboard.transacoes.tipo_contribuicao,
    recebimento: t.dashboard.transacoes.tipo_recebimento,
    transferencia: t.dashboard.transacoes.tipo_transferencia,
  }

  // Função para traduzir meses (calendário)
  const translateMonth = (monthName: string): string => {
    const monthMap: Record<string, keyof typeof t.meses> = {
      'Jan': 'jan', 'Feb': 'fev', 'Mar': 'mar', 'Apr': 'abr',
      'May': 'mai', 'Jun': 'jun', 'Jul': 'jul', 'Aug': 'ago',
      'Sep': 'set', 'Oct': 'out', 'Nov': 'nov', 'Dec': 'dez',
      'Ene': 'jan', 'Fév': 'fev', 'Avr': 'abr', 'Aoû': 'ago',
      'Déc': 'dez', 'Dic': 'dez', 'Fev': 'fev', 'Ago': 'ago', 'Set': 'set', 'Out': 'out',
    }
    return t.meses[monthMap[monthName] || 'jan']
  }

  // Função para traduzir data com advérbios (Hoje, Ontem, etc.) e calendário
  const translateDateTime = (dateStr: string): string => {
    // Suporta dois formatos:
    // 1. "Hoje, 14:32", "Ontem, 18:45" → traduz advérbios
    // 2. "3 Mar, 11:20" → traduz mês do calendário
    
    // Formato 1: Advérbios de data
    if (dateStr.includes('Hoje,')) {
      const time = dateStr.split(', ')[1]
      return `${t.data_adverbios.hoje}, ${time}`
    }
    if (dateStr.includes('Ontem,')) {
      const time = dateStr.split(', ')[1]
      return `${t.data_adverbios.ontem}, ${time}`
    }
    if (dateStr.includes('Amanhã,')) {
      const time = dateStr.split(', ')[1]
      return `${t.data_adverbios.amanha}, ${time}`
    }
    
    // Formato 2: Data de calendário "3 Mar, 11:20"
    const parts = dateStr.split(', ')
    if (parts.length === 2) {
      const datePart = parts[0] // "3 Mar"
      const timePart = parts[1] // "11:20"
      const dateParts = datePart.split(' ')
      if (dateParts.length === 2) {
        const day = dateParts[0]
        const month = dateParts[1]
        const translatedMonth = translateMonth(month)
        return `${day} ${translatedMonth}, ${timePart}`
      }
    }
    
    return dateStr // fallback
  }

  const formatTxDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");

    if (isToday) return `Hoje, ${hh}:${mm}`;
    if (isYesterday) return `Ontem, ${hh}:${mm}`;

    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
    return `${date.getDate()} ${month}, ${hh}:${mm}`;
  };

  const toNumber = (value: string | number | undefined | null): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") return parseFloat(value) || 0;
    return 0;
  };

  const pickText = (...values: unknown[]): string | undefined => {
    for (const value of values) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  };

  const fetchWalletData = useCallback(async () => {
    setWalletLoading(true);
    try {
      const wallet = await api.get<WalletResponse>("/wallet");
      const walletId = wallet.id;
      setSaldo(toNumber(wallet.balance));

      const txResponse = await api.get<WalletTransactionsResponse>("/wallet/transactions", {
        params: { page: 1, limit: 10 },
      });

      const mapped = (txResponse.data || []).map((tx): DashboardTransaction => {
        const amount = toNumber(tx.amount);

        if (tx.type === "CAMPAIGN_CONTRIBUTION") {
          return {
            id: tx.id,
            tipo: "contribuicao",
            nome: pickText(tx.metadata?.campaignTitle, tx.metadata?.campaignName) || "Contribuição em campanha",
            valor: -Math.abs(amount),
            data: formatTxDate(tx.createdAt),
            status: tx.status,
          };
        }

        if (tx.type === "P2P_TRANSFER") {
          const sentByMe = tx.fromWalletId === walletId;
          return {
            id: tx.id,
            tipo: sentByMe ? "transferencia" : "recebimento",
            nome: sentByMe
              ? (pickText(tx.metadata?.toUsername, tx.metadata?.note) || "Transferência enviada")
              : (pickText(tx.metadata?.fromUsername, tx.metadata?.note) || "Transferência recebida"),
            valor: sentByMe ? -Math.abs(amount) : Math.abs(amount),
            data: formatTxDate(tx.createdAt),
            status: tx.status,
          };
        }

        if (tx.type === "DEPOSIT" || tx.type === "CAMPAIGN_WITHDRAWAL") {
          return {
            id: tx.id,
            tipo: "recebimento",
            nome: pickText(tx.metadata?.note) || (tx.type === "DEPOSIT" ? "Depósito" : "Levantamento de campanha"),
            valor: Math.abs(amount),
            data: formatTxDate(tx.createdAt),
            status: tx.status,
          };
        }

        return {
          id: tx.id,
          tipo: "transferencia",
          nome: "Transação",
          valor: amount,
          data: formatTxDate(tx.createdAt),
          status: tx.status,
        };
      });

      const pendente = mapped
        .filter((tx) => tx.status === "PENDING" && tx.valor < 0)
        .reduce((acc, tx) => acc + Math.abs(tx.valor), 0);

      setSaldoPendente(pendente);
      setTransacoes(mapped.slice(0, 4));
    } catch {
      setSaldo(0);
      setSaldoPendente(0);
      setTransacoes([]);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const handleQuickTransfer = async () => {
    const recipient = destinatario.trim();
    const amount = parseFloat(montante);

    if (!recipient) {
      toast.error("Beneficiário obrigatório", "Informa um email ou UUID válido.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Montante inválido", "Informa um valor maior que 0.");
      return;
    }

    setTransferLoading(true);

    try {
      await transferirVaks({ recipient, amount });
      toast.success("Transferência realizada com sucesso!");
      setDestinatario("");
      setMontante("");
      await fetchWalletData();
    } catch (error: unknown) {
      const rawMessage =
        typeof error === "object" &&
        error !== null &&
        "message" in error
          ? Array.isArray((error as { message: unknown }).message)
            ? (error as { message: string[] }).message.join(" | ")
            : String((error as { message: unknown }).message)
          : "Não foi possível concluir a transferência.";

      const recipientNotFound = /USER_NOT_FOUND|RECIPIENT_USER_NOT_FOUND|RECIPIENT_WALLET_NOT_FOUND|Destinatario invalido ou nao encontrado/i.test(rawMessage);
      const message = recipientNotFound
        ? "Destinatário inválido ou não encontrado."
        : rawMessage;

      toast.error("Erro na transferência", message);
    } finally {
      setTransferLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const vaquinhasRecentes = useMemo(() => {
    return vaquinhas.slice(0, 3).map((vaq) => {
      const progresso = vaq.meta > 0 ? Math.min(100, Math.round((vaq.arrecadado / vaq.meta) * 100)) : 0;
      return {
        id: vaq.id,
        nome: vaq.nome,
        tipo: vaq.isPrivate ? "privada" as const : "publica" as const,
        progresso,
        meta: vaq.meta,
        arrecadado: vaq.arrecadado,
      };
    });
  }, [vaquinhas]);

  return (
    <div className="h-full bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {/* Scrollable content below fixed Nav */}
      <div className="px-4 sm:px-6 lg:px-8 pb-10 max-w-7xl mx-auto space-y-6">

        {/* ━━━ Greeting + Balance ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" as const }}
          className="pt-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xl text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {d.saudacao} {userName} <Hand className="inline h-5 w-5 ml-1 text-amber-400" />
              </p>
              <p className="text-sm text-vaks-light-alt-txt/70 dark:text-vaks-dark-alt-txt/70 mt-0.5">
                {walletLoading ? d.carregando : d.ativos}
              </p>
            </div>

            {/* Balance */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-extrabold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {saldoVisivel
                    ? saldo.toLocaleString("pt-AO", { minimumFractionDigits: 2 })
                    : "••••••"}
                </span>
                <span className="ml-2 text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                  VAKS
                </span>
              </div>
              <button
                onClick={() => setSaldoVisivel((v) => !v)}
                className="p-2 rounded-xl hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input transition-colors text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt"
              >
                {saldoVisivel ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ━━━ Card + Transfer Form ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* ── Left: VAKS Card ─────────────────────────────────── */}
          <motion.div variants={fadeUp} className="space-y-4">
            <div className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card p-5 dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card h-full flex flex-col shadow-md dark:shadow-vaks-dark-purple-card-hover">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
                <h3 className="text-xl font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {d.cartao_vaks}
                </h3>
              </div>

              {/* 3D Card - responsive wrapper */}
              <div className="flex justify-center overflow-hidden">
                <div className="transform scale-75 sm:scale-100 origin-center">
                  <CosmicNebulaMastercard
                    cardholderName={userName.toUpperCase()}
                    height="220px"
                    width="360px"
                  />
                </div>
              </div>

              {/* Card actions */}
              <div className="flex gap-3 mt-14">
                <Link
                  href="/carteira"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-2.5 text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {d.ver_dados}
                </Link>
                <Link
                  href="/carteira/carregar"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  {d.carregar}
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── Right: Quick Transfer ───────────────────────────── */}
          <motion.div variants={fadeUp}>
            <div className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card p-5 dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card h-full flex flex-col shadow-md dark:shadow-vaks-dark-purple-card-hover">
              <div className="flex items-center gap-2 mb-5">
                <Zap className="h-5 w-5 text-amber-500" />
                <h3 className="text-xl font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {d.transferencia_rapida}
                </h3>
              </div>

              <div className="space-y-4 flex-1">
                {/* Conta de Origem */}
                <div>
                  <label className="text-xs font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-1.5 block">
                    {d.conta_origem}
                  </label>
                  <div className="flex items-center gap-3 rounded-xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3">
                    <Wallet className="h-4 w-4 text-vaks-cobalt dark:text-vaks-dark-secondary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{d.carteira_principal}</p>
                      <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                        {d.disponivel}: {saldoVisivel ? disponivel.toLocaleString("pt-AO", { minimumFractionDigits: 2 }) : "••••"} VAKS
                      </p>
                    </div>
                  </div>
                </div>

                {/* Beneficiário */}
                <div>
                  <label className="text-xs font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-1.5 block">
                    {d.beneficiario}
                  </label>
                  <input
                    type="text"
                    value={destinatario}
                    onChange={(e) => setDestinatario(e.target.value)}
                    placeholder={d.placeholder_beneficiario}
                    className="w-full rounded-xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow"
                  />
                </div>

                {/* Montante */}
                <div>
                  <label className="text-xs font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mb-1.5 block">
                    {d.montante}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={montante}
                      onChange={(e) => setMontante(e.target.value)}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      className="w-full rounded-xl bg-vaks-light-input dark:bg-vaks-dark-input px-4 py-3 pr-16 text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt placeholder:text-vaks-light-alt-txt/50 dark:placeholder:text-vaks-dark-alt-txt/50 outline-none focus:ring-2 focus:ring-vaks-cobalt/30 dark:focus:ring-vaks-dark-secondary/30 transition-shadow"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                      VAKS
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleQuickTransfer}
                disabled={transferLoading || !destinatario.trim() || !montante.trim()}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {transferLoading ? t.buttons.sending : d.validar_transferencia}
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* ━━━ Frequent Operations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <h3 className="text-xl font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-3">
            {d.operacoes_frequentes}
          </h3>
          <OperacoesFrequentes />
        </motion.div>

        {/* ━━━ Bottom Grid: Património / Links / Movimentos ━━━━━ */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* ── Património ──────────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card overflow-hidden shadow-md dark:shadow-vaks-dark-purple-card-hover"
          >
            <div className="flex items-center justify-between border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 px-5 py-4">
              <h3 className="text-xl font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {d.patrimonio}
              </h3>
              <Link
                href="/carteira"
                className="text-[11px] font-medium text-vaks-light-purple-button dark:text-vaks-dark-secondary hover:underline"
              >
                {d.ver_tudo}
              </Link>
            </div>

            <div className="p-5 space-y-4">
              {/* Activos */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{d.ativos_label}</p>
                  <p className="text-sm font-bold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                    {saldoVisivel ? saldo.toLocaleString("pt-AO", { minimumFractionDigits: 2 }) : "••••"} VAKS
                  </p>
                </div>
              </div>

              {/* Pendente */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  <History className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{d.pendente}</p>
                  <p className="text-sm font-bold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                    {saldoVisivel ? saldoPendente.toLocaleString("pt-AO", { minimumFractionDigits: 2 }) : "••••"} VAKS
                  </p>
                </div>
              </div>

              {/* Disponível */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{d.disponivel_label}</p>
                  <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {saldoVisivel ? disponivel.toLocaleString("pt-AO", { minimumFractionDigits: 2 }) : "••••"} VAKS
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Links Rápidos ──────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card overflow-hidden shadow-md dark:shadow-vaks-dark-purple-card-hover"
          >
            <div className="border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 px-5 py-4">
              <h3 className="text-xl font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {d.links_rapidos}
              </h3>
            </div>

            <div className="divide-y divide-vaks-light-stroke/10 dark:divide-vaks-dark-stroke/10">
              {linksRapidosData.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-vaks-light-primary/50 dark:hover:bg-vaks-dark-primary/30 transition-colors group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-vaks-cobalt/10 text-vaks-cobalt dark:bg-vaks-dark-secondary/15 dark:text-vaks-dark-secondary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      {d[link.key]}
                    </span>
                    <ChevronRight className="h-4 w-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt group-hover:text-vaks-cobalt dark:group-hover:text-vaks-dark-secondary transition-colors" />
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* ── Saldos e Movimentos ────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card overflow-hidden shadow-md dark:shadow-vaks-dark-purple-card-hover"
          >
            <div className="flex items-center justify-between border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 px-5 py-4">
              <h3 className="text-xl font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {d.saldos_movimentos}
              </h3>
              <Link
                href="/carteira?secao=historico"
                className="text-[11px] font-medium text-vaks-light-purple-button dark:text-vaks-dark-secondary hover:underline"
              >
                {d.ver_tudo}
              </Link>
            </div>

            <div className="divide-y divide-vaks-light-stroke/10 dark:divide-vaks-dark-stroke/10">
              {transacoes.length === 0 && !walletLoading && (
                <div className="px-5 py-6 text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                  {d.sem_movimentos}
                </div>
              )}

              {walletLoading && (
                <div className="px-5 py-6 text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                  {d.carregar_movimentos}
                </div>
              )}

              {transacoes.map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05, ease: "easeOut" as const }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-vaks-light-primary/50 dark:hover:bg-vaks-dark-primary/30 transition-colors"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TIPO_COLOR[tx.tipo]}`}>
                    {TIPO_ICON[tx.tipo]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      {tx.nome}
                    </p>
                    <p className="text-[10px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                      {translateDateTime(tx.data)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ${tx.valor > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-vaks-light-main-txt dark:text-vaks-dark-main-txt"}`}>
                    {tx.valor > 0 ? "+" : ""}{tx.valor.toLocaleString("pt-AO")} <span className="text-[10px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">VAKS</span>
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* ━━━ Vaquinhas Recentes ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-2xl border border-vaks-light-stroke/30 bg-vaks-light-purple-card dark:border-vaks-dark-stroke/20 dark:bg-vaks-dark-purple-card overflow-hidden shadow-md dark:shadow-vaks-dark-purple-card-hover"
        >
          <div className="flex items-center justify-between border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15 px-5 py-4">
            <div className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
              <h3 className="text-xl font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {d.vaquinhas_recentes}
              </h3>
            </div>
            <Link
              href="/vaquinhas"
              className="text-[11px] font-medium text-vaks-light-purple-button dark:text-vaks-dark-secondary hover:underline"
            >
              {d.ver_todas}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-vaks-light-stroke/10 dark:divide-vaks-dark-stroke/10">
            {vaquinhasRecentes.map((vaq, i) => (
              <Link key={vaq.id} href={vaq.tipo === 'privada' ? `/vaquinhas/privadas/${vaq.id}` : `/vaquinhas/${vaq.id}`} className="block">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, ease: "easeOut" as const }}
                  className="p-5 hover:bg-vaks-light-primary/40 dark:hover:bg-vaks-dark-primary/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${vaq.tipo === "privada" ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"}`}>
                      {vaq.tipo === "privada" ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                      {vaq.tipo === "privada" ? d.privada : d.publica}
                    </span>
                    <ChevronRight className="h-4 w-4 text-vaks-light-alt-txt hover:text-vaks-cobalt dark:text-vaks-dark-alt-txt dark:hover:text-vaks-dark-secondary transition-colors" />
                  </div>

                <p className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-3 truncate">
                  {vaq.nome}
                </p>

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-vaks-light-input dark:bg-vaks-dark-input">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${vaq.progresso}%` }}
                      transition={{ duration: 0.7, ease: "easeOut" as const, delay: 0.3 + i * 0.08 }}
                      className={`absolute inset-y-0 left-0 rounded-full ${vaq.progresso >= 100 ? "bg-emerald-500" : "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button"}`}
                    />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                    {vaq.progresso}%
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                  {vaq.arrecadado.toLocaleString("pt-AO")} / {vaq.meta.toLocaleString("pt-AO")} VAKS
                </p>
                </motion.div>
              </Link>
            ))}

            {!vaquinhasLoading && vaquinhasRecentes.length === 0 && (
              <div className="p-5 text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {d.sem_vaquinhas}
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
