'use client';

import {
  Camera, CheckCircle, Pencil, Plane, Gift, Mic, Cake,
  Wallet, Users, Crown, Shield, User, ArrowUpDown,
  ArrowUp, ArrowDown, ExternalLink, TrendingUp, MapPin,
  HandCoins
} from "lucide-react";
import { FriendsModal } from "@/components/profile/FriendsModal";
import { UserAvatar } from "@/components/profile/useAvatar";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ContributionGraph } from "@/components/profile/contribution-graph";
import { useI18n } from "@/locales";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { api } from "@/utils/api/api";
import { getCarteiraData } from "@/utils/wallet";
import { useWalletBalance } from "@/hooks/react-query";
import { toast } from "@/utils/toast";

type WrappedData<T> = T | { data?: T; success?: boolean };

type ProfileApiData = {
  id: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  email?: string;
  phone?: string;
  username?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
  photoUrl?: string | null;
  image?: string | null;
  picture?: string | null;
  saldoVaks?: number | string;
};

type UsersSearchResponse = WrappedData<{
  users?: Array<{
    id: string;
    username: string;
    name?: string;
    avatarUrl?: string | null;
    avatar?: string | null;
    photoUrl?: string | null;
    image?: string | null;
    picture?: string | null;
  }>;
  items?: Array<{
    id: string;
    username: string;
    name?: string;
    avatarUrl?: string | null;
    avatar?: string | null;
    photoUrl?: string | null;
    image?: string | null;
    picture?: string | null;
  }>;
}>;

type CampaignApiItem = {
  id: string;
  title?: string;
  goalAmount?: number | string | null;
  currentAmount?: number | string;
  ownerId?: string;
  ownerUsername?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | string;
  createdAt?: string;
  members?: Array<{ userId?: string; username?: string; role?: 'SUDO' | 'VAKER' | string }>;
  _count?: { members?: number };
};

type CampaignMemberApiItem = {
  userId?: string;
  username?: string;
  role?: 'SUDO' | 'VAKER' | string;
};

type CampaignMembersApiResponse =
  | { members?: CampaignMemberApiItem[] }
  | { data?: { members?: CampaignMemberApiItem[] } }
  | { data?: CampaignMemberApiItem[] };

type CampaignListApiResponse =
  | { campaigns?: CampaignApiItem[] }
  | { data?: { campaigns?: CampaignApiItem[] } }
  | { data?: CampaignApiItem[] };

type CampaignListApiMeta = {
  page?: number;
  pages?: number;
  total?: number;
  limit?: number;
};

type CampaignListPayload = CampaignListApiResponse & {
  meta?: CampaignListApiMeta;
};

type FriendsListApiResponse =
  | { friends?: unknown[]; data?: unknown[] }
  | unknown[];

type OnlineStatusUser = {
  id?: string;
  userId?: string;
  username?: string;
  userName?: string;
  lastSeen?: string;
  lastHeartbeat?: string;
};

type OnlineStatusApiResponse =
  | Record<string, boolean>
  | { data?: Record<string, boolean> }
  | { onlineUsers?: OnlineStatusUser[] }
  | { data?: { onlineUsers?: OnlineStatusUser[] } };

const ONLINE_TIMEOUT_MS = 60 * 1000;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

function unwrapData<T>(payload: WrappedData<T>): T {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data as T;
  }
  return payload as T;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
}

