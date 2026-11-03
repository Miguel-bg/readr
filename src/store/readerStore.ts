import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReaderFontId, ReaderTextAlign, ReaderTheme } from '@/lib/types'

// Leitor v2 — preferências visuais inspiradas em textstack (desktop) e liseur (celular).
// Desktop usa light | sepia | dark (textstack). O celular expõe os 5 círculos do
// liseur (light, cream, gray, black) + sepia herdado do desktop.
export const READER_THEMES: ReaderTheme[] = ['light', 'sepia', 'cream', 'gray', 'dark', 'black']

interface ReaderState {
  theme: ReaderTheme
  fontFamily: ReaderFontId
  fontSize: number          // desktop: 14–28, passo 2 (textstack)
  mobileFontSize: number    // celular: passos do slider do liseur (px)
  lineHeight: 1.5 | 1.6 | 1.65 | 1.8
  textAlign: ReaderTextAlign
  brightness: number        // 0–100
  setTheme: (theme: ReaderTheme) => void
  setFontFamily: (fontFamily: ReaderFontId) => void
  setFontSize: (fontSize: number) => void
  setMobileFontSize: (fontSize: number) => void
  setLineHeight: (lineHeight: ReaderState['lineHeight']) => void
  setTextAlign: (align: ReaderTextAlign) => void
  setBrightness: (brightness: number) => void
}

export const useReaderStore = create<ReaderState>()(persist((set) => ({
  theme: 'light',
  fontFamily: 'literata',
  fontSize: 20,
  mobileFontSize: 22,
  lineHeight: 1.6,
  textAlign: 'left',
  brightness: 100,
  setTheme: (theme) => set({ theme }),
  setFontFamily: (fontFamily) => set({ fontFamily }),
  setFontSize: (fontSize) => set({ fontSize: Math.max(14, Math.min(28, fontSize)) }),
  setMobileFontSize: (mobileFontSize) => set({ mobileFontSize: Math.max(16, Math.min(30, mobileFontSize)) }),
  setLineHeight: (lineHeight) => set({ lineHeight }),
  setTextAlign: (textAlign) => set({ textAlign }),
  setBrightness: (brightness) => set({ brightness: Math.max(45, Math.min(100, Math.round(brightness))) }),
}), {
  name: 'readr-reader-preferences',
  version: 3,
  migrate: (persisted: any) => {
    // v1/v2 traziam ids antigos de fonte e poucos temas.
    const legacyFamily = (persisted?.fontFamily ?? '') as string
    const legacyTheme = persisted?.theme as ReaderTheme | undefined
    return {
      theme: legacyTheme === 'dark' ? 'dark' : legacyTheme === 'sepia' ? 'sepia' : legacyTheme === 'light' ? 'light' : 'light',
      fontFamily: legacyFamily && ['literata', 'georgia', 'source-sans', 'opendyslexic'].includes(legacyFamily)
        ? legacyFamily
        : (!legacyFamily || ['source-serif', 'lora', 'bitter', 'merriweather', 'serif'].includes(legacyFamily)) ? 'literata' : legacyFamily === 'atkinson' ? 'opendyslexic' : 'source-sans',
      fontSize: typeof persisted?.fontSize === 'number' ? persisted.fontSize : 20,
      mobileFontSize: typeof persisted?.mobileFontSize === 'number' ? persisted.mobileFontSize : 22,
      lineHeight: persisted?.lineHeight === 1.5 || persisted?.lineHeight === 1.65 || persisted?.lineHeight === 1.8 ? persisted.lineHeight : 1.6,
      textAlign: persisted?.textAlign === 'center' || persisted?.textAlign === 'justify' || persisted?.textAlign === 'left' ? persisted.textAlign : 'left',
      brightness: typeof persisted?.brightness === 'number' ? persisted.brightness : 100,
    }
  },
  partialize: (state) => ({
    theme: state.theme,
    fontFamily: state.fontFamily,
    fontSize: state.fontSize,
    mobileFontSize: state.mobileFontSize,
    lineHeight: state.lineHeight,
    textAlign: state.textAlign,
    brightness: state.brightness,
  }),
}))

// Variáveis visuais por tema — valores exatos do reader.css do textstack.
export const READER_THEME_VARS: Record<ReaderTheme, { bg: string; text: string; secondary: string; border: string; bar: string }> = {
  light: { bg: '#ffffff', text: '#1a1a1a', secondary: '#666666', border: '#e0e0e0', bar: 'rgba(255,255,255,0.95)' },
  sepia: { bg: '#f4ecd8', text: '#5b4636', secondary: '#8b7355', border: '#d4c4a8', bar: 'rgba(244,236,216,0.95)' },
  cream: { bg: '#f2ece1', text: '#4a4238', secondary: '#8b8175', border: '#ddd3c4', bar: 'rgba(242,236,225,0.95)' },
  gray: { bg: '#1e1e1e', text: '#d4d4d4', secondary: '#9a9a9a', border: '#3a3a3a', bar: 'rgba(30,30,30,0.95)' },
  dark: { bg: '#1a1a1a', text: '#e0e0e0', secondary: '#999999', border: '#333333', bar: 'rgba(26,26,26,0.95)' },
  black: { bg: '#000000', text: '#cccccc', secondary: '#888888', border: '#333333', bar: 'rgba(0,0,0,0.95)' },
}
