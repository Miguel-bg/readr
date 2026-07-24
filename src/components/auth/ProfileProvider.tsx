'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentProfile } from '@/lib/data'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types'

interface ProfileContextValue { profile: UserProfile | null; loading: boolean; error: string }
const ProfileContext = createContext<ProfileContextValue>({ profile: null, loading: true, error: '' })

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<ProfileContextValue>({ profile: null, loading: true, error: '' })
  useEffect(() => {
    let active = true
    const load = () => getCurrentProfile()
      .then((profile) => { if (active) setValue({ profile, loading: false, error: '' }) })
      .catch((cause) => { if (active) setValue({ profile: null, loading: false, error: cause instanceof Error ? cause.message : 'Não foi possível carregar o perfil.' }) })
    load()
    const { data: listener } = createClient().auth.onAuthStateChange(() => { setValue((current) => ({ ...current, loading: true })); load() })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() { return useContext(ProfileContext) }
