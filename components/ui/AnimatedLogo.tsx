"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export type LogoAnimation = "coin-drop" | "spin-glow" | "pulse-rise" | "none";

interface AnimatedLogoProps {
  /** Tipo de animação */
  variant?: LogoAnimation;
  /** Tamanho do logo (largura e altura) em px */
  size?: number;
  /** Classes adicionais para o container */
  className?: string;
  /** Animar apenas no hover (default: false) */
  hoverOnly?: boolean;
}

/**
 * AnimatedLogo — Logo VAKS com animações CSS
 *
 * Variantes:
 * - coin-drop  → splash screen (queda com bounce)
 * - spin-glow  → loading loop (rotação 3D + anel roxo)
 * - pulse-rise → loading subtil (pulso + partículas)
 * - none       → logo estático (hover → spin + glow)
 *
 * hoverOnly=true → a animação só ativa ao passar o rato
 */
export function AnimatedLogo({
  variant = "none",
  size = 96,
  className = "",
  hoverOnly = false,
}: AnimatedLogoProps) {
  const hoverGroup = hoverOnly ? "vaks-logo-hover-group" : "";

  if (variant === "coin-drop") {
    return (
      <div
        className={`vaks-logo-coin-drop relative flex items-center justify-center ${hoverGroup} ${className}`}
        style={{ width: size * 1.5, height: size * 1.8 }}
      >
        {/* Sombra no chão */}
        <div
          className={`absolute ${hoverOnly ? "vaks-logo-shadow--hover" : "vaks-logo-shadow"}`}
          style={{
            bottom: 0,
            width: size * 0.6,
            height: size * 0.12,
            borderRadius: "50%",
          }}
        />
        {/* Logo */}
        <div
          className={hoverOnly ? "vaks-logo-drop--hover" : "vaks-logo-drop"}
          style={{ width: size, height: size }}
        >
          <Image
            src="/logo_dark.svg"
            alt="VAKS Logo"
            width={size}
            height={size}
            loading="eager"
            className="h-full w-full object-contain hidden dark:block"
          />
          <Image
            src="/logo_light.svg"
            alt="VAKS Logo"
            width={size}
            height={size}
            loading="eager"
            className="h-full w-full object-contain block dark:hidden"
          />
        </div>
      </div>
    );
  }

  if (variant === "spin-glow") {
    return (
      <div
        className={`relative flex items-center justify-center ${hoverGroup} ${className}`}
        style={{ width: size * 1.5, height: size * 1.5 }}
      >
        {/* Anel de glow */}
        <div
          className={`absolute rounded-full ${hoverOnly ? "vaks-logo-ring--hover" : "vaks-logo-ring"}`}
          style={{
            width: size * 1.25,
            height: size * 1.25,
          }}
        />
        {/* Logo a girar */}
        <div
          className={hoverOnly ? "vaks-logo-spin--hover" : "vaks-logo-spin"}
          style={{
            width: size,
            height: size,
            perspective: "600px",
          }}
        >
          <Image
            src="/logo_dark.svg"
            alt="VAKS Logo"
            width={size}
            height={size}
            loading="eager"
            className="h-full w-full object-contain hidden dark:block"
          />
          <Image
            src="/logo_light.svg"
            alt="VAKS Logo"
            width={size}
            height={size}
            loading="eager"
            className="h-full w-full object-contain block dark:hidden"
          />
        </div>
      </div>
    );
  }

  if (variant === "pulse-rise") {
    return (
      <div
        className={`relative flex items-center justify-center ${hoverGroup} ${className}`}
        style={{ width: size * 1.8, height: size * 1.8 }}
      >
        {/* Partículas */}
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            className={`absolute rounded-full ${hoverOnly ? "vaks-logo-particle--hover" : "vaks-logo-particle"}`}
            style={{
              width: size * 0.06,
              height: size * 0.06,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
        {/* Logo a pulsar */}
        <div
          className={hoverOnly ? "vaks-logo-pulse--hover" : "vaks-logo-pulse"}
          style={{ width: size, height: size }}
        >
          <Image
            src="/logo_dark.svg"
            alt="VAKS Logo"
            width={size}
            height={size}
            loading="eager"
            className="h-full w-full object-contain hidden dark:block"
          />
          <Image
            src="/logo_light.svg"
            alt="VAKS Logo"
            width={size}
            height={size}
            loading="eager"
            className="h-full w-full object-contain block dark:hidden"
          />
        </div>
      </div>
    );
  }

  // Variante "none" — logo com auto-bounce (10s) + hover bounce
  return (
    <div
      className={`vaks-logo-auto-bounce vaks-logo-hover-group relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div className="vaks-logo-hover-bounce" style={{ width: size, height: size }}>
        <Image
            src="/logo_dark.svg"
            alt="VAKS Logo"
            width={size}
            height={size}
            loading="eager"
            className="h-full w-full object-contain hidden dark:block"
          />
          <Image
            src="/logo_light.svg"
            alt="VAKS Logo"
            width={size}
            height={size}
            loading="eager"
            className="h-full w-full object-contain block dark:hidden"
          />
      </div>
    </div>
  );
}
