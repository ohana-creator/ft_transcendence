"use client"

import { useI18n } from "@/locales/useI18n";
import { use, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bell, Lock, Palette, Sun, Moon, Globe, ChevronRight, Eye, EyeOff, Smartphone, Mail, Shield, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { TranslationKeys } from "@/locales/pt";
import { VaksMascot } from "@/components/config/mascot";

// ─── TIPOS ───
type SettingsSection = "account" | "notifications" | "privacy" | "appearance";

const getMenuItems = (settings: TranslationKeys['configuration']) => [
  { label: settings.conta.titulo, key: "account" as SettingsSection, icon: User },
  { label: settings.notificacoes.titulo, key: "notifications" as SettingsSection, icon: Bell },
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
      className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0
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
function AccountSection() {
  const [name, setName] = useState("Melzira Ebo");
  const [username, setUsername] = useState("melzira_ebo");
  const [email, setEmail] = useState("user@example.com");
  const [phone, setPhone] = useState("+244 999 999 999");
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
        <SettingsInput label={config.conta.card1.nome} value={name} onChange={setName} placeholder={config.conta.card1.nome} />
        <SettingsInput label={config.conta.card1.username} value={username} onChange={setUsername} placeholder={config.conta.card1.username} />
        <SettingsInput label={config.conta.card1.email} value={email} onChange={setEmail} type="email" placeholder={config.conta.card1.email} />
        <SettingsInput label={config.conta.card1.telefone} value={phone} onChange={setPhone} type="tel" placeholder={config.conta.card1.telefone} />
        <div className="py-3 flex justify-end">
          <button className="px-5 py-2 rounded-xl text-sm font-semibold bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white hover:opacity-90 transition-opacity">
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
          <button className="px-5 py-2 rounded-xl text-sm font-semibold bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white hover:opacity-90 transition-opacity">
            {config.conta.card2.guardar}
          </button>
        </div>
      </SettingsCard>

      {/* Zona de perigo */}
      <SettingsCard title={config.conta.card3.titulo}>
        <SettingRow
          label={config.conta.card3.eliminar_conta}
          description={config.conta.card3.info}
        >
          <DangerButton label={config.conta.card3.confirmar} onClick={() => console.log("Eliminar conta")} />
        </SettingRow>
      </SettingsCard>
    </div>
  );
}

/**
 * SECÇÃO: NOTIFICAÇÕES
 * Para adicionar uma notificação: adiciona um SettingRow com um Toggle.
 * O state é um objeto — adiciona a chave correspondente em notifState.
 */
function NotificationsSection() {
  const [notifState, setNotifState] = useState({
    // Email
    emailContribuicoes: true,
    emailMetaAtingida: true,
    emailTransferencias: false,
    emailMarketing: false,
    // Push
    pushContribuicoes: true,
    pushMetaAtingida: true,
    pushTransferencias: true,
    // In-app
    inAppTudo: true,
    inAppSons: false,
  });
  const { t } = useI18n();
  const config = t.configuration;

  const toggle = (key: keyof typeof notifState) =>
    setNotifState(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div>
      <SettingsCard title={config.notificacoes.card1.titulo}>
        <SettingRow label={config.notificacoes.card1.nova_contribuicao} description={config.notificacoes.card1.descricao}>
          <Toggle enabled={notifState.emailContribuicoes} onChange={() => toggle("emailContribuicoes")} />
        </SettingRow>
        <SettingRow label={config.notificacoes.card1.meta_atingida} description={config.notificacoes.card1.descricao_meta}>
          <Toggle enabled={notifState.emailMetaAtingida} onChange={() => toggle("emailMetaAtingida")} />
        </SettingRow>
        <SettingRow label={config.notificacoes.card1.transferencia_recebida} description={config.notificacoes.card1.descricao_transferencia}>
          <Toggle enabled={notifState.emailTransferencias} onChange={() => toggle("emailTransferencias")} />
        </SettingRow>
        <SettingRow label={config.notificacoes.card1.marketing} description={config.notificacoes.card1.descricao_marketing}>
          <Toggle enabled={notifState.emailMarketing} onChange={() => toggle("emailMarketing")} />
        </SettingRow>
      </SettingsCard>

      <SettingsCard title={config.notificacoes.card2.titulo}>
        <SettingRow label={config.notificacoes.card2.nova_contribuicao}>
          <Toggle enabled={notifState.pushContribuicoes} onChange={() => toggle("pushContribuicoes")} />
        </SettingRow>
        <SettingRow label={config.notificacoes.card2.meta_atingida}>
          <Toggle enabled={notifState.pushMetaAtingida} onChange={() => toggle("pushMetaAtingida")} />
        </SettingRow>
        <SettingRow label={config.notificacoes.card2.transferencia_recebida}>
          <Toggle enabled={notifState.pushTransferencias} onChange={() => toggle("pushTransferencias")} />
        </SettingRow>
      </SettingsCard>

      <SettingsCard title={config.notificacoes.card3.titulo}>
        <SettingRow label={config.notificacoes.card3.mostrar}>
          <Toggle enabled={notifState.inAppTudo} onChange={() => toggle("inAppTudo")} />
        </SettingRow>
        <SettingRow label={config.notificacoes.card3.sons}>
          <Toggle enabled={notifState.inAppSons} onChange={() => toggle("inAppSons")} />
        </SettingRow>
      </SettingsCard>
    </div>
  );
}

/**
 * SECÇÃO: PRIVACIDADE
 * Para adicionar/remover opções de privacidade, segue o mesmo padrão de SettingRow + Toggle.
 */
function PrivacySection() {
  const [privacyState, setPrivacyState] = useState({
    perfilPublico: true,
    mostrarVaquinhas: true,
    mostrarContribuicoes: false,
    mostrarCarteira: false,
    duasFatores: false,
    sessaoAtiva: true,
  });
  const { t } = useI18n();
  const config = t.configuration;

  const toggle = (key: keyof typeof privacyState) =>
    setPrivacyState(prev => ({ ...prev, [key]: !prev[key] }));

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
      </SettingsCard>

      <SettingsCard title={config.privacidade.card2.titulo}>
        <SettingRow label={config.privacidade.card2.auth} description={config.privacidade.card2.descricao_auth}>
          <Toggle enabled={privacyState.duasFatores} onChange={() => toggle("duasFatores")} />
        </SettingRow>
        <SettingRow label={config.privacidade.card2.sessao} description={config.privacidade.card2.descricao_sessao}>
          <Toggle enabled={privacyState.sessaoAtiva} onChange={() => toggle("sessaoAtiva")} />
        </SettingRow>
        <SettingRow label={config.privacidade.card2.sessoes_ativas} description={config.privacidade.card2.descricao_sessoes_ativas}>
          <button className="flex items-center gap-1 text-sm text-vaks-light-purple-button dark:text-vaks-dark-secondary font-medium hover:underline">
            {config.privacidade.card2.ver_sessoes} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </SettingRow>
      </SettingsCard>

      <SettingsCard title={config.privacidade.card3.titulo}>
        <SettingRow label={config.privacidade.card3.exportar} description={config.privacidade.card3.descricao}>
          <button className="px-4 py-2 rounded-xl text-sm font-medium border
            border-vaks-light-stroke dark:border-vaks-dark-stroke
            text-vaks-light-main-txt dark:text-vaks-dark-main-txt
            hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input transition-colors">
            {config.privacidade.card3.guardar}
          </button>
        </SettingRow>
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
              onClick={() => setLocale(l.key as any)}
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
                  <div className="absolute inset-[-4px] bg-vaks-light-purple-button/30 dark:bg-vaks-dark-purple-button/30 rounded-full blur-md" />
                  <div className="absolute inset-[-8px] bg-vaks-light-purple-button/20 dark:bg-vaks-dark-purple-button/20 rounded-full blur-xl" />
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
  const config = t.configuration;
  const [active, setActive] = useState<SettingsSection>("account");
  const [mascotSize, setMascotSize] = useState({ width: 150, height: 180 });

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

  const sections: Record<SettingsSection, React.ReactNode> = {
    account: <AccountSection />,
    notifications: <NotificationsSection />,
    privacy: <PrivacySection />,
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
    </div>
  );
}