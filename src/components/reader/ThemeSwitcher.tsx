'use client'

import type { ReaderTheme } from '@/lib/types'
import { useReaderStore } from '@/store/readerStore'

const themes: { value: ReaderTheme; color: string; label: string }[] = [
  { value: 'light', color: '#f8f3e8', label: 'Claro' },
  { value: 'sepia', color: '#e8d5ae', label: 'Sépia' },
  { value: 'dark', color: '#242526', label: 'Escuro' },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useReaderStore()
  return <div className="flex items-center gap-2">{themes.map((item) => <button key={item.value} onClick={() => setTheme(item.value)} title={item.label} aria-label={`Tema ${item.label}`} className={`size-6 rounded-full border-2 shadow-sm ${theme === item.value ? 'border-coral' : 'border-white'}`} style={{ background: item.color }} />)}</div>
}
