'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  createHighlight,
  deleteHighlight as deleteHighlightRemote,
  getBookmarks,
  getCreatedBook,
  getCurrentProfile,
  getHighlights,
  getImportedBook,
  getReadingProgress,
  registerBookRead,
  toggleBookmark,
  updateReadingProgress,
} from '@/lib/data'
import { CreatedBookSource, ImportedBookSource } from '@/lib/reader/ReaderSource'
import { wordCount } from './content'
import type { Book, CreatedBook, HighlightColor, ReaderBookmark, ReaderChapter, ReaderHighlight, UserProfile } from '@/lib/types'

/* Dados + persistência do livro, compartilhados entre o leitor desktop
 * (textstack) e o celular (liseur). O shell chama uma vez e distribui. */

export interface BookData {
  book: Book | null
  profile: UserProfile | null
  chapters: ReaderChapter[]
  bookmarks: ReaderBookmark[]
  highlights: ReaderHighlight[]
  chapterStarts: number[]
  chapterWordCounts: number[]
  totalWords: number
  savedAnchor: number
  savedPercent: number
  loading: boolean
  error: string
  /** true quando o erro não se resolve tentando de novo (ex.: livro pessoal de outro leitor). */
  fatal: boolean
  saveError: string
  reload: () => void
  saveProgress: (anchor: number, chapterIndex: number, percent: number) => void
  flushProgress: () => void
  toggleBookmarkAt: (anchor: number, pageNumber: number) => Promise<boolean | null>
  addHighlight: (input: { anchorStart: number; anchorEnd: number; text: string; color: HighlightColor; note?: string }) => Promise<ReaderHighlight | null>
  removeHighlight: (id: string) => Promise<void>
}

