'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/locales/useI18n'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { AnimatedLogo } from '@/components/ui/AnimatedLogo'

type Step = 'email' | 'sent'

export default function RecuperarSenhaPage() {
  const router = useRouter()
  const { t } = useI18n()
  const content = t.recuperar
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  /*
    const handleSubmit = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError(null)
 
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
 
      // mesmo que o email não exista o backend deve devolver 200
      // para não revelar se o email está registado (segurança)
      if (!res.ok) {
        const data = await res.json()
        const mensagem = Array.isArray(data.message) ? data.message[0] : data.message
        setError(mensagem ?? t.erros.erro_generico)
        return
      }
 
      setStep('sent')
 
    } catch {
      setError(t.erros.erro_generico)
    } finally {
      setLoading(false)
    }
  }
 
  const handleResend = async () => {
    setStep('email')
    // ao voltar ao step email o utilizador pode reenviar
  }
  */
  const handleSubmit = async () => {
    if (!email) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1400)) // substituir por chamada real
    setLoading(false)
    setStep('sent')
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center px-6"
    >
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Logo / brand */}
        <div className="flex flex-col items-center gap-2">
           <AnimatedLogo variant="pulse-rise" size={96} />
        </div>

        {/* Card */}
        <div className="bg-vaks-light-purple-card dark:bg-vaks-dark-purple-card rounded-2xl shadow-card-light dark:shadow-card-dark p-8 flex flex-col gap-6">

          {step === 'email' ? (
            <>
              {/* Header */}
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                  {content.titulo}
                </h1>
                <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed">
                  {content.descricao}
                </p>
              </div>

              {/* Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder={content.placeholder_email}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border
                      bg-vaks-light-input dark:bg-vaks-dark-input
                      border-vaks-light-stroke dark:border-vaks-dark-stroke
                      text-vaks-light-main-txt dark:text-vaks-dark-main-txt
                      placeholder:text-vaks-light-alt-txt dark:placeholder:text-vaks-dark-alt-txt
                      focus:outline-none focus:border-vaks-light-purple-button dark:focus:border-vaks-dark-purple-button
                      transition-colors"
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!email || loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
                  bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button
                  hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : content.botao_enviar}
              </button>
            </>
          ) : (
            /* Step: sent */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
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
                  {content.sucesso_titulo}
                </h2>
                <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed">
                  {content.sucesso_descricao.replace('{email}', '')}
                  <span className="font-semibold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
                    {email}
                  </span>
                  {content.sucesso_descricao.split('{email}')[1]}
                </p>
              </div>
              <button
                onClick={() => setStep('email')}
                className="text-xs text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt hover:underline mt-1"
              >
                {content.reenviar}
              </button>
            </motion.div>
          )}

        </div>

        {/* Back to login */}
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