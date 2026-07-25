'use client'

import { createClient } from './client'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function signUp(displayName: string, email: string, password: string) {
  const name = displayName.trim()
  const normalizedEmail = normalizeEmail(email)

  if (name.length < 2) throw new Error('Informe seu nome com pelo menos 2 caracteres.')
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Informe um e-mail válido.')
  if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')

  const result = await createClient().auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { display_name: name },
    },
  })

  if (result.error) throw result.error
  return result.data
}

export async function signIn(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Informe o e-mail usado no cadastro.')
  if (!password) throw new Error('Informe sua senha.')

  const result = await createClient().auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (result.error) throw result.error
  return result.data
}

export async function signOut() {
  const { error } = await createClient().auth.signOut()
  if (error) throw error
}
