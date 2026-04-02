"use client"

import { useI18n } from "@/locales/useI18n";
import {  useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Palette, Sun, Moon, Eye, EyeOff, Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { useTheme } from "next-themes";
import { TranslationKeys } from "@/locales/pt";
import { VaksMascot } from "@/components/config/mascot";
import { api } from "@/utils/api/api";
import { readMockPrivacySettings, writeMockPrivacySettings } from "@/utils/privacy/mockPrivacy";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import { toast } from "@/utils/toast";

// ─── TIPOS ───
type SettingsSection = "account" | "privacy" | "appearance";
type LocaleKey = "pt" | "en" | "es" | "fr";

type UserData = {
  email: string; username: string;
};

type ProfileApiData = {
  id: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  email?: string;
  phone?: string;
  username?: string;
  avatarUrl?: string | null;
  saldoVaks?: number | string;
};

type WrappedData<T> = T | { data?: T; success?: boolean };

type UsersSearchResponse = WrappedData<{
  users?: Array<{ id: string; username: string }>;
  items?: Array<{ id: string; username: string }>;
}>;

type SettingsApiData = {
  notifications?: {
    emailContribuicoes?: boolean;
    emailMetaAtingida?: boolean;
    emailTransferencias?: boolean;
    emailMarketing?: boolean;
    pushContribuicoes?: boolean;
    pushMetaAtingida?: boolean;
    pushTransferencias?: boolean;
    inAppTudo?: boolean;
    inAppSons?: boolean;
    contributions?: boolean;
    goalReached?: boolean;
    newMembers?: boolean;
    email?: boolean;
  };
  privacy?: {
    profilePublic?: boolean;
    showBalance?: boolean;
    showContributions?: boolean;
    showCampaigns?: boolean;
  };
  appearance?: {
    theme?: string;
    language?: string;
  };
};

function unwrapData<T>(payload: WrappedData<T>): T {
  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return payload.data as T;
  }
  return payload as T;
}

