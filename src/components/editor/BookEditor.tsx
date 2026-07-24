'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronUp, ImagePlus, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { BookCover } from '@/components/books/BookCover'
import { createBook, getCreatedBook, getCurrentProfile, updateBook, uploadCover } from '@/lib/data'
import type { Chapter, CreateBookPayload, CreatedBook, UserProfile } from '@/lib/types'

const emptyChapter = (index: number): Chapter => ({ title: `Capítulo ${index + 1}`, content: '', order_index: index })

export function BookEditor({ bookId }: { bookId?: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([emptyChapter(0)])
  const [active, setActive] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(Boolean(bookId))
  const [error, setError] = useState('')

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
        if (!book || book.user_id !== p.id) { setError('Somente o proprietário pode editar este livro.'); return }
        setTitle(book.title); setAuthor(book.author); setCoverUrl(book.cover_url || null)
        setChapters(book.chapters?.sort((a, b) => a.order_index - b.order_index) || [emptyChapter(0)])
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o editor.') }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [bookId])

  function updateChapter(field: 'title' | 'content', value: string) {
    setChapters((items) => items.map((chapter, index) => index === active ? { ...chapter, [field]: value } : chapter))
  }
  function addChapter() { setChapters((items) => [...items, emptyChapter(items.length)]); setActive(chapters.length) }
  function removeChapter(index: number) { if (chapters.length === 1) return; setChapters((items) => items.filter((_, i) => i !== index).map((c, i) => ({ ...c, order_index: i }))); setActive(Math.max(0, active - 1)) }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction; if (target < 0 || target >= chapters.length) return
    const next = [...chapters]; [next[index], next[target]] = [next[target], next[index]]
    setChapters(next.map((c, i) => ({ ...c, order_index: i }))); setActive(target)
  }

  async function save(status: 'draft' | 'published') {
    if (!profile) { router.push('/auth/login'); return }
    if (!title.trim()) { setError('Dê um título ao seu livro.'); return }
    if (!chapters.some((chapter) => chapter.content.trim())) { setError('Escreva algum conteúdo antes de salvar.'); return }
    setSaving(true); setError('')
    try {
      let finalCover = coverUrl
      if (coverFile) finalCover = await uploadCover(coverFile, profile.id)
      const payload: CreateBookPayload = { title: title.trim(), author: author.trim(), cover_url: finalCover, status, chapters: chapters.map((c, i) => ({ title: c.title || `Capítulo ${i + 1}`, content: c.content, order_index: i })) }
      if (bookId) { await updateBook(bookId, payload, profile.id); router.push(`/book/${bookId}?source=created`) }
      else { const id = await createBook(payload, profile.id); router.push(`/book/${id}?source=created`) }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o livro.') }
    finally { setSaving(false) }
  }

  const previewBook: CreatedBook = { id: bookId || `preview-${title}`, user_id: profile?.id || '', title: title || 'Digite um título', author, cover_url: coverUrl, format: 'readr', source: 'created', total_pages: chapters.length, status: 'draft', reads_count: 0, created_at: '' }

  if (loading) return <AppShell><section className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin" /></section></AppShell>

  return (
    <AppShell name={profile?.display_name} avatarUrl={profile?.avatar_url}>
      <section className="px-5 pb-12 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <div className="flex items-center gap-4"><Link href="/library/created" className="grid size-10 place-items-center rounded-full border border-line hover:bg-white"><ArrowLeft size={18} /></Link><div><p className="eyebrow">Estúdio Readr</p><h1 className="font-serif text-3xl">{bookId ? 'Editar livro' : 'Criar novo livro'}</h1></div></div>
          <div className="flex gap-2"><button className="secondary-btn !min-h-10 !px-4" onClick={() => save('draft')} disabled={saving}><Save size={15} /> Rascunho</button><button className="primary-btn !min-h-10 !px-4" onClick={() => save('published')} disabled={saving}>{saving ? <LoaderCircle className="animate-spin" size={16} /> : 'Publicar'}</button></div>
        </header>

        <section className="mt-6 grid gap-5 xl:grid-cols-[260px_260px_1fr]">
          <aside className="panel p-5">
            <h2 className="mb-4 text-xs font-semibold">Capa e detalhes</h2>
            <button type="button" onClick={() => fileRef.current?.click()} className="mx-auto block w-[150px] transition hover:-translate-y-1"><BookCover book={previewBook} /></button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setCoverFile(file); setCoverUrl(URL.createObjectURL(file)) }} />
            <button onClick={() => fileRef.current?.click()} className="mt-4 flex w-full items-center justify-center gap-2 text-[10px] text-muted hover:text-ink"><ImagePlus size={15} /> Enviar capa</button>
            <label className="mt-5 block"><span className="mb-1.5 block text-[10px] font-medium">Título</span><input className="field !py-2.5" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="mt-3 block"><span className="mb-1.5 block text-[10px] font-medium">Autor</span><input className="field !py-2.5" value={author} onChange={(e) => setAuthor(e.target.value)} /></label>
            <p className="mt-4 text-[9px] leading-relaxed text-muted">Sem capa? Usaremos uma composição editorial do Readr. <span className="block">// TODO Fase 2: geração por IA.</span></p>
          </aside>

          <aside className="panel p-4">
            <header className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold">Capítulos</h2><button onClick={addChapter} className="grid size-8 place-items-center rounded-full bg-ink text-white"><Plus size={15} /></button></header>
            <div className="space-y-2">
              {chapters.map((chapter, index) => <button key={index} onClick={() => setActive(index)} className={`flex w-full items-center gap-2 rounded-xl border p-3 text-left ${active === index ? 'border-ink bg-white' : 'border-transparent bg-white/30'}`}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-[9px]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[10px] font-medium">{chapter.title || `Capítulo ${index + 1}`}</span><span className="flex"><span onClick={(e) => { e.stopPropagation(); move(index, -1) }}><ChevronUp size={13} /></span><span onClick={(e) => { e.stopPropagation(); move(index, 1) }}><ChevronDown size={13} /></span><span onClick={(e) => { e.stopPropagation(); removeChapter(index) }}><Trash2 size={13} /></span></span></button>)}
            </div>
          </aside>

          <article className="panel min-h-[610px] overflow-hidden bg-[#fcfaf4]">
            <header className="flex items-center border-b border-line p-3"><span className="text-[10px] text-muted">Texto do capítulo</span><span className="ml-auto text-[9px] text-muted">{chapters[active]?.content.trim().split(/\s+/).filter(Boolean).length || 0} palavras</span></header>
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
