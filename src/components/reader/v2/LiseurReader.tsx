'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, Bookmark as BookmarkIcon, Sun, Search as SearchIcon, X } from 'lucide-react'
import { READER_FONTS, readerFontCss } from '@/lib/reader/fonts'
import { useReaderStore } from '@/store/readerStore'
import { SelectionToolbar } from '../SelectionToolbar'
import {
  ChapterBlocks,
  anchorAtPoint,
  chapterIndexForAnchor,
  rectForAnchor,
  snippetForAnchor,
} from './content'
import { useReaderActions } from './useReaderActions'
import type { BookData } from './useBookData'

/* Margens laterais de cada "página" do pager (column-gap do multicol). */
const PAGE_GAP_PX = 44
const FONT_MIN = 16
const FONT_MAX = 30

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/* Leitor celular — visual 1:1 de chmouel/liseur (Apache-2.0):
 * pager horizontal paginado (Kindle), tap zones (esquerda/centro/direita),
 * chrome em duas barras finas, scrubber com ticks de capítulos, sheet "Aa"
 * (temas/Tamanho/Brilho/Fonte) e tela Navegar (Sumário/Marcadores/Grifos).
 * A lógica compartilhada (modelo: capítulo, âncora, salto, busca, grifos)
 * mora em useReaderActions; aqui fica só a apresentação (pager de colunas). */

const NAV_TABS = ['contents', 'bookmarks', 'highlights'] as const
type NavTab = typeof NAV_TABS[number]

const MOBILE_THEMES: Array<{ value: 'light' | 'cream' | 'sepia' | 'gray' | 'black'; color: string }> = [
  { value: 'light', color: '#ffffff' },
  { value: 'cream', color: '#f2ece1' },
  { value: 'sepia', color: '#f4ecd8' },
  { value: 'gray', color: '#1e1e1e' },
  { value: 'black', color: '#000000' },
]

