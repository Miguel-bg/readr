'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, FileImage, FileText, LoaderCircle, UploadCloud } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { BookCover } from '@/components/books/BookCover'
import { getCurrentProfile, importBook } from '@/lib/data'
import type { Book } from '@/lib/types'

export default function ImportPage() {
  const router = useRouter()
  const coverRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [dragging, setDragging] = useState(false)
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const choose = useCallback(function choose(file?: File) {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['epub', 'pdf', 'docx'].includes(extension || '')) {
      setError('Formato não suportado. Envie EPUB, PDF ou DOCX.')
      return
    }
    setError('')
    setSelectedFile(file)
    setTitle(file.name.replace(/\.[^.]+$/, ''))
    setBook(null)
  }, [])

  function chooseCover(file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('A capa precisa ser uma imagem.'); return }
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  /** Item 20 (banca): erros técnicos (zip/pdfjs) são inglês criptico — traduz para o usuário. */
  function submissionErrorMessage(cause: unknown): string {
    const raw = cause instanceof Error ? cause.message : ''
    if (!raw) return 'Não foi possível importar o livro.'
    if (/central directory|zip file|end of file/i.test(raw)) return 'O arquivo parece corrompido (não consigo abrir o pacote interno). Reimporte ou baixe o livro de novo.'
    if (/invalid pdf|pdf header|corrupt/i.test(raw)) return 'O arquivo parece corrompido ou é um PDF eletronicamente protegido. Tente outra versão.'
    if (/preview/i.test(raw)) return 'O visualizador não conseguiu ler este arquivo.'
    return raw
  }

  async function submit() {
    if (!selectedFile) { setError('Selecione um arquivo para importar.'); return }
    setLoading(true); setError('')
    try {
      const profile = await getCurrentProfile()
      if (!profile) { router.push('/auth/login'); return }
      const imported = await importBook(selectedFile, profile.id, { title, author, coverFile })
      setBook(imported)
      router.prefetch(`/book/${imported.id}?source=imported`)
    } catch (cause) {
      setError(cause instanceof Error && cause.message.includes('Entre na sua conta') ? cause.message : submissionErrorMessage(cause))
    } finally { setLoading(false) }
  }

  // Item 20 (banca): o arraste vale a página inteira — sem o peitor global do
  // navegador, soltar fora da caixa faz a página "abrir o arquivo" (navegação).
  const dragDepth = useRef(0)

  useEffect(() => {
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types || []).includes('Files')
    const prevent = (event: DragEvent) => { if (hasFiles(event)) event.preventDefault() }
    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth.current += 1
      setDragging(true)
    }
    const leave = () => {
      dragDepth.current -= 1
      if (dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false) }
    }
    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      choose(event.dataTransfer?.files?.[0])
    }
    window.addEventListener('dragover', prevent, true)
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', prevent, true)
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [choose])

  const preview: Book = {
    id: selectedFile?.name || title || 'preview',
    title: title || 'Título do livro',
    author,
    cover_url: coverPreview,
    format: (selectedFile?.name.split('.').pop()?.toLowerCase() || 'epub') as Book['format'],
    total_pages: 1,
    source: 'imported',
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
        <header className="flex items-center gap-4 border-b border-line pb-6">
          <Link href="/library" className="grid size-10 place-items-center rounded-full border border-line" aria-label="Voltar"><ArrowLeft size={18} /></Link>
          <div><p className="eyebrow">Adicionar à biblioteca</p><h1 className="font-serif text-4xl">Importar livro</h1></div>
        </header>

        <section className="mt-8 grid gap-7 lg:grid-cols-[1fr_340px]">
          <section className="space-y-5">
            <label onDragOver={(event) => event.preventDefault()} className={`grid min-h-[260px] cursor-pointer place-items-center rounded-3xl border border-dashed p-8 text-center transition ${dragging ? 'border-coral bg-coral/5' : 'border-ink/25 bg-white/25 hover:bg-white/45'}`}>
              <input type="file" accept=".epub,.pdf,.docx" hidden onChange={(event) => choose(event.target.files?.[0])} />
              <div><span className="mx-auto grid size-16 place-items-center rounded-full bg-white shadow-soft"><UploadCloud size={26} /></span><h2 className="mt-5 font-serif text-2xl">{selectedFile ? selectedFile.name : 'Solte seu livro aqui'}</h2><p className="mt-3 text-xs leading-relaxed text-muted">Clique ou arraste um arquivo EPUB, PDF ou DOCX</p></div>
            </label>

            {selectedFile && <section className="panel grid gap-4 p-5 sm:grid-cols-2">
              <label><span className="mb-1.5 block text-[10px] font-medium">Título</span><input className="field" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
              <label><span className="mb-1.5 block text-[10px] font-medium">Autor</span><input className="field" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="Opcional" /></label>
              <div className="sm:col-span-2"><input ref={coverRef} type="file" accept="image/*" hidden onChange={(event) => chooseCover(event.target.files?.[0])} /><button type="button" onClick={() => coverRef.current?.click()} className="secondary-btn !min-h-10"><FileImage size={16} /> {coverFile ? 'Trocar capa' : 'Adicionar capa'}</button></div>
            </section>}
          </section>

          <aside className="panel p-6">
            <FileText className="text-coral" />
            <h2 className="mt-4 text-sm font-semibold">Importação persistente</h2>
            {selectedFile ? <div className="mt-5 grid grid-cols-[96px_1fr] gap-4"><BookCover book={preview} /><div className="min-w-0"><p className="line-clamp-3 text-sm font-medium">{title}</p><p className="mt-1 text-[10px] text-muted">{author || 'Autor não informado'}</p><p className="mt-3 text-[9px] uppercase text-muted">{preview.format}</p></div></div> : <p className="mt-3 text-xs leading-relaxed text-muted">Selecione um arquivo para conferir seus dados antes do envio.</p>}
            {error && <p className="mt-5 rounded-xl bg-coral/10 p-3 text-xs text-coral" role="alert">{error}</p>}
            {book ? <div className="mt-6"><p className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 size={17} /> Livro salvo na sua biblioteca.</p><Link href={`/book/${book.id}?source=imported`} className="primary-btn mt-4 w-full">Abrir no leitor</Link></div> : <button type="button" onClick={submit} disabled={!selectedFile || loading} className="primary-btn mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50">{loading ? <><LoaderCircle className="animate-spin" size={17} /> Processando arquivo</> : 'Importar para minha biblioteca'}</button>}
          </aside>
        </section>
      </section>
    </AppShell>
  )
}
