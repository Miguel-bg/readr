'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, LogOut, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { getCurrentProfile } from '@/lib/data'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'
import type { UserProfile } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { getCurrentProfile().then((p) => { setProfile(p); setName(p?.display_name || '') }) }, [])

  async function upload(file?: File) {
    if (!file || !profile) return
    const supabase = createClient(); const ext = file.name.split('.').pop() || 'jpg'; const path = `${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true }); if (error) { setMessage(error.message); return }
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    setProfile({ ...profile, avatar_url: url }); setMessage('Foto atualizada.')
  }
  async function save() { if (!profile) return; const { error } = await createClient().from('profiles').update({ display_name: name }).eq('id', profile.id); setMessage(error?.message || 'Perfil salvo.') }
  async function logout() { await signOut(); router.push('/auth/login') }

  return (
    <AppShell name={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <section className="mx-auto max-w-3xl px-5 pb-14 sm:px-8">
        <header className="border-b border-line pb-7"><p className="eyebrow">Sua conta Readr</p><h1 className="mt-2 font-serif text-5xl">Perfil</h1></header>
        <section className="panel mt-8 p-6 sm:p-9">
          <div className="flex flex-col items-center gap-6 sm:flex-row"><button onClick={() => inputRef.current?.click()} className="group relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-3xl text-white"><input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />{profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="size-full object-cover" /> : name.charAt(0).toUpperCase()}<span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100"><Camera size={22} /></span></button><div className="w-full"><label className="block text-xs font-medium">Nome de exibição</label><input className="field mt-2" value={name} onChange={(e) => setName(e.target.value)} /><p className="mt-2 text-[10px] text-muted">Sua foto pode ser enviada diretamente para o bucket avatars.</p></div></div>
          {message && <p className="mt-5 rounded-lg bg-white/60 p-3 text-xs">{message}</p>}
          <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6"><button onClick={logout} className="secondary-btn !min-h-10 text-coral"><LogOut size={16} /> Sair</button><button onClick={save} className="primary-btn !min-h-10"><Save size={16} /> Salvar perfil</button></footer>
        </section>
      </section>
    </AppShell>
  )
}
