'use client'

import FlipBook from 'react-pageflip'
import { useRouter, useSearchParams } from 'next/navigation'
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw } from 'lucide-react'
import { CreatedBookSource, ImportedBookSource, repaginateReaderContent } from '@/lib/reader/ReaderSource'
import { getBookmarks, getCreatedBook, getCurrentProfile, getImportedBook, getReadingProgress, registerBookRead, toggleBookmark, updateReadingProgress } from '@/lib/data'
import type { Book, CreatedBook, ReaderBookmark, ReaderPage, UserProfile } from '@/lib/types'
import { useReaderStore } from '@/store/readerStore'
import { ReaderToolbar } from './ReaderToolbar'
import { ThemeSwitcher } from './ThemeSwitcher'

const HTMLFlipBook = FlipBook as any

function highlightedText(text: string, query: string) {
  const needle = query.trim()
  if (!needle) return text
  const expression = new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.split(expression).map((part, index) => expression.test(part) ? <mark key={index}>{part}</mark> : part)
}

const Page = memo(forwardRef<HTMLDivElement, { page: ReaderPage; total: number; query: string }>(({ page, total, query }, ref) => {
  const { theme, fontSize, fontFamily, margin, lineSpacing } = useReaderStore()
  return <article ref={ref} className={`reader-page reader-theme-${theme}`}>
    <div className="reader-page-inner" style={{ padding: `${margin}px` }}>
      <p className="reader-chapter">{page.chapterTitle}</p>
      <section className="reader-copy" style={{ fontFamily: fontFamily === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)', fontSize, lineHeight: lineSpacing }}><p>{highlightedText(page.text || '', query)}</p></section>
      <p className="reader-page-number">{page.pageNumber} / {total}</p>
    </div>
  </article>
}))
Page.displayName = 'ReaderPage'

interface BookDimensions { width: number; height: number; portrait: boolean }
const safeRoute = (value: string | null, fallback: string) => value?.startsWith('/') && !value.startsWith('//') ? value : fallback

export function PageFlipReader({ bookId }: { bookId: string }) {
  const search = useSearchParams()
  const router = useRouter()
  const t = useTranslations('reader')
  const source = search.get('source') === 'created' ? 'created' : 'imported'
  const flipRef = useRef<any>(null)
  const stageRef = useRef<HTMLElement>(null)
  const persistErrorShown = useRef(false)
  const positionAnchorRef = useRef(0)
  const [book, setBook] = useState<Book | null>(null)
  const [sourcePages, setSourcePages] = useState<ReaderPage[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progressError, setProgressError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [searchMatch, setSearchMatch] = useState('')
  const [direction, setDirection] = useState<'next' | 'previous'>('next')
  const [dimensions, setDimensions] = useState<BookDimensions>({ width: 360, height: 520, portrait: true })
  const store = useReaderStore()
  const { currentPage, setPage, theme, brightness, pageGap, viewMode, animation, renderQuality, showChapters, showThumbnails, fontSize, margin, lineSpacing } = store

  const wordsPerPage = useMemo(() => {
    const areaFactor = (dimensions.width * dimensions.height) / (360 * 520)
    return Math.max(60, Math.round(165 * areaFactor * (18 / fontSize) * (38 / margin) * (1.68 / lineSpacing)))
  }, [dimensions, fontSize, margin, lineSpacing])
  const pages = useMemo(() => repaginateReaderContent(sourcePages, wordsPerPage), [sourcePages, wordsPerPage])
  const scrollWindowStart = Math.max(0, currentPage - 4)
  const scrollPages = pages.slice(scrollWindowStart, scrollWindowStart + 9)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const { width, height } = stage.getBoundingClientRect()
        const portrait = window.innerWidth < 1024
        const safeWidth = Math.max(280, width - (portrait ? 24 : 150))
        const safeHeight = Math.max(400, height - 24)
        const pageWidth = Math.floor(Math.min(portrait ? safeWidth : safeWidth / 2, safeHeight / 1.46, 580))
        const next = { width: pageWidth, height: Math.floor(pageWidth * 1.46), portrait }
        setDimensions((old) => old.width === next.width && old.height === next.height && old.portrait === next.portrait ? old : next)
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true); setError(''); setProgressError('')
      try {
        const currentProfile = await getCurrentProfile()
        if (!currentProfile) { router.replace(`/auth/login?next=${encodeURIComponent(`/book/${bookId}?source=${source}&from=${encodeURIComponent(search.get('from') || '/')}`)}`); return }
        const loadedBook = source === 'created' ? await getCreatedBook(bookId) : await getImportedBook(bookId)
        const loadedPages = loadedBook ? await (source === 'created' ? new CreatedBookSource(loadedBook, (loadedBook as CreatedBook).chapters || []) : new ImportedBookSource(loadedBook)).load() : []
        if (!loadedBook || !loadedPages.length) throw new Error('Livro não encontrado ou sem conteúdo legível.')
        await registerBookRead(bookId, source)
        const [progress, savedBookmarks] = await Promise.all([getReadingProgress(currentProfile.id, loadedBook.id, loadedBook.source), getBookmarks(currentProfile.id, loadedBook.id, loadedBook.source)])
        if (!active) return
        setProfile(currentProfile); setBook(loadedBook); setSourcePages(loadedPages); setBookmarks(savedBookmarks as ReaderBookmark[])
        const initialAnchor = Number(progress?.anchor_offset || 0)
        const initialPages = repaginateReaderContent(loadedPages, wordsPerPage)
        const page = initialAnchor ? Math.max(0, initialPages.findLastIndex((item) => Number(item.anchor || 0) <= initialAnchor)) : Math.min(progress?.current_page || 0, initialPages.length - 1)
        positionAnchorRef.current = Number(initialPages[page]?.anchor || initialAnchor)
        setPage(page)
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o leitor.') }
      finally { if (active) setLoading(false) }
    }
    load()
    return () => { active = false }
  }, [bookId, source, reloadKey, router])

  useEffect(() => {
    if (!pages.length) return
    const anchoredPage = Math.max(0, pages.findLastIndex((item) => Number(item.anchor || 0) <= positionAnchorRef.current))
    if (anchoredPage !== currentPage) setPage(anchoredPage)
  }, [wordsPerPage, pages, currentPage, setPage])

  useEffect(() => {
    if (!profile || !book || !pages.length) return
    const timer = window.setTimeout(async () => {
      try {
        await updateReadingProgress({ user_id: profile.id, book_id: book.id, book_source: book.source, current_page: currentPage, anchor_offset: Number(pages[currentPage]?.anchor || 0), percent: Math.round(((currentPage + 1) / pages.length) * 100) })
        persistErrorShown.current = false; setProgressError('')
      } catch (cause) { if (!persistErrorShown.current) { persistErrorShown.current = true; setProgressError(cause instanceof Error ? cause.message : t('notSaved')) } }
    }, 700)
    return () => window.clearTimeout(timer)
  }, [currentPage, profile, book, pages])

  const goTo = useCallback((page: number) => {
    const target = Math.max(0, Math.min(page, pages.length - 1))
    positionAnchorRef.current = Number(pages[target]?.anchor || 0)
    setDirection(target >= currentPage ? 'next' : 'previous')
    setPage(target)
  }, [currentPage, pages, setPage])
  const goToBookmark = useCallback((item: ReaderBookmark) => {
    const anchor = Number(item.anchor_offset || 0)
    goTo(anchor ? Math.max(0, pages.findLastIndex((page) => Number(page.anchor || 0) <= anchor)) : item.page_number)
  }, [goTo, pages])
  const previous = useCallback(() => goTo(currentPage - 1), [currentPage, goTo])
  const next = useCallback(() => goTo(currentPage + 1), [currentPage, goTo])
  const close = useCallback(() => router.replace(safeRoute(search.get('from'), `/book/${bookId}/details?source=${source}`)), [router, search, bookId, source])

  useEffect(() => { const keys = (event: KeyboardEvent) => { if (event.key === 'ArrowRight') next(); if (event.key === 'ArrowLeft') previous() }; window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys) }, [next, previous])

  async function bookmark() {
    if (!profile || !book) return
    await toggleBookmark(profile.id, book.id, book.source, currentPage, '', Number(pages[currentPage]?.anchor || 0))
    setBookmarks(await getBookmarks(profile.id, book.id, book.source) as ReaderBookmark[])
  }
  const searchPages = useCallback((query: string) => { const normalized = query.trim().toLocaleLowerCase(); if (!normalized) return; const found = pages.findIndex((item) => (item.text || '').toLocaleLowerCase().includes(normalized)); if (found >= 0) { setSearchMatch(query.trim()); goTo(found) } }, [pages, goTo])
  const percentage = pages.length ? Math.round(((currentPage + 1) / pages.length) * 100) : 0
  const chapter = pages[currentPage]?.chapterTitle || ''
  const windowStart = Math.max(0, Math.min(currentPage - 3, Math.max(0, pages.length - 8)))
  const flipPages = pages.slice(windowStart, windowStart + 8)
  const isBookmarked = bookmarks.some((item) => item.page_number === currentPage || Number(item.anchor_offset || -1) === Number(pages[currentPage]?.anchor || 0))

  return <main className={`reader-shell reader-theme-${theme} reader-quality-${renderQuality} reader-animation-${animation}`} style={{ ['--reader-page-gap' as string]: `${pageGap}px`, ['--reader-brightness' as string]: `${brightness}%` }}>
    {book && <div className="reader-toolbar-wrap"><ReaderToolbar title={book.title} chapter={chapter} currentPage={currentPage} bookmarks={bookmarks} bookmarked={isBookmarked} onClose={close} onSearch={searchPages} onToggleBookmark={bookmark} onNavigateBookmark={goToBookmark} /></div>}
    <section ref={stageRef} className="reader-stage">
      {loading && <div className="reader-status"><LoaderCircle className="animate-spin" /><p>{t('preparing')}</p></div>}
      {!loading && error && <div className="reader-status max-w-md text-center"><AlertCircle /><p>{error}</p><button onClick={() => setReloadKey((value) => value + 1)} className="secondary-btn !min-h-10"><RotateCcw size={15} /> {t('retry')}</button></div>}
      {!loading && !error && book && pages.length > 0 && <>
        {showChapters && <aside className="reader-side-panel reader-chapters-panel"><h2>{t('chapters')}</h2>{Array.from(new Set(pages.map((item) => item.chapterTitle))).map((title) => { const index = pages.findIndex((item) => item.chapterTitle === title); return <button key={`${title}-${index}`} onClick={() => goTo(index)}>{title}</button> })}</aside>}
        {showThumbnails && <aside className="reader-side-panel reader-thumbnails-panel"><h2>{t('thumbnails')}</h2>{pages.map((item, index) => <button key={index} onClick={() => goTo(index)} className={index === currentPage ? 'is-active' : ''}><span>{item.text?.slice(0, 55)}</span><b>{index + 1}</b></button>)}</aside>}
        {viewMode === 'scroll' ? <section className="reader-scroll-view" aria-label={t('scroll')}>
          <div className="reader-scroll-spacer" style={{ height: scrollWindowStart * (dimensions.height + pageGap) }} />
          {scrollPages.map((item, offset) => { const index = scrollWindowStart + offset; return <button key={item.anchor} onClick={() => goTo(index)} className={`reader-scroll-page ${index === currentPage ? 'is-current' : ''}`} style={{ minHeight: dimensions.height }}><Page page={item} total={pages.length} query={index === currentPage ? searchMatch : ''} /></button> })}
          <div className="reader-scroll-spacer" style={{ height: Math.max(0, pages.length - scrollWindowStart - scrollPages.length) * (dimensions.height + pageGap) }} />
        </section> : animation === 'real-page' ? <>
          <button onClick={() => flipRef.current?.pageFlip()?.flipPrev()} className="reader-arrow reader-arrow-left" aria-label={t('previous')}><ChevronLeft /></button>
          <div className={`pageflip-frame ${dimensions.portrait ? 'is-portrait' : 'is-spread'}`} style={{ width: dimensions.portrait ? dimensions.width : dimensions.width * 2, height: dimensions.height }}><HTMLFlipBook key={`${book.id}-${windowStart}-${dimensions.width}-${wordsPerPage}`} ref={flipRef} width={dimensions.width} height={dimensions.height} size="fixed" minWidth={dimensions.width} maxWidth={dimensions.width} minHeight={dimensions.height} maxHeight={dimensions.height} drawShadow={renderQuality === 'smooth'} maxShadowOpacity={renderQuality === 'smooth' ? 0.52 : 0.18} showCover={false} mobileScrollSupport useMouseEvents swipeDistance={24} flippingTime={renderQuality === 'smooth' ? 680 : 360} startPage={Math.min(currentPage - windowStart, flipPages.length - 1)} usePortrait={dimensions.portrait} autoSize={false} onFlip={(event: { data: number }) => goTo(windowStart + event.data)} className="pageflip-book">{flipPages.map((page) => <Page key={page.anchor} page={page} total={pages.length} query={page.pageNumber - 1 === currentPage ? searchMatch : ''} />)}</HTMLFlipBook></div>
          <button onClick={() => flipRef.current?.pageFlip()?.flipNext()} className="reader-arrow reader-arrow-right" aria-label={t('next')}><ChevronRight /></button>
        </> : <>
          <button onClick={previous} className="reader-arrow reader-arrow-left" aria-label={t('previous')}><ChevronLeft /></button>
          <div key={`${currentPage}-${animation}`} className={`reader-single-page reader-transition-${animation} is-${direction}`} style={{ width: dimensions.width, height: dimensions.height }}><Page page={pages[currentPage]} total={pages.length} query={searchMatch} /></div>
          <button onClick={next} className="reader-arrow reader-arrow-right" aria-label={t('next')}><ChevronRight /></button>
        </>}
      </>}
    </section>
    {book && pages.length > 0 && <footer className="reader-footer"><ThemeSwitcher /><input className="reader-range" type="range" min={0} max={Math.max(0, pages.length - 1)} value={currentPage} onChange={(event) => goTo(Number(event.target.value))} aria-label="Progresso de leitura" /><span className="reader-progress-label">{currentPage + 1}/{pages.length} · {percentage}%</span>{progressError && <span className="reader-save-error" title={progressError}>{t('notSaved')}</span>}</footer>}
  </main>
}
