"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  ArrowDownToLine,
  HandCoins,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";

import { useOperacoesFrequentes } from "@/hooks/dashboard/useOperacoesFrequentes";
import {
  type OperacaoFrequenteRecord,
  type OperacaoPayload,
  type TipoOperacao,
  getHrefOperacao,
} from "@/types/operacoesFrequentes";
import { useI18n } from "@/locales";

// ─────────────────────────────────────────────────────────────────────────────
// Configuração visual por tipo
// ─────────────────────────────────────────────────────────────────────────────

const VISUAL_CONFIG: Record<
  TipoOperacao,
  {
    Icon: React.ElementType;
    color: string; // bg-* do Tailwind
    label: (payload: OperacaoPayload) => string;
    sublabel: (payload: OperacaoPayload) => string;
  }
> = {
  transferir: {
    Icon: Send,
    color: "bg-purple-500",
    label: (p) => {
      if (p.tipo !== "transferir") return "";
      return p.nomeDestinatario;
    },
    sublabel: (p) => {
      if (p.tipo !== "transferir") return "";
      const moeda = p.moeda ?? "AOA";
      return `${Number(p.valor).toLocaleString("pt-AO")} ${moeda}`;
    },
  },
  carregar: {
    Icon: ArrowDownToLine,
    color: "bg-emerald-500",
    label: (p) => {
      if (p.tipo !== "carregar") return "";
      return p.numeroTelefone;
    },
    sublabel: (p) => {
      if (p.tipo !== "carregar") return "";
      return p.operadora;
    },
  },
  converter: {
    Icon: ArrowLeftRight,
    color: "bg-sky-500",
    label: (p) => {
      if (p.tipo !== "converter") return "";
      return `${p.moedaOrigem} → ${p.moedaDestino}`;
    },
    sublabel: (p) => {
      if (p.tipo !== "converter") return "";
      return `${Number(p.valor).toLocaleString("pt-AO")} ${p.moedaOrigem}`;
    },
  },
  contribuir: {
    Icon: HandCoins,
    color: "bg-amber-500",
    label: (p) => {
      if (p.tipo !== "contribuir") return "";
      return p.nomeVaquinha;
    },
    sublabel: (p) => {
      if (p.tipo !== "contribuir") return "";
      return `${Number(p.valor).toLocaleString("pt-AO")} AOA`;
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Variantes de animação
// ─────────────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.88, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ease: "easeOut" as const, duration: 0.25 },
  },
  exit: {
    opacity: 0,
    scale: 0.85,
    transition: { duration: 0.15 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: card de uma operação frequente
// ─────────────────────────────────────────────────────────────────────────────

interface CardOperacaoProps {
  record: OperacaoFrequenteRecord;
  onRemover: (id: string) => void;
}

function CardOperacao({ record, onRemover }: CardOperacaoProps) {
  const { payload } = record;
  const cfg = VISUAL_CONFIG[payload.tipo];
  const { Icon } = cfg;
  const href = getHrefOperacao(payload);

  return (
    <motion.div
      layout
      variants={itemVariants}
      className="group relative flex-shrink-0"
    >
      {/* Botão de remover — aparece no hover */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onRemover(record.id);
        }}
        aria-label="Remover operação frequente"
        className="
          absolute -right-1.5 -top-1.5 z-10
          flex h-5 w-5 items-center justify-center
          rounded-full bg-vaks-light-stroke/60 dark:bg-vaks-dark-stroke/50
          text-vaks-light-secondary-txt dark:text-vaks-dark-secondary-txt
          opacity-0 transition-all duration-150
          hover:bg-red-500 hover:text-white
          group-hover:opacity-100
          focus-visible:opacity-100 focus-visible:outline-none
        "
      >
        <X className="h-3 w-3" />
      </button>

      <Link
        href={href}
        prefetch={false}
        className="
          flex flex-col items-center gap-2
          min-w-[5.5rem] max-w-[5.5rem]
          rounded-xl border
          border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15
          bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card
          p-3
          transition-colors duration-150
          hover:border-vaks-light-stroke/50 dark:hover:border-vaks-dark-stroke/40
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500
        "
      >
        {/* Ícone */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${cfg.color}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Label principal */}
        <span className="w-full truncate text-center text-[11px] font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          {cfg.label(payload)}
        </span>

        {/* Sublabel (valor / operadora / etc.) */}
        <span className="w-full truncate text-center text-[10px] text-vaks-light-secondary-txt dark:text-vaks-dark-secondary-txt">
          {cfg.sublabel(payload)}
        </span>
      </Link>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Estado vazio
// ─────────────────────────────────────────────────────────────────────────────

function EstadoVazio() {
  const { t } = useI18n();
  const dash = t.dashboard;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: "easeOut", duration: 0.25 }}
      className="
        flex items-center gap-3
        w-full rounded-xl border border-dashed
        border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20
        bg-vaks-light-purple-card/50 dark:bg-vaks-dark-purple-card/50
        px-4 py-3.5
      "
    >
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-vaks-light-stroke/10 dark:bg-vaks-dark-stroke/10">
        <Send className="h-4 w-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          {dash.vazio}
        </span>
        <span className="text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
          {dash.descricao}
        </span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface OperacoesFrequentesProps {
  /** Título da secção — permite passar tradução externamente */
  titulo?: string;
  /** Classe extra para o wrapper externo */
  className?: string;
  /**
   * Mock de operações frequentes para desenvolvimento.
   * Substitui o localStorage — remover em produção.
   * @example
   * mockFrequentes={[
   *   { id: "transferir:AO06...:15000", contagem: 3, ultimaExecucao: Date.now(), payload: { tipo: "transferir", ... } }
   * ]}
   */
  mockFrequentes?: OperacaoFrequenteRecord[];
}

export default function OperacoesFrequentes({
  className,
  mockFrequentes,
}: OperacoesFrequentesProps) {
  const { frequentes, removerFrequente } = useOperacoesFrequentes({
    initialMock: mockFrequentes,
  });

  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
      initial="hidden"
      animate="show"
      transition={{ ease: "easeOut", duration: 0.3 }}
      className={className}
      aria-labelledby="op-frequentes-titulo"
    >

      <AnimatePresence mode="wait">
        {frequentes.length === 0 ? (
          <EstadoVazio key="vazio" />
        ) : (
          <motion.div
            key="lista"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
          >
            <AnimatePresence mode="popLayout">
              {frequentes.map((record) => (
                <CardOperacao
                  key={record.id}
                  record={record}
                  onRemover={removerFrequente}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exporta o hook e os tipos para conveniência dos consumidores deste módulo
// ─────────────────────────────────────────────────────────────────────────────

export { useOperacoesFrequentes } from "@/hooks/dashboard/useOperacoesFrequentes";
export type {
  OperacaoPayload,
  PayloadTransferir,
  PayloadCarregar,
  PayloadConverter,
  PayloadContribuir,
} from "@/types/operacoesFrequentes";