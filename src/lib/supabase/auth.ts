'use client'

import { createClient } from './client'

const TEMPORARY_PASSWORD = '123456'

export function nameToSyntheticEmail(name: string) {
  const slug = name
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${slug || 'leitor'}@readr.app`
}

export async function signUp(displayName: string) {
  const supabase = createClient()
  const email = nameToSyntheticEmail(displayName)
  // TODO Fase 2: substituir por senha real definida pelo usuário + verificação de e-mail.
  const result = await supabase.auth.signUp({
    email,
    password: TEMPORARY_PASSWORD,
    options: { data: { display_name: displayName.trim() } },
  })
  if (result.error) throw result.error
  return result.data
}

export async function signIn(nameOrEmail: string) {
  const supabase = createClient()
  const email = nameOrEmail.includes('@') ? nameOrEmail.trim() : nameToSyntheticEmail(nameOrEmail)
  // TODO Fase 2: substituir por senha real definida pelo usuário + verificação de e-mail.
  const result = await supabase.auth.signInWithPassword({ email, password: TEMPORARY_PASSWORD })
  if (result.error) throw result.error
  return result.data
}

export async function signOut() {
  const { error } = await createClient().auth.signOut()
  if (error) throw error
}
