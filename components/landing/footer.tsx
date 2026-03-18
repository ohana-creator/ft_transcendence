"use client"

import Link from "next/link"
import Image from "next/image"
import { Instagram, Github, Linkedin, Heart } from "lucide-react"
import { useTheme } from "next-themes"
import { useI18n } from "@/locales/useI18n"
import { AnimatedLogo } from "@/components/ui/AnimatedLogo"

interface TeamMember {
  name: string
  instagram?: string
  linkedin?: string
  github?: string
}

interface FooterProps {
  members?: TeamMember[]
}

export function Footer({ members = [] }: FooterProps) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const { landing, footer } = t

  const navLinks = [
    { href: "#resume", label: landing.resume },
    { href: "#overview", label: landing.overview },
    { href: "#features", label: landing.features },
    { href: "#team-project", label: landing.team },
  ]

  const platformLinks = [
    { href: "/auth/login", label: landing.login },
    { href: "/vaquinhas/publicas", label: footer.vaquinhas_publicas },
    { href: "/vaquinhas/privadas", label: footer.vaquinhas_privadas },
    { href: "/carteira", label: footer.carteira },
  ]

  const legalLinks = [
    { href: "/legal/politica-de-privacidade", label: footer.politica_privacidade },
    { href: "/legal/termos-de-servico", label: footer.termos_servico },
  ]

  return (
    <footer className="w-full bg-linear-to-b from-vaks-light-primary to-vaks-light-purple-card-hover dark:from-vaks-dark-primary dark:to-vaks-dark-purple-card">
      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <AnimatedLogo variant="none" size={100} />
            </Link>
            <p className="text-sm leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt max-w-xs">
              {footer.descricao}
            </p>

            {/* Social icons */}
            {members.length > 0 && (
              <div className="flex gap-3 mt-6">
                {members.map((member) => (
                  <div key={member.name} className="flex gap-2">
                    {member.github && (
                      <Link
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} GitHub`}
                        className="w-8 h-8 rounded-full border border-vaks-light-stroke dark:border-vaks-dark-stroke flex items-center justify-center transition-colors hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover hover:border-vaks-light-purple-button dark:hover:border-vaks-dark-secondary"
                      >
                        <Github className="w-4 h-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-4">
              {footer.navegacao}
            </h3>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-4">
              {footer.legal}
            </h3>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Team */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-vaks-light-main-txt dark:text-vaks-dark-main-txt mb-4">
              {landing.team}
            </h3>
            <ul className="space-y-3">
              {members.map((member) => (
                <li key={member.name} className="flex items-center gap-2">
                  <span className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    {member.name}
                  </span>
                  <div className="flex gap-1.5">
                    {member.instagram && (
                      <Link
                        href={member.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} Instagram`}
                        className="text-vaks-light-alt-txt/60 dark:text-vaks-dark-alt-txt/60 hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary transition-colors"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {member.linkedin && (
                      <Link
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} LinkedIn`}
                        className="text-vaks-light-alt-txt/60 dark:text-vaks-dark-alt-txt/60 hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary transition-colors"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {member.github && (
                      <Link
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} GitHub`}
                        className="text-vaks-light-alt-txt/60 dark:text-vaks-dark-alt-txt/60 hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary transition-colors"
                      >
                        <Github className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            VAKS © {new Date().getFullYear()}. {footer.direitos}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/legal/politica-de-privacidade" className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary transition-colors">
              {footer.politica_privacidade}
            </Link>
            <Link href="/legal/termos-de-servico" className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-purple-button dark:hover:text-vaks-dark-secondary transition-colors">
              {footer.termos_servico}
            </Link>
          </div>
          <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt flex items-center gap-1">
            {footer.feito_com}
            {footer.por}
          </p>
        </div>
      </div>
    </footer>
  )
}