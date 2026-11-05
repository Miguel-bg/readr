'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { safeNextPath, signUp } from '@/lib/auth-client'

export function SignupForm() {
  const router = useRouter()
  const t = useTranslations('auth')
  const formRef = useRef<HTMLFormElement>(null)
  const [mounted, setMounted] = useState(false)
  const [nextPath, setNextPath] = useState('/')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Botão só habilita depois da hidratação: um submit antes disso virava um GET nativo
  // que recarregava a página e apagava tudo que o usuário tinha digitado.
  useEffect(() => {
    setNextPath(safeNextPath(new URLSearchParams(window.location.search).get('next')))
    setMounted(true)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    const name = String(data.get('name') || '').trim()
    const nickname = String(data.get('nickname') || '').toLowerCase().replace(/\s/g, '')
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '')
    setError('')
    setLoading(true)
    try {
      await signUp(name, nickname, email, password)
      router.replace(nextPath)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4">
      <label className="block"><span className="mb-2 block text-xs font-medium">{t('name')}</span><input name="name" className="field" placeholder="Seu nome" autoComplete="name" minLength={2} required /></label>
      <label className="block"><span className="mb-2 block text-xs font-medium">{t('nickname')}</span><input name="nickname" className="field" placeholder="seuapelido" autoComplete="nickname" minLength={3} maxLength={24} pattern="[A-Za-z0-9._\-]+" required /><small className="mt-1.5 block text-[10px] text-muted">{t('nicknameHint')}</small></label>
      <label className="block"><span className="mb-2 block text-xs font-medium">{t('email')}</span><input name="email" className="field" placeholder="seu@email.com" type="email" autoComplete="email" required /></label>
      <label className="block"><span className="mb-2 block text-xs font-medium">{t('password')}</span><input name="password" className="field" placeholder={t('choosePassword')} type="password" autoComplete="new-password" minLength={8} required /><small className="mt-1.5 block text-[10px] text-muted">Mínimo de 8 caracteres.</small></label>
      {error && <p className="rounded-lg bg-coral/10 p-3 text-xs text-coral" role="alert">{error}</p>}
      <button className="primary-btn w-full" disabled={loading || !mounted}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : <>{t('createAndEnter')} <ArrowRight size={17} /></>}</button>
      <p className="text-center text-xs text-muted">Já tem conta? <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-coral hover:underline">Entrar</Link></p>
    </form>
  )
}
