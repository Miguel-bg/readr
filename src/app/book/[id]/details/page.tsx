'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Bookmark, Eye, Heart, LoaderCircle, Star, ThumbsDown, X } from 'lucide-react'
import { BookCover } from '@/components/books/BookCover'
import { getBookSocial, getCatalogBook, getCurrentProfile, saveBookToShelf, saveReview, setBookReaction } from '@/lib/data'
import type { Book, UserProfile } from '@/lib/types'

export default function BookDetailsPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const source = search.get('source') === 'created' ? 'created' : 'imported'
  const [book, setBook] = useState<Book | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null)
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([getCatalogBook(params.id, source), getCurrentProfile(), getBookSocial(params.id, source)])
      .then(([loadedBook, current, social]) => { setBook(loadedBook); setProfile(current); setReviews(social.reviews); setLikes(social.likes); setDislikes(social.dislikes) })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Não foi possível abrir o livro.'))
      .finally(() => setLoading(false))
  }, [params.id, source])

  function requireAccount(action?: () => void) {
    if (!profile) { router.push(`/auth/signup?next=${encodeURIComponent(`/book/${params.id}/details?source=${source}`)}`); return }
    action?.()
  }
  async function save(status: 'want_to_read' | 'reading') {
    if (!book) return
    requireAccount(async () => { await saveBookToShelf(profile!.id, book, status); setMessage(status === 'reading' ? 'Adicionado aos livros em leitura.' : 'Livro salvo na sua estante.') })
  }
  async function react(next: 'like' | 'dislike') {
    if (!book) return
    requireAccount(async () => {
      await setBookReaction(profile!.id, book.id, book.source, next)
      setReaction(next)
      const social = await getBookSocial(book.id, book.source)
      setLikes(social.likes); setDislikes(social.dislikes)
    })
  }
  async function submitReview() {
    if (!book || !review.trim()) return
    requireAccount(async () => { await saveReview(profile!.id, book.id, book.source, rating, review.trim()); setReviews((await getBookSocial(book.id, book.source)).reviews); setReview(''); setMessage('Avaliação publicada.') })
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#efede7]"><LoaderCircle className="animate-spin" /></main>
  if (!book) return <main className="grid min-h-screen place-items-center"><p>{message || 'Livro não encontrado.'}</p></main>

  return (
    <main className="min-h-screen bg-[#eceae5] px-5 py-6 sm:px-10 sm:py-10">
      <button onClick={() => router.back()} className="fixed right-5 top-5 z-20 grid size-11 place-items-center rounded-full bg-white shadow-soft" aria-label="Voltar"><X size={19} /></button>
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-[#faf9f5] shadow-panel">
        <section className="grid gap-10 px-7 py-12 md:grid-cols-[260px_1fr] md:px-14 md:py-16">
          <div className="mx-auto w-full max-w-[260px]"><BookCover book={book} /></div>
          <article className="flex flex-col justify-center">
            <p className="eyebrow">{book.source === 'created' ? 'Livro autoral' : `Arquivo ${book.format}`}</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{book.title}</h1>
            <p className="mt-2 text-sm text-muted">{book.author || 'Autor não informado'}</p>
            <div className="mt-5 flex flex-wrap items-center gap-5 text-xs"><span className="flex items-center gap-1"><Star className="text-amber-500" size={16} fill="currentColor" />{Number(book.average_rating || 0).toFixed(1)}</span><span className="flex items-center gap-1"><Eye size={16} />{book.reads_count || 0} leitores</span><span>{book.total_pages} páginas</span>{book.published_year && <span>{book.published_year}</span>}</div>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-ink/75">{book.description || 'Este livro ainda não possui descrição. Abra a leitura para conhecer seu conteúdo.'}</p>
            <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => requireAccount(async () => { await save('reading'); router.push(`/book/${book.id}?source=${book.source}`) })} className="primary-btn">Ler agora</button><button onClick={() => save('want_to_read')} className="secondary-btn"><Bookmark size={17} /> Salvar para mais tarde</button><button onClick={() => react('like')} className={`secondary-btn !px-4 ${reaction === 'like' ? '!border-coral !text-coral' : ''}`} aria-label="Curtir"><Heart size={18} fill={reaction === 'like' ? 'currentColor' : 'none'} /> {likes}</button><button onClick={() => react('dislike')} className={`secondary-btn !px-4 ${reaction === 'dislike' ? '!border-coral !text-coral' : ''}`} aria-label="Não gostei"><ThumbsDown size={18} /> {dislikes}</button></div>
            {message && <p className="mt-4 text-xs text-coral">{message}</p>}
          </article>
        </section>

        <section className="border-t border-line px-7 py-10 md:px-14">
          <h2 className="font-serif text-3xl">Avaliações</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <form onSubmit={(event) => { event.preventDefault(); submitReview() }} className="panel p-5"><label className="text-xs font-semibold">Sua nota</label><select className="field mt-2" value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} estrelas</option>)}</select><textarea className="field mt-3 min-h-28 resize-none" value={review} onChange={(event) => setReview(event.target.value)} placeholder="Conte o que achou..." /><button className="primary-btn mt-3 !min-h-10" type="submit">Publicar avaliação</button></form>
            <div className="space-y-3">{reviews.length ? reviews.map((item) => <article key={item.id} className="rounded-2xl border border-line bg-white/45 p-4"><header className="flex items-center justify-between"><strong className="text-xs">{item.profiles?.display_name || 'Leitor'}</strong><span className="flex items-center gap-1 text-xs text-amber-600"><Star size={12} fill="currentColor" />{item.rating}</span></header><p className="mt-2 text-xs leading-relaxed text-muted">{item.content}</p></article>) : <p className="text-sm text-muted">Ainda não há avaliações. Seja a primeira pessoa a avaliar.</p>}</div>
          </div>
        </section>
      </section>
    </main>
  )
}
