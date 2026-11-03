import type { ReaderFontId } from '@/lib/types'

// Fontes do leitor v2 (visual: textstack no desktop, liseur no celular).
// `literata` é a serif padrão dos dois referências.
export const READER_FONTS: Array<{ id: ReaderFontId; label: string; css: string; serif: boolean }> = [
  { id: 'literata', label: 'Literata', css: 'var(--reader-font-literata)', serif: true },
  { id: 'georgia', label: 'Georgia', css: 'Georgia, "Times New Roman", serif', serif: true },
  { id: 'source-sans', label: 'Source Sans 3', css: 'var(--reader-font-source-sans)', serif: false },
  { id: 'opendyslexic', label: 'OpenDyslexic', css: '"OpenDyslexic", "Atkinson Hyperlegible", sans-serif', serif: false },
]

export function readerFontCss(id: ReaderFontId) {
  return READER_FONTS.find((font) => font.id === id)?.css || READER_FONTS[0].css
}
