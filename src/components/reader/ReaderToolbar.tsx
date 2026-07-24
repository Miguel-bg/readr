'use client'

import Link from 'next/link'
import { Bookmark, ChevronLeft, MoreHorizontal, Minus, Plus, Type } from 'lucide-react'
import { useReaderStore } from '@/store/readerStore'

export function ReaderToolbar({ title, chapter }: { title: string; chapter: string }) {
  const { fontSize, setFontSize, fontFamily, setFontFamily } = useReaderStore()
  return (
    <header className="flex min-h-[72px] items-center justify-between gap-4 border-b border-black/5 px-4 sm:px-7">
      <Link href="/" className="flex items-center gap-2 text-xs"><ChevronLeft size={17} /> <span className="hidden sm:inline">Voltar</span></Link>
      <div className="min-w-0 text-center"><p className="truncate text-[9px] text-muted">{title}</p><h1 className="truncate text-xs font-semibold">{chapter}</h1></div>
      <div className="flex items-center gap-1">
        <button onClick={() => setFontSize(Math.max(13, fontSize - 1))} className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Diminuir fonte"><Minus size={14} /></button>
        <button onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')} className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Alternar fonte"><Type size={17} /></button>
        <button onClick={() => setFontSize(Math.min(24, fontSize + 1))} className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Aumentar fonte"><Plus size={14} /></button>
        <button className="hidden size-9 place-items-center rounded-full hover:bg-black/5 sm:grid" aria-label="Mais opções"><MoreHorizontal size={17} /></button>
        <button className="grid size-9 place-items-center rounded-full hover:bg-black/5" aria-label="Salvar página"><Bookmark size={17} /></button>
      </div>
    </header>
  )
}
