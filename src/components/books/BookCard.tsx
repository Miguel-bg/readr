import Link from 'next/link'
import { Eye, Pencil } from 'lucide-react'
import type { Book } from '@/lib/types'
import { BookCover } from './BookCover'

export function BookCard({ book, canEdit = false }: { book: Book; canEdit?: boolean }) {
  const readHref = `/book/${book.id}?source=${book.source}`
  return (
    <article className="group min-w-0">
      <div className="relative">
        <Link href={readHref} prefetch aria-label={`Ler ${book.title}`}><BookCover book={book} /></Link>
        {canEdit && book.source === 'created' && <Link href={`/book/${book.id}/edit`} prefetch aria-label={`Editar ${book.title}`} className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black"><Pencil size={13} /></Link>}
        <span className="absolute bottom-1.5 left-1.5 z-10 rounded bg-black/65 px-1.5 py-0.5 text-[7px] font-semibold uppercase text-white">{book.format}</span>
      </div>
      <Link href={readHref} prefetch className="mt-2 block">
        <h3 className="line-clamp-2 text-[11px] font-semibold leading-[1.35] group-hover:underline">{book.title}</h3>
        {book.author && <p className="mt-1 line-clamp-1 text-[9px] text-muted">{book.author}</p>}
        {typeof book.reads_count === 'number' && <p className="mt-1 flex items-center gap-1 text-[8px] text-coral"><Eye size={10} /> {book.reads_count} leituras</p>}
      </Link>
    </article>
  )
}