function extractUsersFromSearch(payload: UsersSearchResponse): Array<{ id: string; username: string }> {
  if (!payload || typeof payload !== "object") return [];

  if ("users" in payload && Array.isArray(payload.users)) {
    return payload.users;
  }

  if ("items" in payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  if (
    "data" in payload
    && payload.data
    && typeof payload.data === "object"
    && "users" in payload.data
    && Array.isArray((payload.data as { users?: Array<{ id: string; username: string }> }).users)
  ) {
    return (payload.data as { users: Array<{ id: string; username: string }> }).users;
  }

  if (
    "data" in payload
    && payload.data
    && typeof payload.data === "object"
    && "items" in payload.data
    && Array.isArray((payload.data as { items?: Array<{ id: string; username: string }> }).items)
  ) {
    return (payload.data as { items: Array<{ id: string; username: string }> }).items;
  }

  return [];
}

const DEFAULT_SETTINGS: Required<SettingsApiData> = {
  notifications: {
    emailContribuicoes: true,
    emailMetaAtingida: true,
    emailTransferencias: false,
    emailMarketing: false,
    pushContribuicoes: true,
    pushMetaAtingida: true,
    pushTransferencias: true,
    inAppTudo: true,
    inAppSons: false,
    contributions: true,
    goalReached: true,
    newMembers: true,
    email: false,
  },
  privacy: {
    profilePublic: true,
    showCampaigns: true,
    showBalance: false,
    showContributions: true,
  },
  appearance: {
    theme: "light",
    language: "pt",
  },
};

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const MOCK_PASSWORD_CHANGE = true;

const getMenuItems = (settings: TranslationKeys['configuration']) => [
  { label: settings.conta.titulo, key: "account" as SettingsSection, icon: User },
  { label: settings.privacidade.titulo, key: "privacy" as SettingsSection, icon: Lock },
  { label: settings.aparencia.titulo, key: "appearance" as SettingsSection, icon: Palette },
];

// ─── COMPONENTES REUTILIZÁVEIS ───

/** Linha de configuração simples com label, descrição e um elemento à direita */
function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {

  return (
    <div className="flex items-center justify-between py-4 border-b border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40 last:border-0">
      <div className="flex flex-col gap-0.5 flex-1 mr-6">
        <span className="text-sm font-medium text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
          {label}
        </span>
        {description && (
          <span className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {description}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** Toggle switch */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0
        ${enabled
          ? "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button"
          : "bg-vaks-blue-charcoal"
        }`}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

/** Card de secção com título */
function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover rounded-xl shadow-md dark:shadow-vaks-dark-purple-card-hover px-6 py-2 mb-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt pt-4 pb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

/** Input de configuração */
function SettingsInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40 last:border-0">
      <label className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm border
          bg-vaks-light-input dark:bg-vaks-dark-input
          border-vaks-light-stroke dark:border-vaks-dark-stroke
          text-vaks-light-main-txt dark:text-vaks-dark-main-txt
          placeholder:text-vaks-light-alt-txt dark:placeholder:text-vaks-dark-alt-txt
          focus:outline-none focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button
          transition-colors"
      />
    </div>
  );
}

/** Botão de ação destrutiva */
function DangerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
        text-vaks-light-error dark:text-vaks-dark-error
        border border-vaks-light-error dark:border-vaks-dark-error
        hover:bg-vaks-light-error/10 dark:hover:bg-vaks-dark-error/10
        transition-colors"
    >
      <Trash2 className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─── SECÇÕES ───

/** 
 * SECÇÃO: CONTA
 * Modela aqui os campos do utilizador.
 * Para adicionar um campo: adiciona um SettingsInput com label, value e onChange.
 * Para remover: apaga o SettingsInput correspondente.
 */
function AccountSection({
  account,
  onAccountChange,
  onSave,
  saving,
  onChangePassword,
  passwordSaving,
  onDeleteAccount,
}: {
  account: UserData;
  onAccountChange: (next: UserData) => void;
  onSave: () => void;
  saving: boolean;
  onChangePassword: (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) => Promise<boolean>;
  passwordSaving: boolean;
  onDeleteAccount: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { t } = useI18n();
  const config = t.configuration;

  return (
    <div>
      {/* Informações pessoais */}
      <SettingsCard title={config.conta.card1.titulo}>
        <SettingsInput
          label={config.conta.card1.username}
          value={account.username}
          onChange={(username) => onAccountChange({ ...account, username })}
          placeholder={config.conta.card1.username}
        />
        <SettingsInput
          label={config.conta.card1.email}
          value={account.email}
          onChange={(email) => onAccountChange({ ...account, email })}
          type="email"
          placeholder={config.conta.card1.email}
        />
        <div className="py-3 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {config.conta.card1.guardar}
          </button>
        </div>
      </SettingsCard>

      {/* Palavra-passe */}
      <SettingsCard title={config.conta.card2.titulo}>
        <div className="flex flex-col gap-1.5 py-3 border-b border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40">
          <label className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
            {config.conta.card2.senha_atual}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 pr-10 rounded-xl text-sm border
                bg-vaks-light-input dark:bg-vaks-dark-input
                border-vaks-light-stroke dark:border-vaks-dark-stroke
                text-vaks-light-main-txt dark:text-vaks-dark-main-txt
                focus:outline-none focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <SettingsInput label={config.conta.card2.nova_senha} value={newPassword} onChange={setNewPassword} type="password" placeholder="••••••••" />
        <SettingsInput label={config.conta.card2.confirmar_senha} value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="••••••••" />
        <div className="py-3 flex justify-end">
          <button
            onClick={async () => {
              const success = await onChangePassword({ currentPassword, newPassword, confirmPassword });
              if (success) {
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setShowPassword(false);
              }
            }}
            disabled={passwordSaving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {passwordSaving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {config.conta.card2.carregando}
              </span>
            ) : (
              config.conta.card2.guardar
            )}
          </button>
        </div>
      </SettingsCard>

      {/* Zona de perigo */}
      <SettingsCard title={config.conta.card3.titulo}>
        <SettingRow
          label={config.conta.card3.eliminar_conta}
          description={config.conta.card3.info}
        >
          <DangerButton label={config.conta.card3.confirmar} onClick={onDeleteAccount} />
        </SettingRow>
      </SettingsCard>
    </div>
  );
}

/**
 * SECÇÃO: PRIVACIDADE
 * Para adicionar/remover opções de privacidade, segue o mesmo padrão de SettingRow + Toggle.
 */
function PrivacySection({
  privacyState,
  onPrivacyChange,
  onSave,
  saving,
}: {
  privacyState: {
    perfilPublico: boolean;
    mostrarVaquinhas: boolean;
    mostrarContribuicoes: boolean;
    mostrarCarteira: boolean;
  };
  onPrivacyChange: (next: {
    perfilPublico: boolean;
    mostrarVaquinhas: boolean;
    mostrarContribuicoes: boolean;
    mostrarCarteira: boolean;
  }) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const { t } = useI18n();
  const config = t.configuration;

  const toggle = (key: keyof typeof privacyState) =>
    onPrivacyChange({ ...privacyState, [key]: !privacyState[key] });

  return (
    <div>
      <SettingsCard title={config.privacidade.card1.titulo}>
        <SettingRow label={config.privacidade.card1.perfil_publico} description={config.privacidade.card1.descricao_perfil}>
          <Toggle enabled={privacyState.perfilPublico} onChange={() => toggle("perfilPublico")} />
        </SettingRow>
        <SettingRow label={config.privacidade.card1.mostrar_vaquinhas} description={config.privacidade.card1.descricao_vaquinhas}>
          <Toggle enabled={privacyState.mostrarVaquinhas} onChange={() => toggle("mostrarVaquinhas")} />
        </SettingRow>
        <SettingRow label={config.privacidade.card1.mostrar_contribuicoes} description={config.privacidade.card1.descricao_contribuicoes}>
          <Toggle enabled={privacyState.mostrarContribuicoes} onChange={() => toggle("mostrarContribuicoes")} />
        </SettingRow>
        <SettingRow label={config.privacidade.card1.mostrar_saldo} description={config.privacidade.card1.descricao_saldo}>
          <Toggle enabled={privacyState.mostrarCarteira} onChange={() => toggle("mostrarCarteira")} />
        </SettingRow>

        <div className="py-3 flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      </SettingsCard>
    </div>
  );
}

/**
 * SECÇÃO: APARÊNCIA
 * Aqui estão os toggles de tema e idioma.
 * Para adicionar mais temas ou idiomas, adiciona ao array correspondente.
 */
function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useI18n();
  const { t } = useI18n();
  const config = t.configuration;

  const themes = [
    { key: "light", label: config.aparencia.card1.claro, icon: <Sun className="w-4 h-4" /> },
    { key: "dark", label: config.aparencia.card1.escuro, icon: <Moon className="w-4 h-4" /> },
  ];

  const languages = [
    { key: "pt", label: "Português", flag: "pt" },
    { key: "en", label: "English", flag: "gb" },
    { key: "es", label: "Español", flag: "es" },
    { key: "fr", label: "Français", flag: "fr" },
  ];

  return (
    <div>
      <SettingsCard title={config.aparencia.card1.titulo}>
        <div className="py-3 grid grid-cols-2 gap-3">
          {themes.map(t => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                ${theme === t.key
                  ? "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white border-transparent shadow-md"
                  : "bg-vaks-light-input dark:bg-vaks-dark-input border-vaks-light-stroke dark:border-vaks-dark-stroke text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:border-vaks-light-purple-button dark:hover:border-vaks-dark-purple-button"
                }`}
            >
              {t.icon}
              {t.label}
              {theme === t.key && (
                <motion.div
                  layoutId="theme-check"
                  className="ml-auto w-2 h-2 rounded-full bg-white"
                />
              )}
            </button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title={config.aparencia.card2.titulo}>
        <div className="py-3 grid grid-cols-2 gap-3">
          {languages.map(l => (
            <button
              key={l.key}
              onClick={() => setLocale(l.key as LocaleKey)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all
                ${locale === l.key
                  ? "bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white border-transparent shadow-md"
                  : "bg-vaks-light-input dark:bg-vaks-dark-input border-vaks-light-stroke dark:border-vaks-dark-stroke text-vaks-light-main-txt dark:text-vaks-dark-main-txt hover:border-vaks-light-purple-button dark:hover:border-vaks-dark-purple-button"
                }`}
            >
              <span className={`fi fi-${l.flag}`}></span>
              {l.label}
              {locale === l.key && (
                <motion.div
                  layoutId="lang-check"
                  className="ml-auto w-2 h-2 rounded-full bg-white"
                />
              )}
            </button>
          ))}
        </div>
      </SettingsCard>
    </div>
  );
}

// ─── TABS ───
function SettingsTabs({ active, setActive }: { active: SettingsSection; setActive: (key: SettingsSection) => void }) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const { t } = useI18n();
  const settings = t.configuration;
  const menuItems = getMenuItems(settings);

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="flex items-center gap-1 justify-between bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover backdrop-blur-lg py-2 px-2 rounded-full shadow-sm w-155"
    >
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;
        const isHovered = hoveredTab === item.key;

        return (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            onMouseEnter={() => setHoveredTab(item.key)}
            onMouseLeave={() => setHoveredTab(null)}
            className="relative cursor-pointer text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-300 flex items-center gap-2"
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-bg"
                className="absolute inset-0 rounded-full -z-10 overflow-hidden"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="absolute inset-0 bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button rounded-full" />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="absolute -inset-1 bg-vaks-light-purple-button/30 dark:bg-vaks-dark-purple-button/30 rounded-full blur-md" />
                  <div className="absolute -inset-2 bg-vaks-light-purple-button/20 dark:bg-vaks-dark-purple-button/20 rounded-full blur-xl" />
                </motion.div>
              </motion.div>
            )}

            <AnimatePresence>
              {isHovered && !isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="absolute inset-0 bg-vaks-light-input dark:bg-vaks-dark-input rounded-full -z-10"
                />
              )}
            </AnimatePresence>

            {isActive && (
              <motion.div
                layoutId="tab-mascot"
                className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <motion.div
                  className="w-7 h-7 rounded-full bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card border-2 border-vaks-light-purple-button dark:border-vaks-dark-purple-button flex items-center justify-center shadow-lg"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="flex gap-1">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-vaks-light-main-txt dark:bg-vaks-dark-main-txt" animate={isHovered ? { scaleY: [1, 0.1, 1] } : { scaleY: 1 }} transition={{ duration: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-vaks-light-main-txt dark:bg-vaks-dark-main-txt" animate={isHovered ? { scaleY: [1, 0.1, 1] } : { scaleY: 1 }} transition={{ duration: 0.2, delay: 0.05 }} />
                  </div>
                </motion.div>
                <div className="w-0.5 h-2 bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button mx-auto" />
              </motion.div>
            )}

            <Icon size={15} strokeWidth={2.5} className={isActive ? "text-white" : "text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt"} />
            <span className={isActive ? "text-white" : "text-vaks-light-main-txt dark:text-vaks-dark-main-txt"}>
              {item.label}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}

// ─── PÁGINA PRINCIPAL ───
export default function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, setUser, setPrivacySettings, logout } = useAuth();
  const config = t.configuration;
  const [active, setActive] = useState<SettingsSection>("account");
  const [mascotSize, setMascotSize] = useState({ width: 150, height: 180 });
  const [account, setAccount] = useState<UserData>({ email: "", username: "" });
  const [privacyState, setPrivacyState] = useState({
    perfilPublico: true,
    mostrarVaquinhas: true,
    mostrarContribuicoes: true,
    mostrarCarteira: false,
  });
  const [settingsData, setSettingsData] = useState<Required<SettingsApiData>>(DEFAULT_SETTINGS);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Atualiza tamanho do mascote conforme o tamanho da janela
  useEffect(() => {
    const handleResize = () => {
      // Responsivo: Reduzido para ser mais discreto
      const availableWidth = window.innerWidth - 100;
      const newWidth = Math.min(availableWidth * 0.15, 250);
      const newHeight = Math.min(availableWidth * 0.28, 300);
      
      setMascotSize({ 
        width: newWidth,
        height: newHeight
      });
    };

    handleResize(); // Chama na montagem
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const loadConfigData = async () => {
      const persistedPrivacy = readMockPrivacySettings(user.id);

      try {
        const profileResponse = await api.get<WrappedData<ProfileApiData>>(`/users/${user.id}`);

        if (cancelled) return;

        const profileData = unwrapData(profileResponse);

        const mergedSettings: Required<SettingsApiData> = {
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
          },
          privacy: {
            ...DEFAULT_SETTINGS.privacy,
            ...persistedPrivacy,
          },
          appearance: {
            ...DEFAULT_SETTINGS.appearance,
          },
        };

        setSettingsData(mergedSettings);
        setAccount({
          email: profileData?.email || user.email || "",
          username: profileData?.username || user.username || "",
        });
        setPrivacyState((prev) => ({
          ...prev,
          perfilPublico: !!mergedSettings.privacy.profilePublic,
          mostrarVaquinhas: mergedSettings.privacy.showCampaigns ?? prev.mostrarVaquinhas,
          mostrarContribuicoes: !!mergedSettings.privacy.showContributions,
          mostrarCarteira: !!mergedSettings.privacy.showBalance,
        }));
        setPrivacySettings({
          profilePublic: !!mergedSettings.privacy.profilePublic,
          showBalance: !!mergedSettings.privacy.showBalance,
          showContributions: !!mergedSettings.privacy.showContributions,
          showCampaigns: mergedSettings.privacy.showCampaigns ?? true,
        });
      } catch {
        if (cancelled) return;
        setAccount({
          email: user.email || "",
          username: user.username || "",
        });
        setSettingsData((prev) => ({
          ...prev,
          privacy: {
            ...prev.privacy,
            ...persistedPrivacy,
          },
        }));
        setPrivacyState({
          perfilPublico: persistedPrivacy.profilePublic,
          mostrarVaquinhas: persistedPrivacy.showCampaigns,
          mostrarContribuicoes: persistedPrivacy.showContributions,
          mostrarCarteira: persistedPrivacy.showBalance,
        });
        setPrivacySettings(persistedPrivacy);
      }
    };

    loadConfigData();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, user?.username]);

  const handleSaveAccount = async () => {
    if (!user?.id) return;

    const nextUsername = account.username.trim();
    const currentUsername = (user.username || "").trim();
    const currentEmail = (user.email || "").trim().toLowerCase();
    const requestedEmail = account.email.trim().toLowerCase();

    const usernameChanged = nextUsername !== currentUsername;
    const emailChanged = requestedEmail !== currentEmail;

    if (!usernameChanged && !emailChanged) {
      toast.success("Conta atualizada com sucesso");
      return;
    }

    if (emailChanged && !usernameChanged) {
      toast.error("A alteracao de email ainda nao esta disponivel");
      return;
    }

    if (nextUsername.length < 3 || nextUsername.length > 30 || !USERNAME_REGEX.test(nextUsername)) {
      toast.error("O nome de utilizador deve ter 3-30 caracteres e usar apenas letras, numeros e underscore");
      return;
    }

    if (usernameChanged) {
      try {
        const searchResponse = await api.get<UsersSearchResponse>("/users/search", {
          params: {
            q: nextUsername,
            page: 1,
            limit: 10,
          },
        });

        const normalizedUsername = nextUsername.toLowerCase();
        const exactTaken = extractUsersFromSearch(searchResponse).some((candidate) => (
          candidate.id !== user.id
          && candidate.username.trim().toLowerCase() === normalizedUsername
        ));

        if (exactTaken) {
          toast.error("Esse nome de utilizador ja existe");
          return;
        }
      } catch {
        // Se a pesquisa falhar, seguimos para o PUT e deixamos o backend validar.
      }
    }

    setSavingAccount(true);
    try {
      const response = await api.put<WrappedData<ProfileApiData>>(`/users/${user.id}`, {
        username: nextUsername,
      });
      const updated = unwrapData(response);

      setAccount({
        email: user.email || account.email,
        username: updated?.username || nextUsername,
      });

      setUser({
        ...user,
        email: user.email,
        username: updated?.username || nextUsername,
      });

      if (emailChanged) {
        toast.info("Email mantido sem alteracoes. Esta funcionalidade sera disponibilizada em breve");
      }
      toast.success("Conta atualizada com sucesso");
    } catch (error) {
      const apiError = error as { status?: number; message?: string | string[] };
      const apiMessage = Array.isArray(apiError?.message)
        ? apiError.message[0]
        : apiError?.message;

      if ((apiError?.status === 400 || apiError?.status === 409) && apiMessage) {
        toast.error(apiMessage);
      } else {
        toast.error("Nao foi possivel guardar os dados da conta");
      }
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async ({ currentPassword, newPassword, confirmPassword }: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (!user?.id) return false;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos da palavra-passe");
      return false;
    }

    if (newPassword.length < 8) {
      toast.error("A nova palavra-passe deve ter pelo menos 8 caracteres");
      return false;
    }

    if (!PASSWORD_POLICY_REGEX.test(newPassword)) {
      toast.error("A nova palavra-passe deve incluir maiuscula, minuscula e numero");
      return false;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As palavras-passe não correspondem");
      return false;
    }

    setSavingPassword(true);
    try {
      if (MOCK_PASSWORD_CHANGE) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        toast.success(`${config.conta.card2.sucesso} (mock)`);
        return true;
      }

      await api.post(`/auth/change-password`, {
        currentPassword,
        newPassword,
      });
      toast.success(config.conta.card2.sucesso);
      return true;
    } catch (error) {
      const apiError = error as { status?: number; message?: string | string[] };

      if (apiError?.status === 401) {
        toast.error(config.conta.card2.erro_atual);
        return false;
      }

      if (apiError?.status === 400) {
        toast.error(config.conta.card2.erro_requisitos);
        return false;
      }

      toast.error(config.conta.card2.erro);
      return false;
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setDeletingAccount(true);
    try {
      await api.delete(`/users/${user.id}`);
      toast.success(config.conta.card3.delete_sucesso);
      logout();
      router.push("/auth/login");
    } catch {
      toast.error(config.conta.card3.delete_erro);
    } finally {
      setDeletingAccount(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleSavePrivacy = async () => {
    if (!user?.id) return;

    const nextPrivacy = {
      profilePublic: privacyState.perfilPublico,
      showCampaigns: privacyState.mostrarVaquinhas,
      showContributions: privacyState.mostrarContribuicoes,
      showBalance: privacyState.mostrarCarteira,
    };

    setSavingPrivacy(true);
    try {
      writeMockPrivacySettings(user.id, nextPrivacy);
      setSettingsData((prev) => ({
        ...prev,
        privacy: nextPrivacy,
      }));
      setPrivacySettings(nextPrivacy);
      toast.success("Privacidade atualizada com sucesso");
    } finally {
      setSavingPrivacy(false);
    }
  };

  const sections: Record<SettingsSection, React.ReactNode> = {
    account: (
      <AccountSection
        account={account}
        onAccountChange={setAccount}
        onSave={handleSaveAccount}
        saving={savingAccount}
        onChangePassword={handleChangePassword}
        passwordSaving={savingPassword}
          onDeleteAccount={() => setIsDeleteModalOpen(true)}
      />
    ),
    privacy: (
      <PrivacySection
        privacyState={privacyState}
        onPrivacyChange={setPrivacyState}
        onSave={handleSavePrivacy}
        saving={savingPrivacy}
      />
    ),
    appearance: <AppearanceSection />,
  };

  return (
    <div className="flex min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary">
      <div className="flex-1">
        <div className="w-full h-full">
          {/* Header */}
          <div className="border-b pl-8 flex flex-col justify-center h-20 border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/40">
            <h1 className="text-2xl font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
              {config.titulo}
            </h1>
            <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1">
              {config.descricao}
            </p>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-8 pb-4 max-w-2xl">
            <SettingsTabs active={active} setActive={setActive} />
          </div>

          {/* Conteúdo */}
          <div className="px-8 pb-12 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {sections[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mascote responsivo */}
      <div className="hidden lg:flex items-center justify-center flex-1 sticky top-0 h-screen w-screen p-4">
        <div className="w-full h-full flex items-center justify-center">
          <VaksMascot 
            width={mascotSize.width}
            height={mascotSize.height}
            className="transition-all duration-300"
          />
        </div>
      </div>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => !deletingAccount && setIsDeleteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-vaks-light-stroke/40 dark:border-vaks-dark-stroke/30 bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card shadow-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                        {config.conta.card3.modal_titulo}
                      </h3>
                      <p className="mt-1 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                        {config.conta.card3.modal_descricao}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={deletingAccount}
                      className="rounded-full p-2 text-vaks-light-alt-txt transition-colors hover:bg-vaks-light-input hover:text-vaks-light-main-txt dark:text-vaks-dark-alt-txt dark:hover:bg-vaks-dark-input dark:hover:text-vaks-dark-main-txt disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={deletingAccount}
                      className="rounded-xl border border-vaks-light-stroke dark:border-vaks-dark-stroke px-4 py-2 text-sm font-semibold text-vaks-light-main-txt transition-colors hover:bg-vaks-light-input dark:text-vaks-dark-main-txt dark:hover:bg-vaks-dark-input disabled:opacity-50"
                    >
                      {config.conta.card3.modal_cancelar}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deletingAccount}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      {deletingAccount ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {config.conta.card3.modal_carregando}
                        </>
                      ) : (
                        config.conta.card3.modal_confirmar
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}