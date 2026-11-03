'use client'

import { memo, useEffect, useState, type ReactNode, type RefObject } from 'react'
import type { HighlightColor, ReaderChapter, ReaderHighlight } from '@/lib/types'

/* ============================================================================
 * Âncoras
 * A regra comum dos dois leitores: cada palavra do livro tem um índice global
 * (0, 1, 2, …) na ordem de leitura — o "anchor". É o que grava progresso,
 * marcadores, grifos e busca no D1.
 *
 * O render não marca palavra por palavra com <span data-reader-anchor> (isso
 * estoura o DOM em livros grandes). Cada bloco recebe data-rv-block-start com
 * o anchor da sua primeira palavra; qualquer posição dentro do bloco tem o
 * anchor calculado por contagem de palavras — mesmo algoritmo dos dois lados.
 * ========================================================================== */

export function wordCount(text: string) {
  let count = 0
  const re = /\S+/g
  while (re.exec(text)) count++
  return count
}

/** Índice (em caracteres) onde cada palavra do bloco começa. */
export function wordStarts(text: string): number[] {
  const starts: number[] = []
  const re = /\S+/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) starts.push(match.index)
  return starts
}

/** Quantas palavras começam antes do caractere `char` do bloco. */
export function wordsBefore(text: string, char: number): number {
  let count = 0
  const re = /\S+/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index >= char) break
    count++
  }
  return count
}

/** Span de caracteres coberto pelas palavras [from..to] (inclusivo) dentro de `text`. */
export function charSpanOfWordRange(text: string, from: number, to: number): { k0: number; k1: number } | null {
  const starts = wordStarts(text)
  if (!starts.length) return null
  const a = Math.max(0, Math.min(Math.round(from), starts.length - 1))
  const b = Math.max(a, Math.min(Math.round(to), starts.length - 1))
  const tail = /\S+/.exec(text.slice(starts[b]))
  return { k0: starts[a], k1: starts[b] + (tail ? tail[0].length : 0) }
}

/* --------------------------------------------------------------------------
 * Render de um bloco: fatia o texto original em pedaços exatos para pintar
 * grifos (rv-hl) e resultados de busca (rv-match) sem tocar no resto.
 * A concatenação dos pedaços é SEMPRE igual ao texto original — é o que
 * permite converter seleção (DOM) de volta em anchor.
 * ------------------------------------------------------------------------ */

interface Interval { k0: number; k1: number; color?: HighlightColor; note?: string | null; match?: boolean }

function intervalsForBlock(blockStart: number, text: string, query: string, highlights: ReaderHighlight[]) {
  const words = wordCount(text)
  const out: Interval[] = []

  const needle = query.trim().toLocaleLowerCase()
  if (needle) {
    const haystack = text.toLocaleLowerCase()
    let from = 0
    let at = haystack.indexOf(needle, from)
    while (at >= 0) {
      out.push({ k0: at, k1: at + needle.length, match: true })
      from = at + Math.max(1, needle.length)
      at = haystack.indexOf(needle, from)
    }
  }

  for (const item of highlights) {
    const start = Number(item.anchor_start)
    const end = Number(item.anchor_end)
    if (end < blockStart || start > blockStart + words - 1) continue
    const span = charSpanOfWordRange(text, Math.max(0, start - blockStart), end - blockStart)
    if (!span) continue
    out.push({ k0: span.k0, k1: span.k1, color: item.color, note: item.note || undefined })
  }

  if (!out.length) return null
  out.sort((a, b) => a.k0 - b.k0 || a.k1 - b.k1)
  const merged: Interval[] = []
  for (const interval of out) {
    const last = merged[merged.length - 1]
    if (last && interval.k0 <= last.k1) {
      last.k1 = Math.max(last.k1, interval.k1)
      last.match = last.match || interval.match
      if (interval.color && !last.color) { last.color = interval.color; last.note = interval.note }
    } else {
      merged.push({ ...interval })
    }
  }
  return merged
}

