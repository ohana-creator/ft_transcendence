'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const PHRASES = [
  'Oink!', 'Vamos poupar!', 'VAKS!',
  'Oink oink oinkkkkkk!', 'Meta atingida! ',
  'Contribua já!', 'És incrível! ', 'Poupa comigo!',
]

const badges = [
  {
    label: 'Vaquinhas',
    className: 'top-10 -left-36',
    bobDelay: 0,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 11c0 5-7 9-7 9s-7-4-7-9a7 7 0 0 1 14 0z"/><circle cx="12" cy="11" r="2.5"/>
      </svg>
    ),
  },
  {
    label: 'Carteira',
    className: 'top-10 -right-36',
    bobDelay: 0.4,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><line x1="12" y1="12" x2="12" y2="16"/>
      </svg>
    ),
  },
  {
    label: 'Transferir',
    className: 'bottom-20 -left-34',
    bobDelay: 0.8,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"/>
      </svg>
    ),
  },
  {
    label: 'Meta',
    className: 'bottom-20 -right-32',
    bobDelay: 1.2,
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
]

interface VaksMascotProps {
  width?: number
  height?: number
  className?: string
  compact?: boolean
}

export function VaksMascot({ width = 250, height = 290, className, compact = false }: VaksMascotProps) {
  const [isBlinking, setIsBlinking] = useState(false)
  const [isSmiling, setIsSmiling] = useState(false)
  const [isWaving, setIsWaving] = useState(false)
  const [phrase, setPhrase] = useState(PHRASES[0])
  const [showBubble, setShowBubble] = useState(false)

  const randomPhrase = () => PHRASES[Math.floor(Math.random() * PHRASES.length)]

  // auto blink
  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setIsBlinking(true)
        setTimeout(() => setIsBlinking(false), 140)
        schedule()
      }, 2400 + Math.random() * 3500)
      return t
    }
    const t = schedule()
    return () => clearTimeout(t)
  }, [])

  const onHoverStart = () => {
    setIsSmiling(true)
    setIsWaving(true)
    setPhrase(randomPhrase())
    setShowBubble(true)
    setIsBlinking(true)
    setTimeout(() => setIsBlinking(false), 140)
  }

  const onHoverEnd = () => {
    setIsSmiling(false)
    setIsWaving(false)
    setShowBubble(false)
  }

  const onClick = () => {
    setIsBlinking(true)
    setTimeout(() => setIsBlinking(false), 140)
    setPhrase(randomPhrase())
    setShowBubble(true)
    setTimeout(() => setShowBubble(false), 2200)
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className ?? ''}`}
      style={{ width, height }}
    >

      {/* Speech bubble */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 6 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="relative bg-white dark:bg-vaks-dark-purple-card border-2 border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover rounded-2xl px-4 py-2 shadow-md mb-1"
          >
            <p className="text-sm font-extrabold text-vaks-light-purple-button dark:text-vaks-dark-secondary whitespace-nowrap">
              {phrase}
            </p>
            {/* bubble tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0
              border-l-[7px] border-r-[7px] border-t-[9px]
              border-l-transparent border-r-transparent
              border-t-white dark:border-t-vaks-dark-purple-card" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pig + badges wrapper */}
      <div className="relative">

        {/* Badges flutuantes — só mostra se NÃO for compact */}
        {!compact && badges.map((b, i) => (
          <motion.div
            key={b.label}
            initial={{ opacity: 0, scale: 0.7, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
            transition={{
              opacity: { delay: 0.3 + i * 0.2, duration: 0.4 },
              scale:   { delay: 0.3 + i * 0.2, duration: 0.4, type: 'spring', stiffness: 280 },
              y: { delay: b.bobDelay, duration: 3.5 + i * 0.5, repeat: Infinity, ease: 'easeInOut' },
            }}
            className={`absolute flex items-center gap-1.5 bg-white dark:bg-vaks-dark-purple-card
              border-2 border-vaks-light-purple-card-hover dark:border-vaks-dark-purple-card-hover
              rounded-2xl px-3 py-1.5 text-xs font-extrabold
              text-vaks-light-purple-button dark:text-vaks-dark-secondary
              shadow-md whitespace-nowrap ${b.className}`}
          >
            {b.icon}
            {b.label}
          </motion.div>
        ))}

        {/* SVG da mascote */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="cursor-pointer"
          style={{ filter: 'drop-shadow(0 18px 32px rgba(124,58,237,0.15))' }}
          onHoverStart={onHoverStart}
          onHoverEnd={onHoverEnd}
          onClick={onClick}
        >
          <svg width={width} height={height} viewBox="0 0 250 290" fill="none" xmlns="http://www.w3.org/2000/svg">

            {/* SHADOW */}
            <motion.ellipse
              cx="122" cy="278" rx="66" ry="9" fill="#7144B7"
              animate={{ scaleX: [1, 0.78, 1], opacity: [0.09, 0.05, 0.09] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* CURLY TAIL */}
            <motion.g
              animate={{ rotate: [-8, 14, -8] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{ originX: '195px', originY: '170px' }}
            >
              <path d="M196 168 Q214 158 210 144 Q206 132 218 126 Q226 122 222 114"
                stroke="#e8b4d0" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
              <path d="M222 114 Q228 108 224 104 Q220 100 216 106"
                stroke="#e8b4d0" strokeWidth="4" strokeLinecap="round" fill="none"/>
            </motion.g>

            {/* BODY */}
            <ellipse cx="120" cy="192" rx="76" ry="74" fill="#f5d0e8" stroke="#2a1040" strokeWidth="4.5"/>
            <path d="M68 165 Q60 195 72 230" stroke="#e8b4d0" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7"/>

            {/* BELLY */}
            <ellipse cx="120" cy="206" rx="44" ry="42" fill="#f9e4f1" stroke="#2a1040" strokeWidth="2.5"/>

            {/* VAKS coin */}
            <circle cx="120" cy="204" r="20" fill="#7C3AED" opacity="0.18"/>
            <text x="120" y="211" textAnchor="middle" fontSize="16" fontWeight="900"
              fill="#7C3AED" opacity="0.65" fontFamily="sans-serif">V</text>

            {/* LEFT ARM — waving */}
            <motion.g
              animate={isWaving
                ? { rotate: [-32, 10, -20, 0] }
                : { rotate: [0, -8, 0] }
              }
              transition={isWaving
                ? { duration: 0.5, repeat: 2, ease: 'easeInOut' }
                : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
              }
              style={{ originX: '58px', originY: '182px' }}
            >
              <ellipse cx="50" cy="175" rx="22" ry="15" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5" transform="rotate(-42 50 175)"/>
              <circle cx="32" cy="157" r="16" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5"/>
              <path d="M24 150 Q32 144 40 150" stroke="#2a1040" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </motion.g>

            {/* RIGHT ARM */}
            <ellipse cx="190" cy="188" rx="22" ry="15" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5" transform="rotate(30 190 188)"/>
            <circle cx="207" cy="204" r="15" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5"/>
            <path d="M199 198 Q207 192 215 198" stroke="#2a1040" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

            {/* LEFT LEG */}
            <rect x="82" y="250" width="32" height="30" rx="16" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5"/>
            <ellipse cx="98" cy="279" rx="19" ry="9" fill="#e8b4d0" stroke="#2a1040" strokeWidth="2.5"/>
            <path d="M88 272 Q98 268 108 272" stroke="#2a1040" strokeWidth="2" strokeLinecap="round" fill="none"/>

            {/* RIGHT LEG */}
            <rect x="126" y="250" width="32" height="30" rx="16" fill="#f5d0e8" stroke="#2a1040" strokeWidth="3.5"/>
            <ellipse cx="142" cy="279" rx="19" ry="9" fill="#e8b4d0" stroke="#2a1040" strokeWidth="2.5"/>
            <path d="M132 272 Q142 268 152 272" stroke="#2a1040" strokeWidth="2" strokeLinecap="round" fill="none"/>

            {/* HEAD */}
            <ellipse cx="118" cy="104" rx="74" ry="72" fill="#f5d0e8" stroke="#2a1040" strokeWidth="4.5"/>
            <path d="M68 90 Q62 108 70 130" stroke="#e8b4d0" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6"/>

            {/* LEFT EAR */}
            <path d="M58 50 L44 14 Q58 6 78 22 L76 60 Z" fill="#f5d0e8" stroke="#2a1040" strokeWidth="4"/>
            <path d="M60 48 L50 20 Q62 14 76 26 L74 56 Z" fill="#f0b8d8"/>

            {/* RIGHT EAR */}
            <path d="M178 50 L192 14 Q178 6 158 22 L160 60 Z" fill="#f5d0e8" stroke="#2a1040" strokeWidth="4"/>
            <path d="M176 48 L186 20 Q174 14 160 26 L162 56 Z" fill="#f0b8d8"/>

            {/* SNOUT */}
            <ellipse cx="118" cy="128" rx="38" ry="30" fill="#f0b8d8" stroke="#2a1040" strokeWidth="3.5"/>
            <ellipse cx="100" cy="116" rx="8" ry="6" fill="white" opacity="0.22"/>
            <ellipse cx="106" cy="130" rx="8" ry="7" fill="#e090b8" stroke="#2a1040" strokeWidth="2"/>
            <ellipse cx="130" cy="130" rx="8" ry="7" fill="#e090b8" stroke="#2a1040" strokeWidth="2"/>
            <circle cx="104" cy="127" r="2.5" fill="white" opacity="0.45"/>
            <circle cx="128" cy="127" r="2.5" fill="white" opacity="0.45"/>

            {/* LEFT EYE */}
            <ellipse cx="88" cy="88" rx="12" ry="13" fill="#1e0a30" stroke="#2a1040" strokeWidth="2"/>
            <circle cx="93" cy="83" r="4" fill="white"/>
            <circle cx="86" cy="92" r="2.2" fill="white" opacity="0.55"/>
            {/* blink lid */}
            <motion.ellipse
              cx="88" cy="88" rx="12"
              ry="0"
              initial={{ ry: 0 }}
              animate={{ ry: isBlinking ? 13 : 0 }}
              transition={{ duration: 0.07 }}
              fill="#f5d0e8"
            />

            {/* RIGHT EYE */}
            <ellipse cx="148" cy="88" rx="12" ry="13" fill="#1e0a30" stroke="#2a1040" strokeWidth="2"/>
            <circle cx="153" cy="83" r="4" fill="white"/>
            <circle cx="146" cy="92" r="2.2" fill="white" opacity="0.55"/>
            <motion.ellipse
              cx="148" cy="88" rx="12"
              ry="0"
              initial={{ ry: 0 }}
              animate={{ ry: isBlinking ? 13 : 0 }}
              transition={{ duration: 0.07 }}
              fill="#f5d0e8"
            />

            {/* EYEBROWS */}
            <motion.path
              stroke="#2a1040" strokeWidth="3" strokeLinecap="round" fill="none"
              animate={{ d: isSmiling ? 'M76 68 Q88 60 100 68' : 'M76 72 Q88 65 100 72' }}
              transition={{ duration: 0.25 }}
            />
            <motion.path
              stroke="#2a1040" strokeWidth="3" strokeLinecap="round" fill="none"
              animate={{ d: isSmiling ? 'M136 68 Q148 60 160 68' : 'M136 72 Q148 65 160 72' }}
              transition={{ duration: 0.25 }}
            />

            {/* CHEEKS */}
            <motion.ellipse
              cx="70" cy="112" rx="16" ry="10" fill="#e090b8"
              opacity="0.25"
              initial={{ opacity: 0.25 }}
              animate={{ opacity: isSmiling ? 0.6 : 0.25 }}
              transition={{ duration: 0.3 }}
            />
            <motion.ellipse
              cx="166" cy="112" rx="16" ry="10" fill="#e090b8"
              opacity="0.25"
              initial={{ opacity: 0.25 }}
              animate={{ opacity: isSmiling ? 0.6 : 0.25 }}
              transition={{ duration: 0.3 }}
            />

            {/* MOUTH */}
            <motion.path
              stroke="#2a1040" strokeWidth="2.8" strokeLinecap="round" fill="none"
              animate={{ d: isSmiling ? 'M104 150 Q118 168 132 150' : 'M108 152 Q118 159 128 152' }}
              transition={{ duration: 0.3 }}
            />

          </svg>
        </motion.div>
      </div>

      {/* Name tag */}
      <motion.p
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="text-xs font-extrabold tracking-widest uppercase text-vaks-light-alt-txt dark:text-vaks-dark-alt-txt mt-1"
      >
        Vaksy
      </motion.p>
    </div>
  )
}