'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type AppTheme = 'light' | 'dark'

const AppThemeContext = createContext<{
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
}>({ theme: 'light', setTheme: () => undefined, toggleTheme: () => undefined })

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('light')

  useEffect(() => {
    const saved = localStorage.getItem('readr-app-theme')
    const initial = saved === 'dark' || saved === 'light'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setThemeState(initial)
    document.documentElement.dataset.theme = initial
  }, [])

  const setTheme = useCallback((next: AppTheme) => {
    localStorage.setItem('readr-app-theme', next)
    document.documentElement.dataset.theme = next
    setThemeState(next)
  }, [])
  const toggleTheme = useCallback(() => setTheme(theme === 'light' ? 'dark' : 'light'), [setTheme, theme])
  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function useAppTheme() {
  return useContext(AppThemeContext)
}
