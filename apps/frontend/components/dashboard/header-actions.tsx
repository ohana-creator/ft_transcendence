"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, Users, Globe, LogOut, User, Sun, Moon,
  Check, Heart, Handshake, Megaphone, Gift, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "@/locales";
import { useTheme } from "next-themes";
import { UserAvatar } from "@/components/profile/useAvatar";

type NotifTab = "geral" | "amigos";

interface Notification {
  id: string;
  tab: NotifTab;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
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

export function NotificationsModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const notifT = t.dashboard.header_actions.notifications;
  const [tab, setTab] = useState<NotifTab>("geral");
  const [notifs, setNotifs] = useState<Notification[]>(() => [
    {
      id: "1", tab: "geral",
      icon: <Megaphone className="h-3.5 w-3.5" />, iconBg: "bg-purple-500",
      title: notifT.items.n1_title, description: notifT.items.n1_description,
      time: "2m", read: false,
    },
    {
      id: "2", tab: "geral",
      icon: <Gift className="h-3.5 w-3.5" />, iconBg: "bg-amber-500",
      title: notifT.items.n2_title, description: notifT.items.n2_description,
      time: "1h", read: false,
    },
    {
      id: "3", tab: "geral",
      icon: <Check className="h-3.5 w-3.5" />, iconBg: "bg-emerald-500",
      title: notifT.items.n3_title, description: notifT.items.n3_description,
      time: "3h", read: true,
    },
    {
      id: "4", tab: "amigos",
      icon: <Heart className="h-3.5 w-3.5" />, iconBg: "bg-pink-500",
      title: notifT.items.n4_title, description: notifT.items.n4_description,
      time: "5m", read: false,
    },
    {
      id: "5", tab: "amigos",
      icon: <Handshake className="h-3.5 w-3.5" />, iconBg: "bg-sky-500",
      title: notifT.items.n5_title, description: notifT.items.n5_description,
      time: "2h", read: false,
    },
    {
      id: "6", tab: "amigos",
      icon: <Users className="h-3.5 w-3.5" />, iconBg: "bg-indigo-500",
      title: notifT.items.n6_title, description: notifT.items.n6_description,
      time: "1d", read: true,
    },
  ]);

  const ref = useRef<HTMLDivElement>(null!);
  useClickOutside(ref, onClose);

  const filtered = notifs.filter(n => n.tab === tab);
  const unreadCount = (key: NotifTab) => notifs.filter(n => n.tab === key && !n.read).length;
  const markAllRead = () => setNotifs(prev => prev.map(n => n.tab === tab ? { ...n, read: true } : n));
  const markOne = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

  const tabs: { key: NotifTab; label: string; icon: React.ReactNode }[] = [
    { key: "geral",  label: notifT.tabs.geral,  icon: <Globe className="h-3.5 w-3.5" /> },
    { key: "amigos", label: notifT.tabs.amigos, icon: <Users className="h-3.5 w-3.5" /> },
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
        {unreadCount(tab) > 0 && (
          <button
            onClick={markAllRead}
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
          {filtered.length === 0 && (
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
          {filtered.map((n, i) => (
            <motion.button
              key={n.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => markOne(n.id)}
              className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors
                ${!n.read
                  ? "bg-vaks-light-purple-button/5 dark:bg-vaks-dark-purple-button/10 hover:bg-vaks-light-purple-button/10 dark:hover:bg-vaks-dark-purple-button/15"
                  : "hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
                }`}
            >
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white ${n.iconBg}`}>
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${!n.read ? "text-vaks-light-main-txt dark:text-vaks-dark-main-txt" : "text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt"}`}>
                  {n.title}
                </p>
                <p className="text-[11px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-0.5 line-clamp-2">
                  {n.description}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[10px] text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{n.time}</span>
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button" />
                )}
              </div>
            </motion.button>
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
  const { theme, setTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const menuT = t.dashboard.header_actions.user_menu;
  const isDark = theme === "dark";

  const handleLogout = () => router.push("/auth/login");

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