'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, BookPlus, ChevronDown, Compass, Library, LoaderCircle, RotateCcw, Search, SlidersHorizontal, Upload } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { BookCard } from './BookCard'
import { CreateBookCard } from './CreateBookCard'
import { getCatalogBooks, getCreatedBooks, getCurrentProfile, getImportedLibrary, getShelf } from '@/lib/data'
import type { Book, UserProfile } from '@/lib/types'

type LibraryMode = 'imported' | 'created' | 'community'
type SortMode = 'popular' | 'recent' | 'az' | 'za' | 'rating'

export function LibraryView({ mode }: { mode: LibraryMode }) {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [createdBooks, setCreatedBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState(searchParams.get('query') || '')
  const [genre, setGenre] = useState('all')
  const [author, setAuthor] = useState('all')
  const [language, setLanguage] = useState('all')
  const [publisher, setPublisher] = useState('all')
  const [tag, setTag] = useState('all')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [recentOnly, setRecentOnly] = useState(false)
  const [origin, setOrigin] = useState('all')
  const [length, setLength] = useState('all')
  const [status, setStatus] = useState('all')
  const [rating, setRating] = useState(0)
  const [sort, setSort] = useState<SortMode>('popular')
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      try {
        const current = await getCurrentProfile()
        if (!active) return
        setProfile(current)
        if (mode === 'community') {
          const [catalog, shelf] = await Promise.all([getCatalogBooks(), current ? getShelf(current.id) : Promise.resolve([])])
          const statuses = new Map(shelf.map((book) => [`${book.source}:${book.id}`, book.shelf_status]))
          if (active) setBooks(catalog.map((book) => ({ ...book, shelf_status: statuses.get(`${book.source}:${book.id}`) })))
          return
        }
        if (!current) return
        if (mode === 'created') {
          const authored = await getCreatedBooks(current.id)
          if (active) setBooks(authored)
        } else {
          const [shelf, imports, authored] = await Promise.all([getShelf(current.id), getImportedLibrary(current.id), getCreatedBooks(current.id)])
          const merged = new Map<string, Book>()
          ;[...shelf, ...imports].forEach((book) => merged.set(`${book.source}:${book.id}`, book))
          if (active) { setBooks(Array.from(merged.values())); setCreatedBooks(authored) }
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os livros.')
      } finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [mode, reloadKey])

  const genres = useMemo(() => Array.from(new Set(books.map((book) => book.genre).filter(Boolean))) as string[], [books])
  const authors = useMemo(() => Array.from(new Set(books.map((book) => book.author).filter(Boolean))) as string[], [books])
  const languages = useMemo(() => Array.from(new Set(books.map((book) => book.language).filter(Boolean))) as string[], [books])
  const publishers = useMemo(() => Array.from(new Set(books.map((book) => book.publisher).filter(Boolean))) as string[], [books])
  const tags = useMemo(() => Array.from(new Set(books.flatMap((book) => book.tags || []).filter(Boolean))), [books])
  const visibleBooks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    return books.filter((book) => {
      if (normalized && !`${book.title} ${book.author} ${book.publisher || ''}`.toLocaleLowerCase('pt-BR').includes(normalized)) return false
      if (genre !== 'all' && book.genre !== genre) return false
      if (author !== 'all' && book.author !== author) return false
      if (language !== 'all' && book.language !== language) return false
      if (publisher !== 'all' && book.publisher !== publisher) return false
      if (tag !== 'all' && !(book.tags || []).includes(tag)) return false
      if (yearMin && Number(book.published_year || 0) < Number(yearMin)) return false
      if (yearMax && Number(book.published_year || 0) > Number(yearMax)) return false
      if (recentOnly && (!book.published_year || book.published_year < new Date().getFullYear() - 1)) return false
      if (origin !== 'all' && book.source !== origin) return false
      if (status !== 'all' && book.shelf_status !== status) return false
      if (rating && Number(book.average_rating || 0) < rating) return false
      if (length === 'short' && book.total_pages >= 100) return false
      if (length === 'medium' && (book.total_pages < 100 || book.total_pages > 300)) return false
      if (length === 'long' && book.total_pages <= 300) return false
      return true
    }).sort((a, b) => {
      if (sort === 'recent') return String(b.created_at).localeCompare(String(a.created_at))
      if (sort === 'az') return a.title.localeCompare(b.title, 'pt-BR')
      if (sort === 'za') return b.title.localeCompare(a.title, 'pt-BR')
      if (sort === 'rating') return Number(b.average_rating || 0) - Number(a.average_rating || 0)
      return Number(b.reads_count || 0) - Number(a.reads_count || 0)
    })
  }, [books, query, genre, author, language, publisher, tag, yearMin, yearMax, recentOnly, origin, length, status, rating, sort])

  const isCatalog = mode === 'community'
  const content = mode === 'community'
    ? { eyebrow: 'Catálogo público', title: 'Biblioteca', subtitle: 'Encontre livros importados e histórias publicadas pela comunidade.' }
    : mode === 'created'
      ? { eyebrow: 'Seu espaço de autoria', title: 'Livros criados', subtitle: 'Escreva, publique e continue editando suas histórias.' }
      : { eyebrow: 'Sua coleção pessoal', title: 'Minha estante', subtitle: 'Salvos, curtidos, em leitura e importados em um só lugar.' }

  return (
    <AppShell name={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">{content.eyebrow}</p><h1 className="mt-2 font-serif text-4xl sm:text-5xl">{content.title}</h1><p className="mt-3 text-sm text-muted">{content.subtitle}</p></div>
          <div className="flex flex-wrap gap-2">{profile && mode !== 'community' && <><Link href="/import" className="secondary-btn !min-h-10 !px-4"><Upload size={16} /> Importar</Link><Link href="/create" className="primary-btn !min-h-10 !px-4"><BookPlus size={16} /> Criar</Link></>}</div>
        </header>

        {isCatalog && <section className="mt-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field !pl-11" placeholder="Pesquisar título, autor ou editora" /></label>
            <button onClick={() => setFiltersOpen((value) => !value)} className="secondary-btn !min-h-11 lg:hidden"><SlidersHorizontal size={16} /> Filtros <ChevronDown size={14} /></button>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="field max-w-[230px] !py-2.5" aria-label="Ordenar livros"><option value="popular">Mais lidos</option><option value="recent">Mais recentes</option><option value="az">Título A–Z</option><option value="za">Título Z–A</option><option value="rating">Melhor avaliados</option></select>
          </div>
        </section>}

        {!profile && !loading && !isCatalog && <EmptyState icon={Library} title="Entre para acessar sua estante" description="Sua estante, seus livros e seu progresso ficam vinculados à sua conta." href="/auth/login" action="Entrar" />}
        {error && <section className="mt-8 flex items-center justify-between gap-4 rounded-xl bg-coral/10 p-4 text-sm text-coral" role="alert"><span className="flex items-center gap-2"><AlertCircle size={17} />{error}</span><button onClick={() => setReloadKey((value) => value + 1)} className="flex items-center gap-1 font-semibold"><RotateCcw size={14} /> Tentar novamente</button></section>}

        {(profile || isCatalog) && <section className={`mt-7 grid gap-8 ${isCatalog ? 'lg:grid-cols-[220px_1fr]' : ''}`}>
          {isCatalog && <aside className={`${filtersOpen ? 'block' : 'hidden'} panel h-fit p-5 lg:block`}>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={16} /> Filtros</h2>
            <Filter label="Gênero" value={genre} onChange={setGenre} options={genres.map((value) => [value, value])} />
            <Filter label="Autor" value={author} onChange={setAuthor} options={authors.map((value) => [value, value])} />
            <Filter label="Idioma" value={language} onChange={setLanguage} options={languages.map((value) => [value, value])} />
            <Filter label="Editora" value={publisher} onChange={setPublisher} options={publishers.map((value) => [value, value])} />
            <Filter label="Tag" value={tag} onChange={setTag} options={tags.map((value) => [value, value])} />
            <div className="mt-5"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted">Intervalo de ano</span><div className="grid grid-cols-2 gap-2"><input className="field !px-2 !py-2 text-xs" inputMode="numeric" placeholder="De" value={yearMin} onChange={(event) => setYearMin(event.target.value.replace(/\D/g, '').slice(0, 4))} /><input className="field !px-2 !py-2 text-xs" inputMode="numeric" placeholder="Até" value={yearMax} onChange={(event) => setYearMax(event.target.value.replace(/\D/g, '').slice(0, 4))} /></div></div>
            <label className="mt-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={recentOnly} onChange={(event) => setRecentOnly(event.target.checked)} /> Lançamentos</label>
            <Filter label="Origem" value={origin} onChange={setOrigin} options={[["imported","Arquivos importados"],["created","Livros autorais"]]} />
            {profile && <Filter label="Status" value={status} onChange={setStatus} options={[["saved","Salvos"],["wishlist","Quero ler"],["reading","Lendo"],["completed","Concluídos"]]} />}
            <Filter label="Tamanho" value={length} onChange={setLength} options={[["short","Curtos — menos de 100 páginas"],["medium","Médios — 100 a 300 páginas"],["long","Longos — mais de 300 páginas"]]} />
            <Filter label="Avaliação" value={String(rating)} onChange={(value) => setRating(Number(value))} options={[["4","4 estrelas ou mais"],["3","3 estrelas ou mais"]]} />
            <button onClick={() => { setGenre('all'); setAuthor('all'); setLanguage('all'); setPublisher('all'); setTag('all'); setYearMin(''); setYearMax(''); setRecentOnly(false); setOrigin('all'); setStatus('all'); setLength('all'); setRating(0) }} className="mt-5 text-xs font-semibold text-coral">Limpar filtros</button>
          </aside>}

          <div>
            {!isCatalog && mode === 'imported' && <nav className="mb-6 flex flex-wrap gap-2"><ShelfTab label="Todos" value="all" active={status} set={setStatus} /><ShelfTab label="Quero ler" value="wishlist" active={status} set={setStatus} /><ShelfTab label="Lendo" value="reading" active={status} set={setStatus} /><ShelfTab label="Concluídos" value="completed" active={status} set={setStatus} /></nav>}
            <section className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 sm:gap-x-6 md:grid-cols-4 xl:grid-cols-5">
              {mode === 'created' && !loading && <CreateBookCard />}
              {loading ? Array.from({ length: 10 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded bg-black/5" />) : visibleBooks.map((book) => <BookCard key={`${book.source}-${book.id}`} book={book} canEdit={Boolean(profile && book.user_id === profile.id)} from={mode === 'community' ? '/library/community' : mode === 'created' ? '/library/created' : '/library'} />)}
            </section>
            {!loading && !error && !visibleBooks.length && <EmptyState icon={isCatalog ? Compass : Library} title={query ? 'Nenhum livro encontrado' : 'Nenhum livro nesta seção'} description={query ? `Não encontramos resultados para “${query}”.` : 'Os livros aparecerão aqui conforme sua atividade.'} href={isCatalog ? '/auth/signup' : '/import'} action={isCatalog ? 'Criar conta' : 'Importar livro'} />}
          </div>
        </section>}

        {profile && mode === 'imported' && <section className="mt-12 border-t border-line pt-8"><div className="mb-5 flex items-end justify-between"><div><p className="eyebrow">Autoria</p><h2 className="mt-2 font-serif text-3xl">Meus livros criados</h2></div><Link href="/library/created" className="text-xs font-semibold">Ver todos</Link></div><section className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"><CreateBookCard />{createdBooks.slice(0, 4).map((book) => <BookCard key={book.id} book={book} canEdit from="/library" />)}</section></section>}
      </section>
    </AppShell>
  )
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="mt-5 block"><span className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span><select className="field !py-2.5 text-xs" value={value} onChange={(event) => onChange(event.target.value)}><option value="all">Todos</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
}
function ShelfTab({ label, value, active, set }: { label: string; value: string; active: string; set: (value: string) => void }) { return <button onClick={() => set(value)} className={`rounded-full px-4 py-2 text-xs font-medium ${active === value ? 'bg-ink text-white' : 'border border-line bg-white/40'}`}>{label}</button> }
function EmptyState({ icon: Icon, title, description, href, action }: { icon: typeof Library; title: string; description: string; href: string; action: string }) { return <section className="col-span-full mt-4 grid place-items-center rounded-2xl border border-dashed border-line px-5 py-14 text-center"><Icon className="mb-4 text-muted" /><h2 className="font-serif text-2xl">{title}</h2><p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">{description}</p><Link href={href} className="secondary-btn mt-5 !min-h-10">{action}</Link></section> }