export function useBookData(bookId: string): BookData {
  const search = useSearchParams()
  const router = useRouter()
  const t = useTranslations('reader')
  const source = search.get('source') === 'created' ? 'created' : 'imported'
  const fromParam = search.get('from') || '/'

  const [book, setBook] = useState<Book | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [chapters, setChapters] = useState<ReaderChapter[]>([])
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([])
  const [highlights, setHighlights] = useState<ReaderHighlight[]>([])
  const [savedAnchor, setSavedAnchor] = useState(0)
  const [savedPercent, setSavedPercent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fatal, setFatal] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const bookRef = useRef<Book | null>(null)
  const profileRef = useRef<UserProfile | null>(null)
  const pendingProgress = useRef<{ anchor: number; chapterIndex: number; percent: number } | null>(null)
  const persistTimer = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      setFatal(false)
      setSaveError('')
      try {
        const currentProfile = await getCurrentProfile()
        if (!active) return
        if (!currentProfile) {
          router.replace(`/auth/login?next=${encodeURIComponent(`/book/${bookId}?source=${source}&from=${encodeURIComponent(fromParam)}`)}`)
          return
        }
        const loadedBook = source === 'created' ? await getCreatedBook(bookId) : await getImportedBook(bookId)
        if (!active) return
        if (!loadedBook) throw new Error('Livro não encontrado.')
        // Livro importado é pessoal do autor: sem cadeia de retries, mensagem direta.
        if (source !== 'created' && loadedBook.access === 'other') {
          if (!active) return
          setError(t('personalBook'))
          setFatal(true)
          return
        }
        const loadedChapters = source === 'created'
          ? await new CreatedBookSource(loadedBook, ((loadedBook as CreatedBook).chapters || []) as never).load()
          : await new ImportedBookSource(loadedBook).load()
        if (!active) return
        if (!loadedChapters.length) throw new Error('Este livro ainda não tem conteúdo legível.')
        await registerBookRead(bookId, source)
        const [progress, savedBookmarks, savedHighlights] = await Promise.all([
          getReadingProgress(currentProfile.id, loadedBook.id, loadedBook.source),
          getBookmarks(currentProfile.id, loadedBook.id, loadedBook.source),
          getHighlights(currentProfile.id, loadedBook.id, loadedBook.source).catch(() => []),
        ])
        if (!active) return
        bookRef.current = loadedBook
        profileRef.current = currentProfile
        setProfile(currentProfile)
        setBook(loadedBook)
        setChapters(loadedChapters)
        setBookmarks((savedBookmarks || []) as ReaderBookmark[])
        setHighlights(savedHighlights || [])
        setSavedAnchor(Number(progress?.anchor_offset || 0))
        setSavedPercent(Number(progress?.percent || 0))
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o leitor.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [bookId, source, reloadKey, router, fromParam])

  const { chapterStarts, chapterWordCounts, totalWords } = useMemo(() => {
    const starts: number[] = []
    const counts: number[] = []
    let acc = 0
    for (const chapter of chapters) {
      let words = 0
      for (const block of chapter.blocks) words += 'text' in block ? wordCount(block.text) : 0
      starts.push(acc)
      counts.push(words)
      acc += words
    }
    return { chapterStarts: starts, chapterWordCounts: counts, totalWords: acc }
  }, [chapters])

  const flushProgress = useCallback(() => {
    if (persistTimer.current !== null) { window.clearTimeout(persistTimer.current); persistTimer.current = null }
    const payload = pendingProgress.current
    const currentBook = bookRef.current
    const currentProfile = profileRef.current
    if (!payload || !currentBook || !currentProfile) return
    updateReadingProgress({
      user_id: currentProfile.id,
      book_id: currentBook.id,
      book_source: currentBook.source,
      current_page: payload.chapterIndex,
      anchor_offset: payload.anchor,
      percent: payload.percent,
    }).then(() => {
      pendingProgress.current = null
      setSaveError('')
    }).catch(() => {
      setSaveError(t('notSaved'))
    })
  }, [t])

  const saveProgress = useCallback((anchor: number, chapterIndex: number, percent: number) => {
    pendingProgress.current = { anchor, chapterIndex, percent }
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(flushProgress, 900)
  }, [flushProgress])

  useEffect(() => {
    const onPageHide = () => flushProgress()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      flushProgress()
    }
  }, [flushProgress])

  const toggleBookmarkAt = useCallback(async (anchor: number, pageNumber: number) => {
    const currentBook = bookRef.current
    const currentProfile = profileRef.current
    if (!currentBook || !currentProfile) return null
    try {
      const added = await toggleBookmark(currentProfile.id, currentBook.id, currentBook.source, pageNumber, '', anchor)
      const fresh = await getBookmarks(currentProfile.id, currentBook.id, currentBook.source)
      setBookmarks((fresh || []) as ReaderBookmark[])
      return added === true
    } catch {
      setSaveError(t('notSaved'))
      return null
    }
  }, [t])

  const addHighlight = useCallback(async (input: { anchorStart: number; anchorEnd: number; text: string; color: HighlightColor; note?: string }) => {
    const currentBook = bookRef.current
    const currentProfile = profileRef.current
    if (!currentBook || !currentProfile) return null
    try {
      const created = await createHighlight({
        userId: currentProfile.id,
        bookId: currentBook.id,
        source: currentBook.source,
        anchorStart: input.anchorStart,
        anchorEnd: input.anchorEnd,
        selectedText: input.text,
        color: input.color,
        note: input.note,
      })
      setHighlights((items) => [...items, created])
      return created
    } catch {
      setSaveError(t('highlightUnavailable'))
      return null
    }
  }, [t])

  const removeHighlight = useCallback(async (id: string) => {
    const currentProfile = profileRef.current
    if (!currentProfile) return
    try {
      await deleteHighlightRemote(id, currentProfile.id)
      setHighlights((items) => items.filter((item) => item.id !== id))
    } catch {
      setSaveError(t('highlightUnavailable'))
    }
  }, [t])

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])

  return useMemo(() => ({
    book,
    profile,
    chapters,
    bookmarks,
    highlights,
    chapterStarts,
    chapterWordCounts,
    totalWords,
    savedAnchor,
    savedPercent,
    loading,
    error,
    fatal,
    saveError,
    reload,
    saveProgress,
    flushProgress,
    toggleBookmarkAt,
    addHighlight,
    removeHighlight,
  }), [book, profile, chapters, bookmarks, highlights, chapterStarts, chapterWordCounts, totalWords, savedAnchor, savedPercent, loading, error, fatal, saveError, reload, saveProgress, flushProgress, toggleBookmarkAt, addHighlight, removeHighlight])
}
