"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, Users, Globe, LogOut, User, Sun, Moon,
  Check, Mail, X, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/locales";
import { useTheme } from "next-themes";
import { UserAvatar } from "@/components/profile/useAvatar";
import { Notification, NotificationType } from "@/types/notifications";
import { useAuth } from "@/contexts/auth";
import { usePendingInvitations } from "@/hooks/campaigns";

type NotifTab = "geral" | "convites";
const INVITE_TYPE_HINTS = ["INVITE", "INVITATION", "CONVITE", "CONVITES"];

type InviteNotificationMetadata = {
  inviteId?: string;
  invitationId?: string;
  campaignId?: string;
  campaignTitle?: string;
  inviterId?: string;
  inviterName?: string;
  inviterUsername?: string;
};

interface NotificationsModalProps {
  onClose: () => void;
  notifications: Notification[];
  notificationsLoading: boolean;
  unreadNotificationsCount: number;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

function useClickOutside(ref: React.RefObject<HTMLElement>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Notificações — exportado para usar no Nav
// ─────────────────────────────────────────────────────────────────────────────

function notificationVisual(type: NotificationType): { icon: React.ReactNode; iconBg: string } {
  switch (type) {
    case "CAMPAIGN_CONTRIBUTION":
      return { icon: <Check className="h-3.5 w-3.5" />, iconBg: "bg-emerald-500" };
    case "CAMPAIGN_INVITE":
      return { icon: <Mail className="h-3.5 w-3.5" />, iconBg: "bg-sky-500" };
    case "WALLET_TRANSFER_RECEIVED":
    case "WALLET_TRANSFER_SENT":
      return { icon: <Globe className="h-3.5 w-3.5" />, iconBg: "bg-indigo-500" };
    case "CAMPAIGN_GOAL_REACHED":
      return { icon: <Check className="h-3.5 w-3.5" />, iconBg: "bg-violet-500" };
    case "CAMPAIGN_CLOSED":
      return { icon: <X className="h-3.5 w-3.5" />, iconBg: "bg-amber-500" };
    case "MEMBER_PROMOTED":
      return { icon: <Users className="h-3.5 w-3.5" />, iconBg: "bg-purple-500" };
    default:
      return { icon: <Bell className="h-3.5 w-3.5" />, iconBg: "bg-gray-500" };
  }
}

function formatRelativeTime(input: string): string {
  const date = new Date(input);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}m`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

function normalizeInviteHint(value: unknown): string {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isInviteLikeNotification(item: Notification): boolean {
  const metadata = (item.metadata || {}) as InviteNotificationMetadata;
  const combined = [item.type, item.title, item.message].map(normalizeInviteHint).join(" ");
  const hasInviteHint = INVITE_TYPE_HINTS.some((hint) => combined.includes(hint));
  const hasInviteMetadata = Boolean(metadata.inviteId || metadata.invitationId);
  const hasCampaignInviteShape = Boolean(
    metadata.campaignId && (metadata.inviterId || metadata.inviterName || metadata.inviterUsername)
  );

  return hasInviteHint || hasInviteMetadata || hasCampaignInviteShape;
}

function getInviteIdFromNotification(item: Notification): string | null {
  const metadata = (item.metadata || {}) as InviteNotificationMetadata;
  return metadata.inviteId || metadata.invitationId || null;
}

function getCampaignIdFromNotification(item: Notification): string | undefined {
  const metadata = (item.metadata || {}) as InviteNotificationMetadata;
  return metadata.campaignId;
}

function getInviteTitleFromNotification(item: Notification): string {
  const metadata = (item.metadata || {}) as InviteNotificationMetadata;
  return metadata.campaignTitle || item.title || "Convite para vaquinha privada";
}

function getInviterLabelFromNotification(item: Notification): string {
  const metadata = (item.metadata || {}) as InviteNotificationMetadata;
  return metadata.inviterName || metadata.inviterUsername || "alguem";
}

export function NotificationsModal({
  onClose,
  notifications = [],
  notificationsLoading = false,
  unreadNotificationsCount = 0,
  markNotificationAsRead = async () => {},
  markAllNotificationsAsRead = async () => {},
}: NotificationsModalProps) {
  const { t } = useI18n();
  const notifT = t.dashboard.header_actions.notifications;
  const [tab, setTab] = useState<NotifTab>("geral");
  const {
    invitations,
    loading: invitesLoading,
    acceptInvitation,
    rejectInvitation,
  } = usePendingInvitations();
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);

  const ref = useRef<HTMLDivElement>(null!);
  useClickOutside(ref, onClose);

  const generalNotifications = notifications.filter((n) => !isInviteLikeNotification(n));
  const inviteNotifications = notifications.filter(isInviteLikeNotification);

  const unreadCount = (key: NotifTab) => {
    if (key === "geral") return unreadNotificationsCount;
    // Para convites: soma as notificações não lidas + convites pendentes do hook
    return inviteNotifications.filter(n => !n.read).length + invitations.length;
  };

  const handleMarkAllRead = async () => {
    if (tab !== "geral") return;
    await markAllNotificationsAsRead();
  };

  const handleMarkNotification = async (item: Notification) => {
    if (item.read) return;
    await markNotificationAsRead(item.id);
  };

  const markCampaignInviteNotificationsAsRead = async (campaignId?: string) => {
    if (!campaignId) return;

    const related = inviteNotifications.filter((notification) => {
      const metadataCampaignId = (notification.metadata as { campaignId?: string } | undefined)?.campaignId;
      return metadataCampaignId === campaignId && !notification.read;
    });

    await Promise.all(related.map((notification) => markNotificationAsRead(notification.id).catch(() => undefined)));
  };

  const handleAcceptFromNotification = async (notification: Notification) => {
    const inviteId = getInviteIdFromNotification(notification);
    const campaignId = getCampaignIdFromNotification(notification);

    if (!inviteId) {
      await handleMarkNotification(notification);
      return;
    }

    await handleAcceptInvitation(inviteId, campaignId);
    await handleMarkNotification(notification);
  };

  const handleRejectFromNotification = async (notification: Notification) => {
    const inviteId = getInviteIdFromNotification(notification);
    const campaignId = getCampaignIdFromNotification(notification);

    if (!inviteId) {
      await handleMarkNotification(notification);
      return;
    }

    await handleRejectInvitation(inviteId, campaignId);
    await handleMarkNotification(notification);
  };

  const handleAcceptInvitation = async (inviteId: string, campaignId?: string) => {
    try {
      setActingInviteId(inviteId);
      await acceptInvitation(inviteId);
      await markCampaignInviteNotificationsAsRead(campaignId);
    } catch {
      // Toast já tratado no hook.
    } finally {
      setActingInviteId(null);
    }
  };

  const handleRejectInvitation = async (inviteId: string, campaignId?: string) => {
    try {
      setActingInviteId(inviteId);
      await rejectInvitation(inviteId);
      await markCampaignInviteNotificationsAsRead(campaignId);
    } catch {
      // Toast já tratado no hook.
    } finally {
      setActingInviteId(null);
    }
  };

  const tabs: { key: NotifTab; label: string; icon: React.ReactNode }[] = [
    { key: "geral",  label: notifT.tabs.geral,  icon: <Globe className="h-3.5 w-3.5" /> },
    {
      key: "convites",
      label: notifT.tabs.amigos,
      icon: <Users className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute -left-48 top-full mt-3 z-50 w-[22rem]
        rounded-2xl border border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20
        bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card
        shadow-xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h3 className="text-sm font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          {notifT.title}
        </h3>
        {tab === "geral" && unreadCount(tab) > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[11px] font-medium text-vaks-light-purple-button dark:text-vaks-dark-secondary hover:underline"
          >
            {notifT.mark_all_read}
          </button>
        )}
      </div>

      <div className="flex px-4 gap-1 pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.key
                ? "bg-vaks-light-purple-button/10 dark:bg-vaks-dark-purple-button/20 text-vaks-light-purple-button dark:text-vaks-dark-secondary"
                : "text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
            }`}
          >
            {t.icon}
            {t.label}
            {unreadCount(t.key) > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button px-1 text-[10px] font-bold text-white">
                {unreadCount(t.key)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto px-2 pb-3 flex flex-col gap-0.5">
        <AnimatePresence mode="popLayout">
          {tab === "geral" && !notificationsLoading && generalNotifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 gap-2"
            >
              <Bell className="h-8 w-8 text-vaks-light-alt-txt/30 dark:text-vaks-dark-alt-txt/30" />
              <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {notifT.empty}
              </p>
            </motion.div>
          )}

          {tab === "geral" && notificationsLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-8 text-center text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {t.common.loading_notifications}
            </motion.div>
          )}