function blockChildren(blockStart: number, text: string, query: string, highlights: ReaderHighlight[]) {
  const merged = intervalsForBlock(blockStart, text, query, highlights)
  if (!merged) return text
  const nodes: ReactNode[] = []
  let pos = 0
  let key = 0
  for (const interval of merged) {
    if (interval.k0 > pos) nodes.push(text.slice(pos, interval.k0))
    const cls = [interval.color ? `rv-hl is-${interval.color}` : '', interval.match ? 'rv-match' : ''].filter(Boolean).join(' ')
    nodes.push(
      <span key={key++} className={cls || undefined} title={interval.note || undefined}>
        {text.slice(pos, interval.k1)}
      </span>,
    )
    pos = Math.max(pos, interval.k1)
  }
  if (pos < text.length) nodes.push(text.slice(pos))
  return nodes
}

/* --------------------------------------------------------------------------
 * ChapterBlocks — os blocos de um capítulo, com grupos de listas reunidos.
 * `mobile` desliga a régua de dropcap (visual do liseur).
 * ------------------------------------------------------------------------ */

export interface ChapterBlocksProps {
  chapter: ReaderChapter
  startAnchor: number
  highlights: ReaderHighlight[]
  query?: string
  onImageClick?: (src: string, alt?: string) => void
}

export const ChapterBlocks = memo(function ChapterBlocks({ chapter, startAnchor, highlights, query = '', onImageClick }: ChapterBlocksProps) {
  let anchor = startAnchor
  const out: ReactNode[] = []
  let list: { ordered: boolean; items: ReactNode[]; key: string } | null = null
  const flushList = () => {
    if (!list) return
    out.push(
      list.ordered
        ? <ol key={list.key}>{list.items}</ol>
        : <ul key={list.key}>{list.items}</ul>,
    )
    list = null
  }

  chapter.blocks.forEach((block, index) => {
    const start = anchor
    anchor += 'text' in block ? wordCount(block.text) : 0

    if (block.type === 'list-item') {
      if (!list || list.ordered !== Boolean(block.ordered)) {
        flushList()
        list = { ordered: Boolean(block.ordered), items: [], key: `rv-l${start}-${index}` }
      }
      list.items.push(
        <li key={`rv-li${start}-${index}`} data-rv-block-start={start}>
          {blockChildren(start, block.text, query, highlights)}
        </li>,
      )
      return
    }
    flushList()

    switch (block.type) {
      case 'heading': {
        const level = Math.min(6, Math.max(1, block.level))
        const Tag = `h${level}` as 'h1'
        out.push(
          <Tag key={`rv-h${start}-${index}`} data-rv-block-start={start}>
            {blockChildren(start, block.text, query, highlights)}
          </Tag>,
        )
        break
      }
      case 'paragraph':
        out.push(
          <p key={`rv-p${start}-${index}`} data-rv-block-start={start} style={block.preserveBreaks ? { whiteSpace: 'pre-line' } : undefined}>
            {blockChildren(start, block.text, query, highlights)}
          </p>,
        )
        break
      case 'blockquote':
        out.push(
          <blockquote key={`rv-b${start}-${index}`} data-rv-block-start={start} style={block.preserveBreaks ? { whiteSpace: 'pre-line' } : undefined}>
            {blockChildren(start, block.text, query, highlights)}
          </blockquote>,
        )
        break
      case 'divider':
        out.push(<hr key={`rv-d${start}-${index}`} role="separator" />)
        break
      case 'image':
        out.push(
          <figure key={`rv-i${start}-${index}`} className="rv-figure">
            <img
              src={block.src}
              alt={block.alt || ''}
              loading="lazy"
              onClick={() => onImageClick?.(block.src, block.alt || '')}
              onError={(event) => { event.currentTarget.closest('figure')?.classList.add('is-missing') }}
            />
            {block.alt ? <figcaption>{block.alt}</figcaption> : null}
          </figure>,
        )
        break
      default:
        break
    }
  })
  flushList()

  return <>{out}</>
})

/* --------------------------------------------------------------------------
 * BUSCA no livro inteiro.
 * ------------------------------------------------------------------------ */

export interface BookSearchResult {
  chapterIndex: number
  chapterTitle: string
  anchor: number
  before: string
  match: string
  after: string
}

