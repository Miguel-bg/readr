'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertCircle, BookOpen, LoaderCircle, RotateCcw, Upload } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { BookCard } from '@/components/books/BookCard'
import { CreateBookCard } from '@/components/books/CreateBookCard'
import { ContinueReadingHero } from './ContinueReadingHero'
import { CustomizationPanel } from '@/components/customization/CustomizationPanel'
import { getCatalogBooks, getContinueReading, getCreatedBooks, getCurrentProfile, getImportedLibrary, type ContinueReadingData } from '@/lib/data'
import type { Book, CreatedBook, UserProfile } from '@/lib/types'

export function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [imported, setImported] = useState<Book[]>([])
  const [created, setCreated] = useState<CreatedBook[]>([])
  const [reading, setReading] = useState<ContinueReadingData | null>(null)
  const [catalog, setCatalog] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      try {
        const [current, publicCatalog] = await Promise.all([getCurrentProfile(), getCatalogBooks()])
        if (!active) return
        setProfile(current)
        setCatalog(publicCatalog)
        if (!current) return
        const [ownedImports, authoredBooks, currentReading] = await Promise.all([
          getImportedLibrary(current.id), getCreatedBooks(current.id), getContinueReading(current.id),
        ])
        if (!active) return
        setImported(ownedImports); setCreated(authoredBooks); setReading(currentReading)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar sua estante.')
      } finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [reloadKey])

  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || ''

  return (
    <AppShell name={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <section className="space-y-4 px-5 pb-6 sm:px-8 lg:px-7 xl:px-9">
        {error && <section className="flex items-center justify-between gap-4 rounded-xl bg-coral/10 p-4 text-sm text-coral" role="alert"><span className="flex items-center gap-2"><AlertCircle size={17} /> {error}</span><button onClick={() => setReloadKey((value) => value + 1)} className="flex items-center gap-1 font-semibold"><RotateCcw size={14} /> Tentar novamente</button></section>}
        <section id="hero-section" className="grid items-center gap-7 lg:grid-cols-[.72fr_1.28fr]">
          <article className="px-1 lg:px-5">
            <h1 className="font-serif text-[42px] leading-[.98] tracking-[-.035em] sm:text-[52px]">Boa leitura{firstName ? <>,<br />{firstName}</> : '.'}</h1>
            <p className="mt-6 max-w-[280px] text-xs leading-relaxed text-ink/80">Crie seus livros. Importe, personalize e leia do seu jeito com a melhor experiência de leitura.</p>
            <div className="mt-7 flex max-w-[300px] flex-col gap-3">
              {profile ? <><Link href="/create" prefetch className="primary-btn"><BookOpen size={17} /> Criar Novo Livro</Link><Link href="/import" prefetch className="secondary-btn"><Upload size={17} /> Importar Livro</Link><span className="text-center text-[8px] uppercase tracking-wide text-muted">EPUB, PDF ou DOCX</span></> : <><Link href="/auth/login" prefetch className="primary-btn">Entrar no Readr</Link><Link href="/auth/signup" prefetch className="secondary-btn">Criar conta</Link></>}
            </div>
          </article>
          {loading ? <HeroSkeleton /> : <ContinueReadingHero reading={reading} />}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <LibraryPanel title="Minha Biblioteca" suffix="(Importados)" href="/library">
            {loading ? <BookSkeletons /> : imported.slice(0, 4).map((book) => <BookCard key={book.id} book={book} />)}
            {!loading && !imported.length && <EmptyShelf href="/import" label="Importe seu primeiro livro" />}
          </LibraryPanel>
          <LibraryPanel title="Meus Livros Criados" href="/library/created">
            {!loading && profile && <CreateBookCard />}
            {loading ? <BookSkeletons count={3} /> : created.slice(0, 3).map((book) => <BookCard key={book.id} book={book} />)}
            {!loading && profile && !created.length && <div className="col-span-3 flex items-center justify-center px-5 text-center text-[10px] leading-relaxed text-muted">Seus livros aparecerão aqui após serem criados.</div>}
          </LibraryPanel>
        </section>
        <section className="panel mt-6 p-5 sm:p-7">
          <header className="mb-6 flex items-end justify-between"><div><p className="eyebrow">Mais lidos</p><h2 className="mt-2 font-serif text-3xl">Biblioteca</h2></div><Link href="/library/community" className="text-xs font-semibold hover:underline">Ver mais</Link></header>
          {loading ? <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded bg-black/5" />)}</section> : catalog.length ? <section className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{catalog.slice(0, 12).map((book, index) => <BookCard key={`${book.source}-${book.id}`} book={book} highlighted={index < 3 && Number(book.reads_count || 0) > 0} />)}</section> : <p className="rounded-xl border border-dashed border-line py-12 text-center text-xs text-muted">A biblioteca pública ainda não possui livros.</p>}
        </section>
        <CustomizationPanel />
      </section>
    </AppShell>
  )
}

function LibraryPanel({ title, suffix, href, children }: { title: string; suffix?: string; href: string; children: React.ReactNode }) {
  return <section className="panel min-h-[292px] p-4 sm:p-5"><header className="mb-4 flex items-center justify-between"><h2 className="text-sm font-medium">{title} <small className="text-[10px] text-muted">{suffix}</small></h2><Link href={href} prefetch className="text-[9px] hover:underline">Ver todos</Link></header><section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">{children}</section></section>
}
function HeroSkeleton() { return <div className="min-h-[320px] animate-pulse rounded-xl bg-white/45" aria-label="Carregando leitura" /> }
function BookSkeletons({ count = 4 }: { count?: number }) { return <>{Array.from({ length: count }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-lg bg-black/5" />)}</> }
function EmptyShelf({ href, label }: { href: string; label: string }) { return <Link href={href} className="col-span-full grid min-h-44 place-items-center rounded-xl border border-dashed border-line text-center text-xs text-muted hover:bg-white/40">{label}</Link> }
