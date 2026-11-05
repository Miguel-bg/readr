'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, ImagePlus, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { BookCover } from '@/components/books/BookCover'
import { countWordsInText } from '@/lib/reader/blocks'
import { createBook, getCreatedBook, getCurrentProfile, updateBook, uploadCover } from '@/lib/data'
import type { Chapter, CreateBookPayload, CreatedBook, UserProfile } from '@/lib/types'

const emptyChapter = (index: number): Chapter => ({ title: `Capítulo ${index + 1}`, content: '', order_index: index })

export function BookEditor({ bookId }: { bookId?: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [language, setLanguage] = useState('Português')
  const [publisher, setPublisher] = useState('')
  const [publishedYear, setPublishedYear] = useState('')
  const [tags, setTags] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  // Valor de capa que o servidor realmente tem: durante o autosave com capa nova
  // pendente de upload, enviamos este valor (não o blob: local) para não gravar
  // lixo nem apagar a capa existente.
  const [storedCoverUrl, setStoredCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([emptyChapter(0)])
  const [active, setActive] = useState(0)
  const [saving, setSaving] = useState(false)
  const [autoState, setAutoState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [loading, setLoading] = useState(Boolean(bookId))
  const [error, setError] = useState('')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef(false)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const p = await getCurrentProfile()
        if (!active) return
        setProfile(p)
        if (!p) { setError('Entre na sua conta para criar ou editar livros.'); return }
        if (!bookId) { setAuthor(p.display_name); return }
        const book = await getCreatedBook(bookId)
        // Item 23: "não existe" e "não é seu" são situações diferentes — mensagem
        // honesta para cada uma em vez da mesma frase confusa pros dois casos.
        if (!book) { setError('Este livro não existe (ou foi apagado).'); return }
        if (book.user_id !== p.id) { setError('Somente o proprietário pode editar este livro.'); return }
        setTitle(book.title); setAuthor(book.author); setDescription(book.description || ''); setGenre(book.genre || ''); setLanguage(book.language || 'Português'); setPublisher(book.publisher || ''); setPublishedYear(book.published_year ? String(book.published_year) : ''); setTags((book.tags || []).join(', ')); setCoverUrl(book.cover_url || null)
        setChapters(book.chapters?.sort((a, b) => a.order_index - b.order_index) || [emptyChapter(0)])
        setStoredCoverUrl(book.cover_url || null)
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o editor.') }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [bookId])

  useEffect(() => () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }, [])

  // Aviso honesto ao fechar a aba com edições que o autosave ainda não levou ao servidor.
  useEffect(() => {
    if (!bookId) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || autoState === 'saving') event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [bookId, autoState])

  // Item 21: toda edição de usuário agenda um autosave de rascunho (2s de calma).
  // Regras: só para livros já criados (novo livro não tem nada a autosavear), precisa
  // de título; exige conteúdo não — perder o que foi digitado é pior que um rascunho vazio.
  function touch() {
    if (!bookId) return
    dirtyRef.current = true
    setAutoState('idle')
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => { void autosaveDraft() }, 2000)
  }

  function buildPayload(status: 'draft' | 'published', cover: string | null): CreateBookPayload {
    return { title: title.trim(), author: author.trim(), description: description.trim(), genre: genre.trim(), language: language.trim() || 'Português', publisher: publisher.trim(), published_year: publishedYear ? Number(publishedYear) : null, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), cover_url: cover, status, chapters: chapters.map((c, i) => ({ title: c.title || `Capítulo ${i + 1}`, content: c.content, order_index: i })) }
  }

  async function autosaveDraft() {
    if (!bookId || !profile || saving) {
      if (dirtyRef.current && saving) autosaveTimer.current = setTimeout(() => { void autosaveDraft() }, 2000)
      return
    }
    if (!title.trim()) {
      autosaveTimer.current = setTimeout(() => { void autosaveDraft() }, 2000)
      return
    }
    if (!dirtyRef.current) return
    dirtyRef.current = false
    setSaving(true)
    setAutoState('saving')
    try {
      // O autosave não faz upload da capa (arquivo em espera fica para o próximo
      // "Rascunho"/"Publicar"); manda o que o servidor já tem para preservá-la.
      await updateBook(bookId, buildPayload('draft', coverFile ? storedCoverUrl : coverUrl), profile.id)
      if (!dirtyRef.current) setAutoState('saved')
    } catch {
      dirtyRef.current = true
      setAutoState('idle')
      setError('O servidor não recebeu o rascunho automático. Continue escrevendo; ele tenta de novo a cada mudança, ou use "Rascunho" para salvar agora.')
    } finally { setSaving(false) }
  }

  function updateChapter(field: 'title' | 'content', value: string) {
    setChapters((items) => items.map((chapter, index) => index === active ? { ...chapter, [field]: value } : chapter))
    touch()
  }
  function addChapter() { setChapters((items) => [...items, emptyChapter(items.length)]); setActive(chapters.length); touch() }
  function removeChapter(index: number) { if (chapters.length === 1) return; setChapters((items) => items.filter((_, i) => i !== index).map((c, i) => ({ ...c, order_index: i }))); setActive(Math.max(0, active - 1)); touch() }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= chapters.length) return
    const next = [...chapters]; [next[index], next[target]] = [next[target], next[index]]
    setChapters(next.map((c, i) => ({ ...c, order_index: i }))); setActive(target)
    touch()
  }

  async function save(status: 'draft' | 'published') {
    if (!profile) { router.push('/auth/login'); return }
    if (!title.trim()) { setError('Dê um título ao seu livro.'); return }
    if (status === 'published') {
      const empties = chapters.filter((chapter) => !chapter.content.trim()).map((c) => c.title.trim() || `Capítulo ${c.order_index + 1}`)
      if (empties.length > 0) { setError(`Para publicar, escreva conteúdo em: ${empties.join(', ')}.`); return }
    } else if (!bookId && !chapters.some((chapter) => chapter.content.trim())) {
      setError('Escreva algum conteúdo antes de salvar.'); return
    }
    setSaving(true); setError(''); setAutoState('idle')
    try {
      let finalCover = storedCoverUrl
      if (coverFile) {
        finalCover = await uploadCover(coverFile, profile.id)
        setStoredCoverUrl(finalCover)
      }
      const payload = buildPayload(status, finalCover)
      if (bookId) { await updateBook(bookId, payload, profile.id); router.push(`/book/${bookId}?source=created`) }
      else { const id = await createBook(payload, profile.id); router.push(`/book/${id}?source=created`) }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o livro.') }
    finally { setSaving(false) }
  }

  const previewBook: CreatedBook = { id: bookId || `preview-${title}`, user_id: profile?.id || '', title: title || 'Digite um título', author, description, genre, language, publisher, published_year: publishedYear ? Number(publishedYear) : null, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), cover_url: coverUrl, format: 'readr', source: 'created', total_pages: chapters.length, status: 'draft', reads_count: 0, created_at: '' }

  if (loading) return <AppShell><section className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin" /></section></AppShell>

  return (
    <AppShell name={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <div className="flex items-center gap-4"><Link href="/library/created" className="grid size-10 place-items-center rounded-full border border-line hover:bg-white"><ArrowLeft size={18} /></Link><div><p className="eyebrow">Estúdio Readr</p><h1 className="font-serif text-3xl">{bookId ? 'Editar livro' : 'Criar novo livro'}</h1></div></div>
          <div className="flex items-center gap-2"><span className="text-[10px] text-muted">{autoState === 'saving' ? 'Salvando rascunho...' : autoState === 'saved' ? 'Rascunho salvo' : ''}</span><button className="secondary-btn !min-h-10 !px-4" onClick={() => save('draft')} disabled={saving}><Save size={15} /> Rascunho</button><button className="primary-btn !min-h-10 !px-4" onClick={() => save('published')} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" size={16} /> : 'Publicar'}</button></div>
        </header>

        <section className="mt-6 grid gap-5 xl:grid-cols-[260px_260px_1fr]">
          <aside className="panel p-5">
            <h2 className="mb-4 text-xs font-semibold">Capa e detalhes</h2>
            <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto block w-[150px] transition hover:-translate-y-1"><BookCover book={previewBook} /></button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setCoverFile(file); setCoverUrl(URL.createObjectURL(file)); touch() }} />
            <button onClick={() => fileRef.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 text-[10px] text-muted hover:text-ink"><ImagePlus size={15} /> Enviar capa</button>
            <label className="mt-5 block"><span className="mb-1.5 block text-[10px] font-medium">Título</span><input className="field !py-2.5" value={title} onChange={(e) => { setTitle(e.target.value); touch() }} /></label>
            <label className="mt-3 block"><span className="mb-1.5 block text-[10px] font-medium">Autor</span><input className="field !py-2.5" value={author} onChange={(e) => { setAuthor(e.target.value); touch() }} /></label>
            <label className="mt-3 block"><span className="mb-1.5 block text-[10px] font-medium">Descrição</span><textarea className="field min-h-20 resize-none !py-2.5" value={description} onChange={(e) => { setDescription(e.target.value); touch() }} /></label>
            <div className="mt-3 grid grid-cols-2 gap-2"><label><span className="mb-1.5 block text-[10px] font-medium">Gênero</span><input className="field !px-2 !py-2" value={genre} onChange={(e) => { setGenre(e.target.value); touch() }} /></label><label><span className="mb-1.5 block text-[10px] font-medium">Idioma</span><input className="field !px-2 !py-2" value={language} onChange={(e) => { setLanguage(e.target.value); touch() }} /></label></div>
            <div className="mt-3 grid grid-cols-2 gap-2"><label><span className="mb-1.5 block text-[10px] font-medium">Editora</span><input className="field !px-2 !py-2" value={publisher} onChange={(e) => { setPublisher(e.target.value); touch() }} /></label><label><span className="mb-1.5 block text-[10px] font-medium">Ano</span><input className="field !px-2 !py-2" inputMode="numeric" value={publishedYear} onChange={(e) => { setPublishedYear(e.target.value.replace(/\D/g, '').slice(0, 4)); touch() }} /></label></div>
            <label className="mt-3 block"><span className="mb-1.5 block text-[10px] font-medium">Tags, separadas por vírgulas</span><input className="field !py-2.5" value={tags} onChange={(e) => { setTags(e.target.value); touch() }} /></label>
            <p className="mt-4 text-[9px] leading-relaxed text-muted">Sem capa? Usaremos uma composição editorial original do Readr.</p>
          </aside>

          <aside className="panel p-4">
            <header className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold">Capítulos</h2><button onClick={addChapter} className="grid size-8 place-items-center rounded-full bg-ink text-white"><Plus size={15} /></button></header>
            <div className="space-y-2">
              {chapters.map((chapter, index) => <button key={index} onClick={() => setActive(index)} className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left ${active === index ? 'border-ink bg-white' : 'border-transparent bg-white/30'}`}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-[9px]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[10px] font-medium">{chapter.title || `Capítulo ${index + 1}`}</span><span className="flex"><span onClick={(e) => { e.stopPropagation(); move(index, -1) }}><ChevronUp size={13} /></span><span onClick={(e) => { e.stopPropagation(); move(index, 1) }}><ChevronDown size={13} /></span><span onClick={(e) => { e.stopPropagation(); removeChapter(index) }}><Trash2 size={13} /></span></span></button>)}
            </div>
          </aside>

          <article className="panel min-h-[610px] overflow-hidden bg-[#fcfaf4]">
            <header className="flex items-center border-b border-line p-3"><span className="text-[10px] text-muted">Texto do capítulo</span><span className="ml-auto text-[9px] text-muted">{countWordsInText(chapters[active]?.content || '')} palavras</span></header>
            <section className="mx-auto max-w-2xl p-7 sm:p-12">
              <input className="w-full border-none bg-transparent font-serif text-3xl outline-none placeholder:text-muted/50" value={chapters[active]?.title || ''} onChange={(e) => updateChapter('title', e.target.value)} placeholder="Título do capítulo" />
              <textarea className="mt-8 min-h-[430px] w-full resize-none border-none bg-transparent font-serif text-[17px] leading-[1.8] outline-none placeholder:text-muted/45" value={chapters[active]?.content || ''} onChange={(e) => updateChapter('content', e.target.value)} placeholder="Era uma vez..." />
            </section>
          </article>
        </section>
        {error && <p className="mt-4 rounded-xl bg-coral/10 p-4 text-sm text-coral">{error}</p>}
      </section>
    </AppShell>
  )
}
