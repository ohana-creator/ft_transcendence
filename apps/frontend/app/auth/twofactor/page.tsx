'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react'
import { useI18n } from '@/locales/useI18n'
import { AnimatedLogo } from '@/components/ui/AnimatedLogo'

const CODE_LENGTH = 6

export default function Verificacao2FAPage() {
  const router = useRouter()
  const { t } = useI18n()
  const content = t.twofactor
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // countdown reenvio
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // auto-focus primeiro input
  useEffect(() => { inputRefs.current[0]?.focus() }, [])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    setError(false)
    // avança para o próximo
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    // auto-submit quando completo
    if (newCode.every(d => d !== '') && value) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    const newCode = [...Array(CODE_LENGTH).fill('')]
    pasted.split('').forEach((d, i) => { newCode[i] = d })
    setCode(newCode)
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
    if (pasted.length === CODE_LENGTH) handleVerify(pasted)
  }
/*
const handleVerify = async (finalCode: string) => {
  setLoading(true);
  setError(false);

  try {
    // tempToken guardado no localStorage quando o login devolveu 2FA pendente
    const tempToken = localStorage.getItem('vaks:temp_token');

    if (!tempToken) {
      // token expirou ou não existe — volta ao login
      router.push('/auth/login');
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tempToken,
        code: finalCode,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(true);
      setCode(Array(CODE_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      return;
    }

    // troca o tempToken pelo token definitivo
    localStorage.removeItem('vaks:temp_token');
    localStorage.setItem('vaks:token', data.access_token);

    router.push('/dashboard');

  } catch {
    setError(true);
    setCode(Array(CODE_LENGTH).fill(''));
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  } finally {
    setLoading(false);
  }
};

const handleResend = async () => {
  setResendCooldown(60);
  setCode(Array(CODE_LENGTH).fill(''));
  setError(false);
  setTimeout(() => inputRefs.current[0]?.focus(), 50);

  try {
    const tempToken = localStorage.getItem('vaks:temp_token');
    if (!tempToken) { router.push('/auth/login'); return; }

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/2fa/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempToken }),
    });
  } catch {
    // falha silenciosa — o countdown já começou
  }
};
*/
  const handleVerify = async (finalCode: string) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200)) // substituir por chamada real
    setLoading(false)
    // simula erro — substituir por lógica real
    if (finalCode !== '123456') {
      setError(true)
      setCode(Array(CODE_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
      return
    }
    router.push('/dashboard')
  }

  const handleResend = () => {
    setResendCooldown(60)
    setCode(Array(CODE_LENGTH).fill(''))
    setError(false)
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
    // substituir por chamada real de reenvio
    console.log('Reenviar código')
  }

  const filled = code.filter(d => d !== '').length

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center px-6"
    >
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-2">
          <AnimatedLogo variant="pulse-rise" size={96} />
        </div>

        {/* Card */}
        <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-card-light dark:shadow-card-dark p-8 flex flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-vaks-light-input dark:bg-vaks-dark-input flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-vaks-light-purple-button dark:text-vaks-dark-secondary" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                {content.titulo}
              </h1>
              <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed">
                {content.descricao}
              </p>
            </div>
          </div>

          {/* OTP inputs */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-2 justify-center">
              {code.map((digit, i) => (
                <motion.input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={handlePaste}
                  animate={error ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`w-11 h-13 text-center text-lg font-bold rounded-xl border-2 outline-none transition-all
                    bg-vaks-light-input dark:bg-vaks-dark-input
                    text-vaks-light-main-txt dark:text-vaks-dark-main-txt
                    ${error
                      ? 'border-red-400 dark:border-red-500'
                      : digit
                        ? 'border-vaks-light-purple-button dark:border-vaks-dark-purple-button'
                        : 'border-vaks-light-stroke dark:border-vaks-dark-stroke focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button'
                    }`}
                />
              ))}
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-center text-red-500 font-semibold"
                >
                  {content.erro_codigo}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-vaks-light-stroke dark:bg-vaks-dark-stroke rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${(filled / CODE_LENGTH) * 100}%` }}
              transition={{ duration: 0.2 }}
              className="h-full bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button rounded-full"
            />
          </div>

          {/* Verify button — só aparece se não fizer auto-submit */}
          <button
            onClick={() => handleVerify(code.join(''))}
            disabled={filled < CODE_LENGTH || loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
              bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button
              hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : content.botao_verificar}
          </button>

          {/* Resend */}
          <div className="text-center">
            {resendCooldown > 0 ? (
              <p className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                {content.reenviar_em.replace('{seconds}', resendCooldown.toString())}
              </p>
            ) : (
              <button
                onClick={handleResend}
                className="flex items-center gap-1.5 text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-main-txt dark:hover:text-vaks-dark-main-txt transition-colors mx-auto"
              >
                <RefreshCw className="w-3 h-3" />
                {content.reenviar_botao}
              </button>
            )}
          </div>

        </div>

        {/* Back */}
        <button
          onClick={() => router.push('/auth/login')}
          className="flex items-center justify-center gap-1.5 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-main-txt dark:hover:text-vaks-dark-main-txt transition-colors mx-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {content.voltar_login}
        </button>

      </div>
    </motion.div>
  )
}