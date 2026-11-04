'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Bookmark as BookmarkIcon, ChevronLeft, ChevronRight, List as ListIcon, RotateCcw, Search as SearchIcon, Settings as SettingsIcon, X } from 'lucide-react'
import { READER_FONTS, readerFontCss } from '@/lib/reader/fonts'
import { useReaderStore } from '@/store/readerStore'
import type { HighlightColor } from '@/lib/types'
import { SelectionToolbar } from '../SelectionToolbar'
import {
  ChapterBlocks,
  anchorAtPoint,
  chapterIndexForAnchor,
  clearPageSelection,
  rectForAnchor,
  searchBook,
  snippetForAnchor,
  useSelection,
  type BookSearchResult,
} from './content'
import type { BookData } from './useBookData'

const safeRoute = (value: string | null, fallback: string) => value?.startsWith('/') && !value.startsWith('//') ? value : fallback

const TOC_TABS = ['contents', 'bookmarks', 'highlights'] as const
type TocTab = typeof TOC_TABS[number]

const TOPIC_CIRCLES: { value: 'light' | 'sepia' | 'dark'; color: string }[] = [
  { value: 'light', color: '#ffffff' },
  { value: 'sepia', color: '#f4ecd8' },
  { value: 'dark', color: '#1a1a1a' },
]

const LINE_HEIGHTS: Array<{ value: 1.5 | 1.6 | 1.65 | 1.8; label: string }> = [
  { value: 1.5, label: '1.5' },
  { value: 1.6, label: '1.6' },
  { value: 1.65, label: '1.65' },
  { value: 1.8, label: '1.8' },
]

const ALIGN_OPTIONS: Array<{ value: 'left' | 'center' | 'justify'; key: string }> = [
  { value: 'left', key: 'alignLeft' },
  { value: 'center', key: 'alignCenter' },
  { value: 'justify', key: 'alignJustify' },
]

/* ==========================================================================
 * Leitor desktop — visual 1:1 de mrviduus/textstack (AGPL-3.0):
 * top bar 56px fixa, coluna de ~680px com scroll vertical por capítulo,
 * footer com barra 4px + capítulo/contador/percentual, drawers TOC/Busca
 * (esquerda) e Ajustes (direita), navegação de capítulo com botões de 44px.
 * ========================================================================== */

