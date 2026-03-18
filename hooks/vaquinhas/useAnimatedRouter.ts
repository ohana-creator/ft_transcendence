'use client'

import { useRouter } from 'next/navigation'

export function useAnimatedRouter() {
  const router = useRouter()

  const navigateTo = (href: string) => {
    // dá 350ms para o exit animation correr antes do push
    setTimeout(() => router.push(href), 10)
    router.push(href)
  }

  return { navigateTo }
}