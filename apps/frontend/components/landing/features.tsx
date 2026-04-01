"use client"

import { ArrowRight, Globe, Lock, Wallet, Bell, LucideIcon } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/locales/useI18n"

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  COMO EDITAR AS FEATURES                                            ║
 * ║                                                                      ║
 * ║  O conteúdo (textos) vive nos ficheiros de tradução:                 ║
 * ║    • locales/pt/index.ts  →  features_section.items.feature_X        ║
 * ║    • locales/en/index.ts  →  features_section.items.feature_X        ║
 * ║                                                                      ║
 * ║  Os ícones e imagens são definidos aqui em FEATURE_CONFIG abaixo.    ║
 * ║                                                                      ║
 * ║  Para ADICIONAR uma feature:                                         ║
 * ║    1. Adicione feature_5 (ou o nº seguinte) nos 2 ficheiros locales  ║
 * ║       com { titulo: '...', descricao: '...' }                        ║
 * ║    2. Adicione uma entrada em FEATURE_CONFIG com a mesma key          ║
 * ║       ex: feature_5: { icon: AlgumaIcon, gradient: '...' }          ║
 * ║                                                                      ║
 * ║  Para REMOVER uma feature:                                           ║
 * ║    1. Apague o bloco feature_X nos 2 ficheiros locales               ║
 * ║    2. Apague a entrada correspondente em FEATURE_CONFIG               ║
 * ║                                                                      ║
 * ║  Para MUDAR O ÍCONE:                                                  ║
 * ║    1. Importe o ícone de lucide-react no topo deste ficheiro          ║
 * ║    2. Substitua o icon na entrada FEATURE_CONFIG correspondente       ║
 * ║    Lista de ícones: https://lucide.dev/icons                          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

/*
 * Configuração visual de cada feature.
 * A key deve corresponder ao nome em features_section.items nos locales.
 * - icon: ícone lucide-react
 * - gradient: classes Tailwind para o gradiente do card (light + dark)
 */
const FEATURE_CONFIG: Record<
  string,
  { icon: LucideIcon; gradient: string }
> = {
  feature_1: {
    icon: Globe,
    gradient:
      "from-vaks-light-purple-button/10 to-vaks-light-purple-card-hover dark:from-vaks-dark-purple-button/20 dark:to-vaks-dark-purple-card",
  },
  feature_2: {
    icon: Lock,
    gradient:
      "from-vaks-light-info/10 to-vaks-light-purple-card-hover dark:from-vaks-dark-info/20 dark:to-vaks-dark-purple-card",
  },
  feature_3: {
    icon: Wallet,
    gradient:
      "from-vaks-light-success/10 to-vaks-light-purple-card-hover dark:from-vaks-dark-success/20 dark:to-vaks-dark-purple-card",
  },
  feature_4: {
    icon: Bell,
    gradient:
      "from-vaks-light-warning/10 to-vaks-light-purple-card-hover dark:from-vaks-dark-warning/20 dark:to-vaks-dark-purple-card",
  },
}

export function Features() {
  const { t } = useI18n()
  const section = t.features_section
  const items = section.items

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-14">
        {/* Header */}
        <div className="max-w-lg">
          <h2 className="mb-2 text-3xl md:text-4xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            {section.heading}
          </h2>
          <p className="mb-6 text-xl md:text-2xl font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {section.descricao}
          </p>
          <Link
            href={section.cta_url}
            className="group inline-flex items-center text-sm md:text-base font-semibold text-vaks-light-purple-button dark:text-vaks-dark-secondary hover:underline"
          >
            {section.cta_texto}
            <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto">
          {Object.entries(items).map(([key, feature]) => {
            const config = FEATURE_CONFIG[key] || {
              icon: Globe,
              gradient:
                "from-vaks-light-purple-button/10 to-vaks-light-purple-card-hover dark:from-vaks-dark-purple-button/20 dark:to-vaks-dark-purple-card",
            }
            const Icon = config.icon

            return (
              <div
                key={key}
                className="group flex flex-col overflow-hidden rounded-md border border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40 transition-all duration-300 hover:border-vaks-light-purple-button/40 dark:hover:border-vaks-dark-secondary/40"
              >
                {/* Icon area — light bg */}
                <div
                  className={`flex items-center justify-center h-44 bg-linear-to-br ${config.gradient} bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover`}
                >
                  <div className="w-16 h-16 rounded-md bg-vaks-light-purple-card/90 dark:bg-vaks-dark-purple-card/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-vaks-light-purple-button dark:text-vaks-dark-secondary" />
                  </div>
                </div>

                {/* Text area — dark bg */}
                <div className="flex-1 bg-vaks-light-main-txt dark:bg-vaks-dark-primary px-6 py-8 md:px-8 md:py-10">
                  <h3 className="mb-3 text-lg md:text-xl font-semibold text-vaks-white dark:text-vaks-dark-main-txt">
                    {feature.titulo}
                  </h3>
                  <p className="text-sm md:text-base text-vaks-white/70 dark:text-vaks-dark-alt-txt leading-relaxed">
                    {feature.descricao}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
