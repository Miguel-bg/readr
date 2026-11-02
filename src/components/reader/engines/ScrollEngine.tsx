'use client'

import React from 'react'
import type { ReaderBlock, ReaderChapter } from '@/lib/types'
import { useReaderStore } from '@/store/readerStore'

interface ScrollEngineProps {
  chapters: ReaderChapter[]
  onProgressUpdate?: (percent: number) => void
}

export function ScrollEngine({ chapters }: ScrollEngineProps) {
  const { fontSize, fontFamily, lineSpacing, margin, theme } = useReaderStore()

  // Mapeamento de temas elegantes (estilo TextStack)
  const themeStyles = {
    light: 'bg-[#faf8f5] text-[#2c2c2c]',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]',
    dark: 'bg-[#121212] text-[#e0e0e0]',
  }

  const fontFamilies = {
    'source-serif': 'font-serif',
    lora: 'font-serif',
    bitter: 'font-serif',
    merriweather: 'font-serif',
    atkinson: 'font-sans',
    inter: 'font-sans',
    'public-sans': 'font-sans',
    serif: 'font-serif',
    sans: 'font-sans',
  }

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-200 ${themeStyles[theme] || themeStyles.light}`}
      style={{
        paddingLeft: `${margin}px`,
        paddingRight: `${margin}px`,
      }}
    >
      <div
        className={`mx-auto max-w-2xl py-12 ${fontFamilies[fontFamily] || 'font-serif'}`}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: lineSpacing,
        }}
      >
        {chapters.map((chapter, cIndex) => (
          <article key={chapter.id || cIndex} className="mb-16">
            {chapter.title && (
              <h2 className="mb-8 text-2xl font-bold tracking-tight opacity-90">
                {chapter.title}
              </h2>
            )}
            
            <div className="space-y-6">
              {chapter.blocks.map((block: ReaderBlock, bIndex: number) => {
                if (block.type === 'heading') {
                  return (
                    <h3
                      key={bIndex}
                      className="mt-8 mb-4 font-bold opacity-90"
                      style={{ fontSize: `${fontSize * (1.4 - block.level * 0.1)}px` }}
                    >
                      {block.text}
                    </h3>
                  )
                }

                if (block.type === 'paragraph') {
                  return (
                    <p key={bIndex} className="text-justify leading-relaxed">
                      {block.text}
                    </p>
                  )
                }

                if (block.type === 'blockquote') {
                  return (
                    <blockquote
                      key={bIndex}
                      className="my-6 border-l-2 border-current pl-4 italic opacity-80"
                    >
                      {block.text}
                    </blockquote>
                  )
                }

                if (block.type === 'image') {
                  return (
                    <figure key={bIndex} className="my-8 text-center">
                      {/* eslint-disable-next-html-element-suppression */}
                      <img
                        src={block.src}
                        alt={block.alt || 'Imagem do livro'}
                        className="mx-auto max-h-[70vh] rounded-md object-contain shadow-sm"
                      />
                    </figure>
                  )
                }

                return null
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
