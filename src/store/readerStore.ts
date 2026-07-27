import { create } from 'zustand'
import type { ReaderTheme } from '@/lib/types'

export type ReaderAnimation = 'real-page' | 'apple' | 'horizontal' | 'vertical' | 'fade' | 'shift-horizontal' | 'shift-vertical'
export type ReaderViewMode = 'pages' | 'scroll'

interface ReaderState {
  currentPage: number
  theme: ReaderTheme
  fontSize: number
  fontFamily: 'serif' | 'sans'
  margin: number
  lineSpacing: number
  brightness: number
  pageGap: number
  viewMode: ReaderViewMode
  textReflow: boolean
  renderQuality: 'standard' | 'high'
  animation: ReaderAnimation
  engine: 'normal' | 'opengl'
  showThumbnails: boolean
  showChapters: boolean
  showAnnotations: boolean
  searchQuery: string
  setPage: (page: number) => void
  setTheme: (theme: ReaderTheme) => void
  setFontSize: (size: number) => void
  setFontFamily: (font: 'serif' | 'sans') => void
  setMargin: (margin: number) => void
  setLineSpacing: (spacing: number) => void
  setBrightness: (brightness: number) => void
  setPageGap: (pageGap: number) => void
  setViewMode: (viewMode: ReaderViewMode) => void
  setTextReflow: (textReflow: boolean) => void
  setRenderQuality: (renderQuality: 'standard' | 'high') => void
  setAnimation: (animation: ReaderAnimation) => void
  setEngine: (engine: 'normal' | 'opengl') => void
  setShowThumbnails: (showThumbnails: boolean) => void
  setShowChapters: (showChapters: boolean) => void
  setShowAnnotations: (showAnnotations: boolean) => void
  setSearchQuery: (searchQuery: string) => void
}

export const useReaderStore = create<ReaderState>((set) => ({
  currentPage: 0,
  theme: 'light',
  fontSize: 17,
  fontFamily: 'serif',
  margin: 32,
  lineSpacing: 1.62,
  brightness: 100,
  pageGap: 0,
  viewMode: 'pages',
  textReflow: true,
  renderQuality: 'high',
  animation: 'real-page',
  engine: 'normal',
  showThumbnails: false,
  showChapters: false,
  showAnnotations: false,
  searchQuery: '',
  setPage: (currentPage) => set({ currentPage }),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setMargin: (margin) => set({ margin }),
  setLineSpacing: (lineSpacing) => set({ lineSpacing }),
  setBrightness: (brightness) => set({ brightness }),
  setPageGap: (pageGap) => set({ pageGap }),
  setViewMode: (viewMode) => set({ viewMode }),
  setTextReflow: (textReflow) => set({ textReflow }),
  setRenderQuality: (renderQuality) => set({ renderQuality }),
  setAnimation: (animation) => set({ animation }),
  setEngine: (engine) => set({ engine }),
  setShowThumbnails: (showThumbnails) => set({ showThumbnails }),
  setShowChapters: (showChapters) => set({ showChapters }),
  setShowAnnotations: (showAnnotations) => set({ showAnnotations }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}))
