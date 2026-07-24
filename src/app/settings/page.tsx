'use client'

import { AlignJustify, BookOpen, Download, MoonStar, Type } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeSwitcher } from '@/components/reader/ThemeSwitcher'
import { useReaderStore } from '@/store/readerStore'

export default function SettingsPage() {
  const { fontFamily, setFontFamily, fontSize, setFontSize, margin, setMargin, lineSpacing, setLineSpacing } = useReaderStore()
  return (
    <AppShell>
      <section className="mx-auto max-w-5xl px-5 pb-14 sm:px-8">
        <header className="border-b border-line pb-7"><p className="eyebrow">Do seu jeito</p><h1 className="mt-2 font-serif text-5xl">Personalize sua leitura</h1><p className="mt-3 text-sm text-muted">Ajustes aplicados imediatamente ao leitor.</p></header>
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <Setting title="Tema da página" subtitle="Escolha o tom de papel mais confortável." icon={MoonStar}><ThemeSwitcher /></Setting>
          <Setting title="Família tipográfica" subtitle="Alterne entre leitura clássica e moderna." icon={Type}><div className="flex gap-2"><button onClick={() => setFontFamily('serif')} className={`rounded-lg border px-4 py-2 font-serif text-sm ${fontFamily === 'serif' ? 'border-ink bg-white' : 'border-line'}`}>Serif</button><button onClick={() => setFontFamily('sans')} className={`rounded-lg border px-4 py-2 text-sm ${fontFamily === 'sans' ? 'border-ink bg-white' : 'border-line'}`}>Sans</button></div></Setting>
          <Setting title="Tamanho da fonte" subtitle={`${fontSize}px no papel digital.`} icon={BookOpen}><input className="w-full" type="range" min="13" max="24" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} /></Setting>
          <Setting title="Margens" subtitle={`${margin}px ao redor do texto.`} icon={AlignJustify}><input className="w-full" type="range" min="18" max="52" value={margin} onChange={(e) => setMargin(Number(e.target.value))} /></Setting>
          <Setting title="Espaçamento" subtitle={`${lineSpacing.toFixed(1)} entre as linhas.`} icon={AlignJustify}><input className="w-full" type="range" min="1.2" max="2" step="0.1" value={lineSpacing} onChange={(e) => setLineSpacing(Number(e.target.value))} /></Setting>
          <Setting title="Exportar" subtitle="Prepare seu livro para compartilhar." icon={Download}><button className="secondary-btn !min-h-10 !px-4" onClick={() => alert('Exportação preparada para a Fase 2.')}>PDF, EPUB ou MOBI</button><p className="mt-2 text-[9px] text-muted">// TODO Fase 2: exportação real.</p></Setting>
        </section>
      </section>
    </AppShell>
  )
}

function Setting({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: typeof Type; children: React.ReactNode }) {
  return <article className="panel min-h-[190px] p-6"><Icon size={21} strokeWidth={1.5} /><h2 className="mt-5 text-sm font-semibold">{title}</h2><p className="mt-1 text-[11px] text-muted">{subtitle}</p><div className="mt-6">{children}</div></article>
}
