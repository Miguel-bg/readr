import Link from 'next/link'
import { BookOpen, Bookmark, ChevronLeft, ChevronRight, MoreHorizontal, Type } from 'lucide-react'
import type { ContinueReadingData } from '@/lib/data'

function textFromHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function ContinueReadingHero({ reading }: { reading: ContinueReadingData | null }) {
  if (!reading) {
    return (
      <article className="relative grid min-h-[320px] place-items-center rounded-xl border border-dashed border-ink/15 bg-white/40 p-8 text-center shadow-soft">
        <div><span className="mx-auto grid size-12 place-items-center rounded-full bg-white"><BookOpen size={20} /></span><h2 className="mt-4 font-serif text-2xl">Sua próxima página começa aqui</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted">Importe um arquivo ou abra um livro da comunidade. Seu progresso aparecerá aqui automaticamente.</p><Link href="/library/community" className="secondary-btn mt-5 !min-h-10">Descobrir livros</Link></div>
      </article>
    )
  }

  const { book, progress, chapterTitle, pageHtml } = reading
  const text = textFromHtml(pageHtml)
  const middle = Math.max(1, Math.floor(text.length / 2))
  const first = text.slice(0, middle)
  const second = text.slice(middle)
  const current = Math.min(progress.current_page + 1, book.total_pages)
  const percentage = Math.min(100, Math.max(0, Math.round(Number(progress.percent))))

  return (
    <article className="relative flex min-h-[320px] flex-col rounded-xl bg-white/55 p-4 shadow-soft sm:p-5">
      <header className="mb-4 flex items-center justify-between text-[9px]">
        <span className="flex items-center gap-1"><ChevronLeft size={12} /> Continuar</span>
        <span className="min-w-0 px-2 text-center"><span className="block truncate text-[7px] text-muted">{book.title}</span><strong className="block truncate">{chapterTitle}</strong></span>
        <span className="flex gap-3"><Type size={13} /><MoreHorizontal size={13} /><Bookmark size={13} /></span>
      </header>
      <Link href={`/book/${book.id}?source=${book.source}&from=${encodeURIComponent('/')}`} prefetch className="hero-book relative flex flex-1 items-stretch px-4 sm:px-6" aria-label={`Continuar lendo ${book.title}`}>
        <span className="absolute -left-1 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-white/75"><ChevronLeft size={18} /></span>
        <section className="relative flex-1 overflow-hidden rounded-l-md bg-[#eee7d8] px-[8%] py-5 font-serif text-[10px] leading-[1.5] text-[#302d27] shadow-[inset_-14px_0_24px_rgba(78,61,38,.09)] sm:text-[12px]"><p className="line-clamp-[8] text-justify">{first}</p></section>
        <section className="relative flex-1 overflow-hidden rounded-r-md bg-[#eee7d8] px-[8%] py-5 font-serif text-[10px] leading-[1.5] text-[#302d27] shadow-[inset_14px_0_24px_rgba(78,61,38,.09)] sm:text-[12px]"><p className="line-clamp-[8] text-justify">{second}</p></section>
        <span className="absolute -right-1 top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-white/75"><ChevronRight size={18} /></span>
      </Link>
      <footer className="mt-3 grid grid-cols-[1fr_auto_auto] items-center gap-4 px-8 text-[8px] text-muted">
        <span className="h-1 overflow-hidden rounded-full bg-black/10"><span className="block h-full rounded-full bg-ink" style={{ width: `${percentage}%` }} /></span>
        <span>{current} / {book.total_pages}</span><span>{percentage}%</span>
      </footer>
    </article>
  )
}
