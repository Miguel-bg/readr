'use client'

import Link from 'next/link'
import { Eye, Settings2, Star } from 'lucide-react'
import type { Book } from '@/lib/types'
import { isGloballyPopular } from '@/lib/popularity'
import { BookCover } from './BookCover'

export function BookCard({ book, canEdit = false, from = '/' }: { book: Book; canEdit?: boolean; from?: string }) {
  const detailsHref = `/book/${book.id}/details?source=${book.source}&from=${encodeURIComponent(from)}`
  const editHref = book.source === 'created' ? `/book/${book.id}/edit` : `/book/${book.id}/manage?source=imported`
  const reads = Number(book.reads_count || 0)
  return (
    <article className="book-card group min-w-0">
      <div className="relative">
        <Link href={detailsHref} prefetch aria-label={`Ver detalhes de ${book.title}`} className="block"><BookCover book={book} /></Link>
        {canEdit && <Link href={editHref} prefetch aria-label={`Configurar ${book.title}`} className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur transition hover:bg-black"><Settings2 size={14} /></Link>}
        {book.shelf_status && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[8px] font-bold uppercase shadow-sm">{book.shelf_status === 'reading' ? 'Lendo' : book.shelf_status === 'completed' ? 'Concluído' : 'Quero ler'}</span>}
      </div>
      <Link href={detailsHref} prefetch className="mt-3 block">
        <div className="flex items-start gap-2"><h3 className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-[1.35] group-hover:underline">{book.title}</h3><span className={`mt-0.5 flex shrink-0 items-center gap-1 text-[10px] ${isGloballyPopular(reads) ? 'font-bold text-coral' : reads > 0 ? 'text-ink' : 'text-ink/25'}`} title={reads > 0 ? `${reads} leitores` : 'Nenhum leitor ainda'}><Eye size={13} fill={reads > 0 ? 'currentColor' : 'none'} />{reads > 0 ? reads : null}</span></div>
        <p className="mt-1 line-clamp-1 text-[11px] text-muted">{book.author || 'Autor não informado'}</p>
        {Number(book.average_rating || 0) > 0 && <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600"><Star size={11} fill="currentColor" /> {Number(book.average_rating).toFixed(1)} <span className="text-muted">({book.reviews_count || 0})</span></p>}
      </Link>
    </article>
  )
}
