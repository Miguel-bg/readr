import Link from 'next/link'
import { Eye, Pencil } from 'lucide-react'
import type { Book } from '@/lib/types'
import { BookCover } from './BookCover'

export function BookCard({ book, canEdit = false }: { book: Book; canEdit?: boolean }) {
  const readHref = `/book/${book.id}?source=${book.source}`
  return (
    <article className="book-card group min-w-0">
      <div className="relative">
        <Link href={readHref} prefetch aria-label={`Ler ${book.title}`} className="block"><BookCover book={book} /></Link>
        {canEdit && book.source === 'created' && (
          <Link href={`/book/${book.id}/edit`} prefetch aria-label={`Editar ${book.title}`} className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-black/65 text-white shadow-sm backdrop-blur transition hover:bg-black"><Pencil size={14} /></Link>
        )}
      </div>
      <Link href={readHref} prefetch className="mt-3 block">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.35] group-hover:underline">{book.title}</h3>
        <p className="mt-1 line-clamp-1 text-[11px] text-muted">{book.author || 'Autor não informado'}</p>
        {typeof book.reads_count === 'number' && <p className="mt-1.5 flex items-center gap-1 text-[10px] text-coral"><Eye size={11} /> {book.reads_count} leituras</p>}
      </Link>
    </article>
  )
}
