import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function normalizeNickname(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/^@/, '')
}

export async function POST(request: Request) {
  try {
    const { displayName, nickname, email, password } = await request.json() as Record<string, string>
    const name = displayName?.trim()
    const handle = normalizeNickname(nickname || '')
    const normalizedEmail = email?.trim().toLowerCase()

    if (!name || name.length < 2) return NextResponse.json({ error: 'Informe seu nome.' }, { status: 400 })
    if (!/^[a-z0-9._-]{3,24}$/.test(handle)) return NextResponse.json({ error: 'O apelido deve ter de 3 a 24 caracteres: letras, números, ponto, hífen ou sublinhado.' }, { status: 400 })
    if (!normalizedEmail || !normalizedEmail.includes('@')) return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
    if (!password || password.length < 6) return NextResponse.json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return NextResponse.json({ error: 'Cadastro automático indisponível: configure SUPABASE_SERVICE_ROLE_KEY no servidor.' }, { status: 503 })

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: existing } = await admin.from('account_aliases').select('user_id').eq('nickname', handle).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Este apelido já está em uso.' }, { status: 409 })

    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { display_name: name, nickname: handle },
    })
    if (error || !data.user) return NextResponse.json({ error: error?.message || 'Não foi possível criar a conta.' }, { status: 400 })

    const { error: profileError } = await admin.from('profiles').upsert({
      id: data.user.id,
      display_name: name,
      nickname: handle,
    })
    const { error: aliasError } = await admin.from('account_aliases').upsert({ user_id: data.user.id, nickname: handle, email: normalizedEmail })
    if (profileError || aliasError) {
      await admin.auth.admin.deleteUser(data.user.id)
      return NextResponse.json({ error: profileError?.message || aliasError?.message || 'Não foi possível preparar o perfil.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Dados de cadastro inválidos.' }, { status: 400 })
  }
}
