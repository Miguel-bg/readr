'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bookmark, BookOpen, ChevronLeft, Columns2, Highlighter, List, Minus, MoreHorizontal, Plus, Search, Settings2, Sun, Type } from 'lucide-react'
import { useReaderStore, type ReaderAnimation } from '@/store/readerStore'
import { getCurrentProfile, toggleBookmark } from '@/lib/data'
import type { BookSource } from '@/lib/types'

export function ReaderToolbar({ title, chapter, bookId, source, currentPage, onSearch }: { title: string; chapter: string; bookId: string; source: BookSource; currentPage: number; onSearch: (query: string) => void }) {
  const store = useReaderStore()
  const [options, setOptions] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  async function bookmark() {
    const profile = await getCurrentProfile()
    if (!profile) { window.location.href = '/auth/login'; return }
    setSaved(await toggleBookmark(profile.id, bookId, source, currentPage))
  }

  return <header className="relative flex min-h-[72px] items-center justify-between gap-3 border-b border-black/5 px-3 sm:px-7">
    <Link href={`/book/${bookId}/details?source=${source}`} className="flex items-center gap-2 text-xs"><ChevronLeft size={17} /> <span className="hidden sm:inline">Voltar</span></Link>
    <div className="min-w-0 flex-1 text-center"><p className="truncate text-[9px] text-muted">{title}</p><h1 className="truncate text-xs font-semibold">{chapter}</h1></div>
    <div className="flex items-center gap-0.5">
      <button onClick={() => setSearchOpen((value) => !value)} className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Pesquisar no livro"><Search size={16} /></button>
      <button onClick={() => store.setShowChapters(!store.showChapters)} className="hidden size-9 place-items-center rounded-full hover:bg-black/5 sm:grid" aria-label="Capítulos"><List size={16} /></button>
      <button onClick={() => store.setFontSize(Math.max(13, store.fontSize - 1))} className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Diminuir fonte"><Minus size={14} /></button>
      <button onClick={() => store.setFontFamily(store.fontFamily === 'serif' ? 'sans' : 'serif')} className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Alternar fonte"><Type size={17} /></button>
      <button onClick={() => store.setFontSize(Math.min(26, store.fontSize + 1))} className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Aumentar fonte"><Plus size={14} /></button>
      <button onClick={() => setOptions((value) => !value)} className="hidden size-9 place-items-center rounded-full hover:bg-black/5 sm:grid" aria-label="Mais opções"><MoreHorizontal size={17} /></button>
      <button onClick={bookmark} className={`grid size-9 place-items-center rounded-full hover:bg-black/5 ${saved ? 'text-coral' : ''}`} aria-label="Salvar página"><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button>
    </div>
    {searchOpen && <form onSubmit={(event) => { event.preventDefault(); onSearch(store.searchQuery) }} className="absolute left-1/2 top-[62px] z-30 flex w-[min(92vw,480px)] -translate-x-1/2 gap-2 rounded-2xl border border-line bg-surface p-3 shadow-panel"><input autoFocus className="field !py-2" value={store.searchQuery} onChange={(event) => store.setSearchQuery(event.target.value)} placeholder="Pesquisar uma palavra ou frase" /><button className="primary-btn !min-h-9 !px-4">Buscar</button></form>}
    {options && <aside className="absolute right-4 top-[64px] z-30 w-[min(92vw,340px)] rounded-2xl border border-line bg-surface p-5 shadow-panel">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Settings2 size={16} /> Opções de leitura</h2>
      <Control icon={Sun} label={`Brilho ${store.brightness}%`}><input className="w-full" type="range" min="35" max="120" value={store.brightness} onChange={(event) => store.setBrightness(Number(event.target.value))} /></Control>
      <Control icon={Columns2} label={`Margem ${store.margin}px`}><input className="w-full" type="range" min="16" max="72" value={store.margin} onChange={(event) => store.setMargin(Number(event.target.value))} /></Control>
      <Control icon={BookOpen} label={`Espaço entre páginas ${store.pageGap}px`}><input className="w-full" type="range" min="0" max="24" value={store.pageGap} onChange={(event) => store.setPageGap(Number(event.target.value))} /></Control>
      <div className="mt-4 grid grid-cols-2 gap-2"><Select label="Visualização" value={store.viewMode} onChange={store.setViewMode} options={[["pages","Páginas"],["scroll","Rolagem"]]} /><Select label="Qualidade" value={store.renderQuality} onChange={store.setRenderQuality} options={[["standard","Normal"],["high","Alta"]]} /><Select label="Animação" value={store.animation} onChange={(value) => store.setAnimation(value as ReaderAnimation)} options={[["real-page","Página real"],["apple","Apple style"],["horizontal","Horizontal"],["vertical","Vertical"],["fade","Fade"],["shift-horizontal","Shift H"],["shift-vertical","Shift V"]]} /><Select label="Engine" value={store.engine} onChange={store.setEngine} options={[["normal","Normal"],["opengl","OpenGL"]]} /></div>
      <div className="mt-4 grid grid-cols-2 gap-2"><Toggle active={store.textReflow} onClick={() => store.setTextReflow(!store.textReflow)} icon={Type} label="Text reflow" /><Toggle active={store.showThumbnails} onClick={() => store.setShowThumbnails(!store.showThumbnails)} icon={Columns2} label="Miniaturas" /><Toggle active={store.showAnnotations} onClick={() => store.setShowAnnotations(!store.showAnnotations)} icon={Highlighter} label="Anotações" /><Toggle active={store.showChapters} onClick={() => store.setShowChapters(!store.showChapters)} icon={List} label="Capítulos" /></div>
    </aside>}
  </header>
}

function Control({ icon: Icon, label, children }: { icon: typeof Sun; label: string; children: React.ReactNode }) { return <label className="mt-4 grid grid-cols-[22px_1fr] items-center gap-2 text-[10px]"><Icon size={14} /><span>{label}</span><span /><span>{children}</span></label> }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: any) => void; options: string[][] }) { return <label className="text-[9px] text-muted">{label}<select className="field mt-1 !px-2 !py-2 text-[10px] text-ink" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label> }
function Toggle({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Type; label: string }) { return <button onClick={onClick} className={`flex items-center gap-2 rounded-xl border p-2 text-[10px] ${active ? 'border-coral bg-coral/10 text-coral' : 'border-line'}`}><Icon size={13} />{label}</button> }
