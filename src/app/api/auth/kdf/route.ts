import { NextResponse } from 'next/server'
import { jwtSecret, KDF_DECOY_FALLBACK } from '@/server/auth'
import { db } from '@/server/store'
import { clientIp, giveCapacity } from '@/server/ratelimit'

// Devolve o salt PBKDF2 do usuário para o navegador derivar a chave de senha.
// Conta inexistente devolve salt "isca" derivada da própria entrada (evita enumeração de contas).

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function POST(request: Request) {
  // Freio para harvesting de salts em massa: o login legítimo usa 1 kdf por tentativa.
  if (!(await giveCapacity(`kdf:${clientIp(request)}`, 90))) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' }, { status: 429 })
  }
  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const identifier = String(body.identifier ?? '').trim().toLowerCase().replace(/^@/, '')
  if (!identifier) return NextResponse.json({ error: 'Informe seu e-mail ou apelido.' }, { status: 400 })

  const row = await db().prepare('select kdf_salt from profiles where lower(email) = ? or lower(nickname) = ?')
    .bind(identifier, identifier).first<{ kdf_salt: string }>()
  if (row) return NextResponse.json({ salt: row.kdf_salt })

  // Fallback unificado: o salt-isca nunca quebra o login (não é segredo — só
  // deriva um salt estável para contas inexistentes). jwtSecret() já auditou.
  const secret = jwtSecret() || KDF_DECOY_FALLBACK
  const salt = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`readr-decoy|${secret}|${identifier}`))).slice(0, 32)
  return NextResponse.json({ salt })
}
