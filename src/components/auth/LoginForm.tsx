'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { safeNextPath, signIn } from '@/lib/auth-client'

export function LoginForm() {
  const router = useRouter()
  const t = useTranslations('auth')
  const common = useTranslations('common')
  const formRef = useRef<HTMLFormElement>(null)
  const [mounted, setMounted] = useState(false)
  const [nextPath, setNextPath] = useState('/')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Botão só habilita depois da hidratação: um submit antes disso virava um GET nativo
  // que recarregava a página e apagava tudo que o usuário tinha digitado.
  useEffect(() => {
    // Item 25: o retorno ?next= (ex.: direto do leitor para o livro interrompido)
    // agora é levado a sério na hora de voltar.
    setNextPath(safeNextPath(new URLSearchParams(window.location.search).get('next')))
    setMounted(true)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    const identifier = String(data.get('identifier') || '')
    const password = String(data.get('password') || '')
    setError('')
    setLoading(true)
    try {
      await signIn(identifier, password)
      router.replace(nextPath)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <label className="block"><span className="mb-2 block text-xs font-medium">{t('identifier')}</span><input name="identifier" className="field" placeholder="seu@email.com ou @apelido" autoComplete="username" required /></label>
      <label className="block"><span className="mb-2 block text-xs font-medium">{t('password')}</span><input name="password" className="field" placeholder="Sua senha" type="password" autoComplete="current-password" required /></label>
      {error && <p className="rounded-lg bg-coral/10 p-3 text-xs text-coral" role="alert">{error}</p>}
      <button className="primary-btn w-full" disabled={loading || !mounted}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : <>{common('signIn')} <ArrowRight size={17} /></>}</button>
      <p className="text-center text-xs text-muted">Ainda não tem conta? <Link href={`/auth/signup?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-coral hover:underline">Criar conta</Link></p>
      <p className="text-center text-[11px] text-muted">{t('noRecovery')}</p>
    </form>
  )
}
