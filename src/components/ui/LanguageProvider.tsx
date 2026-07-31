'use client'

import { NextIntlClientProvider } from 'next-intl'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import pt from '@/messages/pt.json'
import en from '@/messages/en.json'
import es from '@/messages/es.json'

export type AppLanguage = 'pt' | 'en' | 'es'

const catalogs = { pt, en, es }
const LanguageContext = createContext<{
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}>({ language: 'pt', setLanguage: () => undefined })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('pt')

  useEffect(() => {
    const saved = localStorage.getItem('readr-language')
    if (saved === 'pt' || saved === 'en' || saved === 'es') setLanguageState(saved)
  }, [])

  const setLanguage = useCallback((next: AppLanguage) => {
    localStorage.setItem('readr-language', next)
    setLanguageState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : language
  }, [language])

  const context = useMemo(() => ({ language, setLanguage }), [language, setLanguage])

  return (
    <LanguageContext.Provider value={context}>
      <NextIntlClientProvider locale={language} messages={catalogs[language]} timeZone="America/Sao_Paulo">
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
