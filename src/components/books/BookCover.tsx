import type { Book } from '@/lib/types'

export function BookCover({ book, className = '' }: { book: Book; className?: string }) {
  return (
    <div className={`book-cover ${className}`} aria-label={`Capa de ${book.title}`}>
      {book.cover_url ? (
        <img src={book.cover_url} alt={`Capa de ${book.title}`} loading="lazy" />
      ) : (
        <div className="book-cover-fallback">
          <span>{book.format === 'readr' ? 'Readr' : book.format}</span>
          <strong>{book.title}</strong>
          {book.author && <small>{book.author}</small>}
        </div>
      )}
    </div>
  )
}
