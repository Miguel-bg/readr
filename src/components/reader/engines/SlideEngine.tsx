'use client'

import React, { useState } from 'react'
import type { ReaderChapter } from '@/lib/types'
import { useReaderStore } from '@/store/readerStore'

interface SlideEngineProps {
  chapters: ReaderChapter[]
}

export function SlideEngine({ chapters }: SlideEngineProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const { fontSize, fontFamily, lineSpacing, theme } = useReaderStore()

  const currentChapter = chapters[currentChapterIndex]

  const themeStyles = {
    light: 'bg-[#faf8f5] text-[#2c2c2c]',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]',
    dark: 'bg-[#121212] text-[#e0e0e0]',
  }

  const nextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1)
      window.scrollTo(0, 0)
    }
  }

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex((prev) => prev - 1)
      window.scrollTo(0, 0)
    }
  }

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between p-6 transition-colors duration-200 ${themeStyles[theme] || themeStyles.light}`}>
      <div className="mx-auto max-w-xl w-full flex-1">
        {currentChapter && (
          <article className="py-8">
            {currentChapter.title && (
              <h2 className="mb-6 text-xl font-bold tracking-tight opacity-90 border-b pb-2 border-current/10">
                {currentChapter.title}
              </h2>
            )}
            <div
              className="space-y-4"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineSpacing,
                fontFamily: fontFamily.includes('serif') ? 'serif' : 'sans-serif',
              }}
            >
              {currentChapter.blocks.map((block, idx) => (
                <p key={idx} className="text-justify leading-relaxed">
                  {'text' in block ? block.text : ''}
                </p>
              ))}
            </div>
          </article>
        )}
      </div>

      {/* Controles discretos estilo Kindle na parte inferior */}
      <footer className="mx-auto max-w-xl w-full flex items-center justify-between py-4 border-t border-current/10 text-xs opacity-60">
        <button
          onClick={prevChapter}
          disabled={currentChapterIndex === 0}
          className="hover:opacity-100 disabled:opacity-20 px-3 py-1"
        >
          ← Anterior
        </button>
        <span>
          Capítulo {currentChapterIndex + 1} de {chapters.length}
        </span>
        <button
          onClick={nextChapter}
          disabled={currentChapterIndex === chapters.length - 1}
          className="hover:opacity-100 disabled:opacity-20 px-3 py-1"
        >
          Próximo →
        </button>
      </footer>
    </div>
  )
}