          {tab === "geral" && generalNotifications.map((n, i) => {
            const visual = notificationVisual(n.type);
            return (
            <motion.button
              key={n.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleMarkNotification(n)}
              className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
                ${!n.read
                  ? "bg-vaks-light-purple-button/5 dark:bg-vaks-dark-purple-button/10 hover:bg-vaks-light-purple-button/10 dark:hover:bg-vaks-dark-purple-button/15"
                  : "hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                }`}
            >
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white ${visual.iconBg}`}>
                {visual.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${!n.read ? "text-vaks-light-main-txt dark:text-vaks-dark-main-txt" : "text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt"}`}>
                  {n.title}
                </p>
                <p className="text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5 line-clamp-2">
                  {n.message}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[10px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{formatRelativeTime(n.createdAt)}</span>
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button" />
                )}
              </div>
            </motion.button>
          );})}

          {tab === "convites" && !notificationsLoading && !invitesLoading && invitations.length === 0 && inviteNotifications.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 gap-2"
            >
              <Users className="h-8 w-8 text-vaks-light-alt-txt/30 dark:text-vaks-dark-alt-txt/30" />
              <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {t.common.no_pending_invites}
              </p>
            </motion.div>
          )}

          {tab === "convites" && (notificationsLoading || invitesLoading) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-8 text-center text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {t.common.loading_invites}
            </motion.div>
          )}

          {tab === "convites" && !invitesLoading && invitations.map((invite, i) => {
            const isBusy = actingInviteId === invite.id;

            return (
              <motion.div
                key={`pending-${invite.id}`}
                layout
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="w-full rounded-xl px-3 py-2.5 text-left bg-vaks-light-purple-button/5 dark:bg-vaks-dark-purple-button/10 border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/20"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white bg-sky-500">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                      {invite.campaign?.title || t.invitations.private_campaign_invite}
                    </p>
                    <p className="text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5 line-clamp-2">
                      {t.invitations.invited_by.replace('{{name}}', invite.inviterName)}
                    </p>
                  </div>
                  <span className="text-[10px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{formatRelativeTime(invite.createdAt)}</span>
                </div>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleRejectInvitation(invite.id, invite.campaignId)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {t.invitations.reject}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleAcceptInvitation(invite.id, invite.campaignId)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isBusy ? t.invitations.processing : t.invitations.accept}
                  </button>
                </div>
              </motion.div>
            );
          })}

          {tab === "convites" && inviteNotifications.map((inviteNotification, i) => (
            <motion.div
              key={inviteNotification.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
                ${!inviteNotification.read
                  ? "bg-vaks-light-purple-button/5 dark:bg-vaks-dark-purple-button/10 hover:bg-vaks-light-purple-button/10 dark:hover:bg-vaks-dark-purple-button/15"
                  : "hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                }`}
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white bg-sky-500">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {getInviteTitleFromNotification(inviteNotification)}
                </p>
                <p className="text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5 line-clamp-2">
                  {t.invitations.invited_by.replace('{{name}}', getInviterLabelFromNotification(inviteNotification))}
                </p>
                <p className="text-[10px] text-vaks-light-alt-txt/80 dark:text-vaks-dark-alt-txt/80 mt-0.5 line-clamp-2">
                  {inviteNotification.message}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[10px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{formatRelativeTime(inviteNotification.createdAt)}</span>
                {!inviteNotification.read && (
                  <span className="h-2 w-2 rounded-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button" />
                )}
              </div>

              <div className="ml-auto flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleRejectFromNotification(inviteNotification)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  {t.invitations.reject}
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptFromNotification(inviteNotification)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {t.invitations.accept}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Utilizador
// ─────────────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "es", label: "ES" },
] as const;

function UserMenuModal({
  username,
  avatarUrl,
  onClose,
}: {
  username: string;
  avatarUrl?: string | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null!);
  useClickOutside(ref, onClose);
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const menuT = t.dashboard.header_actions.user_menu;
  const isDark = theme === "dark";

  const handleLogout = () => {
    logout();
    onClose();
    router.replace("/auth/login");
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.97 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute right-0 top-full mt-3 z-50 w-64
        rounded-2xl border border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20
        bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card
        shadow-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15">
        <UserAvatar username={username} avatarUrl={avatarUrl} size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt truncate">
            {username}
          </p>
          <p className="text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {menuT.role}
          </p>
        </div>
      </div>

      <div className="p-2 flex flex-col gap-0.5">
        <Link
          href="/perfil"
          onClick={onClose}
          className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5
            text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt
            hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input transition-colors group"
        >
          <span className="flex items-center gap-2.5">
            <User className="h-4 w-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
            {menuT.view_profile}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        <div className="h-px bg-vaks-light-stroke/20 dark:bg-vaks-dark-stroke/15 my-1" />

        <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
          <span className="flex items-center gap-2.5 text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            {isDark
              ? <Moon className="h-4 w-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
              : <Sun className="h-4 w-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
            }
            {isDark ? menuT.theme_dark : menuT.theme_light}
          </span>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
              isDark
                ? "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button"
                : "bg-vaks-light-stroke/40 dark:bg-vaks-dark-stroke/40"
            }`}
          >
            <motion.span
              animate={{ x: isDark ? -16 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl px-3 py-2">
          <span className="flex items-center gap-2.5 text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            <Globe className="h-4 w-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
            {menuT.language}
          </span>
          <div className="flex gap-0.5">
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                  locale === l.code
                    ? "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white"
                    : "text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-vaks-light-stroke/20 dark:bg-vaks-dark-stroke/15 my-1" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 w-full
            text-sm font-medium text-vaks-light-error dark:text-vaks-dark-error
            hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {menuT.logout}
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeaderActions — apenas o avatar/user menu
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderActionsProps {
  username: string;
  avatarUrl?: string | null;
}

export function HeaderActions({ username, avatarUrl }: HeaderActionsProps) {
  const [openUser, setOpenUser] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpenUser(p => !p)}
        className={`relative h-9 w-9 rounded-full overflow-hidden border-2 transition-all
          ${openUser
            ? "border-vaks-light-purple-button dark:border-vaks-dark-purple-button"
            : "border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/20 hover:border-vaks-light-purple-button/50 dark:hover:border-vaks-dark-purple-button/50"
          }`}
      >
        <UserAvatar username={username} avatarUrl={avatarUrl} size="fill" />
      </button>

      <AnimatePresence>
        {openUser && (
          <UserMenuModal
            username={username}
            avatarUrl={avatarUrl}
            onClose={() => setOpenUser(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}