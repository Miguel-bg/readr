'use client'

/* Núcleo compartilhado dos dois leitores (banca item 11):
 * TextStackReader (desktop/textstack) e LiseurReader (mobile/liseur) usavam
 * ~230 linhas clonadas — boot/posição restaurada, salto de capítulo, busca,
 * marcador, grifos/notas, dicionário, copiar/compartilhar e fechamento.
 * Ficam AQUI; cada view cuida só da apresentação (scroll vertical × pager de colunas). */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { HighlightColor } from '@/lib/types'
import {
  chapterIndexForAnchor,
  clearPageSelection,
  searchBook,
  useSelection,
  type BookSearchResult,
} from './content'
import type { BookData } from './useBookData'

/* Rota segura p/ voltar: só caminhos locais (nada de //evil.com, javascript:, \\). */
export const safeRoute = (value: string | null, fallback: string) => value?.startsWith('/') && !value.startsWith('//') ? value : fallback

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/* Pendência de salto consumida pelo layout effect de cada view.
 * 'start' = topo; 'end' = fim do capítulo (pager mobile usa antecedência). */
export type ReaderPendingJump = { kind: 'start' } | { kind: 'end' } | { kind: 'anchor'; anchor: number }

export function useReaderActions(
  data: BookData,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const t = useTranslations('reader')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selection, setSelection } = useSelection(containerRef)

  /* --- modelo: capítulo + âncora visível + pendência de salto (+ tick forçado) --- */
  const [chapterIndex, setChapterIndex] = useState<number | null>(null)
  const [viewAnchor, setViewAnchor] = useState(0)
  const [jumpTick, setJumpTick] = useState(0)
  const chapterIndexRef = useRef(0)
  const viewAnchorRef = useRef(0)
  const pendingJump = useRef<ReaderPendingJump | null>(null)
  const initialApplied = useRef(false)

  /* --- busca --- */
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [resultIndex, setResultIndex] = useState(-1)
  const [inlineMatch, setInlineMatch] = useState('')

  /* --- seleção/feedback --- */
  const [copied, setCopied] = useState(false)
  const [dictionary, setDictionary] = useState('')

  const source = searchParams.get('source') === 'created' ? 'created' : 'imported'
  const close = useCallback(
    () => router.replace(safeRoute(searchParams.get('from'), `/book/${data.book?.id || ''}/details?source=${source}`)),
    [router, searchParams, data.book?.id, source],
  )

  /* ------------------------------------------------- primeiro carregamento */
  useEffect(() => {
    if (data.loading || data.error) return
    if (!data.chapters.length || initialApplied.current) return
    initialApplied.current = true
    const anchor = clamp(data.savedAnchor, 0, Math.max(0, data.totalWords - 1))
    const index = anchor > 0 ? chapterIndexForAnchor(data.chapterStarts, anchor) : 0
    setChapterIndex(index)
    viewAnchorRef.current = anchor
    setViewAnchor(anchor)
    pendingJump.current = anchor > 0 && data.chapterStarts[index] !== anchor ? { kind: 'anchor', anchor } : { kind: 'start' }
  }, [data.loading, data.error, data.chapters.length, data.savedAnchor, data.chapterStarts, data.totalWords])

  useEffect(() => {
    if (chapterIndex == null) return
    chapterIndexRef.current = chapterIndex
  }, [chapterIndex])

  /* ------------------------------------------------------------ navegação */
  const setViewAnchorNow = useCallback((anchor: number) => {
    viewAnchorRef.current = anchor
    setViewAnchor(anchor)
  }, [])

  /** mode: 'start' (topo), 'end' (fim, pager) ou âncora-específica (grifo/marcador/resultado). */
  const goToChapter = useCallback((index: number, mode: 'start' | 'end' | number = 'start') => {
    if (index < 0 || index >= data.chapters.length) return
    clearPageSelection()
    setSelection(null)
    const chapterStart = data.chapterStarts[index] ?? 0
    if (typeof mode === 'number') {
      pendingJump.current = mode > chapterStart ? { kind: 'anchor', anchor: mode } : { kind: 'start' }
      setJumpTick((value) => value + 1)
      setChapterIndex(index)
      setViewAnchorNow(mode)
    } else {
      pendingJump.current = { kind: mode }
      setJumpTick((value) => value + 1)
      setChapterIndex(index)
      setViewAnchorNow(chapterStart)
    }
  }, [data.chapters, data.chapterStarts, setSelection, setViewAnchorNow])

  const bumpJump = useCallback(() => setJumpTick((value) => value + 1), [])

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

  const resetSearch = useCallback(() => {
    // X dentro do campo: limpa a busca mas mantém o drawer aberto.
    setInlineMatch('')
    setSearchText('')
    setResults([])
    setResultIndex(-1)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setInlineMatch('')
    setSearchText('')
    setResults([])
    setResultIndex(-1)
  }, [])

  /* -------------------------------------------------- marcador / grifos */
  const chapter = chapterIndex != null ? data.chapters[chapterIndex] : null
  const chapterStart = chapterIndex != null ? data.chapterStarts[chapterIndex] ?? 0 : 0
  const chapterWords = chapterIndex != null ? data.chapterWordCounts[chapterIndex] ?? 0 : 0
  const isBookmarked = chapterIndex != null && data.bookmarks.some((item) => item.page_number === chapterIndex)

  const toggleBookmark = useCallback(async () => {
    await data.toggleBookmarkAt(viewAnchorRef.current, chapterIndexRef.current)
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

  return {
    t,
    selection,
    setSelection,
    close,
    // modelo
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
    bumpJump,
    // busca
    searchOpen,
    setSearchOpen,
    searchText,
    setSearchText,
    results,
    resultIndex,
    inlineMatch,
    jumpToResult,
    runSearch,
    searchStep,
    resetSearch,
    closeSearch,
    // seleção/grifos
    isBookmarked,
    toggleBookmark,
    copied,
    setCopied,
    dictionary,
    setDictionary,
    handleHighlight,
    handleNote,
    handleDictionary,
    handleShare,
    handleCopy,
    dismissSelection,
  }
}
