'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ImagePlus, LoaderCircle, Save, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { BookCover } from '@/components/books/BookCover'
import { deleteImportedBook, getCurrentProfile, getImportedBook, updateImportedBook, uploadCover } from '@/lib/data'
import type { Book, UserProfile } from '@/lib/types'

export default function ManageImportedBookPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [book, setBook] = useState<Book | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getCurrentProfile(), getImportedBook(id)]).then(([current, loaded]) => {
      if (!current || !loaded || loaded.user_id !== current.id) throw new Error('Somente o proprietário pode configurar este livro.')
      setProfile(current); setBook(loaded); setTitle(loaded.title); setAuthor(loaded.author); setDescription(loaded.description || ''); setCoverUrl(loaded.cover_url || null)
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível abrir as configurações.')).finally(() => setLoading(false))
  }, [id])

  async function save() {
    if (!profile || !book || !title.trim()) return
    setSaving(true); setError('')
    try {
      let finalCover = coverUrl
      if (coverFile) finalCover = await uploadCover(coverFile, profile.id)
      await updateImportedBook(book.id, profile.id, { title: title.trim(), author: author.trim(), description: description.trim(), cover_url: finalCover })
      router.push('/library')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar.') }
    finally { setSaving(false) }
  }
  async function remove() {
    if (!profile || !book || !window.confirm('Excluir este livro permanentemente?')) return
    setSaving(true)
    try { await deleteImportedBook(book.id, profile.id); router.push('/library') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir.') }
    finally { setSaving(false) }
  }

  if (loading) return <AppShell><section className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin" /></section></AppShell>
  if (!book) return <AppShell><section className="p-10 text-sm text-coral">{error}</section></AppShell>
  const preview = { ...book, title, author, cover_url: coverUrl }

  return <AppShell name={profile?.display_name} avatarUrl={profile?.avatar_url}><section className="mx-auto max-w-4xl px-5 pb-14 sm:px-8"><header className="flex items-center justify-between border-b border-line pb-6"><div className="flex items-center gap-4"><button onClick={() => router.back()} className="grid size-10 place-items-center rounded-full border border-line"><ArrowLeft size={18} /></button><div><p className="eyebrow">Livro importado</p><h1 className="font-serif text-4xl">Configurar livro</h1></div></div><button onClick={remove} disabled={saving} className="flex items-center gap-2 text-xs font-semibold text-coral"><Trash2 size={16} /> Excluir</button></header><section className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]"><aside><BookCover book={preview} /><input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setCoverFile(file); setCoverUrl(URL.createObjectURL(file)) }} /><button onClick={() => fileRef.current?.click()} className="secondary-btn mt-4 w-full !min-h-10"><ImagePlus size={16} /> Trocar capa</button></aside><section className="panel space-y-5 p-6"><label className="block"><span className="mb-2 block text-xs font-semibold">Título</span><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="block"><span className="mb-2 block text-xs font-semibold">Autor</span><input className="field" value={author} onChange={(event) => setAuthor(event.target.value)} /></label><label className="block"><span className="mb-2 block text-xs font-semibold">Descrição</span><textarea className="field min-h-40 resize-none" value={description} onChange={(event) => setDescription(event.target.value)} /></label>{error && <p className="text-xs text-coral">{error}</p>}<button onClick={save} disabled={saving} className="primary-btn">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} Salvar alterações</button></section></section></section></AppShell>
}
