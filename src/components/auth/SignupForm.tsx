'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react'
import { signUp } from '@/lib/supabase/auth'

export function SignupForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const data = await signUp(name, email, password)
      if (data.session) {
        router.replace('/')
        router.refresh()
      } else {
        setSuccess('Conta criada. Confirme o e-mail recebido e depois entre com sua senha.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        <span className="mb-2 block text-xs font-medium">Seu nome</span>
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" minLength={2} required />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-medium">Seu e-mail</span>
        <input className="field" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" type="email" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="mb-2 block text-xs font-medium">Sua senha</span>
        <input className="field" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Escolha uma senha" type="password" autoComplete="new-password" minLength={6} required />
      </label>
      <p className="text-[10px] leading-relaxed text-muted">Use pelo menos 6 caracteres. O e-mail é único e será usado para acessar sua conta em qualquer dispositivo.</p>
      {error && <p className="rounded-lg bg-coral/10 p-3 text-xs text-coral" role="alert">{error}</p>}
      {success && <p className="flex items-start gap-2 rounded-lg bg-emerald-600/10 p-3 text-xs text-emerald-800" role="status"><CheckCircle2 className="mt-0.5 shrink-0" size={15} />{success}</p>}
      <button className="primary-btn w-full" disabled={loading || Boolean(success)}>{loading ? <LoaderCircle className="animate-spin" size={18} /> : <>Criar minha conta <ArrowRight size={17} /></>}</button>
      <p className="text-center text-xs text-muted">Já tem conta? <Link href="/auth/login" className="font-semibold text-coral hover:underline">Entrar</Link></p>
    </form>
  )
}
