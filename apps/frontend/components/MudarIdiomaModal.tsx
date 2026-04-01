import { useI18n } from "@/locales";
import { useEffect, useRef, useMemo } from "react";

export function LanguageModal({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void }) {
  const { locale, setLocale, t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  const LANGUAGES = useMemo(() => [
    { key: "pt" as const, label: t?.languages?.pt || 'Português', flag: "fi-pt" },
    { key: "en" as const, label: t?.languages?.en || 'English', flag: "fi-gb" },
    { key: "fr" as const, label: t?.languages?.fr || 'Français', flag: "fi-fr" },
    { key: "es" as const, label: t?.languages?.es || 'Español', flag: "fi-es" },
  ], [t]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  return (
    <div
      ref={ref}
      className={`absolute w-44 top-12 right-0 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-xl shadow-lg border border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/20 overflow-hidden ${isOpen ? 'block' : 'hidden'}`}
    >
      <div className="px-4 py-2.5 border-b border-vaks-light-stroke/20 dark:border-vaks-dark-stroke/15">
        <h2 className="text-xs font-bold uppercase tracking-wider text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">{t.common.language}</h2>
      </div>
      <ul className="py-1">
        {LANGUAGES.map((lang) => (
          <li
            key={lang.key}
            onClick={() => {
              setLocale(lang.key);
              setIsOpen(false);
            }}
            className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
              locale === lang.key
                ? "bg-vaks-light-purple-card-hover dark:bg-vaks-dark-purple-card-hover font-semibold"
                : "hover:bg-vaks-light-primary/50 dark:hover:bg-vaks-dark-primary/30"
            } text-sm text-vaks-light-main-txt dark:text-vaks-dark-main-txt`}
          >
            <span className={`fi ${lang.flag} rounded-sm text-base`} />
            <span>{lang.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}