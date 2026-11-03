'use client'

import { useTranslations } from 'next-intl'
import type { ReaderTheme } from '@/lib/types'
import { useReaderStore } from '@/store/readerStore'

const themes: { value: ReaderTheme; color: string }[] = [
  { value: 'light', color: '#ffffff' },
  { value: 'cream', color: '#f2ece1' },
  { value: 'sepia', color: '#f4ecd8' },
  { value: 'gray', color: '#1e1e1e' },
  { value: 'dark', color: '#1a1a1a' },
  { value: 'black', color: '#000000' },
]

export function ThemeSwitcher() {
  const t = useTranslations('reader')
  const { theme, setTheme } = useReaderStore()
  return <div className="flex items-center gap-2">{themes.map((item) => <button key={item.value} onClick={() => setTheme(item.value)} title={t(item.value)} aria-label={t(item.value)} className={`size-6 rounded-full border-2 shadow-sm ${theme === item.value ? 'border-coral' : 'border-white'}`} style={{ background: item.color }} />)}</div>
}
