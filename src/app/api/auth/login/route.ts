import { NextResponse } from 'next/server'
import { db, profileOut } from '@/server/store'
import { constantTimeEquals, hashClientKey, signSessionToken, respondWithSession } from '@/server/auth'
import { clientIp, giveCapacity, peekRateLimit, rateHit } from '@/server/ratelimit'

const MAX_FAILURES = 8 // lockout por IP+identificador dentro da janela de 15 min

function tooMany(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 429 })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const identifier = String(body.identifier ?? '').trim().toLowerCase().replace(/^@/, '')
  const k = String(body.k ?? '')
  const ip = clientIp(request)

  // Freio geral por IP (não deixa um endpoint virar dreno de D1) e lockout por tentativas falhas.
  if (!(await giveCapacity(`login:${ip}`, 60))) return tooMany('Muitas tentativas. Aguarde alguns minutos e tente de novo.')
  const lockBucket = `login-fail:${ip}|${identifier}`
  if (identifier && (await peekRateLimit(lockBucket)) >= MAX_FAILURES) {
    return tooMany('Muitas tentativas. Aguarde alguns minutos e tente de novo.')
  }

  if (!identifier) return NextResponse.json({ ok: false, error: 'Informe seu e-mail ou apelido.' }, { status: 400 })
  if (!/^[a-f0-9]{64}$/.test(k)) return NextResponse.json({ ok: false, error: 'Não foi possível entrar. Recarregue a página.' }, { status: 400 })

  const row = await db().prepare('select * from profiles where lower(email) = ? or lower(nickname) = ?')
    .bind(identifier, identifier).first<Record<string, any>>()
  if (!row) return rejeitarCredencial(lockBucket)

  const hash = await hashClientKey(k, row.kdf_salt)
  if (!constantTimeEquals(hash, String(row.password_hash))) return rejeitarCredencial(lockBucket)

  const token = await signSessionToken(String(row.id), Number(row.token_version || 0))
  const response = NextResponse.json({ ok: true, profile: profileOut(row) })
  return respondWithSession(response, token)
}

/** Falha de credencial: conta a tentativa e vira lockout a partir do limite. */
async function rejeitarCredencial(lockBucket: string) {
  await rateHit(lockBucket)
  if ((await peekRateLimit(lockBucket)) >= MAX_FAILURES) {
    return tooMany('Muitas tentativas. Aguarde alguns minutos e tente de novo.')
  }
  return NextResponse.json({ ok: false, error: 'E-mail ou senha incorretos.' }, { status: 401 })
}
