'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { signIn } from '@/lib/supabase/auth'

export function LoginForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try { await signIn(name); router.push('/'); router.refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block"><span className="mb-2 block text-xs font-medium">Nome ou e-mail</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Maria Silva" autoComplete="username" required /></label>
      <label className="block"><span className="mb-2 block text-xs font-medium">Senha temporária</span><input className="field" value="123456" type="password" autoComplete="current-password" readOnly aria-describedby="password-hint" /></label>
      <p id="password-hint" className="text-[10px] text-muted">Senha fixa somente para a Fase 1.</p>
      {error && <p className="rounded-lg bg-coral/10 p-3 text-xs text-coral">{error}</p>}
      <button className="primary-btn w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : <>Entrar <ArrowRight size={17} /></>}</button>
      <p className="text-center text-xs text-muted">Ainda não tem conta? <Link href="/auth/signup" className="font-semibold text-coral hover:underline">Criar conta</Link></p>
    </form>
  )
}
