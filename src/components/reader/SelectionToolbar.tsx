'use client'

import { BookOpen, Check, Copy, Highlighter, MessageSquareText, Share2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { HighlightColor } from '@/lib/types'

export interface ReaderSelection {
  text: string
  anchorStart: number
  anchorEnd: number
  x: number
  y: number
}

/* Barra flutuante de seleção — um só estilo (rv-) para os dois leitores. */
export function SelectionToolbar({
  selection,
  copied,
  dictionary,
  onCopy,
  onHighlight,
  onNote,
  onDictionary,
  onShare,
  onClose,
}: {
  selection: ReaderSelection
  copied: boolean
  dictionary: string
  onCopy: () => void
  onHighlight: (color: HighlightColor) => void
  onNote: () => void
  onDictionary: () => void
  onShare: () => void
  onClose: () => void
}) {
  const t = useTranslations('reader')
  return <aside
    className="rv-selection-toolbar"
    style={{ left: selection.x, top: selection.y }}
    role="toolbar"
    aria-label={t('selectionActions')}
    onMouseDown={(event) => event.preventDefault()}
  >
    <button className="rv-selection-toolbar__action" onClick={onCopy} aria-label={copied ? t('copied') : t('copy')} title={t('copy')}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      <span>{copied ? t('copied') : t('copy')}</span>
    </button>
    <span className="rv-selection-toolbar__divider" aria-hidden="true" />
    <div className="rv-selection-toolbar__colors" aria-label={t('highlight')}>
      <Highlighter size={15} className="rv-selection-toolbar__marker" />
      {(['yellow', 'green', 'blue', 'pink'] as HighlightColor[]).map((color) => (
        <button
          key={color}
          className={`rv-selection-toolbar__color is-${color}`}
          onClick={() => onHighlight(color)}
          aria-label={`${t('highlight')} ${color}`}
        />
      ))}
    </div>
    <span className="rv-selection-toolbar__divider" aria-hidden="true" />
    <button className="rv-selection-toolbar__action" onClick={onNote} aria-label={t('note')} title={t('note')}><MessageSquareText size={15} /><span>{t('note')}</span></button>
    <button className="rv-selection-toolbar__action" onClick={onDictionary} aria-label={t('dictionary')} title={t('dictionary')}><BookOpen size={15} /><span>{t('dictionary')}</span></button>
    <button className="rv-selection-toolbar__action" onClick={onShare} aria-label={t('share')} title={t('share')}><Share2 size={15} /><span>{t('share')}</span></button>
    <button className="rv-selection-toolbar__action" onClick={onClose} aria-label={t('closeSelection')} title={t('closeSelection')}><X size={15} /></button>
    {dictionary && <p className="rv-selection-toolbar__note" aria-live="polite">{dictionary}</p>}
  </aside>
}
