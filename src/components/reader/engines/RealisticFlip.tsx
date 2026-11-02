'use client'

import FlipBook from 'react-pageflip'
import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertCircle, ChevronLeft, ChevronRight, LoaderCircle, RotateCcw } from 'lucide-react'
import { CreatedBookSource, ImportedBookSource, readerPageText, repaginateReaderContent } from '@/lib/reader/ReaderSource'
import { createHighlight, getBookmarks, getCreatedBook, getCurrentProfile, getHighlights, getImportedBook, getReadingProgress, registerBookRead, toggleBookmark, updateReadingProgress } from '@/lib/data'
import { readerFontCss } from '@/lib/reader/fonts'
import type { Book, CreatedBook, HighlightColor, ReaderBlock, ReaderBookmark, ReaderChapter, ReaderHighlight, ReaderPage, UserProfile } from '@/lib/types'
import { useReaderStore } from '@/store/readerStore'

const HTMLFlipBook = FlipBook as any

function renderWords(text: string, startAnchor: number, query: string, highlights: ReaderHighlight[]) {
  let anchor = startAnchor
  const needle = query.trim().toLocaleLowerCase()
  return text.split(/(\s+)/).map((part, index) => {
    if (/^\s+$/.test(part)) return part
    const ownAnchor = anchor++
    const highlight = highlights.find((item) => ownAnchor >= Number(item.anchor_start) && ownAnchor <= Number(item.anchor_end))
    const matches = needle && part.toLocaleLowerCase().includes(needle)
    return <span
      key={`${ownAnchor}-${index}`}
      data-reader-anchor={ownAnchor}
      className={`${highlight ? `reader-highlight is-${highlight.color}` : ''} ${matches ? 'reader-search-match' : ''}`}
      title={highlight?.note || undefined}
    >{part}</span>
  })
}

function blockWordCount(block: ReaderBlock) {
  return 'text' in block ? block.text.split(/\s+/).filter(Boolean).length : 0
}

const Page = memo(forwardRef<HTMLDivElement, { page: ReaderPage; total: number; query: string; highlights: ReaderHighlight[] }>(({ page, total, query, highlights }, ref) => {
  const { theme, fontSize, fontFamily, margin, lineSpacing } = useReaderStore()
  if (page.isCover) return <article ref={ref} className={`reader-page reader-cover-page reader-theme-${theme}`}>
    {page.coverUrl ? <img src={page.coverUrl} alt={page.chapterTitle} /> : <div className="reader-cover-fallback"><strong>{page.chapterTitle}</strong></div>}
  </article>

  let anchor = page.anchor
  const hasHeading = page.blocks.some((block) => block.type === 'heading')
  return <article ref={ref} className={`reader-page reader-theme-${theme}`}>
    <div className="reader-page-inner" style={{ padding: `${margin}px` }}>
      <p className="reader-page-number reader-page-number-top">{page.pageNumber} / {total}</p>
      <section className="reader-copy" style={{ fontFamily: readerFontCss(fontFamily), fontSize, lineHeight: lineSpacing }}>
        {page.isFirstPageOfChapter && !hasHeading && page.chapterTitle && <h1 className="reader-chapter-heading">{page.chapterTitle}</h1>}
        {page.blocks.map((block, index) => {
          const start = anchor
          anchor += blockWordCount(block)
          if (block.type === 'heading') {
            const Tag = `h${Math.min(6, Math.max(1, block.level))}` as keyof JSX.IntrinsicElements
            return <Tag key={index} className={`reader-block-heading reader-heading-${block.level}`}>{renderWords(block.text, start, query, highlights)}</Tag>
          }
          if (block.type === 'paragraph') return <p key={index} className={`reader-block-paragraph ${block.dropCap ? 'dropcap' : ''} ${block.preserveBreaks ? 'preserve-breaks' : ''}`}>{renderWords(block.text, start, query, highlights)}</p>
          if (block.type === 'blockquote') return <blockquote key={index} className={block.preserveBreaks ? 'preserve-breaks' : ''}>{renderWords(block.text, start, query, highlights)}</blockquote>
          if (block.type === 'list-item') return <div key={index} className={`reader-list-item ${block.ordered ? 'is-ordered' : ''}`}><span aria-hidden="true">{block.ordered ? `${index + 1}.` : '•'}</span><p>{renderWords(block.text, start, query, highlights)}</p></div>
          if (block.type === 'divider') return <div key={index} className="reader-divider" role="separator"><span>•</span><span>•</span><span>•</span></div>
          return <figure key={index} className="reader-content-image"><img src={block.src} alt={block.alt || ''} loading="lazy" onError={(event) => { event.currentTarget.closest('figure')?.classList.add('is-missing') }} /><figcaption>{block.alt}</figcaption></figure>
        })}
      </section>
    </div>
  </article>
}))
Page.displayName = 'ReaderPage'

