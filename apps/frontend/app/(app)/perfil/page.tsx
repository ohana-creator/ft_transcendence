'use client';

import {
  Camera, CheckCircle, Pencil, Plane, Gift, Mic, Cake,
  Wallet, Users, LogOut, Crown, Shield, User, ArrowUpDown,
  ArrowUp, ArrowDown, ExternalLink, TrendingUp, MapPin,
  HandCoins
} from "lucide-react";
import { FriendsModal } from "@/components/profile/FriendsModal";
import { UserAvatar } from "@/components/profile/useAvatar";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContributionGraph } from "@/components/profile/contribution-graph";
import { DEFAULT_CURRENT_USERNAME, useSocialGraph } from "@/hooks/social/useSocialGraph";
import { useI18n } from "@/locales";
import Link from "next/link";

// ─── USER CARD ───────────────────────────────────────────────────────────────
function UserCard() {
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useI18n();
  const profile = t.perfil;

  type UserData = {
    dob: string; email: string; phone: string; username: string;
  };

  const [data, setData] = useState<UserData>({
    dob: "17-11-2005", email: "user@example.com", phone: "+244 999 999 999", username: "melzira_ebo"
  });
  const [draft, setDraft] = useState<UserData>(data);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDraft(prev => ({ ...prev, [name as keyof UserData]: value }));
  };

  const Field = ({ label, name, value, type }: {
    label: string; name: keyof UserData; value: string; type?: string;
  }) => (
    <div className="flex flex-col gap-1.5 group">
      <span className="text-[10px] font-bold uppercase tracking-widest text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
        {label}
      </span>
      {!isEditing ? (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt"
        >
          {value}
        </motion.p>
      ) : (
        <motion.input
          type={type} name={name as string} value={draft[name]}
          onChange={handleChange}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-3 py-2 text-sm border
            bg-vaks-light-input dark:bg-vaks-dark-input
            border-vaks-light-stroke dark:border-vaks-dark-stroke
            text-vaks-light-main-txt dark:text-vaks-dark-main-txt
            focus:outline-none focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button
            transition-colors"
        />
      )}
    </div>
  );

  return (
    <motion.div layout
      className="w-full rounded-2xl bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card
        shadow-card-light dark:shadow-card-dark overflow-hidden"
    >
      <div className="h-1 w-full bg-linear-to-r from-violet-400 via-purple-500 to-indigo-400
        dark:from-violet-600 dark:via-purple-700 dark:to-indigo-600" />

      <div className="p-7">
        <div className="flex justify-between items-start mb-7">
          <div>
            <h2 className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
              {profile.card1.titulo}
            </h2>
            <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">
              {profile.card1.descricao}
            </p>
          </div>
          {!isEditing ? (
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => { setDraft(data); setIsEditing(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                bg-vaks-light-purple-button/10 dark:bg-vaks-dark-purple-button/15
                text-vaks-light-purple-button dark:text-vaks-dark-secondary
                hover:bg-vaks-light-purple-button hover:text-white
                dark:hover:bg-vaks-dark-purple-button dark:hover:text-white
                border border-vaks-light-purple-button/20 dark:border-vaks-dark-purple-button/20
                transition-all duration-200">
              <Pencil className="w-3.5 h-3.5" />
              {profile.card1.editar}
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border
                border-vaks-light-stroke dark:border-vaks-dark-stroke
                text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt
                hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input transition-colors">
              {profile.card1.cancelar}
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-5">
          <Field label={profile.card1.data} name="dob" value={data.dob} type="date" />
          <Field label={profile.card1.email} name="email" value={data.email} type="email" />
          <Field label={profile.card1.telefone} name="phone" value={data.phone} type="tel" />
          <Field label={profile.card1.username} name="username" value={data.username} type="text" />
        </div>

        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="mt-7 pt-5 border-t border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/30"
            >
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={() => { setData(draft); setIsEditing(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button hover:opacity-90 transition-opacity">
                <CheckCircle className="w-4 h-4" />
                {profile.card1.guardar}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── VAQUINHAS CARD ──────────────────────────────────────────────────────────
type VaquinhaRole = "criador" | "administrador" | "membro";
type VaquinhaIcon = "plane" | "gift" | "mic" | "cake";
interface UserVaquinha {
  id: string; name: string; icon: VaquinhaIcon; role: VaquinhaRole;
  meta: number; arrecadado: number; status: "ativa" | "encerrada" | "meta_atingida";
  membros: number; criadaEm: string;
}
const ICON_MAP: Record<VaquinhaIcon, React.ReactNode> = {
  plane: <Plane className="h-4 w-4" />, gift: <Gift className="h-4 w-4" />,
  mic: <Mic className="h-4 w-4" />, cake: <Cake className="h-4 w-4" />,
};
const ICON_BG: Record<VaquinhaIcon, string> = {
  plane: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  gift: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  mic: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  cake: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};
const ROLE_ICON: Record<VaquinhaRole, React.ReactNode> = {
  criador: <Crown className="h-3 w-3" />, administrador: <Shield className="h-3 w-3" />, membro: <User className="h-3 w-3" />,
};
const ROLE_STYLES: Record<VaquinhaRole, string> = {
  criador: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300",
  administrador: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
  membro: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
};
const STATUS_STYLES = {
  ativa: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  encerrada: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
  meta_atingida: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
};
const STATUS_DOT = { ativa: "bg-emerald-500", encerrada: "bg-gray-400", meta_atingida: "bg-amber-500" };
const PROGRESS_COLOR = {
  ativa: "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button",
  encerrada: "bg-gray-300 dark:bg-gray-600",
  meta_atingida: "bg-amber-400 dark:bg-amber-500",
};
const mockVaquinhas: UserVaquinha[] = [
  { id: "1", name: "Viagem para Portugal", icon: "plane", role: "criador", meta: 5000, arrecadado: 3200, status: "ativa", membros: 8, criadaEm: "Jan 2025" },
  { id: "2", name: "Presente da turma", icon: "gift", role: "membro", meta: 200, arrecadado: 200, status: "meta_atingida", membros: 12, criadaEm: "Mar 2025" },
  { id: "3", name: "Equipamento de estúdio", icon: "mic", role: "administrador", meta: 1500, arrecadado: 600, status: "ativa", membros: 4, criadaEm: "Jun 2025" },
  { id: "4", name: "Aniversário da Maria", icon: "cake", role: "membro", meta: 100, arrecadado: 100, status: "encerrada", membros: 6, criadaEm: "Fev 2025" },
];

function VaquinhasCard() {
  const [vaquinhas, setVaquinhas] = useState<UserVaquinha[]>(mockVaquinhas);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"name" | "meta" | "arrecadado" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { t } = useI18n();
  const profile = t.perfil;

  const ROLE_LABEL: Record<VaquinhaRole, string> = {
    criador: t.vaquinha_roles.criador,
    administrador: t.vaquinha_roles.administrador,
    membro: t.vaquinha_roles.membro,
  };
  const STATUS_LABEL = {
    ativa: t.vaquinha_status.ativa,
    encerrada: t.vaquinha_status.encerrada,
    meta_atingida: t.vaquinha_status.meta_atingida,
  };

  const translateMonth = (monthName: string): string => {
    const monthMap: Record<string, keyof typeof t.meses> = {
      'Jan': 'jan', 'Feb': 'fev', 'Mar': 'mar', 'Apr': 'abr',
      'May': 'mai', 'Jun': 'jun', 'Jul': 'jul', 'Aug': 'ago',
      'Sep': 'set', 'Oct': 'out', 'Nov': 'nov', 'Dec': 'dez',
      'Ene': 'jan', 'Fév': 'fev', 'Avr': 'abr', 'Aoû': 'ago',
      'Déc': 'dez', 'Dic': 'dez', 'Fev': 'fev', 'Ago': 'ago', 'Set': 'set', 'Out': 'out',
    };
    return t.meses[monthMap[monthName] || 'jan'];
  };

  const formatDate = (dateStr: string): string => {
    const parts = dateStr.split(' ');
    if (parts.length === 2) return `${translateMonth(parts[0])} ${parts[1]}`;
    return dateStr;
  };

  const handleLeave = (id: string) => { setVaquinhas(prev => prev.filter(v => v.id !== id)); setConfirmId(null); };
  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const sorted = [...vaquinhas].sort((a, b) => {
    if (!sortKey) return 0; const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
    if (sortKey === "meta") return (a.meta - b.meta) * dir;
    if (sortKey === "arrecadado") return (a.arrecadado - b.arrecadado) * dir;
    if (sortKey === "status") return a.status.localeCompare(b.status) * dir;
    return 0;
  });
  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-vaks-light-purple-button dark:text-vaks-dark-secondary" />
      : <ArrowDown className="h-3 w-3 text-vaks-light-purple-button dark:text-vaks-dark-secondary" />;
  };
  const thClass = "px-4 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt cursor-pointer select-none hover:text-vaks-light-main-txt dark:hover:text-vaks-dark-main-txt transition-colors";

  return (
    <div className="w-full rounded-2xl bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card
      shadow-card-light dark:shadow-card-dark overflow-hidden">
      <div className="px-6 py-5 flex items-center justify-between
        border-b border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            {profile.card3.titulo}
          </h3>
          <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {vaquinhas.length} {profile.card3.vaquinhas}{vaquinhas.length !== 1 ? "s" : ""} •{" "}
            <span className="text-vaks-light-purple-button dark:text-vaks-dark-secondary font-semibold">
              {vaquinhas.reduce((a, v) => a + v.arrecadado, 0).toLocaleString("pt-AO")} Kz
            </span>{" "}{profile.card3.arrecadados}
          </p>
        </div>
      </div>

      {vaquinhas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input flex items-center justify-center">
            <Users className="h-5 w-5 text-vaks-light-alt-txt/40 dark:text-vaks-dark-alt-txt/40" />
          </div>
          <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">Não fazes parte de nenhuma vaquinha ainda.</p>
        </div>
      )}

      {vaquinhas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-vaks-light-input/40 dark:bg-vaks-dark-input/40">
                <th className={thClass} onClick={() => handleSort("name")}>
                  <span className="inline-flex items-center gap-1.5">{profile.card3.table.nome} <SortIcon col="name" /></span>
                </th>
                <th className={thClass} onClick={() => handleSort("status")}>
                  <span className="inline-flex items-center gap-1.5">{profile.card3.table.estado} <SortIcon col="status" /></span>
                </th>
                <th className={thClass}>{profile.card3.table.funcao}</th>
                <th className={thClass} onClick={() => handleSort("meta")}>
                  <span className="inline-flex items-center gap-1.5">{profile.card3.table.progresso} <SortIcon col="meta" /></span>
                </th>
                <th className={thClass}>{profile.card3.table.info}</th>
                <th className={`${thClass} text-right`}>{profile.card3.table.accoes}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {sorted.map((v, i) => {
                  const percent = Math.min(Math.round((v.arrecadado / v.meta) * 100), 100);
                  const isConfirming = confirmId === v.id;
                  return (
                    <motion.tr key={v.id} layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16, scale: 0.98 }}
                      transition={{ duration: 0.22, delay: i * 0.04 }}
                      className="group border-b border-vaks-light-stroke/10 last:border-0
                        dark:border-vaks-dark-stroke/10 transition-colors
                        hover:bg-vaks-light-input/50 dark:hover:bg-vaks-dark-input/30"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
                            ${ICON_BG[v.icon]} transition-transform duration-200 group-hover:scale-110`}>
                            {ICON_MAP[v.icon]}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">{v.name}</p>
                            <p className="text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{formatDate(v.criadaEm)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[v.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[v.status]}`} />
                          {STATUS_LABEL[v.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ROLE_STYLES[v.role]}`}>
                          {ROLE_ICON[v.role]} {ROLE_LABEL[v.role]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 min-w-36">
                          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-vaks-light-input dark:bg-vaks-dark-input">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: i * 0.06 }}
                              className={`absolute inset-y-0 left-0 rounded-full ${PROGRESS_COLOR[v.status]}`} />
                          </div>
                          <span className="min-w-10 text-right text-xs font-bold tabular-nums text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                            {percent}%
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                          {v.arrecadado.toLocaleString("pt-AO")} / {v.meta.toLocaleString("pt-AO")} Kz
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                          <Users className="h-3 w-3" /> {v.membros}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {v.role !== "criador" && !isConfirming && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setConfirmId(v.id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium
                                text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt
                                hover:bg-red-50 hover:text-red-500
                                dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors">
                              <LogOut className="h-3 w-3" /> {profile.card3.sair}
                            </motion.button>
                          )}
                          {isConfirming && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5">
                              <button onClick={() => handleLeave(v.id)}
                                className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors">
                                {profile.card3.confirmar}
                              </button>
                              <button onClick={() => setConfirmId(null)}
                                className="rounded-lg px-2.5 py-1.5 text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input transition-colors">
                                {profile.card3.cancelar}
                              </button>
                            </motion.div>
                          )}
                          {v.role === "criador" && !isConfirming && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1.5 text-[11px] font-semibold text-purple-500 dark:bg-purple-500/10 dark:text-purple-300">
                              <Crown className="h-3 w-3" /> {profile.card3.funcoes.criador}
                            </span>
                          )}
                          <Link href={`/vaquinhas/${v.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold
                              bg-vaks-light-purple-button/10 text-vaks-light-purple-button
                              hover:bg-vaks-light-purple-button hover:text-white
                              dark:bg-vaks-dark-purple-button/15 dark:text-vaks-dark-secondary
                              dark:hover:bg-vaks-dark-purple-button dark:hover:text-white
                              transition-all duration-200">
                            <ExternalLink className="h-3 w-3" /> {profile.card3.detalhes}
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t } = useI18n();
  const profile = t.perfil;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const { currentUser, friends } = useSocialGraph(DEFAULT_CURRENT_USERNAME);

  type ProfileStat = {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent: string;
    onClick?: () => void;
  };

  type UserData = {
    dob: string; email: string; phone: string; username: string; avatarUrl?: string;
  };

  const [data, setData] = useState<UserData>({
    dob: "17-11-2005",
    email: "user@example.com",
    phone: "+244 999 999 999",
    username: "melzira_ebo",
    avatarUrl: undefined,
  });

  // Hidrata o avatar do localStorage na montagem
  useEffect(() => {
    const saved = localStorage.getItem('vaks:avatar');
    if (saved) setData(prev => ({ ...prev, avatarUrl: saved }));
  }, []);

  // Quando o backend estiver pronto, substitui esta função por um fetch POST /api/user/avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      localStorage.setItem('vaks:avatar', base64);
      setData(prev => ({ ...prev, avatarUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const stats: ProfileStat[] = [
    {
      icon: <Wallet className="w-4 h-4" />,
      label: profile.saldo,
      value: `${(currentUser?.saldo || 12450).toLocaleString("pt-AO")} Kz`,
      accent: "text-vaks-light-purple-button dark:text-vaks-dark-secondary",
    },
    {
      icon: <HandCoins className="w-4 h-4" />,
      label: profile.vaquinhas,
      value: String(currentUser?.vaquinhaCount || 4),
      accent: "text-emerald-500",
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: profile.contribuicoes,
      value: String(currentUser?.contributionCount || 24),
      accent: "text-amber-500",
    },
    {
      icon: <Users className="w-4 h-4" />,
      label: profile.amigos,
      value: String(friends.length),
      accent: "text-sky-500",
      onClick: () => setIsFriendsModalOpen(true),
    },
  ];

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">

      {/* ── HERO CARD ── */}
      <div className="px-8 pt-8 pb-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full rounded-3xl overflow-hidden relative
            bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card
            shadow-card-light dark:shadow-card-dark"
        >
          {/* ── MESH GRADIENT BANNER ── */}
          <div className="relative h-44 w-full overflow-hidden">
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6d28d9 40%, #4f46e5 100%)' }}
            />
            <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full opacity-40"
              style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
            <div className="absolute -bottom-8 right-20 w-72 h-72 rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }} />
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-25"
              style={{ background: 'radial-gradient(circle, #c4b5fd, transparent 70%)' }} />
            <div className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              }}
            />
          </div>

          {/* ── AVATAR + INFO ── */}
          <div className="px-8 pb-7">
            <div className="flex items-end justify-between -mt-14 mb-5">
              <div className="relative">
                <div className="absolute -inset-0.75 rounded-full
                  bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card" />
                <div className="relative w-34 h-34 rounded-full overflow-hidden border-2
                  border-vaks-light-purple-card dark:border-vaks-dark-purple-card
                  bg-vaks-light-input dark:bg-vaks-dark-input shadow-lg">
                  <UserAvatar
                    username={data.username}
                    avatarUrl={data.avatarUrl}
                    size="fill"
                  />
                </div>

                {/* Input de ficheiro oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />

                {/* Botão da câmara abre o input */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0.5 right-0.5
                    bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button
                    p-1.5 rounded-full shadow-md hover:scale-110 transition-transform"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Stats pill */}
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-stretch divide-x divide-vaks-light-stroke/50 dark:divide-vaks-dark-stroke/40
                  border border-vaks-light-stroke/50 dark:border-vaks-dark-stroke/30
                  rounded-2xl overflow-hidden bg-vaks-light-input/60 dark:bg-vaks-dark-input/60
                  backdrop-blur-sm mb-1"
              >
                {stats.map((s, i) => (
                  <motion.div key={s.label}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.07 }}
                    onClick={s.onClick}
                    className={`flex flex-col items-center justify-center px-7 py-3 gap-0.5 transition-colors ${
                      s.onClick
                        ? "cursor-pointer hover:bg-vaks-light-purple-card dark:hover:bg-vaks-dark-purple-card"
                        : "hover:bg-vaks-light-purple-card dark:hover:bg-vaks-dark-purple-card"
                    }`}>
                    <span className={`${s.accent} mb-0.5`}>{s.icon}</span>
                    <span className="text-base font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt leading-none">
                      {s.value}
                    </span>
                    <span className="text-[10px] font-medium text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5">
                      {s.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Nome e username */}
            <motion.div
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <h1 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {data.username}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold
                  bg-vaks-light-purple-button/10 dark:bg-vaks-dark-purple-button/20
                  text-vaks-light-purple-button dark:text-vaks-dark-secondary border
                  border-vaks-light-purple-button/20 dark:border-vaks-dark-purple-button/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Pro
                </span>
              </div>
              <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt flex items-center gap-1.5">
                {data.email}
                <span className="text-vaks-light-stroke dark:text-vaks-dark-stroke">·</span>
                <MapPin className="w-3 h-3" /> Luanda, Angola
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="px-8 py-6 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}>
          <UserCard />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.4 }}>
          <ContributionGraph seed={data.username} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.4 }}>
          <VaquinhasCard />
        </motion.div>
      </div>

      <FriendsModal isOpen={isFriendsModalOpen} onClose={() => setIsFriendsModalOpen(false)} />

    </div>
  );
}