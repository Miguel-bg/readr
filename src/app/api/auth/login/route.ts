import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json() as { identifier?: string; password?: string }
    const login = identifier?.trim().toLocaleLowerCase('pt-BR').replace(/^@/, '')
    if (!login || !password) return NextResponse.json({ error: 'Informe seu e-mail ou apelido e sua senha.' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !anonKey || !serviceKey) return NextResponse.json({ error: 'Login indisponível: configuração do servidor incompleta.' }, { status: 503 })

    let email = login
    if (!login.includes('@')) {
      const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data } = await admin.from('account_aliases').select('email').ilike('nickname', login).maybeSingle()
      if (!data?.email) return NextResponse.json({ error: 'Apelido ou senha inválidos.' }, { status: 401 })
      email = data.email
    }

    const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await auth.auth.signInWithPassword({ email, password })
    if (error || !data.session) return NextResponse.json({ error: 'E-mail, apelido ou senha inválidos.' }, { status: 401 })

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch {
    return NextResponse.json({ error: 'Dados de login inválidos.' }, { status: 400 })
  }
}
