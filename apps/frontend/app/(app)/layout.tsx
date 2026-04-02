/**
 * Layout da App - VAKS
 * Sidebar fixa para todas as páginas internas (dashboard, vaquinhas, carteira, perfil)
 */
"use client"

import React, { useEffect, useState } from "react"
import {
  Sidebar,
  SidebarBody,
  SidebarLinkItem,
  SidebarDropdown,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Home,
  HandCoins,
  Wallet,
  PlusCircle,
  Globe,
  Lock,
  UserCircle,
  Settings,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useI18n } from "@/locales"
import { usePathname, useRouter } from "next/navigation"
import { VaksMascot } from "@/components/config/mascot"
import { AnimatePresence, motion } from "framer-motion"
import { PageTransition, AnimatedLogo } from "@/components"
import { Nav } from "@/components/dashboard/nav-dashboard"
import { useAuth } from "@/contexts/auth"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  const { theme } = useTheme()
  const { t } = useI18n()
  const nav = t.sidebar
  const vaks = t.vaquinhas
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading, logout } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-vaks-light-primary dark:bg-vaks-dark-primary">
        <span className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.alerts.validating_session}</span>
      </div>
    )
  }
  
  // Páginas que JÁ têm a mascote — não mostrar na sidebar
  const paginasComMascote = ['/carteira', '/config']
  const mostrarMascoteSidebar = !paginasComMascote.some(p => pathname.startsWith(p))


  const mainLinks = [
    {
      label: nav.home,
      href: "/dashboard",
      icon: <Home className="h-5 w-5 shrink-0" />,
    },
    {
      label: nav.carteira,
      href: "/carteira",
      icon: <Wallet className="h-5 w-5 shrink-0" />,
    },
  ]

  const vaquinhasLinks = [
    {
      label: vaks.publicas,
      href: "/vaquinhas",
      icon: <Globe className="h-5 w-5 shrink-0" />,
    },
    {
      label: vaks.privadas,
      href: "/vaquinhas/privadas",
      icon: <Lock className="h-5 w-5 shrink-0" />,
    },
  ]
  const createLinks = [
    {
      label: nav.publica,
      href: "/vaquinhas/publicas/criar",
      icon: <Globe className="h-5 w-5 shrink-0" />,
    },
    {
      label: nav.privada,
      href: "/vaquinhas/privadas/criar",
      icon: <Lock className="h-5 w-5 shrink-0" />,
    },
  ]

  const bottomLinks = [
    {
      label: nav.perfil,
      href: "/perfil",
      icon: <UserCircle className="h-5 w-5 shrink-0" />,
    },
    {
      label: nav.configuracoes,
      href: "/config",
      icon: <Settings className="h-5 w-5 shrink-0" />,
    },
    {
      label: nav.sair,
      href: "#",
      icon: <LogOut className="h-5 w-5 shrink-0 text-vaks-light-error dark:text-vaks-dark-error" />,
      onClick: () => {
        logout()
        router.replace("/auth/login")
      },
    },
  ]

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-vaks-light-primary dark:bg-vaks-dark-primary overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6">
          {/* Top section */}
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {/* Logo */}
            <Logo />

            {/* Main nav */}
            <div className="mt-8 flex flex-col gap-2">
              {mainLinks.map((link, idx) => (
                <SidebarLinkItem key={idx} link={link} />
              ))}
              <SidebarDropdown label={nav.vaquinhas} icon={<HandCoins className="h-5 w-5 shrink-0 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />} links={vaquinhasLinks} />
            </div>

            <div className="mt-2">
              <SidebarDropdown
                label={nav.criar}
                icon={<PlusCircle className="h-5 w-5 shrink-0 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />}
                links={createLinks}
              />
            </div>
          </div>

          {/* Mascote — só aparece se a página atual NÃO tem mascote própria */}
          <AnimatePresence mode="wait">
            {mostrarMascoteSidebar && open && (
              <motion.div
                key="sidebar-mascot"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex items-center justify-center mb-3"
              >
                <VaksMascot width={100} height={100} compact />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom section */}
          <div className="flex flex-col gap-1 border-t border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/30 pt-4">
            {bottomLinks.map((link, idx) => (
              <SidebarLinkItem key={idx} link={link} />
            ))}
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Nav />
        <main className="flex-1 overflow-y-auto">
            {children}
        </main>
      </div>
    </div>
  )
}

function Logo() {
  const { open } = useSidebar()

  return (
    <Link
      href="/dashboard"
      className="flex items-center justify-center py-1 relative z-20"
    >
      <AnimatedLogo variant="none" size={open ? 110 : 50} />
    </Link>
  )
}
