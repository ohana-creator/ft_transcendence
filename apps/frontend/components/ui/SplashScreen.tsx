"use client";

import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

interface SplashScreenProps {
  /** Texto a mostrar abaixo do logo */
  text?: string;
  /** Tamanho do logo */
  size?: number;
}

/**
 * SplashScreen — Ecrã de carregamento com logo animado
 * Usa a variante spin-glow para loading contínuo
 */
export function SplashScreen({ text = "A carregar...", size = 80 }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-vaks-light-primary dark:bg-vaks-dark-primary">
      <AnimatedLogo variant="spin-glow" size={size} />
      {text && (
        <p className="animate-pulse text-sm font-medium tracking-wide text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
          {text}
        </p>
      )}
    </div>
  );
}

interface LoadingSpinnerProps {
  /** Tamanho do logo */
  size?: number;
  /** Classes adicionais */
  className?: string;
}

/**
 * LoadingSpinner — Indicador de carregamento inline
 * Usa a variante pulse-rise para loading subtil
 */
export function LoadingSpinner({ size = 48, className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <AnimatedLogo variant="pulse-rise" size={size} />
    </div>
  );
}
