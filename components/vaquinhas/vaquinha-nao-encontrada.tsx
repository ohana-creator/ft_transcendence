'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/locales/useI18n'
import { ArrowLeft, Search } from 'lucide-react'

export function VaquinhaNaoEncontrada() {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-vaks-light-primary dark:bg-vaks-dark-primary flex items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-md w-full gap-6">

        {/* Vaksy triste */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 16px 28px rgba(124,58,237,0.13))' }}
          >
            <svg width="180" height="200" viewBox="0 0 250 290" fill="none" xmlns="http://www.w3.org/2000/svg">

              {/* Shadow */}
              <motion.ellipse
                cx="122" cy="278" rx="66" ry="9" fill="#7144B7"
                animate={{ scaleX: [1, 0.8, 1], opacity: [0.08, 0.04, 0.08] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Tail — sad, drooping */}
              <path d="M196 168 Q210 175 206 188 Q202 200 212 208"
                stroke="#e8b4d0" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
              <path d="M212 208 Q218 214 214 220 Q210 224 206 218"
                stroke="#e8b4d0" strokeWidth="4" strokeLinecap="round" fill="none"/>

              {/* Body */}
              <ellipse cx="120" cy="192" rx="76" ry="74" fill="#f5d0e8" stroke="#2a1040" strokeWidth="4.5"/>
              <path d="M68 165 Q60 195 72 230" stroke="#e8b4d0" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7"/>

              {/* Belly */}
              <ellipse cx="120" cy="206" rx="44" ry="42" fill="#f9e4f1" stroke="#2a1040" strokeWidth="2.5"/>

              {/* Question mark on belly instead of V */}
              <circle cx="120" cy="204" r="20" fill="#7C3AED" opacity="0.15"/>
              <text x="120" y="211" textAnchor="middle" fontSize="20" fontWeight="900"
                fill="#7C3AED" opacity="0.55" fontFamily="sans-serif">?</text>

              {/* Arms — down sad */}
              <ellipse cx="50" cy="195" rx="22" ry="15" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5" transform="rotate(20 50 195)"/>
              <circle cx="38" cy="210" r="15" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5"/>
              <path d="M30 205 Q38 199 46 205" stroke="#2a1040" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

              <ellipse cx="190" cy="195" rx="22" ry="15" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5" transform="rotate(-20 190 195)"/>
              <circle cx="202" cy="210" r="15" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5"/>
              <path d="M194 205 Q202 199 210 205" stroke="#2a1040" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

              {/* Legs */}
              <rect x="82" y="250" width="32" height="30" rx="16" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5"/>
              <ellipse cx="98" cy="279" rx="19" ry="9" fill="#e8b4d0" stroke="#2a1040" strokeWidth="2.5"/>
              <path d="M88 272 Q98 268 108 272" stroke="#2a1040" strokeWidth="2" strokeLinecap="round" fill="none"/>

              <rect x="126" y="250" width="32" height="30" rx="16" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5"/>
              <ellipse cx="142" cy="279" rx="19" ry="9" fill="#e8b4d0" stroke="#2a1040" strokeWidth="2.5"/>
              <path d="M132 272 Q142 268 152 272" stroke="#2a1040" strokeWidth="2" strokeLinecap="round" fill="none"/>

              {/* Head */}
              <ellipse cx="118" cy="104" rx="74" ry="72" fill="#f5d0e8" stroke="#2a1040" strokeWidth="4.5"/>
              <path d="M68 90 Q62 108 70 130" stroke="#e8b4d0" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>

              {/* Ears */}
              <path d="M58 50 L44 14 Q58 6 78 22 L76 60 Z" fill="#f5d0e8" stroke="#2a1040" strokeWidth="4"/>
              <path d="M60 48 L50 20 Q62 14 76 26 L74 56 Z" fill="#f0b8d8"/>
              <path d="M178 50 L192 14 Q178 6 158 22 L160 60 Z" fill="#f5d0e8" stroke="#2a1040" strokeWidth="4"/>
              <path d="M176 48 L186 20 Q174 14 160 26 L162 56 Z" fill="#f0b8d8"/>

              {/* Snout */}
              <ellipse cx="118" cy="128" rx="38" ry="30" fill="#f0b8d8" stroke="#2a1040" strokeWidth="3.5"/>
              <ellipse cx="100" cy="116" rx="8" ry="6" fill="white" opacity="0.22"/>
              <ellipse cx="106" cy="130" rx="8" ry="7" fill="#e090b8" stroke="#2a1040" strokeWidth="2"/>
              <ellipse cx="130" cy="130" rx="8" ry="7" fill="#e090b8" stroke="#2a1040" strokeWidth="2"/>
              <circle cx="104" cy="127" r="2.5" fill="white" opacity="0.45"/>
              <circle cx="128" cy="127" r="2.5" fill="white" opacity="0.45"/>

              {/* Eyes — sad, looking down */}
              <ellipse cx="88" cy="90" rx="12" ry="13" fill="#1e0a30" stroke="#2a1040" strokeWidth="2"/>
              <circle cx="93" cy="86" r="4" fill="white"/>
              <circle cx="86" cy="95" r="2.2" fill="white" opacity="0.55"/>

              <ellipse cx="148" cy="90" rx="12" ry="13" fill="#1e0a30" stroke="#2a1040" strokeWidth="2"/>
              <circle cx="153" cy="86" r="4" fill="white"/>
              <circle cx="146" cy="95" r="2.2" fill="white" opacity="0.55"/>

              {/* Eyebrows — sad, angled inward */}
              <path d="M76 70 Q88 76 100 70" stroke="#2a1040" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <path d="M136 70 Q148 76 160 70" stroke="#2a1040" strokeWidth="3" strokeLinecap="round" fill="none"/>

              {/* Cheeks — faint */}
              <ellipse cx="70" cy="114" rx="16" ry="10" fill="#e090b8" opacity="0.2"/>
              <ellipse cx="166" cy="114" rx="16" ry="10" fill="#e090b8" opacity="0.2"/>

              {/* Mouth — sad */}
              <path d="M104 156 Q118 148 132 156" stroke="#2a1040" strokeWidth="2.8" strokeLinecap="round" fill="none"/>

              {/* Tears */}
              <motion.ellipse
                cx="80" cy="106" rx="4" ry="5" fill="#A78BFA" opacity="0.7"
                animate={{ cy: [106, 130, 106], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeIn', delay: 0.5 }}
              />
              <motion.ellipse
                cx="156" cy="106" rx="4" ry="5" fill="#A78BFA" opacity="0.7"
                animate={{ cy: [106, 130, 106], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeIn', delay: 1.2 }}
              />
            </svg>
          </motion.div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex flex-col gap-2"
        >
          <h2 className="text-2xl font-bold text-vaks-light-main-txt dark:text-vaks-dark-main-txt">
            {t.vaquinhas.detalhe.nao_encontrada}
          </h2>
          <p className="text-sm text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt leading-relaxed">
            {t.vaquinhas.detalhe.nao_encontrada_desc}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 w-full"
        >
          <button
            onClick={() => router.back()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
              border border-vaks-light-stroke dark:border-vaks-dark-stroke
              text-vaks-light-main-txt dark:text-vaks-dark-main-txt
              hover:bg-vaks-light-input dark:hover:bg-vaks-dark-input
              transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.vaquinhas.detalhe.voltar}
          </button>

          <button
            onClick={() => router.push('/vaquinhas')}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
              bg-vaks-light-purple-button dark:bg-vaks-dark-purple-button text-white
              hover:opacity-90 transition-opacity shadow-md"
          >
            <Search className="w-4 h-4" />
            {t.vaquinhas.detalhe.ver_vaquinhas}
          </button>
        </motion.div>

      </div>
    </div>
  )
}