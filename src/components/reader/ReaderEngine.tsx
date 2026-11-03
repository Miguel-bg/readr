'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import type { ReaderChapter } from '@/lib/types'
import { useReaderStore } from '@/store/readerStore'
import { ScrollEngine } from './engines/ScrollEngine'
import { SlideEngine } from './engines/SlideEngine'

const RealisticFlip = dynamic(
  () => import('./engines/RealisticFlip').then((mod) => mod.RealisticFlip),
  { ssr: false }
)

interface ReaderEngineProps {
  chapters: ReaderChapter[]
  currentPage: number
  onPageChange: (page: number) => void
  bookId: string
  source: 'imported' | 'created'
}

export function ReaderEngine({ chapters, currentPage, onPageChange, bookId, source }: ReaderEngineProps) {
  const { viewMode } = useReaderStore()

  switch (viewMode) {
    case 'realistic':
      return <RealisticFlip chapters={chapters} currentPage={currentPage} onPageChange={onPageChange} bookId={bookId} source={source} />
    case 'slide':
      return <SlideEngine chapters={chapters} />
    case 'scroll':
      return <ScrollEngine chapters={chapters} />
    default:
      return <RealisticFlip chapters={chapters} currentPage={currentPage} onPageChange={onPageChange} bookId={bookId} source={source} />
  }
}
