/**
 * Política de Privacidade — VAKS
 * Convertido de HTML estático para página TSX com Tailwind
 */
"use client";

import { useI18n } from "@/locales/useI18n";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  const { t } = useI18n();

  return (
    <>
      {/* Hero */}
      <div className="bg-linear-to-br from-[#361965] to-[#7C3AED] py-14 px-6 text-center text-white relative overflow-hidden">
        <div className="relative z-10 max-w-145 mx-auto">
          <span className="inline-block text-[0.7rem] font-bold tracking-[3px] uppercase text-vaks-light-alt-txt bg-white/10 border border-white/20 px-4 py-1.5 rounded-full mb-4">
            {t.legal.documento_legal}
          </span>
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold mb-2">
            {t.legal.politica_privacidade.titulo}
          </h1>
          <p className="text-white/70 text-[0.95rem]">
            {t.legal.politica_privacidade.descricao}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-205 mx-auto px-6 py-10">
        {/* Meta */}
        <div className="inline-flex items-center gap-2 text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt bg-vaks-light-card dark:bg-vaks-dark-purple-card border border-vaks-light-stroke dark:border-vaks-dark-stroke rounded-lg px-3.5 py-2 mb-8">
          <span className="w-1.75 h-1.75 bg-[#7C3AED] rounded-full shrink-0" />
          {t.legal.ultima_atualizacao}: Março de 2026 · {t.legal.versao} 1.0 · VAKS Platform
        </div>

        {/* TOC */}
        <div className="bg-vaks-light-card dark:bg-vaks-dark-purple-card border border-vaks-light-stroke dark:border-vaks-dark-stroke rounded-xl p-6 mb-8">
          <div className="text-[0.7rem] font-bold tracking-[3px] uppercase text-[#7C3AED] dark:text-vaks-dark-alt-txt mb-4">
            {t.legal.indice}
          </div>
          <ol className="pl-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 list-decimal">
            {t.legal.politica_privacidade.secoes.map((s, index) => (
              <li key={index} className="text-sm">
                <Link href={`#s${index + 1}`} className="text-[#7C3AED] dark:text-vaks-dark-alt-txt font-medium hover:underline">
                  {s.titulo}
                </Link>
              </li>
            ))}
          </ol>
        </div>

        {/* Sections */}
        {t.legal.politica_privacidade.secoes.map((s: any, index: number) => (
          <Section key={index} id={`s${index + 1}`} num={index + 1} title={s.titulo}>
            {s.conteudo && <p className="whitespace-pre-line">{s.conteudo}</p>}
            {s.itens && (
              <ul className="mt-4">
                {s.itens.map((item: string, i: number) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
            {s.callout && <Callout variant="purple">{s.callout}</Callout>}
            {s.rodape && <p className="mt-4 text-sm opacity-80 italic">{s.rodape}</p>}
          </Section>
        ))}
      </div>
    </>
  );
}

/* ─── Reusable sub-components ─── */

function Section({
  id,
  num,
  title,
  children,
}: {
  id: string;
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-5 bg-vaks-light-card dark:bg-vaks-dark-purple-card border border-vaks-light-stroke dark:border-vaks-dark-stroke rounded-xl px-6 py-7 scroll-mt-20 transition-colors hover:border-[#7C3AED] dark:hover:border-vaks-dark-secondary"
    >
      <div className="flex items-center gap-2.5 mb-1">
        <span className="bg-vaks-light-purple-input dark:bg-vaks-dark-purple-input text-[#7C3AED] dark:text-vaks-dark-alt-txt text-[0.7rem] font-bold w-6 h-6 rounded-md flex items-center justify-center shrink-0">
          {num}
        </span>
        <h2 className="text-lg font-bold text-[#361965] dark:text-vaks-dark-main-txt">
          {title}
        </h2>
      </div>
      <div className="w-8 h-0.5 bg-vaks-light-stroke dark:bg-vaks-dark-stroke rounded-sm mt-2 mb-4" />
      <div className="space-y-3 text-[0.9375rem] leading-relaxed text-vaks-light-main-txt/85 dark:text-vaks-dark-main-txt [&_strong]:text-[#361965] [&_strong]:font-bold dark:[&_strong]:text-vaks-dark-main-txt [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1.5">
        {children}
      </div>
    </section>
  );
}

function Callout({
  variant,
  children,
}: {
  variant: "purple" | "warn";
  children: React.ReactNode;
}) {
  const styles =
    variant === "purple"
      ? "bg-vaks-light-purple-input dark:bg-vaks-dark-purple-input border-l-[3px] border-[#7C3AED] dark:border-[#9810FA] text-[#361965] dark:text-vaks-dark-main-txt"
      : "bg-[#FFF7ED] dark:bg-[rgba(245,170,109,0.1)] border-l-[3px] border-[#E89C5C] text-[#7A4A00] dark:text-vaks-dark-main-txt";

  return (
    <div className={`text-sm rounded-r-lg px-4 py-3.5 my-4 ${styles}`}>
      {children}
    </div>
  );
}