interface RealisticFlipProps {
  chapters: ReaderChapter[]
  currentPage: number
  onPageChange: (page: number) => void
  bookId: string
  source: 'imported' | 'created'
}

export function RealisticFlip({ chapters, currentPage, onPageChange, bookId, source }: RealisticFlipProps) {
  const t = useTranslations('reader')
  const flipRef = useRef<any>(null)
  const stageRef = useRef<HTMLElement>(null)
  const { fontSize, fontFamily, margin, lineSpacing, theme, animation, renderQuality, showChapters, showThumbnails } = useReaderStore()

  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const wordsPerPage = useMemo(() => {
    if (windowSize.width === 0) return 170 // Valor padrão
    const areaFactor = (windowSize.width * windowSize.height) / (360 * 540)
    return Math.max(60, Math.round(170 * areaFactor * (18 / fontSize) * (38 / margin) * (1.68 / lineSpacing)))
  }, [windowSize, fontSize, margin, lineSpacing])

  const pages = useMemo(() => repaginateReaderContent(chapters, wordsPerPage), [chapters, wordsPerPage])
  const scrollWindowStart = Math.max(0, currentPage - 4)
  const scrollPages = pages.slice(scrollWindowStart, scrollWindowStart + 9)

  const coverPage: ReaderPage | null = scrollWindowStart === 0 ? {
    chapterTitle: chapters[0]?.title || 'Capa',
    pageNumber: 0,
    anchor: 0,
    blocks: [],
    isCover: true,
    coverUrl: undefined
  } : null

  const flipPages = coverPage ? [coverPage, ...scrollPages] : scrollPages

  return (
    <div className="relative" style={{ width: '100%', height: '100%' }}>
      <button onClick={() => flipRef.current?.pageFlip()?.flipPrev()} className="reader-arrow reader-arrow-left" aria-label={t('previous')}><ChevronLeft /></button>
      <div className="pageflip-frame" style={{ width: '100%', height: '100%' }}>
        <HTMLFlipBook
          ref={flipRef}
          width={windowSize.width || 400}
          height={windowSize.height || 600}
          size="fixed"
          minWidth={windowSize.width || 400}
          maxWidth={windowSize.width || 400}
          minHeight={windowSize.height || 600}
          maxHeight={windowSize.height || 600}
          drawShadow
          maxShadowOpacity={renderQuality === 'smooth' ? 0.68 : 0.34}
          showCover={Boolean(coverPage)}
          mobileScrollSupport
          swipeDistance={24}
          flippingTime={renderQuality === 'smooth' ? 720 : 380}
          startPage={Math.min(currentPage - scrollWindowStart, flipPages.length - 1)}
          usePortrait={windowSize.width < windowSize.height}
          autoSize={false}
          onFlip={(event: { data: number }) => {
            const logical = scrollWindowStart + event.data
            onPageChange(logical)
          }}
          className="pageflip-book"
        >
          {flipPages.map((page, index) => (
            <Page
              key={page.isCover ? 'reader-cover' : `${page.anchor}-${index}`}
              page={page}
              total={pages.length}
              query=""
              highlights={[]}
            />
          ))}
        </HTMLFlipBook>
      </div>
      <button onClick={() => flipRef.current?.pageFlip()?.flipNext()} className="reader-arrow reader-arrow-right" aria-label={t('next')}><ChevronRight /></button>
    </div>
  )
}