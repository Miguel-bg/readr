import type { Book, Chapter, ReaderPage } from '@/lib/types'

export interface ReaderSource {
  book: Book
  load(): Promise<ReaderPage[]>
}

function decodeEntities(value: string) {
  if (typeof document === 'undefined') return value
  const node = document.createElement('textarea')
  node.innerHTML = value
  return node.value
}

export function plainText(html: string) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function sourcePage(text: string, chapterTitle: string, pageNumber: number, anchor = 0): ReaderPage {
  return { chapterTitle, pageNumber, html: '', text: plainText(text), anchor }
}

export function repaginateReaderContent(source: ReaderPage[], wordsPerPage: number): ReaderPage[] {
  const safeSize = Math.max(55, Math.round(wordsPerPage))
  const result: ReaderPage[] = []
  let globalAnchor = 0

  source.forEach((section) => {
    const words = (section.text || plainText(section.html)).split(/\s+/).filter(Boolean)
    if (!words.length) return
    for (let index = 0; index < words.length; index += safeSize) {
      const text = words.slice(index, index + safeSize).join(' ')
      result.push({
        chapterTitle: section.chapterTitle,
        pageNumber: result.length + 1,
        html: '',
        text,
        anchor: globalAnchor + index,
      })
    }
    globalAnchor += words.length
  })

  return result.length ? result : [{ chapterTitle: '', pageNumber: 1, html: '', text: 'Este livro ainda está em branco.', anchor: 0 }]
}

export class CreatedBookSource implements ReaderSource {
  constructor(public book: Book, private chapters: Chapter[]) {}

  async load() {
    let anchor = 0
    return [...this.chapters]
      .sort((a, b) => a.order_index - b.order_index)
      .map((chapter, index) => {
        const page = sourcePage(chapter.content, chapter.title || `Capítulo ${index + 1}`, index + 1, anchor)
        anchor += page.text?.split(/\s+/).filter(Boolean).length || 0
        return page
      })
  }
}

export class ImportedBookSource implements ReaderSource {
  constructor(public book: Book) {}

  async load() {
    let anchor = 0
    return (this.book.content || []).map((html, index) => {
      const page = sourcePage(html, `Página ${index + 1}`, index + 1, anchor)
      anchor += page.text?.split(/\s+/).filter(Boolean).length || 0
      return page
    })
  }
}
