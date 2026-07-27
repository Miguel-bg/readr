'use client'

import JSZip from 'jszip'
import mammoth from 'mammoth'
import type { BookFormat } from '@/lib/types'

export interface ParsedBook {
  title: string
  author: string
  pages: string[]
  format: Exclude<BookFormat, 'readr'>
  description?: string
  language?: string
  publisher?: string
  publicationYear?: number | null
  coverBlob?: Blob | null
  coverExtension?: string
}

const WORDS_PER_PAGE = 280

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function textToPages(text: string, wordsPerPage = WORDS_PER_PAGE) {
  const paragraphs = text
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const words = paragraphs.join('\n\n').split(/\s+/).filter(Boolean)
  const pages: string[] = []

  for (let index = 0; index < words.length; index += wordsPerPage) {
    const chunk = words.slice(index, index + wordsPerPage).join(' ')
    pages.push(`<p class="dropcap">${escapeHtml(chunk)}</p>`)
  }

  return pages
}

function extensionOf(file: File): Exclude<BookFormat, 'readr'> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension !== 'epub' && extension !== 'pdf' && extension !== 'docx') {
    throw new Error('Formato não suportado. Envie um arquivo EPUB, PDF ou DOCX.')
  }
  return extension
}

async function parseDocx(file: File) {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return textToPages(result.value)
}

async function parsePdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []
  let coverBlob: Blob | null = null
  let title = ''
  let author = ''
  try {
    const metadata = await document.getMetadata()
    const info = metadata.info as Record<string, unknown>
    title = typeof info.Title === 'string' ? info.Title : ''
    author = typeof info.Author === 'string' ? info.Author : ''
  } catch {}

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) pages.push(`<p class="dropcap">${escapeHtml(text)}</p>`)
    if (pageNumber === 1) {
      try {
        const viewport = page.getViewport({ scale: 1.2 })
        const canvas = window.document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise
          coverBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86))
        }
      } catch {}
    }
  }

  return { pages, title, author, coverBlob }
}

async function parseEpub(file: File) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const container = await zip.file('META-INF/container.xml')?.async('text')
  if (!container) throw new Error('EPUB inválido: container.xml não encontrado.')

  const containerXml = new DOMParser().parseFromString(container, 'application/xml')
  const packagePath = containerXml.querySelector('rootfile')?.getAttribute('full-path')
  if (!packagePath) throw new Error('EPUB inválido: pacote de conteúdo não encontrado.')

  const packageText = await zip.file(packagePath)?.async('text')
  if (!packageText) throw new Error('EPUB inválido: manifesto não encontrado.')

  const packageXml = new DOMParser().parseFromString(packageText, 'application/xml')
  const title = packageXml.querySelector('metadata > title, dc\\:title')?.textContent?.trim() || ''
  const author = packageXml.querySelector('metadata > creator, dc\\:creator')?.textContent?.trim() || ''
  const description = packageXml.querySelector('metadata > description, dc\\:description')?.textContent?.trim() || ''
  const language = packageXml.querySelector('metadata > language, dc\\:language')?.textContent?.trim() || ''
  const publisher = packageXml.querySelector('metadata > publisher, dc\\:publisher')?.textContent?.trim() || ''
  const date = packageXml.querySelector('metadata > date, dc\\:date')?.textContent?.trim() || ''
  const basePath = packagePath.includes('/') ? packagePath.slice(0, packagePath.lastIndexOf('/') + 1) : ''
  const manifest = new Map<string, string>()
  let coverHref = ''

  packageXml.querySelectorAll('manifest item').forEach((item) => {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    if (id && href) {
      const decoded = decodeURIComponent(href.split('#')[0])
      manifest.set(id, decoded)
      if (item.getAttribute('properties')?.includes('cover-image')) coverHref = decoded
    }
  })

  if (!coverHref) {
    const coverId = packageXml.querySelector('metadata meta[name="cover"]')?.getAttribute('content') || ''
    coverHref = manifest.get(coverId) || ''
  }
  let coverBlob: Blob | null = null
  if (coverHref) {
    const coverFile = zip.file(`${basePath}${coverHref}`)
    if (coverFile) {
      const bytes = await coverFile.async('uint8array')
      const copy = new Uint8Array(bytes.byteLength)
      copy.set(bytes)
      const extension = coverHref.split('.').pop()?.toLowerCase() || 'jpg'
      const type = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
      coverBlob = new Blob([copy.buffer], { type })
    }
  }

  const chapterTexts: string[] = []
  for (const item of Array.from(packageXml.querySelectorAll('spine itemref'))) {
    const href = manifest.get(item.getAttribute('idref') || '')
    if (!href) continue
    const chapterFile = zip.file(`${basePath}${href}`)
    if (!chapterFile) continue
    const chapterHtml = await chapterFile.async('text')
    const chapterDocument = new DOMParser().parseFromString(chapterHtml, 'text/html')
    chapterDocument.querySelectorAll('script, style, nav').forEach((node) => node.remove())
    const text = chapterDocument.body?.textContent?.replace(/\s+/g, ' ').trim()
    if (text) chapterTexts.push(text)
  }

  return { title, author, description, language, publisher, publicationYear: Number(date.slice(0, 4)) || null, coverBlob, coverExtension: coverHref.split('.').pop()?.toLowerCase() || 'jpg', pages: textToPages(chapterTexts.join('\n\n')) }
}

export async function parseBookFile(file: File): Promise<ParsedBook> {
  const format = extensionOf(file)
  const fallbackTitle = file.name.replace(/\.[^.]+$/, '').trim()

  if (format === 'docx') {
    const pages = await parseDocx(file)
    if (!pages.length) throw new Error('O DOCX não contém texto legível.')
    return { title: fallbackTitle, author: '', pages, format }
  }

  if (format === 'pdf') {
    const pdf = await parsePdf(file)
    if (!pdf.pages.length) throw new Error('O PDF não contém texto selecionável.')
    return { title: pdf.title || fallbackTitle, author: pdf.author, pages: pdf.pages, format, coverBlob: pdf.coverBlob, coverExtension: 'jpg' }
  }

  const epub = await parseEpub(file)
  if (!epub.pages.length) throw new Error('O EPUB não contém capítulos legíveis.')
  return { title: epub.title || fallbackTitle, author: epub.author, description: epub.description, language: epub.language, publisher: epub.publisher, publicationYear: epub.publicationYear, coverBlob: epub.coverBlob, coverExtension: epub.coverExtension, pages: epub.pages, format }
}