export function LiseurReader({ data }: { data: BookData }) {
  const { theme, setTheme, fontFamily, setFontFamily, mobileFontSize, setMobileFontSize, brightness, setBrightness } = useReaderStore()

  const pagerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; moved: boolean } | null>(null)
  const lastDragPx = useRef(0)
  const suppressClick = useRef(false)
  const scrubPreviewRef = useRef<number | null>(null)
  const probeRef = useRef<() => void>(() => {})

  const [column, setColumn] = useState(0)
  const [chapterPages, setChapterPages] = useState(1)
  const [measured, setMeasured] = useState<Partial<Record<number, number>>>({})
  const [viewportWidth, setViewportWidth] = useState(0)
  const [fontTick, setFontTick] = useState(0)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [navigateOpen, setNavigateOpen] = useState(false)
  const [navigateTab, setNavigateTab] = useState<NavTab>('contents')
  const [dragPx, setDragPx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [scrubPreview, setScrubPreview] = useState<number | null>(null)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  const {
    t,
    selection,
    close,
    chapterIndex,
    chapter,
    chapterStart,
    chapterWords,
    viewAnchor,
    viewAnchorRef,
    chapterIndexRef,
    pendingJump,
    jumpTick,
    setViewAnchorNow,
    goToChapter,
    searchOpen,
    setSearchOpen,
    searchText,
    setSearchText,
    results,
    inlineMatch,
    jumpToResult,
    runSearch,
    closeSearch,
    isBookmarked,
    toggleBookmark,
    copied,
    dictionary,
    handleHighlight,
    handleNote,
    handleDictionary,
    handleShare,
    handleCopy,
    dismissSelection,
  } = useReaderActions(data, pagerRef)

  /* A medição das colunas só é confiável depois que as fontes carregam. */
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => { if (alive) setFontTick((value) => value + 1) })
    return () => { alive = false }
  }, [])

  /* ------------------------------------------------------ viewport */
  useEffect(() => {
    const viewport = pagerRef.current
    if (!viewport) return
    setViewportWidth(viewport.clientWidth)
    const observer = new ResizeObserver(() => setViewportWidth(viewport.clientWidth))
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  /* ------------------------------------------- estimativa páginas × capítulo */
  const estimatedPagesFor = useCallback((index: number) => {
    const exact = measured[index]
    if (exact) return exact
    const words = data.chapterWordCounts[index] ?? 0
    const density = measured[chapterIndex ?? -1] && chapterWords > 0 && chapterPages > 1
      ? chapterWords / chapterPages
      : 220
    return Math.max(1, Math.round(words / Math.max(60, density)))
  }, [measured, data.chapterWordCounts, chapterIndex, chapterWords, chapterPages])

  const chaptersBefore = useCallback((index: number) => {
    let total = 0
    for (let i = 0; i < index && i < data.chapters.length; i++) total += estimatedPagesFor(i)
    return total
  }, [data.chapters.length, estimatedPagesFor])

  const globalTotal = Math.max(1, chaptersBefore(data.chapters.length))
  const globalPage = (chapterIndex != null ? chaptersBefore(chapterIndex) : 0) + column + 1
  const percentText = data.totalWords
    ? clamp(Math.round(((viewAnchor + 1) / data.totalWords) * 100), 0, 100)
    : clamp(Math.round((((chapterIndex != null ? chaptersBefore(chapterIndex) + column : 0) + 1) / globalTotal) * 100), 0, 100)
  const pageStep = Math.max(120, viewportWidth || 360)

  /* ------------------------------------------------ medição das colunas */
  useLayoutEffect(() => {
    if (chapterIndex == null) return
    const viewport = pagerRef.current
    const content = contentRef.current
    if (!viewport || !content) return
    const step = Math.max(120, viewport.clientWidth)
    const jump = pendingJump.current
    const hadJump = Boolean(jump)

    const count = Math.max(1, Math.round((content.scrollWidth + PAGE_GAP_PX) / step))
    setMeasured((old) => (old[chapterIndex] === count ? old : { ...old, [chapterIndex]: count }))
    setChapterPages(count)

    let target = 0
    if (jump && jump.kind === 'anchor' && jump.anchor != null) {
      const capped = clamp(jump.anchor, chapterStart, chapterStart + Math.max(1, chapterWords) - 1)
      const rect = rectForAnchor(content, capped)
      if (rect) target = clamp(Math.round((rect.left - viewport.getBoundingClientRect().left) / step), 0, count - 1)
    } else if (jump && jump.kind === 'end') {
      target = count - 1
    } else if (viewAnchorRef.current >= chapterStart && viewAnchorRef.current <= chapterStart + chapterWords) {
      const rect = rectForAnchor(content, clamp(viewAnchorRef.current, chapterStart, Math.max(chapterStart, chapterStart + chapterWords - 1)))
      if (rect) target = clamp(Math.round((rect.left - viewport.getBoundingClientRect().left) / step), 0, count - 1)
    }
    pendingJump.current = null
    setColumn(target)
    setDragPx(0)

    if (hadJump) {
      requestAnimationFrame(() => probeRef.current())
    }
  }, [chapterIndex, jumpTick, viewportWidth, mobileFontSize, fontFamily, fontTick, chapterStart, chapterWords, pendingJump, viewAnchorRef])

  /* probe do anchor no topo da coluna — fonte de verdade do progresso */
  useEffect(() => {
    probeRef.current = () => {
      const viewport = pagerRef.current
      if (!viewport) return
      let anchor: number | null = null
      for (const y of [76, 130, 210, 320, 440]) {
        anchor = anchorAtPoint(viewport, Math.round(window.innerWidth / 2), y)
        if (anchor != null) break
      }
      if (anchor == null) return
      setViewAnchorNow(anchor)
      const percent = data.totalWords ? clamp(Math.round(((anchor + 1) / data.totalWords) * 100), 0, 100) : 0
      data.saveProgress(anchor, chapterIndexRef.current, percent)
    }
  }, [data, setViewAnchorNow, chapterIndexRef])

  const probeAfterTransition = useCallback((delay = 300) => {
    window.setTimeout(() => probeRef.current(), delay)
  }, [])

  /* --------------------------------------------------------- navegação */
  const nextPage = useCallback(() => {
    if (chapterIndex == null) return
    if (column + 1 < chapterPages) {
      setColumn(column + 1)
      probeAfterTransition()
    } else {
      goToChapter(chapterIndex + 1, 'start')
    }
  }, [chapterIndex, column, chapterPages, goToChapter, probeAfterTransition])

  const prevPage = useCallback(() => {
    if (chapterIndex == null) return
    if (column > 0) {
      setColumn(column - 1)
      probeAfterTransition()
    } else if (chapterIndex > 0) {
      goToChapter(chapterIndex - 1, 'end')
    }
  }, [chapterIndex, column, goToChapter, probeAfterTransition])

  /* -------------------------------------------------------- interação */
  const onTapViewport = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (suppressClick.current) { suppressClick.current = false; return }
    const target = event.target as Element | null
    if (!target) return
    if (target.closest('button, a, input, select, textarea, img')) return
    if (window.getSelection()?.toString() || selection) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - bounds.left) / Math.max(1, bounds.width)
    if (ratio < 0.3) prevPage()
    else if (ratio > 0.7) nextPage()
    else setChromeVisible((value) => !value)
  }, [prevPage, nextPage, selection])

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (window.getSelection()?.toString()) return
    lastDragPx.current = 0
    dragRef.current = { startX: event.clientX, moved: false }
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    if (Math.abs(dx) > 6) {
      drag.moved = true
      if (!dragging) setDragging(true)
      let damped = dx
      const atBookEnd = chapterIndex === data.chapters.length - 1
      if (column <= 0 && damped > 0) damped *= 0.35
      if (damped < 0 && column >= chapterPages - 1 && atBookEnd) damped *= 0.35
      lastDragPx.current = damped
      setDragPx(damped)
    }
  }, [dragging, chapterIndex, column, chapterPages, data.chapters])

  const onPointerUp = useCallback(() => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    setDragging(false)
    if (drag.moved) {
      const dx = lastDragPx.current
      suppressClick.current = true
      setDragPx(0)
      if (dx < -60) nextPage()
      else if (dx > 60) prevPage()
    } else {
      setDragPx(0)
    }
  }, [nextPage, prevPage])

  /* --------------------------------------------------------- scrubber */
  const scrubMax = Math.max(1, globalTotal - 1)
  const scrubValue = scrubPreview ?? (chapterIndex != null ? chaptersBefore(chapterIndex) + column : 0)
  const scrubTrackFill = (scrubValue / scrubMax) * 100

  const onScrubInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    scrubPreviewRef.current = value
    setScrubPreview(value)
  }, [])

  const commitScrub = useCallback(() => {
    const pending = scrubPreviewRef.current
    scrubPreviewRef.current = null
    setScrubPreview(null)
    if (pending == null) return
    let remaining = pending
    for (let i = 0; i < data.chapters.length; i++) {
      const count = estimatedPagesFor(i)
      if (remaining < count || i === data.chapters.length - 1) {
        const words = data.chapterWordCounts[i] ?? 0
        const anchor = words
          ? data.chapterStarts[i] + clamp(Math.round((remaining / count) * (words - 1)), 0, words - 1)
          : data.chapterStarts[i]
        goToChapter(i, anchor)
        break
      }
      remaining -= count
    }
  }, [data, estimatedPagesFor, goToChapter])

  /* ------------------------------------------------------------ renders */
  const articleStyle = { fontFamily: readerFontCss(fontFamily), fontSize: mobileFontSize, textAlign: 'left' as const }

  return (
    <div className={chromeVisible ? 'rv-screen' : 'rv-screen rv-immersive'}>
      {/* ---------------------------------------------------- pager */}
      <div
        className="rv-pager"
        ref={pagerRef}
        onClick={onTapViewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragRef.current = null; setDragging(false); setDragPx(0) }}
      >
        {data.loading && (
          <div className="rv-status" aria-busy="true" role="status">
            <div className="rv-status__skeleton" />
            <div className="rv-status__skeleton" />
            <div className="rv-status__skeleton" />
            <p className="rv-status__label">{t('preparing')}</p>
          </div>
        )}
        {!data.loading && data.error && (
          <div className="rv-error">
            <h2>{data.error}</h2>
            {!data.fatal && <button type="button" className="rv-error__btn" onClick={data.reload}> {t('retry')}</button>}
          </div>
        )}
        {!data.loading && !data.error && chapter && (
          <div
            className="rv-pager__content"
            ref={contentRef}
            key={`rv-ch-${chapterIndex}`}
            style={{
              columnWidth: Math.max(60, pageStep - PAGE_GAP_PX),
              columnGap: PAGE_GAP_PX,
              transform: `translateX(${-column * pageStep + dragPx}px)`,
              transition: dragging ? 'none' : undefined,
            }}
          >
            <article className="rv-article" style={articleStyle}>
              {!chapter.blocks.some((block) => block.type === 'heading' && block.text === chapter.title) ? (
                <h1 className="rv-chapter-heading">{chapter.title}</h1>
              ) : null}
              <ChapterBlocks
                chapter={chapter}
                startAnchor={chapterStart}
                highlights={data.highlights}
                query={inlineMatch}
                onImageClick={(src, alt) => setLightbox({ src, alt: alt || '' })}
              />
            </article>
          </div>
        )}
        <div className="rv-fade rv-fade--top" />
        <div className="rv-fade rv-fade--bottom" />
      </div>

      {/* ---------------------------------------------------- top bar */}
      <header className="rv-top-bar">
        <div className="rv-top-bar__left">
          <button type="button" className="rv-top-bar__back" aria-label={t('closeReader')} onClick={close}><ArrowLeft size={21} /></button>
          <div className="rv-top-bar__title"><span className="rv-top-bar__book-title">{data.book?.title}</span></div>
        </div>
        <div className="rv-top-bar__right">
          <button type="button" className="rv-top-bar__btn" aria-label={t('search')} onClick={() => { setSheetOpen(false); setSearchOpen(true) }}><SearchIcon size={19} /></button>
          <button type="button" className="rv-top-bar__btn rv-top-bar__aa" aria-label={t('readingOptions')} onClick={() => { setSheetOpen(true); setNavigateOpen(false); setSearchOpen(false) }}>Aa</button>
          <button type="button" className="rv-top-bar__btn" aria-label={t('contents')} onClick={() => { setNavigateOpen(true); setSheetOpen(false); setSearchOpen(false); setNavigateTab('contents') }}>☰</button>
          <button
            type="button"
            className="rv-top-bar__btn"
            aria-label={t('savePage')}
            onClick={toggleBookmark}
            style={isBookmarked ? { color: 'var(--reader-accent)' } : undefined}
          >
            <BookmarkIcon size={19} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </header>

      {/* ---------------------------------------------------- chrome bottom */}
      {chromeVisible && (
        <footer className="rv-chrome-bottom">
          <div className="rv-chrome-bottom__chapter">{chapter?.title}</div>
          <div className="rv-scrub">
            <div className="rv-scrub__track">
              <div className="rv-scrub__fill" style={{ width: `${clamp(scrubTrackFill, 0, 100)}%` }} />
              <div className="rv-scrub__ticks">
                {data.chapters.map((item, index) => (index === 0 ? null : (
                  <span
                    key={item.id ?? index}
                    className="rv-scrub__tick"
                    style={{ left: `${(data.chapterStarts[index] / Math.max(1, data.totalWords)) * 100}%` }}
                  />
                )))}
              </div>
              <div className="rv-scrub__handle" style={{ left: `${clamp(scrubTrackFill, 0, 100)}%` }} />
              <input
                className="rv-scrub__input"
                type="range"
                min={0}
                max={scrubMax}
                step={1}
                value={clamp(scrubValue, 0, scrubMax)}
                aria-label={t('readingProgress')}
                onChange={onScrubInput}
                onPointerUp={commitScrub}
                onKeyUp={commitScrub}
                onBlur={commitScrub}
              />
            </div>
          </div>
          <div className="rv-chrome-bottom__meta">
            <span>{percentText}%</span>
            <span>{t('pageOf', { current: globalPage, total: globalTotal })}</span>
          </div>
          {data.saveError && <div className="rv-toast" role="status">{data.saveError}</div>}
        </footer>
      )}

      {/* ---------------------------------------------------- sheet "Aa" */}
      {sheetOpen && (
        <>
          <div className="rv-sheet-backdrop" onClick={() => setSheetOpen(false)} />
          <div className="rv-sheet" role="dialog" aria-label={t('readingOptions')}>
            <div className="rv-sheet__handle" />
            <div className="rv-sheet__label">{t('theme')}</div>
            <div className="rv-themes">
              {MOBILE_THEMES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`rv-theme-circle ${theme === item.value ? 'active' : ''}`}
                  style={{ background: item.color }}
                  aria-label={t(item.value)}
                  onClick={() => setTheme(item.value)}
                />
              ))}
            </div>
            <div className="rv-sheet__label">{t('size')}</div>
            <div className="rv-mslider">
              <span className="rv-mslider__end rv-mslider__end--small">A</span>
              <div className="rv-mslider__track">
                <div className="rv-mslider__filled" style={{ width: `${((mobileFontSize - FONT_MIN) / (FONT_MAX - FONT_MIN)) * 100}%` }} />
                <div className="rv-mslider__rest" style={{ width: `${(1 - (mobileFontSize - FONT_MIN) / (FONT_MAX - FONT_MIN)) * 100}%` }} />
                <div className="rv-mslider__steps">
                  {Array.from({ length: 8 }).map((_, index) => <span key={index} className="rv-mslider__step" />)}
                </div>
                <div className="rv-mslider__handle" style={{ left: `${((mobileFontSize - FONT_MIN) / (FONT_MAX - FONT_MIN)) * 100}%` }} />
                <input
                  className="rv-mslider__input"
                  type="range"
                  min={FONT_MIN}
                  max={FONT_MAX}
                  step={2}
                  value={mobileFontSize}
                  aria-label={t('size')}
                  onChange={(event) => setMobileFontSize(Number(event.target.value))}
                />
              </div>
              <span className="rv-mslider__end rv-mslider__end--big">A</span>
            </div>
            <div className="rv-sheet__label">{t('brightness')}</div>
            <div className="rv-mslider">
              <Sun size={13} className="rv-mslider__sun" />
              <div className="rv-mslider__track">
                <div className="rv-mslider__filled" style={{ width: `${((brightness - 45) / 55) * 100}%` }} />
                <div className="rv-mslider__rest" style={{ width: `${(1 - (brightness - 45) / 55) * 100}%` }} />
                <div className="rv-mslider__handle" style={{ left: `${((brightness - 45) / 55) * 100}%` }} />
                <input
                  className="rv-mslider__input"
                  type="range"
                  min={45}
                  max={100}
                  value={brightness}
                  aria-label={t('brightness')}
                  onChange={(event) => setBrightness(Number(event.target.value))}
                />
              </div>
              <Sun size={19} className="rv-mslider__sun" />
            </div>
            <div className="rv-sheet__label">{t('font')}</div>
            <div className="rv-font-wrap">
              <select className="rv-font-select" value={fontFamily} onChange={(event) => setFontFamily(event.target.value as typeof fontFamily)} aria-label={t('font')}>
                {READER_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>{font.label}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* ---------------------------------------------------- tela navegar */}
      {navigateOpen && (
        <div className="rv-navigate" role="dialog" aria-label={t('contents')}>
          <div className="rv-navigate__header">
            <button type="button" className="rv-navigate__back" aria-label={t('closeReader')} onClick={() => setNavigateOpen(false)}><ArrowLeft size={22} /></button>
            <span className="rv-navigate__title">{data.book?.title}</span>
          </div>
          <div className="rv-navigate__tabs">
            {NAV_TABS.map((tab) => (
              <button key={tab} type="button" className={`rv-navigate__tab ${navigateTab === tab ? 'active' : ''}`} onClick={() => setNavigateTab(tab)}>{t(tab)}</button>
            ))}
          </div>
          <div className="rv-navigate__list">
            {navigateTab === 'contents' && data.chapters.map((item, index) => (
              <button key={item.id || index} type="button" className="rv-navigate__row" onClick={() => { goToChapter(index, 'start'); setNavigateOpen(false) }}>
                <div className="rv-navigate__body">
                  <div className="rv-navigate__text">{item.title}</div>
                </div>
              </button>
            ))}
            {navigateTab === 'bookmarks' && (data.bookmarks.length ? data.bookmarks.map((item) => {
              const bookmarkAnchor = Number(item.anchor_offset || 0)
              const itemIndex = Math.max(0, chapterIndexForAnchor(data.chapterStarts, bookmarkAnchor))
              const snippet = snippetForAnchor(data.chapters, data.chapterStarts, bookmarkAnchor)
              return (
                <div key={item.id} className="rv-navigate__row">
                  <button type="button" className="rv-navigate__body" onClick={() => { goToChapter(itemIndex, bookmarkAnchor || 'start'); setNavigateOpen(false) }}>
                    <div className="rv-navigate__meta">{data.chapters[itemIndex]?.title}</div>
                    <div className="rv-navigate__text">{snippet || data.chapters[itemIndex]?.title}</div>
                    {item.note ? <div className="rv-navigate__meta">{item.note}</div> : null}
                  </button>
                  <button type="button" className="rv-navigate__trash" aria-label={t('removeBookmark')} onClick={() => { void data.toggleBookmarkAt(bookmarkAnchor, item.page_number) }}>
                    <X size={17} />
                  </button>
                </div>
              )
            }) : <div className="rv-navigate__empty">{t('noBookmarks')}</div>)}
            {navigateTab === 'highlights' && (data.highlights.length ? data.highlights.map((item) => {
              const anchor = Number(item.anchor_start || 0)
              const itemIndex = Math.max(0, chapterIndexForAnchor(data.chapterStarts, anchor))
              return (
                <div key={item.id} className="rv-navigate__row">
                  <span className={`rv-navigate__dot is-${item.color}`} />
                  <button type="button" className="rv-navigate__body" onClick={() => { goToChapter(itemIndex, anchor); setNavigateOpen(false) }}>
                    <div className="rv-navigate__meta">{data.chapters[itemIndex]?.title}</div>
                    <div className="rv-navigate__text">{item.selected_text}</div>
                    {item.note ? <div className="rv-navigate__meta">{item.note}</div> : null}
                  </button>
                  <button type="button" className="rv-navigate__trash" aria-label={t('removeHighlight')} onClick={() => { void data.removeHighlight(item.id) }}>
                    <X size={17} />
                  </button>
                </div>
              )
            }) : <div className="rv-navigate__empty">{t('noHighlights')}</div>)}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- busca (celular) */}
      {searchOpen && (
        <div className="rv-navigate" role="dialog" aria-label={t('search')}>
          <div className="rv-navigate__header">
            <button type="button" className="rv-navigate__back" aria-label={t('closeReader')} onClick={closeSearch}><ArrowLeft size={22} /></button>
            <span className="rv-navigate__title">{t('search')}</span>
          </div>
          <div className="rv-navigate__search">
            <input
              className="rv-navigate__search-input"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') runSearch(searchText) }}
              placeholder={t('searchPlaceholder')}
              aria-label={t('search')}
              autoFocus
            />
            <button type="button" className="rv-navigate__search-go" aria-label={t('search')} onClick={() => runSearch(searchText)}>
              <SearchIcon size={18} />
            </button>
          </div>
          <div className="rv-navigate__list">
            {results.length ? results.map((result, index) => (
              <button key={`${result.chapterIndex}-${result.anchor}-${index}`} type="button" className="rv-navigate__hit" onClick={() => { jumpToResult(index); closeSearch() }}>
                <div className="rv-navigate__meta">{result.chapterTitle}</div>
                <div className="rv-navigate__text">
                  {result.before}
                  <mark className="rv-mark">{result.match}</mark>
                  {result.after}
                </div>
              </button>
            )) : (searchText ? <div className="rv-navigate__empty">{t('noResults')}</div> : <div className="rv-navigate__empty">{t('searchPlaceholder')}</div>)}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- seleção */}
      {selection && (
        <SelectionToolbar
          selection={selection}
          copied={copied}
          dictionary={dictionary}
          onCopy={handleCopy}
          onHighlight={handleHighlight}
          onNote={handleNote}
          onDictionary={handleDictionary}
          onShare={handleShare}
          onClose={dismissSelection}
        />
      )}

      {/* ---------------------------------------------------- lightbox */}
      {lightbox && (
        <div className="rv-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <img src={lightbox.src} alt={lightbox.alt} />
          <button type="button" className="rv-lightbox__close" aria-label={t('closeReader')}><X size={20} /></button>
        </div>
      )}
    </div>
  )
}
