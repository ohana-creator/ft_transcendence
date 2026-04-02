"use client";

import { useI18n } from "@/locales";
import Image from "next/image";
import loginRegisterImage from "../../../public/login_register.png";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Eye, EyeOff } from "lucide-react";
import { AppInput } from "@/components/auth/app-input";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/utils/api/api";
import { toast } from "@/utils/toast";
import { useAuth } from "@/contexts/auth";


export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const { t } = useI18n();
  const login = t.login;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* ── cursor-glow state ── */
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  async function handleLogin() {
    setLoading(true);
    setError(null);
    const identifier = email.trim();

    if (!identifier || !password.trim()) {
      const message = login.erro_campos_obrigatorios;
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    try {
      const response = await api.post<{
        success: boolean; 
        requiresTwoFA?: boolean;
        tempToken?: string;
        data?: {
          user?: { id?: string; email?: string; username?: string; name?: string; avatarUrl?: string };
          id?: string;
          email?: string;
          username?: string;
          name?: string;
          avatarUrl?: string;
          accessToken?: string;
          token?: string;
        };
      }>('/auth/login', {
        identifier,
        password,
      }, { skipAuth: true });

      const responseData = response?.data;
      const resolvedUser = responseData?.user || responseData;
      const resolvedToken = responseData?.accessToken || responseData?.token || response?.tempToken;
      const shouldUseTwoFA = response?.requiresTwoFA !== false;

      if (response.success && resolvedToken) {
        const twoFAEmail = resolvedUser?.email || (identifier.includes('@') ? identifier : '');

        if (!shouldUseTwoFA) {
          authLogin(resolvedToken, resolvedUser);
          toast.success("Login realizado com sucesso");
          router.push('/dashboard');
          return;
        }

        if (!twoFAEmail) {
          throw new Error(login.erro_identificar_email);
        }

        // 🔐 SEMPRE ir para 2FA (obrigatório para todos os logins)
        try {
          // Solicitar código por email
          await api.post('/auth/2fa/email/request', { email: twoFAEmail }, { skipAuth: true });
          
          // Usar token resolvido como tempToken
          const tempToken = resolvedToken;
          
          // Redirecionar para página 2FA
          router.push(`/auth/twofactor?email=${encodeURIComponent(twoFAEmail)}&tempToken=${encodeURIComponent(tempToken)}`);
          toast.info(login.codigo_enviado);
          return;
        } catch {
          toast.error(login.erro_enviar_codigo);
        }
      }

      throw new Error(login.erro);
    } catch (err: unknown) {
      const error = err as { message?: string };
      const message = error.message ?? login.erro;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }
  const handleOAuthLogin = (provider: string) => {
    const configuredBase = process.env.NEXT_PUBLIC_AUTH_URL?.trim();

    if (configuredBase) {
      const normalizedBase = configuredBase.replace(/\/+$/, "");
      const authBase = normalizedBase.endsWith('/auth') ? normalizedBase : `${normalizedBase}/auth`;
      window.location.href = `${authBase}/${provider}`;
      return;
    }

    // Por padrão, usa o proxy interno do Next para chegar ao auth-service.
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <div className="grid min-h-150 w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl shadow-2xl md:grid-cols-2">
        {/* Imagem lateral */}
        <div className="relative hidden md:block">
          <Image
            src={loginRegisterImage}
            alt="VAKS Login"
            className="object-cover"
            fill
            loading="eager"
            sizes="(max-width: 767px) 0px, 50vw"
          />
          <div className="absolute inset-0 bg-white/10 dark:bg-black/10" />
        </div>

        {/* Formulário */}
        <div
          className="relative flex flex-col items-center overflow-hidden bg-vaks-light-primary px-4 py-20 dark:bg-vaks-dark-purple-card sm:px-6"
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
              {login.title}
            </h1>
            <p className="py-2 text-center text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
              {login.descricao}
            </p>

            {/* Campos */}
            <div className="mt-8 flex w-full flex-col gap-5">
              <AppInput
                label={login.email}
                type="text"
                placeholder="email ou username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
              />

              <AppInput
                label={login.senha}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-vaks-light-alt-txt transition-colors hover:text-vaks-cobalt dark:text-vaks-dark-alt-txt dark:hover:text-vaks-dark-secondary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <div className="flex justify-end">
                <Link
                  href="/auth/recuperar"
                  className="text-xs font-bold text-vaks-light-purple-button hover:underline dark:text-vaks-dark-purple-button"
                >
                  {login.esqueceu}
                </Link>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-2.5 text-xs font-medium text-vaks-light-error dark:text-vaks-dark-error"
              >
                {error}
              </motion.p>
            )}

            {/* Botão principal */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="group/button relative mt-10 inline-flex w-full items-center justify-center overflow-hidden rounded-lg bg-vaks-light-purple-button px-4 py-3 font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-vaks-cobalt/25 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-vaks-dark-purple-button dark:hover:shadow-vaks-dark-secondary/25"
            >
              <span className="relative z-10">
                {loading ? t.common.loading : login.botao}
              </span>
              {/* Shimmer sweep */}
              <div className="absolute inset-0 flex h-full w-full justify-center transform-[skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:transform-[skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
            </button>

            {/* Divisor */}
            <div className="my-8 flex w-full items-center gap-4">
              <div className="h-px flex-1 bg-vaks-light-stroke dark:bg-vaks-dark-stroke" />
              <span className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {login.ou}
              </span>
              <div className="h-px flex-1 bg-vaks-light-stroke dark:bg-vaks-dark-stroke" />
            </div>

            {/* Social Buttons */}
            <div className="flex w-full flex-col gap-3">
              <button onClick={() => handleOAuthLogin("google")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-vaks-light-stroke bg-vaks-google px-4 py-3 font-medium text-vaks-black transition-all duration-200 hover:scale-[1.01] hover:shadow-md">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {login.google}
              </button>
              <button onClick={() => handleOAuthLogin("42")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-vaks-light-stroke dark:border-vaks-dark-stroke bg-vaks-black px-4 py-3 font-medium text-vaks-white transition-all duration-200 hover:scale-[1.01] hover:shadow-md">
                 <Image alt="42logo" src="/42_logo_white.png" width={25} height={25} style={{ width: 'auto', height: 'auto' }} />
                 {login.forty}
              </button>
            </div>
            {/* Link para registo */}
            <div className="mt-8 flex">
              <p className="mr-1 font-bold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {login.sem_conta}
              </p>
              <Link
                className="font-bold text-vaks-light-purple-button transition-colors hover:text-vaks-light-main-txt dark:hover:text-vaks-cobalt dark:text-vaks-dark-purple-button dark:hover:text-vaks-dark-alt-txt"
                href="/auth/register"
              >
                {login.criar}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}