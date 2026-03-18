"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/locales/useI18n";
import { ThemeModal } from "@/components/MudarTemaModal";
import { LanguageModal } from "@/components/MudarIdiomaModal";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { t, locale } = useI18n();
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  return (
    <div className="min-h-screen bg-vaks-light-secondary dark:bg-vaks-dark-primary transition-colors">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-100 backdrop-blur-lg bg-vaks-light-primary/80 dark:bg-vaks-dark-primary/80 border-b border-vaks-light-stroke dark:border-vaks-dark-stroke px-6 flex items-center justify-between h-16 transition-colors">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/logo_light.svg"
            alt="VAKS Logo"
            width={32}
            height={32}
            className="dark:hidden"
          />
          <Image
            src="/logo_dark.svg"
            alt="VAKS Logo"
            width={32}
            height={32}
            className="hidden dark:inline-block"
          />
          <span className="text-xs font-bold tracking-[3px] uppercase text-[#361965] dark:text-vaks-dark-main-txt hidden sm:inline">
            VAKS
          </span>
        </Link>
        
        <div className="flex items-center gap-2 overflow-hidden px-2">
          <Link
            href="/legal/politica-de-privacidade"
            className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-[#7C3AED] dark:hover:text-vaks-dark-main-txt px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {t.legal.navbar.privacidade}
          </Link>
          <Link
            href="/legal/termos-de-servico"
            className="text-sm font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-[#7C3AED] dark:hover:text-vaks-dark-main-txt px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {t.legal.navbar.termos}
          </Link>
        </div>

        <div className="flex items-center gap-12 shrink-0">
          {/* Toggles */}
          <div className="flex items-center gap-2">
            <button 
              className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button hover:opacity-90" 
              onClick={() => setIsThemeOpen(true)}
              title={t.legal.navbar.tema}
            >
              {theme === 'dark' ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
              <ThemeModal isOpen={isThemeOpen} setIsOpen={setIsThemeOpen} />
            </button>

            <button 
              className="relative px-6 h-9 flex items-center justify-center gap-2 rounded-lg transition-colors bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button hover:opacity-90" 
              onClick={() => setIsLangOpen(true)}
              title={t.legal.navbar.idioma}
            >
              <span className={`fi fi-${({pt:"pt",en:"gb",fr:"fr",es:"es"} as Record<string,string>)[locale] || "gb"} rounded-sm w-4 h-3`} />
              <span className="text-xs font-bold text-white uppercase">{locale}</span>
              <LanguageModal isOpen={isLangOpen} setIsOpen={setIsLangOpen} />
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {children}
      </div>

      {/* Back to home */}
      <div className="max-w-205 mx-auto px-6 pb-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#7C3AED] dark:text-vaks-dark-alt-txt hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.legal.navbar.voltar}
        </Link>
      </div>
    </div>
  );
}
