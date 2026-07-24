import Link from 'next/link'
import { BookOpen, Download, Layers3, MoonStar, Type } from 'lucide-react'

const items = [
  { icon: BookOpen, title: 'Capas', subtitle: 'Crie capas únicas' },
  { icon: Type, title: 'Fontes', subtitle: 'Escolha sua fonte' },
  { icon: MoonStar, title: 'Temas', subtitle: 'Claro, escuro, sépia' },
  { icon: Layers3, title: 'Layout', subtitle: 'Margens e espaçamento' },
  { icon: Download, title: 'Exportar', subtitle: 'PDF, EPUB, MOBI' },
]

export function CustomizationPanel() {
  return (
    <section className="panel px-4 py-3">
      <h2 className="mb-2 text-xs font-medium">Personalize sua leitura</h2>
      <nav className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {items.map(({ icon: Icon, title, subtitle }) => (
          <Link key={title} href="/settings" className="flex min-h-12 items-center gap-3 rounded-lg border border-line/80 bg-white/25 px-4 transition hover:bg-white/70">
            <Icon size={19} strokeWidth={1.5} />
            <span><strong className="block text-[9px]">{title}</strong><small className="block text-[7px] text-muted">{subtitle}</small></span>
          </Link>
        ))}
      </nav>
    </section>
  )
}
