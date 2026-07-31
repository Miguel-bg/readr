'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Compass, Home, Library, Menu, Settings, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

const items = [
  { href: '/', label: 'home', icon: Home, exact: true },
  { href: '/library', label: 'shelf', icon: Library, exact: true },
  { href: '/library/created', label: 'created', icon: BookOpen },
  { href: '/library/community', label: 'library', icon: Compass },
  { href: '/community', label: 'community', icon: Users },
  { href: '/settings', label: 'settings', icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const t = useTranslations('common')
  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 flex h-[68px] items-center justify-around border-t border-line bg-surface/95 backdrop-blur lg:absolute lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[108px] lg:flex-col lg:justify-start lg:border-r lg:border-t-0 lg:bg-transparent lg:py-7">
      <Link href="/" prefetch className="hidden font-serif text-[25px] font-bold tracking-[-.08em] lg:block" aria-label="Readr">Readr</Link>
      <nav className="flex w-full items-center justify-around lg:mt-28 lg:flex-col lg:gap-4" aria-label="Navegação principal">
        {items.map((item) => {
          const { href, label, icon: Icon } = item
          const active = 'exact' in item && item.exact ? pathname === href : pathname.startsWith(href)
          return <Link key={href} href={href} prefetch aria-label={t(label)} title={t(label)} className={`grid size-11 place-items-center rounded-full transition-colors duration-150 ${active ? 'bg-coral text-white shadow-[0_8px_20px_rgba(216,93,91,.28)]' : 'text-ink hover:bg-white'}`}><Icon size={20} strokeWidth={1.7} /></Link>
        })}
      </nav>
      <button className="mt-auto hidden size-11 place-items-center rounded-full hover:bg-white lg:grid" aria-label="Abrir menu"><Menu size={20} /></button>
    </aside>
  )
}
