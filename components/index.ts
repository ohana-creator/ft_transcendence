/**
 * Components Index
 * Exporta todos os componentes organizados por responsabilidade
 *
 * Uso:
 * import { VaquinhaCard, ProgressBar } from '@/components';
 */

// ── Pessoa 2 ──────────────────────────────────────────────
export * from './vaquinhas';
export * from './carteira';
export * from './realtime';

// ── Pessoa 1 ──────────────────────────────────────────────
export * from './layout';
// export * from './auth';
// export * from './dashboard';
// export * from './profile';

// ── Modals (Vaquinhas Privadas) ────────────────────────────
export { Marquee } from './landing/Marquee';
export { PageTransition } from './PageTransition';

// ── UI Components ──────────────────────────────────────────
export { AnimatedLogo } from './ui/AnimatedLogo';
export { SplashScreen, LoadingSpinner } from './ui/SplashScreen';
