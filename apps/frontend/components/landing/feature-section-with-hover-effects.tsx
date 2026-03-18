"use client";
import { cn } from "@/utils/styling/cn";
import {
  Globe,
  Lock,
  Wallet,
  Bell,
  ArrowLeftRight,
  ShieldCheck,
  UsersRound,
  LayoutDashboard,
  LucideIcon,
} from "lucide-react";
import { useI18n } from "@/locales/useI18n";

/**
 * Mapeamento de cada feature_key → ícone lucide-react.
 * Para alterar um ícone, basta trocar o componente aqui.
 */
const FEATURE_ICONS: Record<string, LucideIcon> = {
  feature_1: Globe,
  feature_2: Lock,
  feature_3: Wallet,
  feature_4: Bell,
  feature_5: ArrowLeftRight,
  feature_6: ShieldCheck,
  feature_7: UsersRound,
  feature_8: LayoutDashboard,
};

export function FeaturesSectionWithHoverEffects() {
  const { t } = useI18n();
  const section = t.features_section;
  const items = section.items;

  const features = Object.entries(items).map(([key, item]) => ({
    key,
    title: item.titulo,
    description: item.descricao,
    icon: FEATURE_ICONS[key] || Globe,
  }));

  return (
    <section className="py-20 bg-vaks-light-primary dark:bg-vaks-dark-primary">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="mb-4 max-w-lg">
          <h2 className="text-3xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt md:text-4xl">
            {section.heading}
          </h2>
          <p className="mt-2 text-lg text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt md:text-xl">
            {section.descricao}
          </p>
        </div>

        {/* Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Feature
              key={feature.key}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

const Feature = ({
  title,
  description,
  icon: Icon,
  index,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "group/feature relative flex flex-col py-10 lg:border-r border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/30",
        (index === 0 || index === 4) &&
          "lg:border-l border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/30",
        index < 4 &&
          "lg:border-b border-vaks-light-stroke/30 dark:border-vaks-dark-stroke/30"
      )}
    >
      {/* Hover gradient overlay — top row fades from bottom, bottom row from top */}
      {index < 4 && (
        <div className="pointer-events-none absolute inset-0 h-full w-full bg-linear-to-t from-vaks-light-purple-card-hover dark:from-vaks-dark-purple-card to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100" />
      )}
      {index >= 4 && (
        <div className="pointer-events-none absolute inset-0 h-full w-full bg-linear-to-b from-vaks-light-purple-card-hover dark:from-vaks-dark-purple-card to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100" />
      )}

      {/* Icon */}
      <div className="relative z-10 mb-4 px-10 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
        <Icon className="h-6 w-6" />
      </div>

      {/* Title with animated left bar */}
      <div className="relative z-10 mb-2 px-10 text-lg font-bold">
        <div className="absolute left-0 inset-y-0 h-6 w-1 origin-center rounded-br-full rounded-tr-full bg-vaks-light-stroke dark:bg-vaks-dark-stroke transition-all duration-200 group-hover/feature:h-8 group-hover/feature:bg-vaks-cobalt dark:group-hover/feature:bg-vaks-dark-purple-button" />
        <span className="inline-block text-vaks-light-main-txt dark:text-vaks-dark-main-txt transition duration-200 group-hover/feature:translate-x-2">
          {title}
        </span>
      </div>

      {/* Description */}
      <p className="relative z-10 max-w-xs px-10 text-sm leading-relaxed text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
        {description}
      </p>
    </div>
  );
};
