import { create } from 'zustand'
import type { ReaderTheme } from '@/lib/types'

interface ReaderState {
  currentPage: number
  theme: ReaderTheme
  fontSize: number
  fontFamily: 'serif' | 'sans'
  margin: number
  lineSpacing: number
  setPage: (page: number) => void
  setTheme: (theme: ReaderTheme) => void
  setFontSize: (size: number) => void
  setFontFamily: (font: 'serif' | 'sans') => void
  setMargin: (margin: number) => void
  setLineSpacing: (spacing: number) => void
}

export const useReaderStore = create<ReaderState>((set) => ({
  currentPage: 0,
  theme: 'light',
  fontSize: 17,
  fontFamily: 'serif',
  margin: 32,
  lineSpacing: 1.62,
  setPage: (currentPage) => set({ currentPage }),
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setMargin: (margin) => set({ margin }),
  setLineSpacing: (lineSpacing) => set({ lineSpacing }),
}))
