'use client'

import { createClient } from './client'

function normalizeIdentifier(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/^@/, '')
}

export async function signUp(displayName: string, nickname: string, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: displayName.trim(), nickname: normalizeIdentifier(nickname), email: normalizedEmail, password }),
  })
  const result = await response.json() as { ok?: boolean; error?: string }
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível criar a conta.')
  return signIn(normalizedEmail, password)
}

export async function signIn(identifier: string, password: string) {
  const normalized = normalizeIdentifier(identifier)
  if (!normalized) throw new Error('Informe seu e-mail ou apelido.')
  if (!password) throw new Error('Informe sua senha.')

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: normalized, password }),
  })
  const result = await response.json() as { access_token?: string; refresh_token?: string; error?: string }
  if (!response.ok || !result.access_token || !result.refresh_token) throw new Error(result.error || 'Não foi possível entrar.')

  const { data, error } = await createClient().auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await createClient().auth.signOut()
  if (error) throw error
}
