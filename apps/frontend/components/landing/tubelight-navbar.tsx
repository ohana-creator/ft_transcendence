"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { LucideIcon, Sun, Moon } from "lucide-react"
import { cn } from "@/utils/styling/cn"
import { useTheme } from "next-themes"
import { useI18n } from "@/locales/useI18n"
import { ThemeModal } from "@/components/MudarTemaModal"
import { LanguageModal } from "@/components/MudarIdiomaModal"
import { AnimatedLogo } from "@/components/ui/AnimatedLogo"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const [activeTab, setActiveTab] = useState("")
  const [isMobile, setIsMobile] = useState(false)

  const { theme } = useTheme()
  const aux = useI18n()

  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)

  /* ---------------- MOBILE DETECTION ---------------- */

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()

    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  /* ---------------- SCROLL SPY ---------------- */

  useEffect(() => {
    const navOffset = 96
    const sectionElements = items
      .map((item) => document.querySelector(item.url) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[]

    if (!sectionElements.length) return

    let ticking = false

    const updateActiveByScroll = () => {
      const scrollY = window.scrollY
      const viewportBottom = scrollY + window.innerHeight
      const docHeight = document.documentElement.scrollHeight

      // fim da página => última secção ativa
      if (viewportBottom >= docHeight - 4) {
        setActiveTab(sectionElements[sectionElements.length - 1].id)
        return
      }

      // encontra a última secção cujo topo já passou da navbar
      let currentId = sectionElements[0].id

      for (const section of sectionElements) {
        // Usa `section.offsetTop` fixo em relação à página para ser consistente no scroll
        const top = section.offsetTop - navOffset
        if (scrollY >= top - 10) { // pequena margem de 10px para ativar logo a seguir a passar
          currentId = section.id
        }
      }

      setActiveTab((prev) => (prev === currentId ? prev : currentId))
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        updateActiveByScroll()
        ticking = false
      })
    }

    // inicializa estado correto
    updateActiveByScroll()

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", updateActiveByScroll)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", updateActiveByScroll)
    }
  }, [items])

  /* ---------------- SCROLL TO SECTION ---------------- */

  const handleScroll = (url: string) => {
    const section = document.querySelector(url)

    if (section) {
      setActiveTab(url.replace("#", ""))
      section.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  }

  /* ---------------- LOGO SCROLL TOP ---------------- */

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault()

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })

    setActiveTab("")
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full backdrop-blur-lg",
        "bg-vaks-light-primary/80 dark:bg-vaks-dark-primary/80",
        "border-b border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/30",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">

        {/* ---------------- LOGO ---------------- */}

        <Link href="/" className="shrink-0" onClick={handleLogoClick}>
          <AnimatedLogo variant="none" size={100} />
        </Link>

        {/* ---------------- NAV LINKS ---------------- */}

        <nav className="flex items-center">
          <div
            className={cn(
              "flex items-center gap-1 py-1 px-1 rounded-full",
              "bg-vaks-light-primary/50 dark:bg-vaks-dark-primary/50",
              "border border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/30",
            )}
          >
            {items.map((item) => {
              const Icon = item.icon
              const sectionId = item.url.replace("#", "")
              const isActive = activeTab === sectionId

              return (
                <button
                  key={item.name}
                  onClick={() => handleScroll(item.url)}
                  className={cn(
                    "relative cursor-pointer text-sm font-semibold px-5 py-2 rounded-full transition-colors duration-200",
                    "text-vaks-light-main-txt/80 dark:text-vaks-dark-main-txt/80",
                    "hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary",
                    isActive &&
                      "bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover text-vaks-light-purple-button dark:text-vaks-dark-alt-txt",
                  )}
                >
                  <span className="hidden md:inline">{item.name}</span>

                  <span className="md:hidden">
                    <Icon size={18} strokeWidth={2.5} />
                  </span>

                  {isActive && (
                    <motion.div
                      layoutId="tubelight"
                      className="absolute inset-0 w-full rounded-full -z-10 bg-vaks-light-purple-button/5 dark:bg-vaks-dark-purple-button/10"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    >
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-vaks-light-purple-button dark:bg-vaks-dark-secondary rounded-t-full">
                        <div className="absolute w-12 h-6 bg-vaks-light-purple-button/20 dark:bg-vaks-dark-secondary/20 rounded-full blur-md -top-2 -left-2" />
                        <div className="absolute w-8 h-6 bg-vaks-light-purple-button/20 dark:bg-vaks-dark-secondary/20 rounded-full blur-md -top-1" />
                        <div className="absolute w-4 h-4 bg-vaks-light-purple-button/20 dark:bg-vaks-dark-secondary/20 rounded-full blur-sm top-0 left-2" />
                      </div>
                    </motion.div>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* ---------------- TOGGLES ---------------- */}

        <div className="flex items-center gap-2 shrink-0">

          {/* Theme Toggle */}

          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
            onClick={() => setIsThemeOpen(!isThemeOpen)}
          >
            <div className="absolute w-9 h-9 bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button rounded-full items-center justify-center flex">
              <Moon className="w-5 h-5 hidden dark:block" color="#FFFFFF" />
              <Sun className="w-5 h-5 dark:hidden" color="#FFFFFF" />
            </div>

            <ThemeModal isOpen={isThemeOpen} setIsOpen={setIsThemeOpen} />
          </button>

          {/* Language Toggle */}

          <div className="pl-2">
            <button
              className="relative w-24 h-8"
              onClick={() => setIsLangOpen(!isLangOpen)}
            >
              <div className="bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button items-center rounded-md w-24 h-8 flex justify-center gap-2">

                <span
                  className={`fi fi-${
                    ({ pt: "pt", en: "gb", fr: "fr", es: "es" } as Record<
                      string,
                      string
                    >)[aux.locale] || "gb"
                  } rounded-sm`}
                />

                <span className="text-sm font-medium text-white">
                  {aux.locale.toUpperCase()}
                </span>

              </div>

              <LanguageModal isOpen={isLangOpen} setIsOpen={setIsLangOpen} />
            </button>
          </div>

        </div>
      </div>
    </header>
  )
}