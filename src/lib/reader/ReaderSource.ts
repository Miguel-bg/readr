import type { Book, Chapter, ReaderPage } from '@/lib/types'

export interface ReaderSource {
  book: Book
  load(): Promise<ReaderPage[]>
}

function textToPages(text: string, chapterTitle: string, startPage: number, wordsPerPage = 115): ReaderPage[] {
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = clean.split(' ').filter(Boolean)
  if (!words.length) return [{ chapterTitle, pageNumber: startPage, html: '<p>Este capítulo ainda está em branco.</p>' }]
  const pages: ReaderPage[] = []
  for (let index = 0; index < words.length; index += wordsPerPage) {
    const chunk = words.slice(index, index + wordsPerPage).join(' ')
    pages.push({
      chapterTitle,
      pageNumber: startPage + pages.length,
      html: `<p>${chunk}</p>`,
    })
  }
  return pages
}

export class CreatedBookSource implements ReaderSource {
  constructor(public book: Book, private chapters: Chapter[]) {}

  async load() {
    const pages: ReaderPage[] = []
    this.chapters
      .sort((a, b) => a.order_index - b.order_index)
      .forEach((chapter) => {
        pages.push(...textToPages(chapter.content, chapter.title, pages.length + 1))
      })
    return pages
  }
}

export class ImportedBookSource implements ReaderSource {
  constructor(public book: Book) {}

  async load() {
    return (this.book.content || []).map((html, index) => ({
      chapterTitle: `Página ${index + 1}`,
      pageNumber: index + 1,
      html,
    }))
  }
}
