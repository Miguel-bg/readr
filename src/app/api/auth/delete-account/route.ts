import { NextResponse } from 'next/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function removeUserFolder(admin: SupabaseClient, bucket: string, userId: string) {
  const { data, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
  if (error) throw error
  const paths = (data || []).filter((item) => item.id).map((item) => `${userId}/${item.name}`)
  if (!paths.length) return
  const { error: removeError } = await admin.storage.from(bucket).remove(paths)
  if (removeError) throw removeError
}

export async function DELETE() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Exclusão indisponível: configure SUPABASE_SERVICE_ROLE_KEY no servidor.' }, { status: 503 })
  }

  const server = createServerClient()
  const { data: { user }, error: userError } = await server.auth.getUser()
  if (userError || !user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })

  const admin = createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  try {
    await Promise.all(['uploads', 'covers', 'avatars'].map((bucket) => removeUserFolder(admin, bucket, user.id)))
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Não foi possível excluir a conta.' }, { status: 500 })
  }
}
