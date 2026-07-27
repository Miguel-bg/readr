'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Flame, Search, Trophy, UserPlus, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { getCurrentProfile, getFollowCounts, getProfiles, getRankings, toggleFollow } from '@/lib/data'
import type { UserProfile } from '@/lib/types'

type Person = UserProfile & { followers?: number; following?: boolean }
type Ranking = { profile: UserProfile; booksRead: number; pagesRead: number; streak: number }

export default function CommunityPage() {
  const [me, setMe] = useState<UserProfile | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getCurrentProfile(), getProfiles(), getRankings()]).then(async ([current, profiles, ranking]) => {
      if (!active) return
      setMe(current)
      const shuffled = [...profiles].sort(() => Math.random() - 0.5)
      const enriched = await Promise.all(shuffled.map(async (profile) => {
        const counts = await getFollowCounts(profile.id, current?.id)
        return { ...profile, followers: counts.followers, following: counts.isFollowing }
      }))
      if (active) { setPeople(enriched); setRankings(ranking as Ranking[]) }
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar a comunidade.')).finally(() => setLoading(false))
    return () => { active = false }
  }, [])

  const visible = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('pt-BR').replace(/^@/, '')
    return people.filter((person) => !value || `${person.display_name} ${person.nickname} ${person.public_id}`.toLocaleLowerCase('pt-BR').includes(value))
  }, [people, query])

  async function follow(person: Person) {
    if (!me) { window.location.href = '/auth/login'; return }
    await toggleFollow(me.id, person.id, Boolean(person.following))
    setPeople((items) => items.map((item) => item.id === person.id ? { ...item, following: !item.following, followers: Math.max(0, Number(item.followers || 0) + (item.following ? -1 : 1)) } : item))
  }

  return <AppShell name={me?.nickname || me?.display_name} avatarUrl={me?.avatar_url}>
    <section className="px-5 pb-14 sm:px-8 lg:px-10">
      <header className="border-b border-line pb-7"><p className="eyebrow">Leitores do Readr</p><h1 className="mt-2 font-serif text-5xl">Comunidade</h1><p className="mt-3 text-sm text-muted">Encontre pessoas por nome, apelido ou ID público e acompanhe suas leituras.</p></header>
      <label className="relative mt-6 block max-w-2xl"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} /><input className="field !pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, @apelido ou ID de 8 dígitos" /></label>
      {error && <p className="mt-5 rounded-xl bg-coral/10 p-4 text-sm text-coral">{error}</p>}
      <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
        <section><div className="mb-5 flex items-center gap-2"><Users size={18} /><h2 className="font-serif text-3xl">Descobrir pessoas</h2></div><div className="grid gap-3 sm:grid-cols-2">{loading ? Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-black/5" />) : visible.map((person) => <article key={person.id} className="panel flex items-center gap-4 p-4"><Link href={`/profile/${person.id}`} className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-ink font-semibold text-white">{person.avatar_url ? <img src={person.avatar_url} alt="" className="size-full object-cover" /> : (person.nickname || person.display_name || '?').charAt(0).toUpperCase()}</Link><div className="min-w-0 flex-1"><Link href={`/profile/${person.id}`} className="truncate text-sm font-semibold hover:underline">@{person.nickname || 'leitor'}</Link><p className="mt-1 text-[10px] text-muted">ID {person.public_id || '--------'} · {person.followers || 0} seguidores</p></div>{me?.id !== person.id && <button onClick={() => follow(person)} className={`grid size-9 place-items-center rounded-full ${person.following ? 'bg-coral text-white' : 'border border-line bg-white/60'}`} aria-label={person.following ? 'Deixar de seguir' : 'Seguir'}><UserPlus size={15} /></button>}</article>)}</div></section>
        <aside className="panel h-fit p-5"><div className="mb-5 flex items-center gap-2"><Trophy className="text-coral" size={18} /><h2 className="font-serif text-2xl">Ranking de leitores</h2></div><div className="space-y-2">{rankings.slice(0, 10).map((item, index) => <Link href={`/profile/${item.profile.id}`} key={item.profile.id} className="flex items-center gap-3 rounded-xl bg-white/45 p-3 hover:bg-white"><span className="grid size-7 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">@{item.profile.nickname || item.profile.display_name}</p><p className="mt-1 flex gap-3 text-[9px] text-muted"><span className="flex items-center gap-1"><BookOpen size={10} />{item.booksRead} livros</span><span>{item.pagesRead} páginas</span><span className="flex items-center gap-1"><Flame size={10} />{item.streak}</span></p></div></Link>)}</div></aside>
      </section>
    </section>
  </AppShell>
}
