import Link from 'next/link'
import { Plus } from 'lucide-react'

export function CreateBookCard() {
  return (
    <Link href="/create" className="flex aspect-[3/4.35] flex-col items-center justify-center rounded-xl border border-dashed border-ink/30 bg-white/20 text-center transition hover:border-coral hover:bg-white/50">
      <Plus size={26} strokeWidth={1.4} />
      <span className="mt-3 max-w-16 text-[10px] font-medium leading-tight">Criar Novo Livro</span>
    </Link>
  )
}
