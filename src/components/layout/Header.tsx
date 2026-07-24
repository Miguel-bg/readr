'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Bell, Search, UserRound } from 'lucide-react'

export function Header({ name, avatarUrl }: { name?: string; avatarUrl?: string | null }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  function search(event: FormEvent) {
    event.preventDefault()
    const value = query.trim()
    router.push(value ? `/library?query=${encodeURIComponent(value)}` : '/library')
  }
  return (
    <header className="flex h-[92px] items-center justify-between gap-4 px-5 sm:px-8 lg:h-[105px] lg:px-11">
      <form onSubmit={search} className="relative flex max-w-[510px] flex-1 items-center" role="search">
        <Search className="absolute left-0 text-ink" size={18} strokeWidth={1.7} />
        <input id="search-input" value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent py-3 pl-8 pr-3 text-xs outline-none placeholder:text-muted" placeholder="Buscar por livro ou autor..." aria-label="Buscar livros" />
      </form>
      <Link href={name ? '/profile' : '/auth/login'} prefetch className="flex items-center gap-3">
        <span className="grid size-9 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#ead4b0] to-[#273b34] text-sm font-semibold text-white">
          {avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${name || 'usuário'}`} className="size-full object-cover" /> : name ? name.charAt(0).toUpperCase() : <UserRound size={16} />}
        </span>
        <span className="hidden text-sm font-medium md:block">{name || 'Entrar'}</span>
        {name && <Bell className="ml-1" size={19} strokeWidth={1.6} />}
      </Link>
    </header>
  )
}
