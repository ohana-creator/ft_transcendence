"use client";

// app/components/Navbar.tsx
import { useState } from "react";
import { GlobalSearch } from "./global-search";
import { HeaderActions } from "./header-actions";
import { Bell } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { NotificationsModal } from "./header-actions"; // exporta o modal separadamente — ver nota abaixo

export function Nav() {
  type UserData = {
    dob: string; email: string; phone: string; username: string; avatarUrl?: string;
  };

  const [data] = useState<UserData>({
    dob: "17-11-2005",
    email: "user@example.com",
    phone: "+244 999 999 999",
    username: "melzira_ebo",
    avatarUrl: undefined,
  });

  const [openNotifs, setOpenNotifs] = useState(false);
  const unreadTotal = 4;

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

        {/* Bell colado à search */}
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
            {unreadTotal > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button px-1 text-[10px] font-bold text-white">
                {unreadTotal}
              </span>
            )}
          </button>

          <AnimatePresence>
            {openNotifs && (
              <NotificationsModal onClose={() => setOpenNotifs(false)} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Avatar + user menu — só o avatar aqui, sem o bell */}
      <HeaderActions
        username={data.username}
        avatarUrl={data.avatarUrl}
      />
    </header>
  );
}