export function searchBook(chapters: ReaderChapter[], query: string, limit = 400): BookSearchResult[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return []
  const results: BookSearchResult[] = []
  let anchor = 0
  for (let ci = 0; ci < chapters.length && results.length < limit; ci++) {
    for (const block of chapters[ci].blocks) {
      const text = 'text' in block ? block.text : ''
      const words = text ? wordCount(text) : 0
      if (words) {
        const haystack = text.toLocaleLowerCase()
        let from = 0
        let at = haystack.indexOf(needle, from)
        while (at >= 0) {
          results.push({
            chapterIndex: ci,
            chapterTitle: chapters[ci].title,
            anchor: anchor + wordsBefore(text, at),
            before: text.slice(Math.max(0, at - 42), at),
            match: text.slice(at, at + needle.length),
            after: text.slice(at + needle.length, at + needle.length + 64),
          })
          from = at + Math.max(1, needle.length)
          at = haystack.indexOf(needle, from)
          if (results.length >= limit) break
        }
      }
      anchor += words
    }
  }
  return results
}

/* --------------------------------------------------------------------------
 * DOM ↔ anchor
 * ------------------------------------------------------------------------ */

/** O bloco que contém o node (o ancestral com data-rv-block-start). */
export function blockElementFor(node: Node): Element | null {
  let element: Element | null = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  while (element && !element.hasAttribute('data-rv-block-start') && element.tagName !== 'HTML') element = element.parentElement
  return element && element.hasAttribute('data-rv-block-start') ? element : null
}

/** Offset em caracteres dentro do texto do bloco, andando os text nodes na ordem do DOM. */
export function textOffsetInBlock(block: Element, node: Node, offset: number): number {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let acc = 0
  while (walker.nextNode()) {
    if (walker.currentNode === node) return acc + Math.min(offset, walker.currentNode.nodeValue?.length || 0)
    acc += walker.currentNode.nodeValue?.length || 0
  }
  return acc
}

export function anchorsFromBlock(block: Element, node: Node, offset: number): { blockStart: number; anchor: number } | null {
  const raw = block.getAttribute('data-rv-block-start')
  if (raw === null) return null
  const blockStart = Number(raw)
  const chars = textOffsetInBlock(block, node, offset)
  const text = block.textContent || ''
  return { blockStart, anchor: blockStart + wordsBefore(text, chars) }
}

export function selectionAnchors(range: Range): { anchorStart: number; anchorEnd: number } | null {
  const startBlock = blockElementFor(range.startContainer)
  const endBlock = blockElementFor(range.endContainer)
  if (!startBlock || !endBlock) return null
  const start = anchorsFromBlock(startBlock, range.startContainer, range.startOffset)
  const end = anchorsFromBlock(endBlock, range.endContainer, range.endOffset)
  if (!start || !end) return null
  return { anchorStart: Math.min(start.anchor, end.anchor), anchorEnd: Math.max(start.anchor, end.anchor) }
}

/** Ponto da tela → anchor da palavra nessa posição. */
export function anchorAtPoint(root: HTMLElement, x: number, y: number): number | null {
  const doc = root.ownerDocument
  let node: Node | null = null
  let offset = 0
  const typed = doc as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null; caretRangeFromPoint?: (x: number, y: number) => Range | null }
  if (typeof typed.caretPositionFromPoint === 'function') {
    const hit = typed.caretPositionFromPoint(x, y)
    if (hit) { node = hit.offsetNode; offset = hit.offset }
  } else if (typeof typed.caretRangeFromPoint === 'function') {
    const hit = typed.caretRangeFromPoint(x, y)
    if (hit) { node = hit.startContainer; offset = hit.startOffset }
  }
  if (!node) return null
  const block = blockElementFor(node)
  if (!block) return null
  const result = anchorsFromBlock(block, node, offset)
  return result ? result.anchor : null
}

/** Range de texto correspondente aos caracteres [k0..k1) do bloco. */
export function rangeForChars(block: HTMLElement, k0: number, k1: number): Range | null {
  const doc = block.ownerDocument
  const range = doc.createRange()
  const walker = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let acc = 0
  let startSet = false
  let last: Text | null = null
  let lastLength = 0
  let currentNode: Text | null
  while ((currentNode = walker.nextNode() as Text | null)) {
    const len = currentNode.nodeValue?.length || 0
    if (!startSet && acc + len > k0) { range.setStart(currentNode, k0 - acc); startSet = true }
    if (startSet && acc + len >= k1) { range.setEnd(currentNode, Math.min(len, k1 - acc)); return range }
    acc += len
    last = currentNode
    lastLength = len
  }
  if (!startSet) return null
  if (last) range.setEnd(last, lastLength)
  return range
}

