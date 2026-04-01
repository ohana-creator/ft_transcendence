"use client";

// app/components/Navbar.tsx
import { useState } from "react";
import { GlobalSearch } from "./global-search";
import { HeaderActions } from "./header-actions";
import { Bell } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { NotificationsModal } from "./header-actions";
import { useAuth } from "@/contexts/auth";
import { useNotifications } from "@/hooks/notifications";
import { usePendingInvitations } from "@/hooks/campaigns";

const INVITE_DEBUG = process.env.NEXT_PUBLIC_DEBUG_INVITES === "true";
const INVITE_TYPE_HINTS = ["INVITE", "INVITATION", "CONVITE", "CONVITES"];

function normalizeInviteHint(value: unknown): string {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isInviteLikeNotification(notification: unknown): boolean {
  const notif = (notification || {}) as {
    type?: string;
    title?: string;
    message?: string;
    metadata?: {
      inviteId?: string;
      invitationId?: string;
      campaignId?: string;
      inviterId?: string;
      inviterName?: string;
      inviterUsername?: string;
    };
  };

  const metadata = notif.metadata || {};
  const combined = [notif.type, notif.title, notif.message]
    .map(normalizeInviteHint)
    .join(" ");

  const hasInviteMetadata = Boolean(metadata.inviteId || metadata.invitationId);
  const hasCampaignInviteShape = Boolean(
    metadata.campaignId && (metadata.inviterId || metadata.inviterName || metadata.inviterUsername)
  );

  return INVITE_TYPE_HINTS.some((hint) => combined.includes(hint)) || hasInviteMetadata || hasCampaignInviteShape;
}

export function Nav() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();
  const { count: pendingInvitesCount } = usePendingInvitations();

  const [openNotifs, setOpenNotifs] = useState(false);

  const inviteNotificationsCount = (notifications || [])
    .filter(isInviteLikeNotification)
    .filter((n) => !n.read)
    .length;

  const totalBadgeCount = Math.max(unreadCount, inviteNotificationsCount, pendingInvitesCount);

  if (INVITE_DEBUG) {
  }

  const username = user?.username || "Utilizador";
  const avatarUrl = user?.avatarUrl;

  return (
    <header className="sticky top-0 z-40 h-16 flex items-center px-6 gap-4
      bg-vaks-light-primary/80 dark:bg-vaks-dark-primary/80
      border-b border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/30
      backdrop-blur-md">

      {/* Logo */}
      <span className="font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt text-lg shrink-0">
        VAKS
      </span>

      {/* Search + Bell — juntos no centro */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <GlobalSearch />

        {/* Notificações Gerais */}
        <div className="relative shrink-0">
          <button
            onClick={() => setOpenNotifs(p => !p)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors
              ${openNotifs
                ? "bg-vaks-light-purple-button/10 dark:bg-vaks-dark-purple-button/20 text-vaks-light-purple-button dark:text-vaks-dark-secondary"
                : "text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input"
              }`}
          >
            <Bell className="h-5 w-5" />
            {totalBadgeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button px-1 text-[10px] font-bold text-white">
                {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {openNotifs && (
              <NotificationsModal
                onClose={() => setOpenNotifs(false)}
                notifications={notifications || []}
                notificationsLoading={notificationsLoading}
                unreadNotificationsCount={unreadCount}
                markNotificationAsRead={markAsRead}
                markAllNotificationsAsRead={markAllAsRead}
              />
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Avatar + user menu — só o avatar aqui, sem o bell */}
      <HeaderActions
        username={username}
        avatarUrl={avatarUrl}
      />
    </header>
  );
}