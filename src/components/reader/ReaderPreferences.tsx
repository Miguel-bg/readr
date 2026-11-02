'use client'

import React from 'react'
import { useReaderStore } from '@/store/readerStore'
import { Type, AlignLeft, Sun, Moon, Coffee, Layout, Layers, MousePointer2 } from 'lucide-react'

export function ReaderPreferences() {
  const { 
    theme, setTheme, 
    fontSize, setFontSize, 
    fontFamily, setFontFamily,
    viewMode, setViewMode,
    lineSpacing, setLineSpacing
  } = useReaderStore()

  const fonts = [
    { id: 'source-serif', name: 'Source Serif' },
    { id: 'lora', name: 'Lora' },
    { id: 'atkinson', name: 'Atkinson' },
    { id: 'inter', name: 'Inter' }
  ]

  const modes = [
    { id: 'realistic', name: 'Realista', icon: Layers },
    { id: 'slide', name: 'Kindle', icon: Layout },
    { id: 'scroll', name: 'Rolagem', icon: MousePointer2 }
  ]

  return (
    <div className="flex flex-col gap-6 p-6 min-w-[280px]">
      {/* Modos de Visualização */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">Modo de Leitura</h4>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id as any)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                viewMode === m.id 
                  ? 'border-blue-500 bg-blue-500/10 text-blue-500' 
                  : 'border-current/10 hover:bg-current/5 opacity-70'
              }`}
            >
              <m.icon size={18} />
              <span className="text-[10px] font-medium">{m.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Tipografia */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">Tipografia</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {fonts.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontFamily(f.id as any)}
              className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                fontFamily === f.id 
                  ? 'border-current bg-current text-white' 
                  : 'border-current/10 hover:border-current/30'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-70">
            <Type size={16} />
            <span className="text-sm">{fontSize}px</span>
          </div>
          <input 
            type="range" min="12" max="32" value={fontSize} 
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="flex-1 accent-current"
          />
        </div>
      </section>

      {/* Temas */}
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider opacity-50 mb-3">Tema</h4>
        <div className="flex gap-3">
          <button onClick={() => setTheme('light')} className={`flex-1 flex items-center justify-center p-2 rounded-md border ${theme === 'light' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-current/10'} bg-white text-black`}><Sun size={18} /></button>
          <button onClick={() => setTheme('sepia')} className={`flex-1 flex items-center justify-center p-2 rounded-md border ${theme === 'sepia' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-current/10'} bg-[#f4ecd8] text-[#5b4636]`}><Coffee size={18} /></button>
          <button onClick={() => setTheme('dark')} className={`flex-1 flex items-center justify-center p-2 rounded-md border ${theme === 'dark' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-current/10'} bg-[#121212] text-white`}><Moon size={18} /></button>
        </div>
      </section>
    </div>
  )
}
