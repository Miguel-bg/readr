'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Flame, UserPlus, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { getCurrentProfile, getFollowCounts, getProfileActivities, getPublicProfile, getRankings, toggleFollow } from '@/lib/data'
import type { UserProfile } from '@/lib/types'

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [me, setMe] = useState<UserProfile | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [counts, setCounts] = useState({ followers: 0, following: 0, isFollowing: false })
  const [metrics, setMetrics] = useState({ booksRead: 0, pagesRead: 0, streak: 0 })
  const [activities, setActivities] = useState<any[]>([])
  const [error, setError] = useState('')
  const [followMessage, setFollowMessage] = useState('')

  useEffect(() => {
    Promise.all([getCurrentProfile(), getPublicProfile(id), getProfileActivities(id), getRankings()]).then(async ([current, person, activity, rankings]) => {
      setMe(current); setProfile(person); setActivities(activity)
      setCounts(await getFollowCounts(id, current?.id))
      const found = rankings.find((item) => item.profile.id === id)
      if (found) setMetrics({ booksRead: found.booksRead, pagesRead: found.pagesRead, streak: found.streak })
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível abrir o perfil.'))
  }, [id])

  async function follow() {
    if (!me) { window.location.href = '/auth/login'; return }
    setFollowMessage('')
    try {
      await toggleFollow(me.id, id, counts.isFollowing)
      setCounts((value) => ({ ...value, isFollowing: !value.isFollowing, followers: Math.max(0, value.followers + (value.isFollowing ? -1 : 1)) }))
    } catch (cause) {
      // Item 19 (banca): falha (rede/sessão) não deixa o contador mentir — avisa.
      setFollowMessage(cause instanceof Error ? cause.message : 'Não foi possível atualizar quem você segue. Tente de novo.')
    }
  }

  if (error) return <AppShell><p className="p-10 text-coral">{error}</p></AppShell>
  if (!profile) return <AppShell><div className="m-10 h-64 animate-pulse rounded-3xl bg-black/5" /></AppShell>
  return <AppShell name={me?.nickname || me?.display_name} avatarUrl={me?.avatar_url}>
    <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
      <Link href="/community" className="mb-5 inline-flex items-center gap-2 text-xs"><ArrowLeft size={15} /> Comunidade</Link>
      <section className="panel overflow-hidden"><div className="h-32 bg-gradient-to-r from-[#243a34] via-[#596f64] to-[#d85d5b]" /><article className="px-6 pb-8 sm:px-10"><div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end"><div className="grid size-28 place-items-center overflow-hidden rounded-full border-4 border-surface bg-ink text-4xl font-bold text-white">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : (profile.nickname || profile.display_name || '?').charAt(0).toUpperCase()}</div><div className="flex-1"><h1 className="font-serif text-4xl">@{profile.nickname || 'leitor'}</h1><p className="mt-1 text-[10px] uppercase tracking-[.18em] text-muted">ID {profile.public_id || '--------'}</p></div>{me?.id !== id && <button onClick={follow} className={counts.isFollowing ? 'secondary-btn !min-h-10' : 'primary-btn !min-h-10'}><UserPlus size={16} />{counts.isFollowing ? 'Seguindo' : 'Seguir'}</button>}</div><p className="mt-6 max-w-2xl text-sm leading-7 text-muted">{profile.bio || 'Este leitor ainda não adicionou uma biografia.'}</p>{followMessage && <p className="mt-3 text-xs text-coral">{followMessage}</p>}<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5"><Stat icon={Users} value={counts.followers} label="Seguidores" /><Stat icon={Users} value={counts.following} label="Seguindo" /><Stat icon={BookOpen} value={metrics.booksRead} label="Livros lidos" /><Stat icon={BookOpen} value={metrics.pagesRead} label="Páginas lidas" /><Stat icon={Flame} value={metrics.streak} label="Streak" /></div></article></section>
      <section className="mt-8"><h2 className="font-serif text-3xl">Atividade recente</h2><div className="mt-4 space-y-3">{activities.length ? activities.map((activity) => <article key={activity.id} className="panel p-4"><p className="text-xs font-semibold">{activity.activity_type.replaceAll('_', ' ')}</p><p className="mt-1 text-[10px] text-muted">{activity.metadata?.title || 'Atividade de leitura'} · {new Date(activity.created_at).toLocaleDateString()}</p></article>) : <p className="rounded-2xl border border-dashed border-line p-10 text-center text-xs text-muted">Nenhuma atividade pública ainda.</p>}</div></section>
    </section>
  </AppShell>
}

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return <div className="rounded-2xl bg-white/50 p-4"><Icon size={15} className="text-coral" /><strong className="mt-2 block text-xl">{value}</strong><span className="text-[9px] uppercase tracking-wider text-muted">{label}</span></div>
}
