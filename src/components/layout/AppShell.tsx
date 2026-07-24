'use client'

import { useProfile } from '@/components/auth/ProfileProvider'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell({ children, name, avatarUrl }: { children: React.ReactNode; name?: string; avatarUrl?: string | null }) {
  const { profile } = useProfile()
  return (
    <section className="app-window relative overflow-hidden">
      <Sidebar />
      <section className="lg:ml-[108px]">
        <Header name={name ?? profile?.display_name} avatarUrl={avatarUrl ?? profile?.avatar_url} />
        <main>{children}</main>
      </section>
    </section>
  )
}
