'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Languages, LogOut, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { getCurrentProfile } from '@/lib/data'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/lib/supabase/auth'
import type { UserProfile } from '@/lib/types'
import { useLanguage, type AppLanguage } from '@/components/ui/LanguageProvider'

export default function ProfilePage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { getCurrentProfile().then((p) => { setProfile(p); setName(p?.display_name || ''); setBio(p?.bio || '') }) }, [])

  async function upload(file?: File) {
    if (!file || !profile) return
    const supabase = createClient(); const ext = file.name.split('.').pop() || 'jpg'; const path = `${profile.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true }); if (error) { setMessage(error.message); return }
    const url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
    setProfile({ ...profile, avatar_url: url }); setMessage('Foto atualizada.')
  }
  async function save() { if (!profile) return; const { error } = await createClient().from('profiles').update({ display_name: name, bio }).eq('id', profile.id); setMessage(error?.message || 'Perfil salvo.') }
  async function logout() { await signOut(); router.push('/auth/login') }

  return (
    <AppShell name={profile?.nickname || profile?.display_name} avatarUrl={profile?.avatar_url}>
      <section className="mx-auto max-w-3xl px-5 pb-14 sm:px-8">
        <header className="border-b border-line pb-7"><p className="eyebrow">Sua conta Readr</p><h1 className="mt-2 font-serif text-5xl">Perfil</h1></header>
        <section className="panel mt-8 p-6 sm:p-9">
          <div className="flex flex-col items-center gap-6 sm:flex-row"><button onClick={() => inputRef.current?.click()} className="group relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-3xl text-white"><input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />{profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="size-full object-cover" /> : (profile?.nickname || name).charAt(0).toUpperCase()}<span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100"><Camera size={22} /></span></button><div className="w-full"><p className="text-lg font-semibold">@{profile?.nickname || 'leitor'}</p><p className="mt-1 text-[10px] uppercase tracking-widest text-muted">ID {profile?.public_id || '--------'}</p><label className="mt-4 block text-xs font-medium">Nome de exibição</label><input className="field mt-2" value={name} onChange={(e) => setName(e.target.value)} /><p className="mt-2 text-[10px] text-muted">O seu apelido é exibido publicamente no Readr.</p></div></div>
          <label className="mt-6 block text-xs font-medium">Biografia</label><textarea className="field mt-2 min-h-24 resize-none" value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Conte um pouco sobre você e suas leituras." />
          <section className="mt-6 rounded-2xl border border-line bg-white/40 p-5"><header className="flex items-center gap-2"><Languages size={18} /><div><h2 className="text-sm font-semibold">Idioma do site</h2><p className="mt-0.5 text-[10px] text-muted">Traduz todos os menus, botões, formulários e mensagens do Readr.</p></div></header><div className="mt-4 grid grid-cols-3 gap-2">{([['pt','Português'],['en','English'],['es','Español']] as [AppLanguage,string][]).map(([value,label]) => <button key={value} type="button" onClick={() => setLanguage(value)} className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${language === value ? 'border-coral bg-coral text-white' : 'border-line bg-white/60 hover:border-ink/30'}`}>{label}</button>)}</div></section>
          {message && <p className="mt-5 rounded-lg bg-white/60 p-3 text-xs">{message}</p>}
          <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6"><button onClick={logout} className="secondary-btn !min-h-10 text-coral"><LogOut size={16} /> Sair</button><button onClick={save} className="primary-btn !min-h-10"><Save size={16} /> Salvar perfil</button></footer>
        </section>
      </section>
    </AppShell>
  )
}
