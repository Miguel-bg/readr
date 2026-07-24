import type { CSSProperties } from 'react'
import type { Book } from '@/lib/types'

const palettes = [
  ['#191c2b', '#8d3e52', '#eabf8b'], ['#0f2d2b', '#376c63', '#e8cf9b'],
  ['#432332', '#b55f52', '#f1c994'], ['#17253d', '#41658a', '#d7a96e'],
  ['#322a24', '#8b7559', '#e9dfc5'], ['#322048', '#805ca8', '#e7bb88'],
  ['#16303d', '#297b88', '#e5d29c'], ['#3b1c16', '#a84e2c', '#f0b964'],
]

function hash(value: string) {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

export function BookCover({ book, className = '' }: { book: Book; className?: string }) {
  if (book.cover_url) return <div className={`book-cover ${className}`}><img src={book.cover_url} alt={`Capa de ${book.title}`} className="size-full object-cover" /></div>

  const seed = hash(`${book.id}:${book.title}`)
  const palette = palettes[seed % palettes.length]
  const variant = seed % 8
  const style = {
    '--cover-a': palette[0], '--cover-b': palette[1], '--cover-c': palette[2],
    '--shape-x': `${18 + (seed % 63)}%`, '--shape-y': `${24 + ((seed >> 4) % 53)}%`,
    '--cover-angle': `${105 + (seed % 95)}deg`,
  } as CSSProperties

  return (
    <div className={`book-cover generated-cover cover-variant-${variant} ${className}`} style={style} aria-label={`Capa de ${book.title}`}>
      <span className="cover-art" aria-hidden><i /><b /><em /></span>
      <span className="cover-kicker">{book.format === 'readr' ? 'Readr original' : book.format}</span>
      <strong className="cover-title">{book.title}</strong>
      {book.author && <span className="cover-author">{book.author}</span>}
    </div>
  )
}
