'use client'

import FlipBook from 'react-pageflip'
import { useRouter, useSearchParams } from 'next/navigation'
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw } from 'lucide-react'
import { CreatedBookSource, ImportedBookSource } from '@/lib/reader/ReaderSource'
import { getCreatedBook, getCurrentProfile, getImportedBook, getReadingProgress, registerBookRead, updateReadingProgress } from '@/lib/data'
import type { Book, ReaderPage, UserProfile } from '@/lib/types'
import { useReaderStore } from '@/store/readerStore'
import { ReaderToolbar } from './ReaderToolbar'
import { ThemeSwitcher } from './ThemeSwitcher'

const HTMLFlipBook = FlipBook as any

const Page = forwardRef<HTMLDivElement, { page: ReaderPage; total: number }>(({ page, total }, ref) => {
  const { theme, fontSize, fontFamily, margin, lineSpacing } = useReaderStore()
  return (
    <article ref={ref} className={`reader-page reader-theme-${theme}`}>
      <div className="reader-page-inner" style={{ padding: `${Math.max(18, margin)}px` }}>
        <p className="reader-chapter">{page.chapterTitle}</p>
        <section className="reader-copy" style={{ fontFamily: fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)', fontSize, lineHeight: lineSpacing }} dangerouslySetInnerHTML={{ __html: page.html }} />
        <p className="reader-page-number">{page.pageNumber} / {total}</p>
      </div>
    </article>
  )
})
Page.displayName = 'ReaderPage'

interface BookDimensions { width: number; height: number; portrait: boolean }

export function PageFlipReader({ bookId }: { bookId: string }) {
  const search = useSearchParams()
  const router = useRouter()
  const source = search.get('source') === 'created' ? 'created' : 'imported'
  const flipRef = useRef<any>(null)
  const stageRef = useRef<HTMLElement>(null)
  const persistErrorShown = useRef(false)
  const [book, setBook] = useState<Book | null>(null)
  const [pages, setPages] = useState<ReaderPage[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [initialPage, setInitialPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progressError, setProgressError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [dimensions, setDimensions] = useState<BookDimensions>({ width: 360, height: 520, portrait: true })
  const { currentPage, setPage, theme, brightness, pageGap, viewMode, animation, renderQuality, engine, showChapters, showThumbnails } = useReaderStore()

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const update = () => {
      const { width, height } = stage.getBoundingClientRect()
      const portrait = window.innerWidth < 1024
      const safeWidth = Math.max(280, width - (portrait ? 28 : 150))
      const safeHeight = Math.max(400, height - 24)
      if (portrait) {
        const pageWidth = Math.floor(Math.min(safeWidth, safeHeight / 1.46, 560))
        setDimensions({ width: pageWidth, height: Math.floor(pageWidth * 1.46), portrait: true })
      } else {
        const pageWidth = Math.floor(Math.min(safeWidth / 2, safeHeight / 1.42, 560))
        setDimensions({ width: pageWidth, height: Math.floor(pageWidth * 1.42), portrait: false })
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    window.addEventListener('resize', update)
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError(''); setProgressError('')
      try {
        const currentProfile = await getCurrentProfile()
        if (!currentProfile) { router.replace(`/auth/login?next=${encodeURIComponent(`/book/${bookId}?source=${source}`)}`); return }
        let loadedBook: Book | null
        let loadedPages: ReaderPage[]
        if (source === 'created') {
          const created = await getCreatedBook(bookId)
          loadedBook = created
          loadedPages = created ? await new CreatedBookSource(created, created.chapters || []).load() : []
        } else {
          loadedBook = await getImportedBook(bookId)
          loadedPages = loadedBook ? await new ImportedBookSource(loadedBook).load() : []
        }
        if (!loadedBook) throw new Error('Livro não encontrado ou acesso não permitido.')
        if (!loadedPages.length) throw new Error('Este livro ainda não possui conteúdo legível.')
        await registerBookRead(bookId, source)
        const progress = await getReadingProgress(currentProfile.id, loadedBook.id, loadedBook.source)
        const page = Math.min(progress?.current_page || 0, loadedPages.length - 1)
        if (!active) return
        setProfile(currentProfile); setBook(loadedBook); setPages(loadedPages); setInitialPage(page); setPage(page)
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o leitor.')
      } finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [bookId, source, setPage, reloadKey, router])

  useEffect(() => {
    if (!profile || !book || !pages.length) return
    const timer = window.setTimeout(async () => {
      try {
        await updateReadingProgress({ user_id: profile.id, book_id: book.id, book_source: book.source, current_page: currentPage, percent: Math.round(((currentPage + 1) / pages.length) * 100) })
        persistErrorShown.current = false
        setProgressError('')
      } catch (cause) {
        if (!persistErrorShown.current) {
          persistErrorShown.current = true
          setProgressError(cause instanceof Error ? cause.message : 'Não foi possível salvar o progresso.')
        }
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [currentPage, profile, book, pages.length])

  const previous = useCallback(() => flipRef.current?.pageFlip()?.flipPrev(), [])
  const next = useCallback(() => flipRef.current?.pageFlip()?.flipNext(), [])
  const goTo = useCallback((page: number) => {
    const instance = flipRef.current?.pageFlip()
    if (!instance) return
    if (typeof instance.flip === 'function') instance.flip(page)
    else instance.turnToPage(page)
  }, [])

  useEffect(() => {
    function keys(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft') previous()
    }
    window.addEventListener('keydown', keys)
    return () => window.removeEventListener('keydown', keys)
  }, [next, previous])

  const percentage = useMemo(() => pages.length ? Math.round(((currentPage + 1) / pages.length) * 100) : 0, [currentPage, pages.length])
  const chapter = pages[currentPage]?.chapterTitle || pages[0]?.chapterTitle || ''
  const searchPages = useCallback((query: string) => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR')
    if (!normalized) return
    const found = pages.findIndex((item) => item.html.replace(/<[^>]+>/g, ' ').toLocaleLowerCase('pt-BR').includes(normalized))
    if (found >= 0) { setPage(found); window.setTimeout(() => goTo(found), 0) }
  }, [pages, goTo, setPage])
  const flipTime = animation === 'fade' ? 360 : animation === 'apple' ? 520 : animation === 'real-page' ? 720 : 480

  return (
    <main className={`reader-shell reader-theme-${theme} reader-quality-${renderQuality} reader-engine-${engine} reader-animation-${animation}`} style={{ filter: `brightness(${brightness}%)`, ['--reader-page-gap' as string]: `${pageGap}px` }}>
      {book && <div className="reader-toolbar-wrap"><ReaderToolbar title={book.title} chapter={chapter} bookId={book.id} source={book.source} currentPage={currentPage} onSearch={searchPages} /></div>}
      <section ref={stageRef} className="reader-stage">
        {loading && <div className="reader-status"><LoaderCircle className="animate-spin" /><p>Preparando suas páginas…</p></div>}
        {!loading && error && <div className="reader-status max-w-md text-center"><AlertCircle /><p>{error}</p><button onClick={() => setReloadKey((value) => value + 1)} className="secondary-btn !min-h-10"><RotateCcw size={15} /> Tentar novamente</button></div>}
        {!loading && !error && book && pages.length > 0 && <>
          {showChapters && <aside className="reader-side-panel reader-chapters-panel"><h2>Capítulos</h2>{Array.from(new Set(pages.map((item) => item.chapterTitle))).map((title) => { const index = pages.findIndex((item) => item.chapterTitle === title); return <button key={`${title}-${index}`} onClick={() => { setPage(index); goTo(index) }}>{title || `Página ${index + 1}`}</button> })}</aside>}
          {showThumbnails && <aside className="reader-side-panel reader-thumbnails-panel"><h2>Miniaturas</h2>{pages.map((item, index) => <button key={index} onClick={() => { setPage(index); goTo(index) }} className={index === currentPage ? 'is-active' : ''}>{index + 1}</button>)}</aside>}
          {viewMode === 'scroll' ? <section className="reader-scroll-view">{pages.map((item) => <Page key={`${item.pageNumber}-${item.chapterTitle}`} page={item} total={pages.length} />)}</section> : <>
          <button onClick={previous} className="reader-arrow reader-arrow-left" aria-label="Página anterior"><ChevronLeft /></button>
          <div className={`pageflip-frame ${dimensions.portrait ? 'is-portrait' : 'is-spread'}`} style={{ width: dimensions.portrait ? dimensions.width : dimensions.width * 2, height: dimensions.height }}>
            <HTMLFlipBook
              key={`${book.id}-${initialPage}-${dimensions.portrait}`}
              ref={flipRef}
              width={dimensions.width}
              height={dimensions.height}
              size="fixed"
              minWidth={dimensions.width}
              maxWidth={dimensions.width}
              minHeight={dimensions.height}
              maxHeight={dimensions.height}
              maxShadowOpacity={0.58}
              showCover={false}
              mobileScrollSupport={true}
              useMouseEvents={true}
              swipeDistance={24}
              clickEventForward={true}
              drawShadow={true}
              flippingTime={flipTime}
              startPage={initialPage}
              usePortrait={dimensions.portrait}
              startZIndex={0}
              autoSize={false}
              showPageCorners={true}
              disableFlipByClick={false}
              onFlip={(event: { data: number }) => setPage(event.data)}
              className="pageflip-book"
              style={{}}
            >
              {pages.map((page) => <Page key={`${page.pageNumber}-${page.chapterTitle}`} page={page} total={pages.length} />)}
            </HTMLFlipBook>
          </div>
          <button onClick={next} className="reader-arrow reader-arrow-right" aria-label="Próxima página"><ChevronRight /></button>
          </>}
        </>}
      </section>
      {book && pages.length > 0 && <footer className="reader-footer">
        <ThemeSwitcher />
        <input className="reader-range" type="range" min={0} max={Math.max(0, pages.length - 1)} value={currentPage} onChange={(event) => { const page = Number(event.target.value); goTo(page) }} aria-label="Progresso de leitura" />
        <span className="reader-progress-label">{currentPage + 1}/{pages.length} · {percentage}%</span>
        {progressError && <span className="reader-save-error" title={progressError}>Progresso não salvo</span>}
      </footer>}
    </main>
  )
}
