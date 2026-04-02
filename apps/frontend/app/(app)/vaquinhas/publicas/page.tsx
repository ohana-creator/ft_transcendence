/**
 * Página: Vaquinhas Públicas
 * Lista todas as vaquinhas públicas disponíveis no VAKS
 * Inclui filtros por categoria, busca e ordenação
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useAnimate } from "framer-motion";
import { useI18n } from '@/locales';
import { useAnimatedRouter } from "@/hooks/vaquinhas/useAnimatedRouter";

// ─── Social Proof Ticker ────────────────────────────────────────────────
interface TickerItem {
  id: number;
  nome: string;
  valor: number;
  vaquinha: string;
  timestamp: Date;
}

function SocialProofTicker() {
  const { t } = useI18n();
  const tk = t.vaquinhas.ticker;

  const [items, setItems] = useState<TickerItem[]>([
    {
      id: 1,
      nome: "Alguem",
      valor: 50,
      vaquinha: "Ajuda ao Abrigo",
      timestamp: new Date(),
    },
    {
      id: 2,
      nome: "Um amigo",
      valor: 120,
      vaquinha: "Festa de Verao",
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: 3,
      nome: "Contribuidor",
      valor: 30,
      vaquinha: "Material Escolar",
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: 4,
      nome: "Anonimo",
      valor: 200,
      vaquinha: "Viagem Solidaria",
      timestamp: new Date(Date.now() - 180000),
    },
    {
      id: 5,
      nome: "Alguem generoso",
      valor: 75,
      vaquinha: "Projeto Comunitario",
      timestamp: new Date(Date.now() - 240000),
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-2xl px-6 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <span className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider flex-shrink-0">
          {tk.em_direto}
        </span>
        <div className="h-4 w-px bg-white/10 flex-shrink-0" />
        <AnimatePresence mode="wait">
          <motion.p
            key={currentIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-white/80"
          >
            <span className="font-semibold text-white">
              {items[currentIndex].nome}
            </span>{" "}
            {tk.acabou_de_doar}{" "}
            <span className="font-bold text-emerald-400">
              {items[currentIndex].valor} VAKS
            </span>{" "}
            {tk.para}{" "}
            <span className="font-semibold text-cyan-300">
              "{items[currentIndex].vaquinha}"
            </span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Avatar Stack (Contribuidores) ──────────────────────────────────────
interface AvatarStackProps {
  contribuidores: string[];
  max?: number;
}

function AvatarStack({ contribuidores, max = 5 }: AvatarStackProps) {
  const { t } = useI18n();
  const hb = t.vaquinhas.hub;
  const visibleAvatars = contribuidores.slice(0, max);
  const remaining = contribuidores.length - max;
  const contributorLabel = contribuidores.length === 1 ? hb.contribuidor : hb.contribuidores;

  const colors = [
    "from-rose-400 to-pink-500",
    "from-violet-400 to-purple-500",
    "from-cyan-400 to-blue-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-fuchsia-400 to-pink-500",
    "from-sky-400 to-indigo-500",
  ];

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2.5">
        {visibleAvatars.map((nome, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, x: -10 }}
            animate={{ scale: 1, x: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 300 }}
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center ring-2 ring-zinc-900 text-[11px] font-bold text-white cursor-default`}
            title={nome}
          >
            {nome.charAt(0).toUpperCase()}
          </motion.div>
        ))}
        {remaining > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: max * 0.05 }}
            className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ring-2 ring-zinc-900 text-[10px] font-semibold text-white/70"
          >
            +{remaining}
          </motion.div>
        )}
      </div>
      <span className="ml-3 text-xs text-white/50">
        {contribuidores.length} {contributorLabel}
      </span>
    </div>
  );
}

// ─── Progress Ring ──────────────────────────────────────────────────────
function ProgressRing({
  percent,
  size = 56,
}: {
  percent: number;
  size?: number;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const clampedPercent = Math.min(Math.max(percent, 0), 100) / 100;
  const progressPath = `M ${center} ${center - radius} a ${radius} ${radius} 0 1 1 0 ${radius * 2} a ${radius} ${radius} 0 1 1 0 ${-radius * 2}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/5"
        />
        <motion.path
          d={progressPath}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          pathLength={clampedPercent}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clampedPercent }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient
            id="progressGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white">
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

// ─── Category Pill ──────────────────────────────────────────────────────
interface CategoryPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

function CategoryPill({ label, active, onClick, count }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300
        ${
          active
            ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25"
            : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
        }
      `}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-2 text-xs ${active ? "text-white/80" : "text-white/40"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Vaquinha Card Pública ──────────────────────────────────────────────
interface VaquinhaPublica {
  id: string;
  nome: string;
  descricao: string;
  meta: number;
  arrecadado: number;
  criador: string;
  categoria: string;
  contribuidores: string[];
  imagem: string;
  diasRestantes: number;
  destaque: boolean;
}

function VaquinhaPublicaCard({
  vaquinha,
  index,
}: {
  vaquinha: VaquinhaPublica;
  index: number;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const percent = vaquinha.meta > 0
    ? Math.min((vaquinha.arrecadado / vaquinha.meta) * 100, 100)
    : 0;

  const categoryColors: Record<string, string> = {
    Solidariedade:
      "from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/30",
    Educacao:
      "from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/30",
    Eventos:
      "from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30",
    Comunidade:
      "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30",
    Desporto: "from-cyan-500/20 to-sky-500/20 text-cyan-300 border-cyan-500/30",
    Cultura:
      "from-purple-500/20 to-violet-500/20 text-purple-300 border-purple-500/30",
  };

  const categoryColor =
    categoryColors[vaquinha.categoria] ||
    "from-white/10 to-white/5 text-white/70 border-white/20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={() => router.push(`/vaquinhas/${vaquinha.id}`)}
      className="group cursor-pointer"
    >
      <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-3xl border border-white/[0.06] overflow-hidden hover:border-emerald-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/10">
        {/* Imagem de Capa */}
        <div className="relative h-48 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
            style={{ backgroundImage: `url(${vaquinha.imagem})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

          {/* Badge Destaque */}
          {vaquinha.destaque && (
            <div className="absolute top-4 left-4">
              <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg text-xs font-bold text-white shadow-lg shadow-amber-500/30">
                {t.vaquinhas.hub.em_destaque}
              </div>
            </div>
          )}

          {/* Categoria Badge */}
          <div className="absolute top-4 right-4">
            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r ${categoryColor} border backdrop-blur-sm`}
            >
              {vaquinha.categoria}
            </div>
          </div>

          {/* Progress Ring Overlay */}
          <div className="absolute bottom-4 right-4">
            <ProgressRing percent={percent} />
          </div>

          {/* Dias Restantes */}
          <div className="absolute bottom-4 left-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg">
              <div
                className={`w-1.5 h-1.5 rounded-full ${vaquinha.diasRestantes <= 3 ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`}
              />
              <span className="text-xs font-medium text-white/80">
                {vaquinha.diasRestantes <= 0
                  ? t.vaquinhas.status.encerrada
                  : `${vaquinha.diasRestantes} ${t.vaquinhas.publica.dias_restantes}`}
              </span>
            </div>
          </div>
        </div>

        {/* Conteudo */}
        <div className="p-5 space-y-4">
          {/* Titulo e Descricao */}
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors duration-300 line-clamp-1">
              {vaquinha.nome}
            </h3>
            <p className="mt-1.5 text-sm text-white/50 line-clamp-2 leading-relaxed">
              {vaquinha.descricao}
            </p>
          </div>

          {/* Barra de Progresso Visual */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-white">
                {vaquinha.arrecadado.toLocaleString()} VAKS
              </span>
              <span className="text-xs text-white/40">
                {t.vaquinhas.hub.de} {vaquinha.meta.toLocaleString()} VAKS
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{
                  duration: 1.2,
                  delay: index * 0.08 + 0.3,
                  ease: "easeOut",
                }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </motion.div>
            </div>
          </div>

          {/* Rodape: Criador + Avatares */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white">
                {vaquinha.criador.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-white/50">{vaquinha.criador}</span>
            </div>
            <AvatarStack contribuidores={vaquinha.contribuidores} max={4} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Destaque Hero Card ─────────────────────────────────────────────────
function DestaqueHero({ vaquinha }: { vaquinha: VaquinhaPublica }) {
  const router = useRouter();
  const { t } = useI18n();
  const percent = vaquinha.meta > 0
    ? Math.min((vaquinha.arrecadado / vaquinha.meta) * 100, 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.025, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } }}
      whileTap={{ scale: 0.99, transition: { duration: 0.15 } }}
      transition={{ duration: 0.6 }}
      onClick={() => router.push(`/vaquinhas/${vaquinha.id}`)}
      className="group cursor-pointer"
    >
      <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-zinc-900/60 backdrop-blur-xl">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Lado Imagem */}
          <div className="relative h-64 md:h-80 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${vaquinha.imagem})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-900/90 hidden md:block" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent md:hidden" />
            <div className="absolute top-5 left-5">
              <div className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-sm font-bold text-white shadow-xl shadow-amber-500/30">
                {t.vaquinhas.hub.vaquinha_destaque}
              </div>
            </div>
          </div>

          {/* Lado Info */}
          <div className="p-8 flex flex-col justify-center space-y-5">
            <div>
              <p className="text-xs font-semibold text-emerald-400/80 uppercase tracking-widest mb-2">
                {vaquinha.categoria}
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                {vaquinha.nome}
              </h2>
              <p className="mt-3 text-sm text-white/50 leading-relaxed line-clamp-3">
                {vaquinha.descricao}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">
                  {vaquinha.arrecadado.toLocaleString()} VAKS
                </span>
                <span className="text-sm text-white/40">
                  {t.vaquinhas.meta}: {vaquinha.meta.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <AvatarStack contribuidores={vaquinha.contribuidores} max={6} />
              <div className="flex items-center gap-2 text-sm text-white/50">
                <div
                  className={`w-2 h-2 rounded-full ${vaquinha.diasRestantes <= 3 ? "bg-red-400" : "bg-emerald-400"}`}
                />
                {vaquinha.diasRestantes} {t.vaquinhas.hub.dias}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/vaquinhas/${vaquinha.id}`);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
            >
              {t.vaquinhas.hub.contribuir_agora}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Search & Stats Bar ─────────────────────────────────────────────────
function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="relative">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.placeholders.search_campaigns}
          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all"
        />
    </div>
  );
}

// ─── Stats Cards ────────────────────────────────────────────────────────
function StatsBar({ vaquinhas }: { vaquinhas: VaquinhaPublica[] }) {
  const { t } = useI18n();
  const st = t.vaquinhas.stats;

  const totalArrecadado = vaquinhas.reduce((acc, v) => acc + v.arrecadado, 0);
  const totalContribuidores = new Set(
    vaquinhas.flatMap((v) => v.contribuidores),
  ).size;
  const vaquinhasAtivas = vaquinhas.filter((v) => v.diasRestantes > 0).length;

  const stats = [
    {
      label: st.total_arrecadado,
      value: `${totalArrecadado.toLocaleString()} VAKS`,
      color: "from-emerald-500 to-teal-500",
    },
    {
      label: st.contribuidores,
      value: totalContribuidores.toString(),
      color: "from-cyan-500 to-blue-500",
    },
    {
      label: st.vaquinhas_ativas,
      value: vaquinhasAtivas.toString(),
      color: "from-violet-500 to-purple-500",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center"
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r ${stat.color} rounded-full`}
          />
          <p className="text-xl md:text-2xl font-bold text-white mt-1">
            {stat.value}
          </p>
          <p className="text-[11px] text-white/40 mt-1 uppercase tracking-wider">
            {stat.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Mock Data ──────────────────────────────────────────────────────────
const mockVaquinhas: VaquinhaPublica[] = [
  {
    id: "1",
    nome: "Ajuda ao Abrigo Municipal",
    descricao:
      "Campanha para renovar o abrigo municipal e oferecer melhores condicoes aos residentes que mais precisam.",
    meta: 5000,
    arrecadado: 3750,
    criador: "Maria S.",
    categoria: "Solidariedade",
    contribuidores: [
      "Ana",
      "Pedro",
      "Joao",
      "Sofia",
      "Miguel",
      "Rita",
      "Carlos",
      "Beatriz",
    ],
    imagem:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop",
    diasRestantes: 12,
    destaque: true,
  },
  {
    id: "2",
    nome: "Festival de Verao 2026",
    descricao:
      "Vamos organizar o melhor festival de verao da cidade, com musica ao vivo, comida e muita diversao!",
    meta: 8000,
    arrecadado: 4200,
    criador: "Tiago R.",
    categoria: "Eventos",
    contribuidores: ["Lucas", "Marta", "Andre", "Diana", "Hugo", "Ines"],
    imagem:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop",
    diasRestantes: 25,
    destaque: false,
  },
  {
    id: "3",
    nome: "Material Escolar para Todos",
    descricao:
      "Recolha de fundos para comprar material escolar para criancas de familias carenciadas da comunidade.",
    meta: 2000,
    arrecadado: 1890,
    criador: "Prof. Lina",
    categoria: "Educacao",
    contribuidores: [
      "Rui",
      "Teresa",
      "Filipe",
      "Catarina",
      "Diogo",
      "Mariana",
      "Paulo",
      "Laura",
      "Nuno",
    ],
    imagem:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop",
    diasRestantes: 5,
    destaque: false,
  },
  {
    id: "4",
    nome: "Torneio Desportivo Interescolas",
    descricao:
      "Financiar o torneio desportivo entre escolas, com premios e equipamentos para todas as equipas participantes.",
    meta: 3500,
    arrecadado: 1200,
    criador: "Coach Bruno",
    categoria: "Desporto",
    contribuidores: ["Marco", "Vera", "Simao", "Clara"],
    imagem:
      "https://images.unsplash.com/photo-1461896836934-bd45ba8fcaff?w=600&h=400&fit=crop",
    diasRestantes: 18,
    destaque: false,
  },
  {
    id: "5",
    nome: "Murais de Arte Urbana",
    descricao:
      "Projeto para transformar paredes cinzentas em obras de arte, dando cor e vida ao bairro.",
    meta: 4000,
    arrecadado: 2800,
    criador: "Artista Zeze",
    categoria: "Cultura",
    contribuidores: [
      "Tania",
      "Ricardo",
      "Adriana",
      "Goncalo",
      "Helena",
      "Vasco",
      "Leonor",
    ],
    imagem:
      "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=600&h=400&fit=crop",
    diasRestantes: 30,
    destaque: false,
  },
  {
    id: "6",
    nome: "Horta Comunitaria",
    descricao:
      "Criar uma horta comunitaria onde vizinhos possam cultivar legumes frescos e partilhar conhecimentos.",
    meta: 1500,
    arrecadado: 1500,
    criador: "Dona Rosa",
    categoria: "Comunidade",
    contribuidores: [
      "Antonio",
      "Fatima",
      "Jose",
      "Amelia",
      "Manuel",
      "Conceicao",
    ],
    imagem:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop",
    diasRestantes: 0,
    destaque: false,
  },
];

// ─── Page Component ─────────────────────────────────────────────────────
export default function VaquinhasPublicasPage() {
  const router = useRouter();
  const { t } = useI18n();
  const hb = t.vaquinhas.hub;
  const pb = t.vaquinhas.publica;
  const [search, setSearch] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("Todas");

  const categorias = useMemo(() => {
    const cats = Array.from(new Set(mockVaquinhas.map((v) => v.categoria)));
    return ["Todas", ...cats];
  }, []);

  const categoriaCounts = useMemo(() => {
    const counts: Record<string, number> = { Todas: mockVaquinhas.length };
    mockVaquinhas.forEach((v) => {
      counts[v.categoria] = (counts[v.categoria] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredVaquinhas = useMemo(() => {
    return mockVaquinhas.filter((v) => {
      const matchSearch =
        v.nome.toLowerCase().includes(search.toLowerCase()) ||
        v.descricao.toLowerCase().includes(search.toLowerCase());
      const matchCategoria =
        categoriaAtiva === "Todas" || v.categoria === categoriaAtiva;
      return matchSearch && matchCategoria;
    });
  }, [search, categoriaAtiva]);

  const destaque = mockVaquinhas.find((v) => v.destaque);
  const restantes = filteredVaquinhas.filter(
    (v) => !v.destaque || categoriaAtiva !== "Todas",
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Background Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-cyan-500/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-violet-500/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {t.vaquinhas.title}{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              {pb.titulo}
            </span>
          </h1>
          <p className="text-white/40 text-sm md:text-base max-w-lg">
            {pb.descricao}
          </p>
        </motion.div>

        {/* Social Proof Ticker */}
        <SocialProofTicker />

        {/* Stats */}
        <StatsBar vaquinhas={mockVaquinhas} />

        {/* Hero Destaque */}
        {destaque && categoriaAtiva === "Todas" && !search && (
          <DestaqueHero vaquinha={destaque} />
        )}

        {/* Search + Categories */}
        <div className="space-y-4">
          <SearchBar value={search} onChange={setSearch} />
          <div className="flex flex-wrap gap-2">
            {categorias.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                active={categoriaAtiva === cat}
                onClick={() => setCategoriaAtiva(cat)}
                count={categoriaCounts[cat]}
              />
            ))}
          </div>
        </div>

        {/* Grid de Vaquinhas */}
        <AnimatePresence mode="wait">
          {restantes.length > 0 ? (
            <motion.div
              key={categoriaAtiva + search}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {restantes.map((v, i) => (
                <VaquinhaPublicaCard key={v.id} vaquinha={v} index={i} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 space-y-4"
            >
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-white/20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <p className="text-white/40 text-sm">
                {hb.nenhuma_encontrada}
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setCategoriaAtiva("Todas");
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {hb.limpar_filtros}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center py-10 space-y-4"
        >
          <div className="h-px w-full max-w-xs mx-auto bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <p className="text-sm text-white/30">
            {hb.footer_cta}
          </p>
          <button
            onClick={() => router.push('/vaquinhas/publicas/criar')}
            className="px-8 py-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/30 text-white/70 hover:text-white rounded-xl text-sm font-medium transition-all duration-300"
          >
            {hb.criar_vaquinha}
          </button>
        </motion.div>
      </div>

      {/* Shimmer Animation Style */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
