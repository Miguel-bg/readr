'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { signUp } from '@/lib/supabase/auth'

export function SignupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try { await signUp(name); router.push('/'); router.refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar a conta.') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block"><span className="mb-2 block text-xs font-medium">Como devemos chamar você?</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" minLength={2} required /></label>
      <div className="rounded-xl border border-line bg-white/35 p-4 text-xs leading-relaxed text-muted">Seu login será criado automaticamente e a senha temporária será <strong className="text-ink">123456</strong>.</div>
      {error && <p className="rounded-lg bg-coral/10 p-3 text-xs text-coral">{error}</p>}
      <button className="primary-btn w-full" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : <>Criar minha conta <ArrowRight size={17} /></>}</button>
      <p className="text-center text-xs text-muted">Já tem conta? <Link href="/auth/login" className="font-semibold text-coral hover:underline">Entrar</Link></p>
    </form>
  )
}
