'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bookmark, ChevronLeft, List, Minus, Plus, Search, Settings2, Type } from 'lucide-react'
import { useReaderStore } from '@/store/readerStore'
import type { ReaderBookmark } from '@/lib/types'
import { ReaderPreferences } from './ReaderPreferences'

interface ReaderToolbarProps {
  title: string
  chapter: string
  currentPage: number
  bookmarks: ReaderBookmark[]
  bookmarked: boolean
  onClose: () => void
  onSearch: (query: string) => void
  onToggleBookmark: () => void
  onNavigateBookmark: (bookmark: ReaderBookmark) => void
}

export function ReaderToolbar({ title, chapter, currentPage, bookmarks, bookmarked, onClose, onSearch, onToggleBookmark, onNavigateBookmark }: ReaderToolbarProps) {
  const t = useTranslations('reader')
  const store = useReaderStore()
  const [options, setOptions] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return <header className="reader-toolbar">
    <button onClick={onClose} className="reader-icon-button" aria-label={t('closeReader')}><ChevronLeft size={19} /></button>
    <div className="reader-toolbar-title"><p>{title}</p><h1>{chapter}</h1></div>
    <nav className="reader-toolbar-actions" aria-label={t('readerTools')}>
      <ToolbarButton label={t('search')} onClick={() => setSearchOpen((value) => !value)} icon={Search} />
      <ToolbarButton label={t('chapters')} onClick={() => store.setShowChapters(!store.showChapters)} icon={List} desktop />
      <ToolbarButton label={t('fontDecrease')} onClick={() => store.setFontSize(Math.max(13, store.fontSize - 1))} icon={Minus} />
      <ToolbarButton label={t('fonts')} onClick={() => setOptions((value) => !value)} icon={Type} />
      <ToolbarButton label={t('fontIncrease')} onClick={() => store.setFontSize(Math.min(28, store.fontSize + 1))} icon={Plus} />
      <button onClick={onToggleBookmark} className={`reader-icon-button ${bookmarked ? 'is-active' : ''}`} aria-label={bookmarked ? t('removeBookmark') : t('savePage')}><Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} /></button>
    </nav>

    {searchOpen && <form onSubmit={(event) => { event.preventDefault(); onSearch(store.searchQuery) }} className="reader-popover reader-search-popover"><input autoFocus className="field !py-2" value={store.searchQuery} onChange={(event) => store.setSearchQuery(event.target.value)} placeholder={t('searchPlaceholder')} /><button className="primary-btn !min-h-9 !px-4">{t('search')}</button></form>}

    {options && <aside className="reader-popover reader-options-popover shadow-xl border border-current/10 rounded-xl bg-background">
      <h2 className="reader-options-heading border-b border-current/10 pb-3 mb-2 flex items-center gap-2 font-bold"><Settings2 size={16} /> {t('readingOptions')}</h2>
      <ReaderPreferences />
    </aside>}
  </header>
}

function ToolbarButton({ label, onClick, icon: Icon, desktop = false }: { label: string; onClick: () => void; icon: typeof Search; desktop?: boolean }) {
  return <button onClick={onClick} className={`reader-icon-button ${desktop ? 'reader-desktop-tool' : ''}`} aria-label={label}><Icon size={17} /></button>
}