export function TextStackReader({ data }: { data: BookData }) {
  const t = useTranslations('reader')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize, lineHeight, setLineHeight, textAlign, setTextAlign } = useReaderStore()

  const scrollRef = useRef<HTMLDivElement>(null)
  const articleRef = useRef<HTMLElement>(null)
  const frameRef = useRef(0)
  const viewAnchorRef = useRef(0)
  const chapterIndexRef = useRef(0)
  const pendingScroll = useRef<{ kind: 'top' } | { kind: 'anchor'; anchor: number } | null>(null)
  const initialApplied = useRef(false)

  const [chapterIndex, setChapterIndex] = useState<number | null>(null)
  const [viewAnchor, setViewAnchor] = useState(0)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [tocOpen, setTocOpen] = useState(false)
  const [tocTab, setTocTab] = useState<TocTab>('contents')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [resultIndex, setResultIndex] = useState(-1)
  const [inlineMatch, setInlineMatch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [dictionary, setDictionary] = useState('')

  /* tick de saltos: aplica o pendingScroll mesmo quando o salto é dentro do
   * capítulo atual (grifo/marcador). */
  const [jumpTick, setJumpTick] = useState(0)

  const { selection, setSelection } = useSelection(scrollRef)

  const source = searchParams.get('source') === 'created' ? 'created' : 'imported'
  const close = useCallback(() => router.replace(safeRoute(searchParams.get('from'), `/book/${data.book?.id || ''}/details?source=${source}`)), [router, searchParams, data.book?.id, source])

  /* ------------------------------------------------- primeiro carregamento */
  useEffect(() => {
    if (data.loading || data.error) return
    if (!data.chapters.length || initialApplied.current) return
    initialApplied.current = true
    const anchor = Math.max(0, Math.min(data.savedAnchor, data.totalWords - 1))
    const index = anchor > 0 ? chapterIndexForAnchor(data.chapterStarts, anchor) : 0
    setChapterIndex(index)
    viewAnchorRef.current = anchor
    setViewAnchor(anchor)
    pendingScroll.current = anchor > 0 && data.chapterStarts[index] !== anchor ? { kind: 'anchor', anchor } : { kind: 'top' }
  }, [data.loading, data.error, data.chapters.length, data.savedAnchor, data.chapterStarts, data.totalWords])

  useEffect(() => {
    if (chapterIndex == null) return
    chapterIndexRef.current = chapterIndex
  }, [chapterIndex])

  /* --------------------------------------------- restore de posição no cap */
  const probeTopAnchor = useCallback(() => {
    requestAnimationFrame(() => {
      const element = scrollRef.current
      if (!element) return
      let anchor: number | null = null
      for (const y of [110, 150, 220, 320, 440]) {
        anchor = anchorAtPoint(element, Math.round(window.innerWidth / 2), y)
        if (anchor != null) break
      }
      if (anchor == null) return
      viewAnchorRef.current = anchor
      setViewAnchor(anchor)
      const index = chapterIndexRef.current
      const chapterStart = data.chapterStarts[index] ?? 0
      const percent = data.totalWords ? Math.max(0, Math.min(100, Math.round(((anchor + 1) / data.totalWords) * 100))) : 0
      data.saveProgress(anchor, index, percent)
      void chapterStart
    })
  }, [data])

  useLayoutEffect(() => {
    if (chapterIndex == null) return
    const element = scrollRef.current
    const article = articleRef.current
    const pending = pendingScroll.current
    if (!element || !article || !pending) return
    pendingScroll.current = null
    if (pending.kind === 'top') {
      element.scrollTop = 0
    } else {
      const rect = rectForAnchor(article, pending.anchor)
      if (rect) element.scrollTop = Math.max(0, rect.top + element.scrollTop - 108)
    }
    probeTopAnchor()
  }, [chapterIndex, jumpTick, data.chapters, probeTopAnchor])

  /* ---------------------------------------------------------- scroll →ancora */
  const onScroll = useCallback(() => {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      const element = scrollRef.current
      if (!element) return
      let anchor: number | null = null
      for (const y of [110, 150, 220, 320, 440]) {
        anchor = anchorAtPoint(element, Math.round(window.innerWidth / 2), y)
        if (anchor != null) break
      }
      if (anchor == null) return
      viewAnchorRef.current = anchor
      setViewAnchor(anchor)
      const index = chapterIndexRef.current
      const percent = data.totalWords ? Math.max(0, Math.min(100, Math.round(((anchor + 1) / data.totalWords) * 100))) : 0
      data.saveProgress(anchor, index, percent)
    })
  }, [data])

  /* ------------------------------------------------------------ navegação */
  const goToChapter = useCallback((index: number, locus?: number) => {
    if (index < 0 || index >= data.chapters.length) return
    clearPageSelection()
    setSelection(null)
    const indexAt = data.chapterStarts[index] ?? 0
    const target = locus != null && locus > indexAt ? locus : indexAt
    setJumpTick((value) => value + 1)
    setChapterIndex(index)
    viewAnchorRef.current = target
    setViewAnchor(target)
    pendingScroll.current = target > indexAt ? { kind: 'anchor', anchor: target } : { kind: 'top' }
  }, [data.chapters, data.chapterStarts, setSelection])

  const prevChapter = useCallback(() => chapterIndex != null && goToChapter(chapterIndex - 1), [chapterIndex, goToChapter])
  const nextChapter = useCallback(() => chapterIndex != null && goToChapter(chapterIndex + 1), [chapterIndex, goToChapter])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); prevChapter() }
      else if (event.key === 'ArrowRight') { event.preventDefault(); nextChapter() }
      else if (event.key === 'Escape') {
        setTocOpen(false); setSearchOpen(false); setSettingsOpen(false); setLightbox(null)
        clearPageSelection(); setSelection(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prevChapter, nextChapter, setSelection])

  /* --------------------------------------------------------------- busca */
  const jumpToResult = useCallback((index: number) => {
    const result = results[index]
    if (!result) return
    setResultIndex(index)
    setInlineMatch(searchText.trim().toLocaleLowerCase())
    goToChapter(result.chapterIndex, result.anchor)
  }, [results, searchText, goToChapter])

  const runSearch = useCallback((raw: string) => {
    const found = searchBook(data.chapters, raw)
    setResults(found)
    setResultIndex(found.length ? 0 : -1)
    setInlineMatch(raw.trim().toLocaleLowerCase())
  }, [data.chapters])

  const searchStep = useCallback((delta: number) => {
    if (!results.length) return
    const next = (resultIndex + delta + results.length) % results.length
    jumpToResult(next)
  }, [results, resultIndex, jumpToResult])

  const openSearch = useCallback(() => {
    setTocOpen(false); setSettingsOpen(false); setChromeVisible(true)
    setSearchOpen(true)
  }, [])
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setInlineMatch('')
    setResults([]); setResultIndex(-1)
  }, [])

  /* -------------------------------------------------- marcador / grifos */
  const chapter = chapterIndex != null ? data.chapters[chapterIndex] : null
  const isBookmarked = chapterIndex != null && data.bookmarks.some((item) => item.page_number === chapterIndex)

  const toggleBookmark = useCallback(async () => {
    const index = chapterIndexRef.current
    const anchor = viewAnchorRef.current
    await data.toggleBookmarkAt(anchor, index)
  }, [data])

  const handleHighlight = useCallback(async (color: HighlightColor) => {
    if (!selection) return
    await data.addHighlight({ anchorStart: selection.anchorStart, anchorEnd: selection.anchorEnd, text: selection.text, color })
    clearPageSelection()
    setSelection(null)
  }, [selection, data, setSelection])

  const handleNote = useCallback(async () => {
    if (!selection) return
    const note = window.prompt(t('notePrompt'), '') || ''
    if (!note) return
    await data.addHighlight({ anchorStart: selection.anchorStart, anchorEnd: selection.anchorEnd, text: selection.text, color: 'yellow', note })
    clearPageSelection()
    setSelection(null)
  }, [selection, t, data, setSelection])

  const handleDictionary = useCallback(async () => {
    if (!selection) return
    const word = selection.text.trim().split(/\s+/)[0].replace(/[^\p{L}'-]/gu, '')
    if (!word) return
    setDictionary(t('dictionaryLoading'))
    try {
      const language = (data.book?.language || '').toLowerCase().startsWith('en') ? 'en' : 'pt'
      if (language === 'en') {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
        const payload = await response.json()
        setDictionary(payload?.[0]?.meanings?.[0]?.definitions?.[0]?.definition || t('dictionaryUnavailable'))
      } else {
        const response = await fetch(`https://pt.wikipedia.org/w/api.php?action=opensearch&origin=*&format=json&limit=1&search=${encodeURIComponent(word)}`)
        const payload = await response.json()
        setDictionary(payload?.[2]?.[0] || t('dictionaryUnavailable'))
      }
    } catch {
      setDictionary(t('dictionaryUnavailable'))
    }
  }, [selection, data.book?.language, t])

  const handleShare = useCallback(async () => {
    if (!selection) return
    if (navigator.share) await navigator.share({ text: selection.text, title: data.book?.title })
    else await navigator.clipboard.writeText(selection.text)
  }, [selection, data.book?.title])

  const handleCopy = useCallback(async () => {
    if (!selection) return
    await navigator.clipboard.writeText(selection.text)
    setCopied(true)
  }, [selection])

  const dismissSelection = useCallback(() => {
    clearPageSelection()
    setSelection(null)
    setCopied(false)
    setDictionary('')
  }, [setSelection])

  /* --------------------------------------------------------- conteúdo */
  const percent = data.totalWords ? Math.max(0, Math.min(100, Math.round(((viewAnchor + 1) / data.totalWords) * 100))) : 0
  const chapterName = chapter?.title || ''
  const chapterStart = chapterIndex != null ? data.chapterStarts[chapterIndex] ?? 0 : 0
  const chapterWords = chapterIndex != null ? data.chapterWordCounts[chapterIndex] ?? 0 : 0
  const chapterProgress = chapterWords > 0 ? Math.max(0, Math.min(1, (viewAnchor - chapterStart) / chapterWords)) : 0

  const onStageClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as Element | null
    if (!target) return
    if (target.closest('button, a, input, select, textarea, img')) return
    if (window.getSelection()?.toString()) return
    if (selection) return
    setChromeVisible((value) => !value)
  }, [selection])

  /* --------------------------------------------------- dados dos drawers */
  const totalChapters = data.chapters.length

  return (
    <div className={chromeVisible ? 'rv-screen' : 'rv-screen rv-immersive'}>
      {/* --------------------------------------------------- top bar */}
      <header className="rv-top-bar">
        <div className="rv-top-bar__left">
          <button type="button" className="rv-top-bar__back" aria-label={t('closeReader')} onClick={close}>
            <ArrowLeft size={19} />
          </button>
          <div className="rv-top-bar__title">
            <span className="rv-top-bar__book-title">{data.book?.title}</span>
            <span className="rv-top-bar__chapter-title">{chapterName}</span>
          </div>
        </div>
        <div className="rv-top-bar__right">
          {chromeVisible && <span className="rv-top-bar__progress">{percent}%</span>}
          <button type="button" className="rv-top-bar__btn" aria-label={t('search')} onClick={openSearch}><SearchIcon size={18} /></button>
          <button
            type="button"
            className="rv-top-bar__btn"
            aria-label={t('savePage')}
            onClick={toggleBookmark}
            style={isBookmarked ? { color: 'var(--reader-accent)' } : undefined}
          >
            <BookmarkIcon size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
          <button type="button" className="rv-top-bar__btn" aria-label={t('contents')} onClick={() => { setTocTab('contents'); setTocOpen((value) => !value); setSearchOpen(false); setSettingsOpen(false); setChromeVisible(true) }}>
            <ListIcon size={18} />
          </button>
          <button type="button" className="rv-top-bar__btn" aria-label={t('readingOptions')} onClick={() => { setSettingsOpen((value) => !value); setTocOpen(false); setSearchOpen(false); setChromeVisible(true) }}>
            <SettingsIcon size={18} />
          </button>
        </div>
      </header>

      {/* --------------------------------------------------- conteúdo */}
      <div className="rv-scroll" ref={scrollRef} onScroll={onScroll} onClick={onStageClick}>
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
            {!data.fatal && <button type="button" className="rv-error__btn" onClick={data.reload}><RotateCcw size={15} /> {t('retry')}</button>}
          </div>
        )}
        {!data.loading && !data.error && chapter != null && (
          <>
            <section className="rv-section" ref={articleRef as React.RefObject<HTMLElement>}>
              <article className="rv-article" style={{ fontFamily: readerFontCss(fontFamily), fontSize, lineHeight, textAlign }}>
                {!chapter.blocks.some((block) => block.type === 'heading' && block.text === chapter.title) ? (
                  <h1 className="rv-chapter-heading">{chapter.title}</h1>
                ) : null}
                <ChapterBlocks
                  chapter={chapter}
                  startAnchor={data.chapterStarts[chapterIndex as number] ?? 0}
                  highlights={data.highlights}
                  query={inlineMatch}
                  onImageClick={(src, alt) => setLightbox({ src, alt: alt || '' })}
                />
              </article>
            </section>
            <nav className="rv-chapter-nav" aria-label={t('readingProgress')}>
              <div className="rv-chapter-nav__progress"><div className="rv-chapter-nav__progress-bar" style={{ width: `${Math.round(chapterProgress * 100)}%` }} /></div>
              <div className="rv-chapter-nav__row">
                <button type="button" className="rv-chapter-nav__btn" onClick={prevChapter} disabled={chapterIndex == null || chapterIndex <= 0} aria-label={t('prevChapter')}>
                  <ChevronLeft size={20} />
                </button>
                <div className="rv-chapter-nav__info">
                  <span className="rv-chapter-nav__title">{chapterName}</span>
                  <span className="rv-chapter-nav__counter">{t('chapterOf', { current: (chapterIndex ?? 0) + 1, total: totalChapters })}</span>
                </div>
                <button type="button" className="rv-chapter-nav__btn" onClick={nextChapter} disabled={chapterIndex == null || chapterIndex >= totalChapters - 1} aria-label={t('nextChapter')}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </nav>
          </>
        )}
      </div>

      {/* --------------------------------------------------- footer */}
      {chromeVisible && (
        <footer className="rv-footer">
          <div className="rv-footer__progress"><div className="rv-footer__progress-bar" style={{ width: `${percent}%` }} /></div>
          <div className="rv-footer__info">
            <span className="rv-footer__chapter">{chapterName}</span>
            <span className="rv-footer__counter">{t('chapterOf', { current: (chapterIndex ?? 0) + 1, total: totalChapters })}</span>
            <span className="rv-footer__percent">{percent}%</span>
          </div>
          {data.saveError && <div className="rv-toast" role="status">{data.saveError}</div>}
        </footer>
      )}

      {/* --------------------------------------------------- drawer: sumário */}
      {tocOpen && (
        <>
          <div className="rv-drawer-backdrop" onMouseDown={(event) => event.preventDefault()} onClick={() => setTocOpen(false)} />
          <aside className="rv-toc-drawer" role="dialog" aria-label={t('contents')}>
            <div className="rv-toc-drawer__header">
              <h3>{t('contents')}</h3>
              <button type="button" className="rv-toc-drawer__close" aria-label={t('closeReader')} onClick={() => setTocOpen(false)}><X size={18} /></button>
            </div>
            <div className="rv-toc-drawer__tabs">
              {TOC_TABS.map((tab) => (
                <button key={tab} type="button" className={`rv-toc-drawer__tab ${tocTab === tab ? 'active' : ''}`} onClick={() => setTocTab(tab)}>{t(tab)}</button>
              ))}
            </div>
            <div className="rv-toc-drawer__list">
              {tocTab === 'contents' && data.chapters.map((item, index) => (
                <button
                  key={item.id || index}
                  type="button"
                  className={`rv-toc-drawer__item ${index === chapterIndex ? 'active' : ''}`}
                  onClick={() => { goToChapter(index); setTocOpen(false) }}
                >
                  <span className="rv-toc-drawer__number">{index + 1}</span>
                  <span className="rv-toc-drawer__title-text">{item.title}</span>
                </button>
              ))}
              {tocTab === 'bookmarks' && (data.bookmarks.length ? data.bookmarks.map((item) => {
                const bookmarkAnchor = Number(item.anchor_offset || 0)
                const itemIndex = Math.max(0, chapterIndexForAnchor(data.chapterStarts, bookmarkAnchor))
                const snippet = snippetForAnchor(data.chapters, data.chapterStarts, bookmarkAnchor)
                return (
                  <div key={item.id} className="rv-drawer-row">
                    <button
                      type="button"
                      className="rv-drawer-row__main"
                      onClick={() => { goToChapter(itemIndex, bookmarkAnchor || undefined); setTocOpen(false) }}
                    >
                      <span className="rv-drawer-row__text">{snippet || data.chapters[itemIndex]?.title}</span>
                      <span className="rv-drawer-row__meta">{data.chapters[itemIndex]?.title}</span>
                      {item.note ? <span className="rv-drawer-row__note">{item.note}</span> : null}
                    </button>
                    <button type="button" className="rv-drawer-row__remove" aria-label={t('removeBookmark')} onClick={() => { void data.toggleBookmarkAt(bookmarkAnchor, item.page_number) }}>
                      <X size={16} />
                    </button>
                  </div>
                )
              }) : <div className="rv-drawer-empty">{t('noBookmarks')}</div>)}
              {tocTab === 'highlights' && (data.highlights.length ? data.highlights.map((item) => {
                const anchor = Number(item.anchor_start || 0)
                const itemIndex = Math.max(0, chapterIndexForAnchor(data.chapterStarts, anchor))
                return (
                  <div key={item.id} className="rv-drawer-row">
                    <span className={`rv-drawer-row__swatch is-${item.color}`} />
                    <button
                      type="button"
                      className="rv-drawer-row__main"
                      onClick={() => { goToChapter(itemIndex, anchor); setTocOpen(false) }}
                    >
                      <span className="rv-drawer-row__text">{item.selected_text}</span>
                      {item.note ? <span className="rv-drawer-row__note">{item.note}</span> : null}
                      <span className="rv-drawer-row__meta">{data.chapters[itemIndex]?.title}</span>
                    </button>
                    <button type="button" className="rv-drawer-row__remove" aria-label={t('closeReader')} onClick={() => { void data.removeHighlight(item.id) }}>
                      <X size={16} />
                    </button>
                  </div>
                )
              }) : <div className="rv-drawer-empty">{t('noHighlights')}</div>)}
            </div>
          </aside>
        </>
      )}

      {/* --------------------------------------------------- drawer: busca */}
      {searchOpen && (
        <>
          <div className="rv-drawer-backdrop" onMouseDown={(event) => event.preventDefault()} onClick={closeSearch} />
          <aside className="rv-search-drawer" role="dialog" aria-label={t('search')}>
            <div className="rv-search-drawer__header">
              <div className="rv-search-drawer__input-wrapper">
                <SearchIcon size={16} />
                <input
                  className="rv-search-drawer__input"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') runSearch(searchText) }}
                  placeholder={t('searchPlaceholder')}
                  aria-label={t('search')}
                  autoFocus
                />
                {searchText ? <button type="button" className="rv-search-drawer__close" aria-label={t('closeReader')} onClick={() => { setSearchText(''); setInlineMatch(''); setResults([]); setResultIndex(-1) }}><X size={16} /></button> : null}
              </div>
              <button type="button" className="rv-search-drawer__close" aria-label={t('closeReader')} onClick={closeSearch}><X size={18} /></button>
            </div>
            {results.length ? (
              <>
                <div className="rv-search-drawer__nav">
                  <span className="rv-search-drawer__count">{resultIndex + 1} / {results.length}</span>
                  <div className="rv-search-drawer__nav-buttons">
                    <button type="button" aria-label={t('previous')} disabled={resultIndex <= 0} onClick={() => searchStep(-1)}><ChevronLeft size={16} /></button>
                    <button type="button" aria-label={t('next')} disabled={resultIndex >= results.length - 1} onClick={() => searchStep(1)}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="rv-search-drawer__results">
                  {results.map((result, index) => (
                    <button
                      key={`${result.chapterIndex}-${result.anchor}-${index}`}
                      type="button"
                      className={`rv-search-drawer__result ${index === resultIndex ? 'active' : ''}`}
                      onClick={() => jumpToResult(index)}
                    >
                      {result.before}
                      <mark>{result.match}</mark>
                      {result.after}
                    </button>
                  ))}
                </div>
              </>
            ) : (searchText ? <div className="rv-search-drawer__empty">{t('noResults')}</div> : <div className="rv-search-drawer__empty">{t('searchPlaceholder')}</div>)}
          </aside>
        </>
      )}

      {/* --------------------------------------------------- drawer: ajustes */}
      {settingsOpen && (
        <>
          <div className="rv-drawer-backdrop" onMouseDown={(event) => event.preventDefault()} onClick={() => setSettingsOpen(false)} />
          <aside className="rv-settings-drawer" role="dialog" aria-label={t('readingOptions')}>
            <div className="rv-settings-drawer__header">
              <h3>{t('readingOptions')}</h3>
              <button type="button" className="rv-toc-drawer__close" aria-label={t('closeReader')} onClick={() => setSettingsOpen(false)}><X size={18} /></button>
            </div>
            <div className="rv-settings-drawer__section">
              <label>{t('theme')}</label>
              <div className="rv-settings-drawer__themes">
                {TOPIC_CIRCLES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`rv-settings-drawer__theme ${theme === item.value ? 'active' : ''}`}
                    style={{ background: item.color }}
                    aria-label={t(item.value)}
                    onClick={() => setTheme(item.value)}
                  />
                ))}
              </div>
            </div>
            <div className="rv-settings-drawer__section">
              <label>{t('fontSizeLabel')}</label>
              <div className="rv-settings-drawer__font-size">
                <button type="button" disabled={fontSize <= 14} onClick={() => setFontSize(fontSize - 2)} aria-label={t('fontDecrease')}>−</button>
                <span>{fontSize}</span>
                <button type="button" disabled={fontSize >= 28} onClick={() => setFontSize(fontSize + 2)} aria-label={t('fontIncrease')}>+</button>
              </div>
            </div>
            <div className="rv-settings-drawer__section">
              <label>{t('lineSpacing')}</label>
              <div className="rv-settings-drawer__options">
                {LINE_HEIGHTS.map((item) => (
                  <button key={item.value} type="button" className={lineHeight === item.value ? 'active' : ''} onClick={() => setLineHeight(item.value)}>{item.label}</button>
                ))}
              </div>
            </div>
            <div className="rv-settings-drawer__section">
              <label>{t('align')}</label>
              <div className="rv-settings-drawer__options">
                {ALIGN_OPTIONS.map((item) => (
                  <button key={item.value} type="button" className={textAlign === item.value ? 'active' : ''} onClick={() => setTextAlign(item.value)}>{t(item.key)}</button>
                ))}
              </div>
            </div>
            <div className="rv-settings-drawer__section">
              <label>{t('fonts')}</label>
              <div className="rv-settings-drawer__options">
                {READER_FONTS.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className={fontFamily === font.id ? 'active' : ''}
                    style={{ fontFamily: readerFontCss(font.id) }}
                    onClick={() => setFontFamily(font.id)}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* --------------------------------------------------- seleção */}
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

      {/* --------------------------------------------------- lightbox */}
      {lightbox && (
        <div className="rv-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(null)}>
          <img src={lightbox.src} alt={lightbox.alt} />
          <button type="button" className="rv-lightbox__close" aria-label={t('closeReader')}><X size={20} /></button>
        </div>
      )}
    </div>
  )
}
