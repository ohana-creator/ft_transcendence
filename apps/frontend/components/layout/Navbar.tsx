'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { ThemeModal } from '../MudarTemaModal';
import { useTheme } from 'next-themes';
import { LanguageModal } from '../MudarIdiomaModal';
import { useI18n } from '@/locales/useI18n';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import Image from 'next/image';

export default function Navbar() {
  const { t: {landing} } = useI18n();
  const aux = useI18n()
  const NAV_LINKS = [
    { href: '#resume', label: landing.resume },
    { href: '#overview', label: landing.overview },
    { href: '#features', label: landing.features },
    { href: '#team-project', label: landing.team },
  ];
  const path = usePathname();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenLang, setIsOpenLang] = useState(false);

  return (
    <header className="bg-vaks-light-primary dark:bg-vaks-dark-primary border-b border-gray-100 dark:border-gray-900 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-start gap-2.5">
            <AnimatedLogo variant="none" size={100} />
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                path === href || path.startsWith(href + '/')
                  ? 'text-vaks-light-main-txt bg-vaks-light-primary/8'
                  : 'text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:text-vaks-dark-main-txt dark:hover:text-vaks-light-main-txt hover:bg-vaks-light-info dark:hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notificações */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors" onClick={() => isOpen ? setIsOpen(false) : setIsOpen(true)}>
            <div className="absolute w-9 h-9 bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button rounded-full items-center justify-center flex">
             {theme === 'dark' ? <Moon className="w-5 h-5" color='#FFFFFF'/> : <Sun className="w-5 h-5" color='#FFFFFF'/> }
            </div>
            <ThemeModal isOpen={isOpen} setIsOpen={setIsOpen} />
          </button>

          {/* Avatar */}
          <div className="pl-2">
            <button className="relative w-24 h-8" onClick={() => setIsOpenLang(!isOpenLang)}>
              <div className="bg-vaks-light-purple-button items-center dark:bg-vaks-dark-purple-button rounded-md w-24 h-8 flex justify-center gap-2">
                <span className={`fi fi-${({pt:"pt",en:"gb",fr:"fr",es:"es"} as Record<string,string>)[aux.locale] || "gb"} rounded-sm`} />
                <span className="text-sm font-medium text-white">{aux.locale.toUpperCase()}</span>
              </div>
              <LanguageModal isOpen={isOpenLang} setIsOpen={setIsOpenLang} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
