'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useI18n } from '@/locales/useI18n'
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { AnimatedLogo } from '@/components/ui/AnimatedLogo'

// Regra espelhada do RegisterDto do backend
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

type Step = 'form' | 'success' | 'invalid_token'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()

  // O token vem na URL: /auth/redefinir?token=xxxx
  const token = searchParams.get('token')

  const [step, setStep] = useState<Step>(() => (!token ? 'invalid_token' : 'form'))
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validações em tempo real
  const passwordValid = PASSWORD_REGEX.test(newPassword)
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0
  const canSubmit = passwordValid && passwordsMatch && !loading

  const rules = [
    { label: 'Mínimo 8 caracteres', ok: newPassword.length >= 8 },
    { label: '1 letra maiúscula', ok: /[A-Z]/.test(newPassword) },
    { label: '1 letra minúscula', ok: /[a-z]/.test(newPassword) },
    { label: '1 número', ok: /\d/.test(newPassword) },
  ]

  const handleSubmit = async () => {
    if (!canSubmit || !token) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // token expirado ou inválido
        if (res.status === 400 || res.status === 401) {
          setStep('invalid_token')
          return
        }
        const mensagem = Array.isArray(data.message) ? data.message[0] : data.message
        setError(mensagem ?? t.erros.erro_generico)
        return
      }

      setStep('success')

    } catch {
      setError(t.erros.erro_generico)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center px-6"
    >
      <div className="w-full max-w-sm flex flex-col gap-8">

        <div className="flex flex-col items-center gap-2">
          <AnimatedLogo variant="pulse-rise" size={96} />
        </div>

        <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-card-light dark:shadow-card-dark p-8 flex flex-col gap-6">

          <AnimatePresence mode="wait">

            {/* ── Token inválido / expirado ── */}
            {step === 'invalid_token' && (
              <motion.div
                key="invalid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-4 py-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
                >
                  <XCircle className="w-8 h-8 text-red-500" />
                </motion.div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                    Link inválido ou expirado
                  </h2>
                  <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed">
                    Este link de recuperação já não é válido. Solicita um novo link para redefinir a tua palavra-passe.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/auth/recuperar')}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
                    bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button
                    hover:opacity-90 transition-opacity"
                >
                  Solicitar novo link
                </button>
              </motion.div>
            )}

            {/* ── Formulário ── */}
            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-5"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                    Redefinir palavra-passe
                  </h1>
                  <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed">
                    Escolhe uma nova palavra-passe segura para a tua conta VAKS.
                  </p>
                </div>

                {/* Nova palavra-passe */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    Nova palavra-passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(null) }}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border
                        bg-vaks-light-input dark:bg-vaks-dark-input
                        border-vaks-light-stroke dark:border-vaks-dark-stroke
                        text-vaks-light-main-txt dark:text-vaks-dark-main-txt
                        placeholder:text-vaks-light-alt-txt dark:placeholder:text-vaks-dark-alt-txt
                        focus:outline-none focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button
                        transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-main-txt dark:hover:text-vaks-dark-main-txt transition-colors"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Regras de validação */}
                  {newPassword.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-1 mt-1"
                    >
                      {rules.map(rule => (
                        <div key={rule.label} className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-medium transition-colors ${
                            rule.ok
                              ? 'text-emerald-500'
                              : 'text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt'
                          }`}>
                            {rule.ok ? '✓' : '○'} {rule.label}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Confirmar palavra-passe */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                    Confirmar palavra-passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(null) }}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border
                        bg-vaks-light-input dark:bg-vaks-dark-input
                        text-vaks-light-main-txt dark:text-vaks-dark-main-txt
                        placeholder:text-vaks-light-alt-txt dark:placeholder:text-vaks-dark-alt-txt
                        focus:outline-none transition-colors
                        ${confirmPassword.length > 0
                          ? passwordsMatch
                            ? 'border-emerald-500 dark:border-emerald-500'
                            : 'border-red-400 dark:border-red-500'
                          : 'border-vaks-light-stroke dark:border-vaks-dark-stroke focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-main-txt dark:hover:text-vaks-dark-main-txt transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-[11px] text-red-500 font-medium mt-0.5">
                      As palavras-passe não coincidem
                    </p>
                  )}
                </div>

                {/* Erro genérico */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-medium text-vaks-light-error dark:text-vaks-dark-error
                        bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-xl"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
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
                  ) : 'Redefinir palavra-passe'}
                </button>
              </motion.div>
            )}

            {/* ── Sucesso ── */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="flex flex-col items-center gap-4 py-4 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </motion.div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                    Palavra-passe redefinida!
                  </h2>
                  <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed">
                    A tua palavra-passe foi actualizada com sucesso. Já podes iniciar sessão.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
                    bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button
                    hover:opacity-90 transition-opacity"
                >
                  Ir para o login
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {step === 'form' && (
          <button
            onClick={() => router.push('/auth/login')}
            className="flex items-center justify-center gap-1.5 text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:text-vaks-light-main-txt dark:hover:text-vaks-dark-main-txt transition-colors mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.recuperar.voltar_login}
          </button>
        )}

      </div>
    </motion.div>
  )
}