function extractCampaigns(payload: CampaignListApiResponse): CampaignApiItem[] {
  if (!payload || typeof payload !== 'object') return [];

  if ('campaigns' in payload && Array.isArray(payload.campaigns)) {
    return payload.campaigns;
  }

  if ('data' in payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  if ('data' in payload && payload.data && typeof payload.data === 'object' && 'campaigns' in payload.data && Array.isArray((payload.data as { campaigns?: CampaignApiItem[] }).campaigns)) {
    return (payload.data as { campaigns: CampaignApiItem[] }).campaigns;
  }

  return [];
}

function extractCampaignMembers(payload: CampaignMembersApiResponse): CampaignMemberApiItem[] {
  if (!payload || typeof payload !== 'object') return [];

  if ('members' in payload && Array.isArray(payload.members)) {
    return payload.members;
  }

  if ('data' in payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  if (
    'data' in payload &&
    payload.data &&
    typeof payload.data === 'object' &&
    'members' in payload.data &&
    Array.isArray((payload.data as { members?: CampaignMemberApiItem[] }).members)
  ) {
    return (payload.data as { members: CampaignMemberApiItem[] }).members;
  }

  return [];
}

function extractFriends(payload: FriendsListApiResponse): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if ('friends' in payload && Array.isArray(payload.friends)) return payload.friends;
  if ('data' in payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function extractUsersFromSearch(payload: UsersSearchResponse): Array<{
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
  photoUrl?: string | null;
  image?: string | null;
  picture?: string | null;
}> {
  const data = payload as {
    data?: {
      users?: Array<{
        id: string;
        username: string;
        name?: string;
        avatarUrl?: string | null;
        avatar?: string | null;
        photoUrl?: string | null;
        image?: string | null;
        picture?: string | null;
      }>;
      items?: Array<{
        id: string;
        username: string;
        name?: string;
        avatarUrl?: string | null;
        avatar?: string | null;
        photoUrl?: string | null;
        image?: string | null;
        picture?: string | null;
      }>;
    };
    users?: Array<{
      id: string;
      username: string;
      name?: string;
      avatarUrl?: string | null;
      avatar?: string | null;
      photoUrl?: string | null;
      image?: string | null;
      picture?: string | null;
    }>;
    items?: Array<{
      id: string;
      username: string;
      name?: string;
      avatarUrl?: string | null;
      avatar?: string | null;
      photoUrl?: string | null;
      image?: string | null;
      picture?: string | null;
    }>;
  };

  if (Array.isArray(data.data?.users)) return data.data.users;
  if (Array.isArray(data.data?.items)) return data.data.items;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function resolveAvatarUrl(user: {
  avatarUrl?: string | null;
  avatar?: string | null;
  photoUrl?: string | null;
  image?: string | null;
  picture?: string | null;
} | null | undefined): string | undefined {
  if (!user) return undefined;
  return user.avatarUrl || user.avatar || user.photoUrl || user.image || user.picture || undefined;
}

function normalizeIdentity(value: string | undefined): string {
  return (value || '').trim().replace(/^@/, '').toLowerCase();
}

function extractOnlineUsers(payload: OnlineStatusApiResponse): OnlineStatusUser[] {
  if (!payload || typeof payload !== 'object') return [];
  if ('onlineUsers' in payload && Array.isArray(payload.onlineUsers)) return payload.onlineUsers;
  if ('data' in payload && payload.data && typeof payload.data === 'object' && Array.isArray(payload.data.onlineUsers)) {
    return payload.data.onlineUsers;
  }
  return [];
}

function extractOnlineStatusMap(payload: OnlineStatusApiResponse): Record<string, boolean> {
  if (!payload || typeof payload !== 'object') return {};

  const direct = payload as Record<string, unknown>;
  const rootBooleans = Object.entries(direct).reduce<Record<string, boolean>>((acc, [key, value]) => {
    if (typeof value === 'boolean') {
      acc[key] = value;
    }
    return acc;
  }, {});
  if (Object.keys(rootBooleans).length > 0) return rootBooleans;

  if ('data' in payload && payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    const fromData = Object.entries(payload.data as Record<string, unknown>).reduce<Record<string, boolean>>((acc, [key, value]) => {
      if (typeof value === 'boolean') {
        acc[key] = value;
      }
      return acc;
    }, {});
    if (Object.keys(fromData).length > 0) return fromData;
  }

  return {};
}

function isPresenceOnline(lastSeen: string | undefined): boolean {
  if (!lastSeen) return true;
  const ts = new Date(lastSeen).getTime();
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts <= ONLINE_TIMEOUT_MS;
}

function resolveOnlineFromList(
  onlineUsers: OnlineStatusUser[],
  userId: string | undefined,
  username: string | undefined,
): boolean {
  const normalizedUserId = normalizeIdentity(userId);
  const normalizedUsername = normalizeIdentity(username);

  const onlineMap = extractOnlineStatusMap({ onlineUsers });
  if (Object.keys(onlineMap).length > 0) {
    const mapValue =
      (userId ? onlineMap[userId] : undefined)
      ?? (username ? onlineMap[username] : undefined)
      ?? (normalizedUserId ? onlineMap[normalizedUserId] : undefined)
      ?? (normalizedUsername ? onlineMap[normalizedUsername] : undefined);
    if (typeof mapValue === 'boolean') return mapValue;
  }

  const match = onlineUsers.find((item) => {
    const itemId = normalizeIdentity(item.id || item.userId);
    const itemUsername = normalizeIdentity(item.username || item.userName);
    return (
      (!!normalizedUserId && !!itemId && normalizedUserId === itemId)
      || (!!normalizedUsername && !!itemUsername && normalizedUsername === itemUsername)
    );
  });

  if (!match) return false;
  return isPresenceOnline(match.lastSeen || match.lastHeartbeat);
}

function normalizeDobForInput(dob: string | undefined): string {
  if (!dob) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) return dob;

  const ddmmyyyy = dob.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }

  return '';
}

function campaignStatusToProfileStatus(status: CampaignApiItem['status']): 'ativa' | 'encerrada' | 'meta_atingida' {
  if (status === 'ACTIVE') return 'ativa';
  if (status === 'COMPLETED') return 'meta_atingida';
  return 'encerrada';
}

function pickVaquinhaIcon(id: string): VaquinhaIcon {
  const icons: VaquinhaIcon[] = ['plane', 'gift', 'mic', 'cake'];
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return icons[hash % icons.length];
}

// ─── FIELD COMPONENT ─────────────────────────────────────────────────────────
type UserData = {
  email: string; username: string;
};

interface FieldProps {
  label: string;
  name: keyof UserData;
  value: string;
  type?: string;
  isEditing: boolean;
  draft: UserData;
  onDraftChange: (draft: UserData) => void;
}

const Field = ({ label, name, value, type, isEditing, draft, onDraftChange }: FieldProps) => (
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
        onChange={(e) => {
          const { name: fieldName, value: fieldValue } = e.target;
          onDraftChange({ ...draft, [fieldName as keyof UserData]: fieldValue });
        }}
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

// ─── USER CARD ───────────────────────────────────────────────────────────────
function UserCard({
  userId,
  onProfileUpdated,
}: {
  userId?: string;
  onProfileUpdated?: (data: { email?: string; username?: string }) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useI18n();
  const { user, setUser } = useAuth();
  const profile = t.perfil;

  const [data, setData] = useState<UserData>({
    email: user?.email || "", username: user?.username || "Utilizador"
  });
  const [draft, setDraft] = useState<UserData>(data);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await api.get<WrappedData<ProfileApiData>>(`/users/${userId}`);
        const profileData = unwrapData(response);

        if (cancelled) return;

        const normalized: UserData = {
          email: profileData?.email || user?.email || '',
          username: profileData?.username || user?.username || 'Utilizador',
        };

        setData(normalized);
        setDraft(normalized);
      } catch {
        // Silencioso para manter a tela funcional mesmo sem endpoint.
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId, user?.email, user?.username]);

  return (
    <motion.div layout
      className="h-full w-full rounded-xl bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card
        shadow-card-light dark:shadow-card-dark overflow-hidden border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover"
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

        <div className="flex flex-col gap-5">
          <Field label={profile.card1.email} name="email" value={data.email} type="email" isEditing={isEditing} draft={draft} onDraftChange={setDraft} />
          <Field label={profile.card1.username} name="username" value={data.username} type="text" isEditing={isEditing} draft={draft} onDraftChange={setDraft} />
        </div>

        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="mt-7 pt-5 border-t border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/30"
            >
              <motion.button whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  if (!userId) {
                    setData(draft);
                    setIsEditing(false);
                    return;
                  }

                  const nextUsername = draft.username.trim();
                  const currentUsername = data.username.trim();
                  const currentEmail = data.email.trim().toLowerCase();
                  const requestedEmail = draft.email.trim().toLowerCase();

                  const usernameChanged = nextUsername !== currentUsername;
                  const emailChanged = requestedEmail !== currentEmail;

                  if (!usernameChanged && !emailChanged) {
                    setIsEditing(false);
                    return;
                  }

                  if (emailChanged && !usernameChanged) {
                    toast.error('A alteracao de email ainda nao esta disponivel.');
                    return;
                  }

                  if (nextUsername.length < 3 || nextUsername.length > 30 || !USERNAME_REGEX.test(nextUsername)) {
                    toast.error('O nome de utilizador deve ter 3-30 caracteres e usar apenas letras, numeros e underscore.');
                    return;
                  }

                  if (usernameChanged) {
                    try {
                      const searchResponse = await api.get<UsersSearchResponse>('/users/search', {
                        params: {
                          q: nextUsername,
                          page: 1,
                          limit: 10,
                        },
                      });

                      const normalizedUsername = nextUsername.toLowerCase();
                      const exactTaken = extractUsersFromSearch(searchResponse).some((candidate) => (
                        candidate.id !== userId
                        && candidate.username.trim().toLowerCase() === normalizedUsername
                      ));

                      if (exactTaken) {
                        toast.error('Esse nome de utilizador ja existe.');
                        return;
                      }
                    } catch {
                      // Se a pesquisa falhar, seguimos para o PUT e deixamos o backend validar.
                    }
                  }

                  try {
                    const response = await api.put<WrappedData<ProfileApiData>>(`/users/${userId}`, {
                      username: nextUsername,
                    });
                    const updated = unwrapData(response);

                    const nextData: UserData = {
                      email: user?.email || data.email,
                      username: updated?.username || nextUsername,
                    };

                    setData(nextData);
                    setDraft(nextData);
                    onProfileUpdated?.({
                      email: nextData.email,
                      username: nextData.username,
                    });

                    if (user) {
                      setUser({
                        ...user,
                        email: user.email,
                        username: nextData.username,
                      });
                    }

                    if (emailChanged) {
                      toast.info('Email mantido sem alteracoes. Esta funcionalidade sera disponibilizada em breve.');
                    }

                    setIsEditing(false);
                  } catch (error) {
                    const apiError = error as { status?: number; message?: string | string[] };
                    const apiMessage = Array.isArray(apiError?.message)
                      ? apiError.message[0]
                      : apiError?.message;

                    if ((apiError?.status === 400 || apiError?.status === 409) && apiMessage) {
                      toast.error(apiMessage);
                    } else {
                      toast.error('Nao foi possivel atualizar o perfil.');
                    }

                    setData(draft);
                    setIsEditing(false);
                  }
                }}
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

// ─── SORT ICON COMPONENT ─────────────────────────────────────────────────────
interface SortIconProps {
  col: "name" | "meta" | "arrecadado" | "status" | null;
  sortKey: "name" | "meta" | "arrecadado" | "status" | null;
  sortDir: "asc" | "desc";
}

const SortIcon = ({ col, sortKey, sortDir }: SortIconProps) => {
  if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 text-vaks-light-purple-button dark:text-vaks-dark-secondary" />
    : <ArrowDown className="h-3 w-3 text-vaks-light-purple-button dark:text-vaks-dark-secondary" />;
};

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
function VaquinhasCard({ vaquinhas, loading = false }: { vaquinhas: UserVaquinha[]; loading?: boolean }) {
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

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input flex items-center justify-center animate-pulse">
            <HandCoins className="h-5 w-5 text-vaks-light-alt-txt/40 dark:text-vaks-dark-alt-txt/40" />
          </div>
          <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.common.loading}</p>
        </div>
      )}

      {!loading && vaquinhas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input flex items-center justify-center">
            <Users className="h-5 w-5 text-vaks-light-alt-txt/40 dark:text-vaks-dark-alt-txt/40" />
          </div>
          <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{profile.card3.vazio_mensagem}</p>
        </div>
      )}

      {!loading && vaquinhas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-vaks-light-input/40 dark:bg-vaks-dark-input/40">
                <th className={thClass} onClick={() => handleSort("name")}>
                  <span className="inline-flex items-center gap-1.5">{profile.card3.table.nome} <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass} onClick={() => handleSort("status")}>
                  <span className="inline-flex items-center gap-1.5">{profile.card3.table.estado} <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass}>{profile.card3.table.funcao}</th>
                <th className={thClass} onClick={() => handleSort("meta")}>
                  <span className="inline-flex items-center gap-1.5">{profile.card3.table.progresso} <SortIcon col="meta" sortKey={sortKey} sortDir={sortDir} /></span>
                </th>
                <th className={thClass}>{profile.card3.table.info}</th>
                <th className={`${thClass} text-right`}>{profile.card3.table.accoes}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {sorted.map((v, i) => {
                  const percent = v.meta > 0 ? Math.min(Math.round((v.arrecadado / v.meta) * 100), 100) : 0;
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
                          {v.role === "criador" && (
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
  const { user, setUser } = useAuth();
  const profile = t.perfil;
  const gs = t.dashboard.global_search;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [userVaquinhas, setUserVaquinhas] = useState<UserVaquinha[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [statsData, setStatsData] = useState({
    saldo: 0,
    vaquinhas: 0,
    contribuicoes: 0,
    amigos: 0,
  });
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const onlineStatusUnavailableRef = useRef(false);

  const { data: walletBalanceData } = useWalletBalance();

  const { data: friendsCountData } = useQuery({
    queryKey: ['friends', 'count'],
    queryFn: async () => {
      const response = await api.get<FriendsListApiResponse>('/friends');
      return extractFriends(response).length;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const { data: contributionsCountData } = useQuery({
    queryKey: ['profile', 'contributions-count', user?.id],
    queryFn: async () => {
      const carteira = await getCarteiraData();
      return (carteira.transacoes || []).filter((tx) => tx.tipo === 'contribuicao').length;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

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

  const [data, setData] = useState<UserData>(() => ({
    dob: "",
    email: user?.email || "",
    phone: "",
    username: user?.username || "Utilizador",
    avatarUrl: typeof window !== 'undefined' ? localStorage.getItem('vaks:avatar') || undefined : undefined,
  }));

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const loadOnlineStatus = async () => {
      if (onlineStatusUnavailableRef.current) {
        setIsOnline(true);
        return;
      }

      try {
        const response = await api.get<OnlineStatusApiResponse>('/users/online-status', {
          params: { limit: 500 },
        });

        if (cancelled) return;

        const onlineUsers = extractOnlineUsers(response);
        const onlineMap = extractOnlineStatusMap(response);
        const normalizedId = normalizeIdentity(user.id);
        const normalizedUsername = normalizeIdentity(user.username);
        const legacyValue =
          onlineMap[user.id]
          ?? (user.username ? onlineMap[user.username] : undefined)
          ?? (normalizedId ? onlineMap[normalizedId] : undefined)
          ?? (normalizedUsername ? onlineMap[normalizedUsername] : undefined);

        if (typeof legacyValue === 'boolean') {
          setIsOnline(legacyValue);
        } else {
          setIsOnline(resolveOnlineFromList(onlineUsers, user.id, user.username));
        }
      } catch (error: unknown) {
        const apiError = error as { status?: number };
        if (apiError?.status === 404) {
          onlineStatusUnavailableRef.current = true;
        }

        if (!cancelled) {
          setIsOnline(true);
        }
      }
    };

    loadOnlineStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.username]);

  useEffect(() => {
    const normalizedUserId = normalizeIdentity(user?.id);
    const normalizedUsername = normalizeIdentity(user?.username);

    if (!normalizedUserId && !normalizedUsername) {
      setUserVaquinhas([]);
      return;
    }

    let cancelled = false;

    const isCurrentUser = (candidateId?: string, candidateUsername?: string): boolean => {
      const normalizedCandidateId = normalizeIdentity(candidateId);
      const normalizedCandidateUsername = normalizeIdentity(candidateUsername);

      return (
        (!!normalizedUserId && !!normalizedCandidateId && normalizedUserId === normalizedCandidateId) ||
        (!!normalizedUsername && !!normalizedCandidateUsername && normalizedUsername === normalizedCandidateUsername)
      );
    };

    const resolveRoleFromMember = (memberRole?: string): VaquinhaRole => {
      if (memberRole === 'SUDO') return 'administrador';
      return 'membro';
    };

    const toCreatedLabel = (createdAt?: string): string => {
      if (!createdAt) return '';
      const date = new Date(createdAt);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
    };

    const fetchCampaignsForProfile = async () => {
      setCampaignsLoading(true);

      try {
        const allCampaigns: CampaignApiItem[] = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
          const response = await api.get<CampaignListPayload>('/campaigns', {
            params: {
              page: currentPage,
              limit: 50,
            },
          });

          const pageCampaigns = extractCampaigns(response);
          allCampaigns.push(...pageCampaigns);

          const responsePages = response?.meta?.pages;
          if (typeof responsePages === 'number' && responsePages > 0) {
            totalPages = responsePages;
          } else if (pageCampaigns.length < 50) {
            totalPages = currentPage;
          } else {
            totalPages = currentPage + 1;
          }

          currentPage += 1;
        } while (currentPage <= totalPages);

        const mapped = await Promise.all(allCampaigns.map(async (campaign) => {
          const ownerMatch = isCurrentUser(campaign.ownerId, campaign.ownerUsername);

          let role: VaquinhaRole | null = ownerMatch ? 'criador' : null;
          let membersCount = campaign._count?.members;

          if (!ownerMatch) {
            const inlineMembers = Array.isArray(campaign.members) ? campaign.members : [];
            const inlineMember = inlineMembers.find((member) => isCurrentUser(member.userId, member.username));

            if (inlineMembers.length > 0 && typeof membersCount !== 'number') {
              membersCount = inlineMembers.length;
            }

            if (inlineMember) {
              role = resolveRoleFromMember(inlineMember.role);
            } else {
              try {
                const membersResponse = await api.get<CampaignMembersApiResponse>(`/campaigns/${campaign.id}/members`, {
                  params: { page: 1, limit: 100 },
                });
                const members = extractCampaignMembers(membersResponse);
                membersCount = members.length || membersCount;

                const foundMember = members.find((member) => isCurrentUser(member.userId, member.username));
                if (foundMember) {
                  role = resolveRoleFromMember(foundMember.role);
                }
              } catch {
                // Se não conseguir listar membros, mantém a campanha fora da tabela para evitar dados incorretos.
              }
            }
          }

          if (!role) return null;

          const goal = toNumber(campaign.goalAmount);
          const current = toNumber(campaign.currentAmount);

          return {
            id: campaign.id,
            name: campaign.title || 'Vaquinha',
            icon: pickVaquinhaIcon(campaign.id),
            role,
            meta: goal > 0 ? goal : current,
            arrecadado: current,
            status: campaignStatusToProfileStatus(campaign.status),
            membros: typeof membersCount === 'number' ? membersCount : 1,
            criadaEm: toCreatedLabel(campaign.createdAt),
          } satisfies UserVaquinha;
        }));

        if (cancelled) return;

        setUserVaquinhas(mapped.filter((item): item is UserVaquinha => item !== null));
      } catch {
        if (cancelled) return;
        setUserVaquinhas([]);
      } finally {
        if (cancelled) return;
        setCampaignsLoading(false);
      }
    };

    fetchCampaignsForProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.username]);

  useEffect(() => {
    if (typeof walletBalanceData?.balance !== 'number') return;

    setStatsData((prev) => {
      if (prev.saldo === walletBalanceData.balance) return prev;
      return { ...prev, saldo: walletBalanceData.balance };
    });
  }, [walletBalanceData?.balance]);

  useEffect(() => {
    if (typeof friendsCountData !== 'number') return;

    setStatsData((prev) => {
      if (prev.amigos === friendsCountData) return prev;
      return { ...prev, amigos: friendsCountData };
    });
  }, [friendsCountData]);

  useEffect(() => {
    setStatsData((prev) => {
      if (prev.vaquinhas === userVaquinhas.length) return prev;
      return { ...prev, vaquinhas: userVaquinhas.length };
    });
  }, [userVaquinhas.length]);

  useEffect(() => {
    if (typeof contributionsCountData !== 'number') return;

    setStatsData((prev) => {
      if (prev.contribuicoes === contributionsCountData) return prev;
      return { ...prev, contribuicoes: contributionsCountData };
    });
  }, [contributionsCountData]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const loadProfileMetrics = async () => {
      try {
        const [profileResponse, searchResponse] = await Promise.all([
          api.get<WrappedData<ProfileApiData>>(`/users/${user.id}`).catch(() => null),
          user.username
            ? api.get<UsersSearchResponse>('/users/search', {
              params: { q: user.username, page: 1, limit: 10 },
            }).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        const profileData = profileResponse ? unwrapData(profileResponse) : null;
        const searchUsers = searchResponse ? extractUsersFromSearch(searchResponse) : [];
        const exactUser = searchUsers.find(
          (item) => normalizeIdentity(item.username) === normalizeIdentity(user.username),
        );
        const resolvedAvatar = resolveAvatarUrl(exactUser) || resolveAvatarUrl(profileData);
        const resolvedSaldo = toNumber(profileData?.saldoVaks);

        if (resolvedSaldo > 0) {
          setStatsData((prev) => ({
            ...prev,
            saldo: resolvedSaldo,
          }));
        }

        setData((prev) => ({
          ...prev,
          dob: normalizeDobForInput(profileData?.dob) || prev.dob,
          email: profileData?.email || prev.email,
          phone: profileData?.phone || prev.phone,
          username: exactUser?.username || profileData?.username || prev.username,
          avatarUrl: prev.avatarUrl || resolvedAvatar || undefined,
        }));

        if (resolvedAvatar && user && user.avatarUrl !== resolvedAvatar) {
          setUser({ ...user, avatarUrl: resolvedAvatar });
        }
      } catch {
        if (cancelled) return;
      }
    };

    loadProfileMetrics();

    return () => {
      cancelled = true;
    };
  }, [user, user?.id, user?.username, setUser]);

  // Quando o backend estiver pronto, substitui esta função por um fetch POST /api/user/avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      localStorage.setItem('vaks:avatar', base64);
      window.dispatchEvent(new CustomEvent('avatar:updated', { detail: { avatarUrl: base64 } }));
      setData(prev => ({ ...prev, avatarUrl: base64 }));
      if (user) {
        setUser({ ...user, avatarUrl: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const stats: ProfileStat[] = [
    {
      icon: <Wallet className="w-4 h-4" />,
      label: profile.saldo,
      value: `${statsData.saldo.toLocaleString("pt-AO")} Kz`,
      accent: "text-vaks-light-purple-button dark:text-vaks-dark-secondary",
    },
    {
      icon: <HandCoins className="w-4 h-4" />,
      label: profile.vaquinhas,
      value: String(statsData.vaquinhas),
      accent: "text-emerald-500",
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: profile.contribuicoes,
      value: String(statsData.contribuicoes),
      accent: "text-amber-500",
    },
    {
      icon: <Users className="w-4 h-4" />,
      label: profile.amigos,
      value: String(statsData.amigos),
      accent: "text-sky-500",
      onClick: () => setIsFriendsModalOpen(true),
    },
  ];

  const handleFriendCountChange = useCallback((count: number) => {
    setStatsData((prev) => {
      if (prev.amigos === count) return prev;
      return { ...prev, amigos: count };
    });
  }, []);

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">

      {/* ── HERO CARD ── */}
      <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
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
          <div className="px-4 sm:px-8 pb-7">
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
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  {isOnline ? gs.online : gs.offline}
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
      <div className="px-4 sm:px-8 py-4 sm:py-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-12">
          <motion.div
            className="h-full w-full min-h-75 xl:col-span-6"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}>
            <UserCard
              userId={user?.id}
              onProfileUpdated={(updated) => {
                setData((prev) => ({
                  ...prev,
                  email: updated.email || prev.email,
                  username: updated.username || prev.username,
                }));
              }}
            />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.46, duration: 0.4 }}>
          <VaquinhasCard vaquinhas={userVaquinhas} loading={campaignsLoading} />
        </motion.div>
      </div>

      <FriendsModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        onFriendCountChange={handleFriendCountChange}
      />

    </div>
  );
}