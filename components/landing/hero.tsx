"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useI18n } from "@/locales";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

export default function HeroSection() {
  const { t } = useI18n();
  const landing = t.landing;

  return (
    <section className="relative w-full overflow-hidden pb-10 pt-32 font-light antialiased md:pb-16 md:pt-20 bg-vaks-light-primary dark:bg-vaks-dark-primary">
      {/* Radial glow decorations */}
      <div
        className="absolute right-0 top-0 h-1/2 w-1/2"
        style={{
          background:
            "radial-gradient(circle at 70% 30%, rgba(124, 58, 237, 0.15) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute left-0 top-0 h-1/2 w-1/2 -scale-x-100"
        style={{
          background:
            "radial-gradient(circle at 70% 30%, rgba(113, 68, 183, 0.15) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 text-center md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Animated Logo */}
          <div className="mb-8 flex justify-center">
            <AnimatedLogo variant="coin-drop" size={96} />
          </div>

          {/* Badge */}
          <span className="mb-6 inline-block rounded-full border border-vaks-light-purple-button/30 dark:border-vaks-dark-purple-button/30 px-3 py-1 text-xs text-vaks-light-purple-button dark:text-vaks-dark-alt-txt">
            VAKS — CROWDFUNDING PLATFORM
          </span>

          {/* Title */}
          <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt md:text-5xl lg:text-7xl">
            {landing.title.split("VAKS")[0]}
            <span className="text-vaks-light-purple-button dark:text-vaks-dark-purple-button">
              VAKS
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt md:text-xl">
            {landing.descricao}
          </p>

          {/* CTA Buttons */}
          <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:mb-0 sm:flex-row">
            <Link
              href="/auth/register"
              className="neumorphic-button relative w-full overflow-hidden rounded-full border border-vaks-light-purple-button/20 dark:border-vaks-dark-purple-button/30 bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button px-8 py-4 text-white shadow-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] sm:w-auto"
            >
              {landing.call_to_action}
            </Link>
            <Link
              href="/auth/login"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-vaks-light-stroke dark:border-vaks-dark-stroke px-8 py-4 text-vaks-light-main-txt dark:text-vaks-dark-main-txt transition-colors hover:bg-vaks-light-purple-card-hover dark:hover:bg-vaks-dark-purple-card-hover sm:w-auto"
            >
              {landing.login}
            </Link>
          </div>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          className="relative mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
        >
          <div className="relative z-10 mx-auto max-w-5xl overflow-hidden rounded-xl shadow-[0_0_50px_rgba(124,58,237,0.2)]">
            <Image
              src="/overview.png"
              alt="VAKS Platform"
              width={1920}
              height={1080}
              className="h-auto w-full rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke"
              priority
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