/** Bloco + span de caracteres que contêm o anchor (ordem do DOM = ordem dos blocos). */
export function locateAnchor(root: HTMLElement, anchor: number): { el: HTMLElement; k0: number; k1: number } | null {
  let candidate: { el: HTMLElement; k0: number; k1: number } | null = null
  const elements = root.querySelectorAll<HTMLElement>('[data-rv-block-start]')
  for (const el of elements) {
    const blockStart = Number(el.getAttribute('data-rv-block-start'))
    if (blockStart > anchor) break
    const text = el.textContent || ''
    const words = wordCount(text)
    if (words) {
      const span = charSpanOfWordRange(text, anchor - blockStart, anchor - blockStart)
      if (span) candidate = { el, k0: span.k0, k1: span.k1 }
    } else {
      candidate = { el, k0: 0, k1: 0 }
    }
  }
  return candidate
}

/** Rect na tela da palavra de anchor dentro de `root`. Coordenadas de viewport. */
export function rectForAnchor(root: HTMLElement, anchor: number): DOMRect | null {
  const located = locateAnchor(root, anchor)
  if (!located) return null
  const range = rangeForChars(located.el, located.k0, Math.max(located.k1, located.k0 + 1))
  if (!range) return null
  const rect = range.getBoundingClientRect()
  if (!rect.width && !rect.height) return null
  return rect
}

/** Snippet de texto ao redor de um anchor (para listas de marcadores/grifos). */
export function snippetForAnchor(chapters: ReaderChapter[], chapterStarts: number[], anchor: number): string {
  let index = chapterStarts.length ? 0 : -1
  for (let i = 0; i < chapterStarts.length; i++) {
    if (chapterStarts[i] <= anchor) index = i
    else break
  }
  if (index < 0) return ''
  let acc = chapterStarts[index]
  for (const block of chapters[index].blocks) {
    const text = 'text' in block ? block.text : ''
    const words = text ? wordCount(text) : 0
    if (words && anchor < acc + words) {
      const rel = anchor - acc
      const span = charSpanOfWordRange(text, Math.max(0, rel - 9), Math.min(words - 1, rel + 10))
      return span ? text.slice(span.k0, span.k1) : ''
    }
    acc += words
  }
  return ''
}

/* --------------------------------------------------------------------------
 * useSelection — toolbar flutante de seleção (os dois leitores).
 * ------------------------------------------------------------------------ */

export interface ReaderSelection {
  text: string
  anchorStart: number
  anchorEnd: number
  x: number
  y: number
}

export function useSelection(container: RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<ReaderSelection | null>(null)

  useEffect(() => {
    // `container` é um RefObject estável (instance do useRef do host), então é
    // seguro capturá-lo: o elemento atual é lido a cada evento.
    const onSelectionChange = () => {
      const hostElement = container.current
      const selected = window.getSelection()
      if (!hostElement || !selected || selected.isCollapsed || !selected.rangeCount) { setSelection((old) => old ? null : old); return }
      const range = selected.getRangeAt(0)
      if (!hostElement.contains(range.commonAncestorContainer)) { setSelection((old) => old ? null : old); return }
      let anchors: { anchorStart: number; anchorEnd: number } | null = null
      try {
        anchors = selectionAnchors(range)
      } catch { anchors = null }
      const text = selected.toString().trim()
      if (!anchors || anchors.anchorEnd < anchors.anchorStart || !text) { setSelection((old) => old ? null : old); return }
      const bounds = range.getBoundingClientRect()
      setSelection({
        text,
        anchorStart: anchors.anchorStart,
        anchorEnd: Math.max(anchors.anchorStart, anchors.anchorEnd),
        x: Math.max(90, Math.min(window.innerWidth - 90, bounds.left + bounds.width / 2)),
        y: Math.max(14, Math.min(window.innerHeight - 72, bounds.top - 14)),
      })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  return { selection, setSelection }
}

/** Limpa a seleção física da página. */
export function clearPageSelection() {
  window.getSelection()?.removeAllRanges()
}

/* --------------------------------------------------------------------------
 * Capítulo N… índice do capítulo que contém um anchor global.
 * ------------------------------------------------------------------------ */

export function chapterIndexForAnchor(chapterStarts: number[], anchor: number): number {
  let low = 0
  let high = chapterStarts.length - 1
  let best = 0
  while (low <= high) {
    const mid = (low + high) >> 1
    if (chapterStarts[mid] <= anchor) { best = mid; low = mid + 1 } else high = mid - 1
  }
  return best
}
