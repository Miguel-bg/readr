'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bookmark, BookOpen, ChevronLeft, Columns2, Gauge, List, Minus, MoreHorizontal, Plus, Search, Settings2, Sun, Type } from 'lucide-react'
import { useReaderStore, type ReaderAnimation } from '@/store/readerStore'
import type { ReaderBookmark } from '@/lib/types'

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

  return <header className="relative flex min-h-[72px] items-center justify-between gap-3 border-b border-black/5 px-3 sm:px-7">
    <button onClick={onClose} className="flex items-center gap-2 text-xs" aria-label={t('closeReader')}><ChevronLeft size={17} /> <span className="hidden sm:inline">{t('back')}</span></button>
    <div className="min-w-0 flex-1 text-center"><p className="truncate text-[9px] opacity-60">{title}</p><h1 className="truncate text-xs font-semibold">{chapter}</h1></div>
    <div className="flex items-center gap-0.5">
      <ToolbarButton label={t('search')} onClick={() => setSearchOpen((value) => !value)} icon={Search} />
      <ToolbarButton label={t('chapters')} onClick={() => store.setShowChapters(!store.showChapters)} icon={List} desktop />
      <ToolbarButton label={t('fontDecrease')} onClick={() => store.setFontSize(Math.max(13, store.fontSize - 1))} icon={Minus} />
      <ToolbarButton label={t('toggleFont')} onClick={() => store.setFontFamily(store.fontFamily === 'serif' ? 'sans' : 'serif')} icon={Type} />
      <ToolbarButton label={t('fontIncrease')} onClick={() => store.setFontSize(Math.min(28, store.fontSize + 1))} icon={Plus} />
      <ToolbarButton label={t('readingOptions')} onClick={() => setOptions((value) => !value)} icon={MoreHorizontal} desktop />
      <button onClick={onToggleBookmark} className={`grid size-9 place-items-center rounded-full hover:bg-black/5 ${bookmarked ? 'text-coral' : ''}`} aria-label={bookmarked ? t('removeBookmark') : t('savePage')}><Bookmark size={17} fill={bookmarked ? 'currentColor' : 'none'} /></button>
    </div>

    {searchOpen && <form onSubmit={(event) => { event.preventDefault(); onSearch(store.searchQuery) }} className="reader-popover reader-search-popover"><input autoFocus className="field !py-2" value={store.searchQuery} onChange={(event) => store.setSearchQuery(event.target.value)} placeholder={t('searchPlaceholder')} /><button className="primary-btn !min-h-9 !px-4">{t('search')}</button></form>}

    {options && <aside className="reader-popover reader-options-popover">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Settings2 size={16} /> {t('readingOptions')}</h2>
      <div className="reader-mobile-brightness"><Control icon={Sun} label={`${t('brightness')} ${store.brightness}%`}><input className="w-full" type="range" min="45" max="115" value={store.brightness} onChange={(event) => store.setBrightness(Number(event.target.value))} /></Control></div>
      <Control icon={Columns2} label={`${t('margin')} ${store.margin}px`}><input className="w-full" type="range" min="18" max="70" value={store.margin} onChange={(event) => store.setMargin(Number(event.target.value))} /></Control>
      <Control icon={Type} label={`${t('lineSpacing')} ${store.lineSpacing.toFixed(1)}`}><input className="w-full" type="range" min="1.3" max="2.1" step="0.1" value={store.lineSpacing} onChange={(event) => store.setLineSpacing(Number(event.target.value))} /></Control>
      <Control icon={BookOpen} label={`${t('pageGap')} ${store.pageGap}px`}><input className="w-full" type="range" min="8" max="32" value={store.pageGap} onChange={(event) => store.setPageGap(Number(event.target.value))} /></Control>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Select label={t('view')} value={store.viewMode} onChange={store.setViewMode} options={[["pages",t('pages')],["scroll",t('scroll')]]} />
        <Select label={t('quality')} value={store.renderQuality} onChange={store.setRenderQuality} options={[["battery",t('battery')],["smooth",t('smooth')]]} />
        <Select label={t('animation')} value={store.animation} onChange={(value) => store.setAnimation(value as ReaderAnimation)} options={[["real-page",t('pageCurl')],["slide",t('slide')],["fade",t('fade')]]} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Toggle active={store.showThumbnails} onClick={() => store.setShowThumbnails(!store.showThumbnails)} icon={Columns2} label={t('thumbnails')} />
        <Toggle active={store.showChapters} onClick={() => store.setShowChapters(!store.showChapters)} icon={List} label={t('chapters')} />
        <Toggle active={store.showBookmarks} onClick={() => store.setShowBookmarks(!store.showBookmarks)} icon={Bookmark} label={`${t('bookmarks')} (${bookmarks.length})`} />
      </div>
      {store.showBookmarks && <div className="mt-4 max-h-40 space-y-1 overflow-auto border-t border-black/10 pt-3">{bookmarks.length ? bookmarks.map((item) => <button key={item.id} onClick={() => onNavigateBookmark(item)} className={`w-full rounded-lg px-3 py-2 text-left text-[10px] hover:bg-black/5 ${item.page_number === currentPage ? 'bg-black/5 font-semibold' : ''}`}>{t('bookmarks')} · {item.page_number + 1}</button>) : <p className="py-3 text-center text-[10px] opacity-60">{t('noBookmarks')}</p>}</div>}
    </aside>}
  </header>
}

function ToolbarButton({ label, onClick, icon: Icon, desktop = false }: { label: string; onClick: () => void; icon: typeof Search; desktop?: boolean }) { return <button onClick={onClick} className={`${desktop ? 'hidden sm:grid' : 'grid'} size-9 place-items-center rounded-full hover:bg-black/5`} aria-label={label}><Icon size={16} /></button> }
function Control({ icon: Icon, label, children }: { icon: typeof Sun; label: string; children: React.ReactNode }) { return <label className="mt-4 grid grid-cols-[22px_1fr] items-center gap-2 text-[10px]"><Icon size={14} /><span>{label}</span><span /><span>{children}</span></label> }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: any) => void; options: string[][] }) { return <label className="text-[9px] opacity-65">{label}<select className="field mt-1 !px-2 !py-2 text-[10px] text-ink" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label> }
function Toggle({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Type; label: string }) { return <button onClick={onClick} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[9px] ${active ? 'border-coral bg-coral/10 text-coral' : 'border-line'}`}><Icon size={14} />{label}</button> }
