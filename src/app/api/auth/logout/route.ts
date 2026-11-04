import { NextResponse } from 'next/server'
import { db } from '@/server/store'
import { getSessionUser, sessionCookie } from '@/server/auth'

export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (user) {
    // Revoga TODAS as sessões assinadas para esta conta, inclusive cópias do token que
    // o navegador guardou: o campo tv embarcado não vai mais bater com o perfil.
    await db().prepare('update profiles set token_version = token_version + 1 where id = ?').bind(user.id).run()
  }
  const response = NextResponse.json({ ok: true, message: 'Logout realizado' })
  response.cookies.set(sessionCookie('', 0))
  return response
}
