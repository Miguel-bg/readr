'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, BookPlus, Compass, Library, LoaderCircle, RotateCcw, Upload } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { BookCard } from './BookCard'
import { CreateBookCard } from './CreateBookCard'
import { getCommunityBooks, getCreatedBooks, getCurrentProfile, getImportedLibrary, getPublicImportedBooks } from '@/lib/data'
import type { Book, UserProfile } from '@/lib/types'

type LibraryMode = 'imported' | 'created' | 'community'

const copy = {
  imported: { eyebrow: 'Sua estante digital', title: 'Minha biblioteca', subtitle: 'Seus arquivos importados com leitura e progresso sincronizados.' },
  created: { eyebrow: 'Seu espaço de autoria', title: 'Livros criados', subtitle: 'Escreva, publique e acompanhe suas leituras.' },
  community: { eyebrow: 'Biblioteca da comunidade', title: 'Descobrir', subtitle: 'Leia livros importados e obras publicadas por outros usuários do Readr.' },
}

export function LibraryView({ mode }: { mode: LibraryMode }) {
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError('')
      try {
        const current = await getCurrentProfile()
        if (!active) return
        setProfile(current)
        if (!current) return
        const result = mode === 'imported'
          ? await getImportedLibrary(current.id)
          : mode === 'created'
            ? await getCreatedBooks(current.id)
            : (await Promise.all([getPublicImportedBooks(current.id), getCommunityBooks(current.id)])).flat()
        if (active) setBooks(result)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os livros.')
      } finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [mode, reloadKey])

  const query = searchParams.get('query')?.trim().toLocaleLowerCase('pt-BR') || ''
  const visibleBooks = useMemo(() => query ? books.filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase('pt-BR').includes(query)) : books, [books, query])
  const action = mode === 'created' ? { href: '/create', label: 'Criar livro', icon: BookPlus } : mode === 'imported' ? { href: '/import', label: 'Importar livro', icon: Upload } : null
  const content = copy[mode]

  return (
    <AppShell name={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">{content.eyebrow}</p><h1 className="mt-2 font-serif text-4xl sm:text-5xl">{content.title}</h1><p className="mt-3 text-sm text-muted">{content.subtitle}</p></div>
          {action && profile && <Link href={action.href} prefetch className="primary-btn w-fit"><action.icon size={17} />{action.label}</Link>}
        </header>

        {!profile && !loading && <EmptyState icon={Library} title="Entre para acessar sua estante" description="Sua biblioteca, seus livros e seu progresso ficam vinculados à sua conta." href="/auth/login" action="Entrar" />}
        {error && <section className="mt-8 flex items-center justify-between gap-4 rounded-xl bg-coral/10 p-4 text-sm text-coral" role="alert"><span className="flex items-center gap-2"><AlertCircle size={17} />{error}</span><button onClick={() => setReloadKey((value) => value + 1)} className="flex items-center gap-1 font-semibold"><RotateCcw size={14} /> Tentar novamente</button></section>}
        {profile && <section className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 sm:gap-x-6 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
          {mode === 'created' && !loading && <CreateBookCard />}
          {loading ? Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded bg-black/5" />) : visibleBooks.map((book) => <BookCard key={`${book.source}-${book.id}`} book={book} canEdit={mode === 'created' && book.user_id === profile.id} />)}
        </section>}
        {profile && !loading && !error && !visibleBooks.length && <EmptyState icon={mode === 'community' ? Compass : Library} title={query ? 'Nenhum livro encontrado' : mode === 'community' ? 'Nenhum livro disponível' : mode === 'created' ? 'Uma estante esperando sua história' : 'Sua biblioteca está vazia'} description={query ? `Não encontramos resultados para “${searchParams.get('query')}”.` : mode === 'community' ? 'Quando outros usuários importarem ou publicarem livros, eles aparecerão aqui.' : mode === 'created' ? 'Crie seu primeiro livro, adicione capítulos e publique para compartilhar.' : 'Importe um arquivo EPUB, PDF ou DOCX para começar a ler.'} href={query ? '/library' : mode === 'community' ? '/library/created' : mode === 'created' ? '/create' : '/import'} action={query ? 'Limpar busca' : mode === 'community' ? 'Meus livros' : mode === 'created' ? 'Criar livro' : 'Importar livro'} />}
      </section>
    </AppShell>
  )
}

function EmptyState({ icon: Icon, title, description, href, action }: { icon: typeof Library; title: string; description: string; href: string; action: string }) {
  return <section className="mt-10 grid place-items-center rounded-2xl border border-dashed border-line px-5 py-14 text-center"><Icon className="mb-4 text-muted" /><h2 className="font-serif text-2xl">{title}</h2><p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">{description}</p><Link href={href} prefetch className="secondary-btn mt-5 !min-h-10">{action}</Link></section>
}
