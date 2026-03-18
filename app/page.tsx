/**
 * Página Inicial - VAKS
 * Landing page com apresentação da plataforma
 */
"use client"

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Instagram, Github, Linkedin, Home as HomeIcon, FileText, Eye, Layers, Users, Lock, Globe, Wallet, Bell } from 'lucide-react';
import { Marquee } from '@/components';
import Image from "next/image"
import { useTheme } from 'next-themes';
import { useI18n } from '@/locales';
import HeroSection from '@/components/landing/hero';
import { NavBar } from '@/components/landing/tubelight-navbar';
import { Footer } from '@/components/landing/footer';
import { Features } from '@/components/landing/features';
import { FeaturesSectionWithHoverEffects } from '@/components/landing/feature-section-with-hover-effects';
import { ContainerScroll } from '@/components/landing/container-scroll-animation';
import { HeroHighlight, Highlight } from '@/components/landing/hero-highlight';

export default function Home() {
  const members = [
    { name: 'Ohana Bento', role: 'Função 1', image: '/file.svg', instragram: 'https://www.instagram.com/ohana_bento/', linkedin: 'https://www.linkedin.com/in/ohana-bento/', github: 'https://github.com/ohana-creator' },
    { name: 'Melzira Ebo', role: 'Função 2', image: '/file.svg', instragram: 'https://www.instagram.com/shelby__ebo/', linkedin: 'https://www.linkedin.com/in/orisa-melzira-ebo-aab95a267/', github: 'https://github.com/ShelbyEbo/' },
    { name: 'Joisson Miguel', role: 'Função 3', image: '/file.svg', instragram: 'https://www.instagram.com/joissonm/', linkedin: 'https://www.linkedin.com/in/joisson-miguel/', github: 'https://github.com/joissonm1' },
    { name: 'Kelson Pedro', role: 'Função 4', image: '/file.svg', instragram: 'https://www.instagram.com/shelby__ebo/', linkedin: 'https://www.linkedin.com/in/kelson-pedro-760a16381/', github: 'https://github.com/Kelson-D-Pedro' },
  ];
  const { theme } = useTheme();
  const { t } = useI18n();
  const landing = t.landing;

  const navItems = [
    { name: landing.resume, url: '#resume', icon: FileText },
    { name: landing.overview, url: '#overview', icon: Eye },
    { name: landing.features, url: '#features', icon: Layers },
    { name: landing.team, url: '#team-project', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {/* Navbar */}
      <NavBar items={navItems} />

      {/* Hero Section */}
      <HeroSection />

      {/* Resumo — Hero Highlight */}
      <section id="resume">
        <HeroHighlight containerClassName="py-20 px-6 md:py-28">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: [20, -5, 0] }}
              transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
              className="flex flex-col gap-8"
            >
              {/* Title */}
              <h2 className="text-3xl font-bold leading-snug text-vaks-light-main-txt dark:text-vaks-dark-main-txt md:text-5xl md:leading-snug">
                {landing.resume_subtitulo}{" "}
                <Highlight className="text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {landing.resume_subtitulo_destaque}
                </Highlight>
              </h2>

              {/* Content grid */}
              <div className="flex flex-col gap-12 md:flex-row md:items-start">
                <div className="flex flex-1 flex-col gap-5">
                  <p className="text-base leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt md:text-lg">
                    {landing.resume_paragrafo_1}
                  </p>
                  <p className="text-base leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt md:text-lg">
                    {landing.resume_paragrafo_2}
                  </p>
                  <p className="text-base leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt md:text-lg">
                    {landing.resume_paragrafo_3}
                  </p>
                </div>
                <div className="flex flex-1 justify-center">
                  <Image
                    src="/overview.png"
                    alt="VAKS Platform"
                    width={565}
                    height={463}
                    className="h-auto w-full max-w-md rounded-xl"
                    priority
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </HeroHighlight>
      </section>

      {/* Visão Geral — Scroll Animation */}
      <section id="overview">
        <ContainerScroll
          titleComponent={
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-3xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt md:text-5xl">
                {landing.overview_titulo}
              </h2>
              <p className="text-lg text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt md:text-xl">
                {landing.overview_subtitulo}
              </p>
            </div>
          }
        >
          <div className="flex h-full flex-col justify-center gap-8 overflow-y-auto px-6 py-8 md:px-12 md:py-10">
            {/* Main paragraph */}
            <p className="text-sm leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt md:text-base">
              {landing.overview_paragrafo_1}
            </p>

            {/* Campaign types */}
            <div>
              <p className="mb-4 text-sm font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt md:text-base">
                {landing.overview_paragrafo_2}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3 rounded-xl border border-vaks-light-stroke/40 bg-vaks-light-purple-card p-4 dark:border-vaks-dark-stroke/30 dark:bg-vaks-dark-purple-card">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    {landing.overview_tipo_privada}
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-vaks-light-stroke/40 bg-vaks-light-purple-card p-4 dark:border-vaks-dark-stroke/30 dark:bg-vaks-dark-purple-card">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    {landing.overview_tipo_publica}
                  </p>
                </div>
              </div>
            </div>

            {/* Closing paragraph */}
            <p className="text-sm leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt md:text-base">
              {landing.overview_paragrafo_3}
            </p>
          </div>
        </ContainerScroll>
      </section>

      {/* Tecnologias Marquee */}
      <Marquee />

      {/* Funcionalidades */}
      <div id="features">
        <FeaturesSectionWithHoverEffects />
      </div>

      {/* Equipa */}
      <section id="team-project" className="py-16 px-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          {landing.team}
        </h1>
        <div className="py-20 grid grid-cols-1 sm:grid-cols-2 gap-12 md:gap-20">
          {members.map((member) => (
            <div key={member.name} className="flex flex-col items-center">
              <Image
                src={member.image}
                alt={member.name}
                width={150}
                height={150}
                className="rounded-md"
              />
              <h3 className="text-lg py-2 font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {member.name}
              </h3>
              <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {member.role}
              </p>
              <div className="flex gap-3 py-2">
                <Link
                  href={member.instragram}
                  className="w-9 h-9 border-2 border-vaks-light-main-txt dark:border-vaks-dark-main-txt hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-button rounded-full flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-5 h-5 text-vaks-dark dark:text-vaks-white"/>
                </Link>
                <Link
                  href={member.github}
                  className="w-9 h-9 border-2 border-vaks-light-main-txt dark:border-vaks-dark-main-txt hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-button rounded-full flex items-center justify-center transition-colors"
                >
                  <Github className="w-5 h-5 text-vaks-dark dark:text-vaks-white"/>
                </Link>
                <Link
                  href={member.linkedin}
                  className="w-9 h-9 border-2 border-vaks-light-main-txt dark:border-vaks-dark-main-txt hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-button rounded-full flex items-center justify-center transition-colors"
                >
                  <Linkedin className="w-5 h-5 text-vaks-dark dark:text-vaks-white"/>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <Footer
        members={members.map((m) => ({
          name: m.name,
          instagram: m.instragram,
          linkedin: m.linkedin,
          github: m.github,
        }))}
      />
    </div>
  );
}