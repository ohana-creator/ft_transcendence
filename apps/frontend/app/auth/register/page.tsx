'use client';

import { useI18n } from "@/locales";
import { useTheme } from "next-themes";
import Image from "next/image";
import loginRegisterImage from "../../../public/login_register.png";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Eye, EyeOff, User, Phone, Calendar, Facebook } from "lucide-react";
import { AppInput } from "@/components/auth/app-input";
import Link from "next/link";
import { api } from "@/utils/api/api";
import { toast } from "@/utils/toast";

const DEBUG_LOGIN = process.env.NEXT_PUBLIC_DEBUG_LOGIN === "true";

function debugRegister(message: string, data?: Record<string, unknown>) {
  if (!DEBUG_LOGIN) return;
  if (typeof window === "undefined") return;
  const stamp = new Date().toISOString();
  if (data) {
    console.log(`[REGISTER-DEBUG ${stamp}] ${message}`, data);
    return;
  }
  console.log(`[REGISTER-DEBUG ${stamp}] ${message}`);
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const register = t.registar;
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── cursor-glow state ── */
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  function validate(): string | null {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return t.registar.erro_email;
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
      return t.registar.erro_username;
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password))
      return t.registar.erro_senha;
    if (password !== confirmPassword)
      return t.registar.erro_confirmacao;
    return null;
  }

  async function handleRegister() {
      const startedAt = Date.now();
    debugRegister("Register submit", {
      email,
      username,
      passwordLength: password.length,
      confirmPasswordLength: confirmPassword.length,
      agreed,
    });

    if (!agreed) {
      const message = register.erro_termos;
      debugRegister("Register blocked: terms not accepted");
      setError(message);
      toast.error(message);
      return;
    }

    const validationError = validate();
    if (validationError) {
      debugRegister("Register blocked: validation error", { validationError });
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        email,
        username,
        password,
      };

      debugRegister("Register request start", {
        method: 'POST',
        endpoint: '/auth/register',
        baseUrl: api.getBaseUrl(),
        payloadPreview: {
          email,
          username,
          hasPassword: Boolean(password),
        },
      });

      const response = await api.post('/auth/register', payload, { skipAuth: true });
      const durationMs = Date.now() - startedAt;
      const responseObj = (response && typeof response === 'object') ? (response as Record<string, unknown>) : null;
      const responseData = responseObj?.data;
      const dataObj =
        responseData && typeof responseData === 'object'
          ? (responseData as Record<string, unknown>)
          : null;

      debugRegister("/auth/register response", {
        hasResponse: Boolean(response),
        durationMs,
        success: responseObj?.success ?? null,
        message: responseObj?.message ?? null,
        responseKeys: responseObj ? Object.keys(responseObj) : [],
        dataKeys: dataObj ? Object.keys(dataObj) : [],
        createdUserId: dataObj?.id ?? null,
        createdEmail: dataObj?.email ?? null,
        createdUsername: dataObj?.username ?? null,
      });

      toast.success(register.sucesso);
      debugRegister("Register success, redirecting to /dashboard", {
        durationMs,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as {
        status?: number;
        message?: string | string[];
        errors?: Record<string, string[]>;
      };
      const durationMs = Date.now() - startedAt;
      const normalizedMessage = Array.isArray(error?.message)
        ? error.message.join(' | ')
        : error?.message;
      const message = normalizedMessage ?? t.registar.erro;
      debugRegister("Register catch", {
        durationMs,
        status: error?.status ?? null,
        message: normalizedMessage ?? null,
        errors: error?.errors ?? null,
      });
      setError(message);
      toast.error(message);
    } finally {
      debugRegister("Register flow finished");
      setLoading(false);
    }
  }

  const handleOAuthRegister = (provider: string) => {
    const configuredBase = process.env.NEXT_PUBLIC_AUTH_URL?.trim();

    debugRegister("OAuth register click", {
      provider,
      configuredBase: configuredBase || null,
    });

    if (configuredBase) {
      const normalizedBase = configuredBase.replace(/\/+$/, "");
      const authBase = normalizedBase.endsWith('/auth') ? normalizedBase : `${normalizedBase}/auth`;
      debugRegister("OAuth register redirect (configured base)", {
        provider,
        redirectUrl: `${authBase}/${provider}`,
      });
      window.location.href = `${authBase}/${provider}`;
      return;
    }

    // Por padrão, usa o proxy interno do Next para chegar ao auth-service.
    debugRegister("OAuth register redirect (next proxy)", {
      provider,
      redirectUrl: `/api/auth/${provider}`,
    });
    window.location.href = `/api/auth/${provider}`;
  }

  const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="text-vaks-light-alt-txt transition-colors hover:text-vaks-cobalt dark:text-vaks-dark-alt-txt dark:hover:text-vaks-dark-secondary"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="flex min-h-screen">
      <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
        {/* Imagem lateral */}
        <div className="relative hidden md:block">
          <Image
            src={loginRegisterImage}
            alt="VAKS Register"
            className="object-cover"
            fill
            loading="eager"
            sizes="(max-width: 767px) 0px, 50vw"
          />
          <div className="absolute inset-0 bg-white/10 dark:bg-black/10" />
        </div>

        {/* Formulário */}
        <div
          className="relative flex flex-col items-center overflow-hidden overflow-y-auto bg-vaks-light-primary px-4 py-14 dark:bg-vaks-dark-primary sm:px-6"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Cursor glow */}
          <div
            className={`pointer-events-none absolute h-125 w-125 rounded-full bg-vaks-cobalt/10 blur-3xl transition-opacity duration-300 dark:bg-vaks-dark-secondary/15 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: `translate(${mousePos.x - 250}px, ${mousePos.y - 250}px)`,
              transition: 'transform 0.15s ease-out, opacity 0.3s',
            }}
          />

          <div className="relative z-10 flex w-full max-w-md flex-col items-center">
            {/* Header */}
            <h1 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
              {register.title}
            </h1>
            <p className="py-2 text-center text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {register.descricao}
            </p>

            {/* Social Buttons */}
            <div className="mt-4 flex w-full flex-col gap-3">
              <button onClick={() => handleOAuthRegister("google")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-vaks-light-stroke bg-vaks-google px-4 py-3 font-medium text-vaks-black transition-all duration-200 hover:scale-[1.01] hover:shadow-md">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.10z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {register.google}
              </button>
              <button onClick={() => handleOAuthRegister("42")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-black px-4 py-3 font-medium text-vaks-white transition-all duration-200 hover:scale-[1.01] hover:shadow-md">
                <Image alt="42logo" src="/42_logo_white.png" width={25} height={25} style={{ width: 'auto', height: 'auto' }} />
                {register.forty}
              </button>
            </div>

            {/* Divisor */}
            <div className="my-6 flex w-full items-center gap-4">
              <div className="h-px flex-1 bg-vaks-light-stroke dark:bg-vaks-dark-stroke" />
              <span className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {register.ou}
              </span>
              <div className="h-px flex-1 bg-vaks-light-stroke dark:bg-vaks-dark-stroke" />
            </div>

            {/* Campos */}
            <div className="flex w-full flex-col gap-5">
              {/* Email */}
              <div>
                <div className="mb-2 flex gap-1">
                  <span className="text-sm font-bold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    {register.email}
                  </span>
                  <span className="text-vaks-light-error dark:text-vaks-dark-error">*</span>
                </div>
                <AppInput
                  type="email"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                />
              </div>

              {error && (
                <div className="w-full rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-xs font-medium text-vaks-light-error dark:text-vaks-dark-error">
                  {error}
                </div>
              )}

              {/* Username */}
              <div>
                <div className="mb-2 flex gap-1">
                  <span className="text-sm font-bold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    {register.username}
                  </span>
                  <span className="text-vaks-light-error dark:text-vaks-dark-error">*</span>
                </div>
                <AppInput
                  type="text"
                  placeholder="meu_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  icon={<User className="h-4 w-4" />}
                />
              </div>
              {/* Senha */}
              <div>
                <div className="mb-2 flex gap-1">
                  <span className="text-sm font-bold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    {register.senha}
                  </span>
                  <span className="text-vaks-light-error dark:text-vaks-dark-error">*</span>
                </div>
                <AppInput
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
                />
              </div>

              {/* Confirmação */}
              <div>
                <div className="mb-2 flex gap-1">
                  <span className="text-sm font-bold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    {register.confirmacao}
                  </span>
                  <span className="text-vaks-light-error dark:text-vaks-dark-error">*</span>
                </div>
                <AppInput
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<PasswordToggle show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />}
                />
              </div>

              {/* Checkbox Termos */}
              <div className="flex items-start gap-3 mt-2">
                <div className="flex h-5 items-center">
                  <input
                    id="agreed"
                    name="agreed"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="h-4 w-4 rounded border-vaks-light-stroke text-vaks-light-purple-button focus:ring-vaks-light-purple-button dark:border-vaks-dark-stroke dark:bg-vaks-dark-primary dark:focus:ring-vaks-dark-purple-button"
                  />
                </div>
                <label htmlFor="agreed" className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-tight cursor-pointer">
                  {register.concordo_texto}{" "}
                  <Link href="/legal/politica-de-privacidade" className="font-bold text-vaks-light-purple-button hover:underline dark:text-vaks-dark-purple-button">
                    {t.legal.politica_privacidade.titulo}
                  </Link>{" "}
                  {register.concordo_e}{" "}
                  <Link href="/legal/termos-de-servico" className="font-bold text-vaks-light-purple-button hover:underline dark:text-vaks-dark-purple-button">
                    {t.legal.termos_servico.titulo}
                  </Link>
                </label>
              </div>
            </div>

            {/* Botão principal */}
            <button
              onClick={handleRegister}
              disabled={loading || !agreed}
              className="group/button relative mt-10 inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-vaks-light-purple-button px-4 py-3 font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-vaks-cobalt/25 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-vaks-dark-purple-button dark:hover:shadow-vaks-dark-secondary/25"
            >
              <span className="relative z-10">
                {loading ? t.common.loading : register.botao}
              </span>
              {/* Shimmer sweep */}
              <div className="absolute inset-0 flex h-full w-full justify-center transform-[skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:transform-[skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
            </button>

            {/* Link para login */}
            <div className="mt-8 flex pb-8">
              <p className="mr-1 font-bold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {register.com_conta}
              </p>
              <Link
                className="font-bold text-vaks-light-purple-button transition-colors hover:text-vaks-cobalt dark:text-vaks-dark-purple-button dark:hover:text-vaks-dark-alt-txt"
                href="/auth/login"
              >
                {register.login}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}