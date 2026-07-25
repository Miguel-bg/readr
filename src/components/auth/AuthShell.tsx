import Link from 'next/link'
import { BookOpen, Sparkles } from 'lucide-react'

export function AuthShell({ mode, children }: { mode: 'login' | 'signup'; children: React.ReactNode }) {
  const signup = mode === 'signup'
  return (
    <main className="grid min-h-screen place-items-center p-5 sm:p-10">
      <section className="grid w-full max-w-[1050px] overflow-hidden rounded-[26px] border border-white/70 bg-surface shadow-panel lg:grid-cols-[1.05fr_.95fr]">
        <aside className="relative hidden min-h-[720px] overflow-hidden bg-[#262724] p-12 text-white lg:flex lg:flex-col">
          <Link href="/" className="font-serif text-3xl font-bold tracking-[-.08em]">Readr</Link>
          <article className="my-auto max-w-[390px]">
            <span className="mb-6 grid size-12 place-items-center rounded-full bg-coral"><BookOpen size={22} /></span>
            <h2 className="font-serif text-5xl leading-[1.02]">Histórias ganham vida quando encontram um leitor.</h2>
            <p className="mt-6 text-sm leading-relaxed text-white/65">Sua biblioteca, seus livros e seu progresso em um espaço feito para ler sem distrações.</p>
          </article>
          <span className="absolute -bottom-24 -right-20 size-80 rounded-full border-[60px] border-white/[.035]" />
        </aside>
        <section className="relative flex min-h-[690px] flex-col justify-center px-7 py-12 sm:px-16">
          <Link href="/" className="absolute left-7 top-8 font-serif text-2xl font-bold tracking-[-.08em] lg:hidden">Readr</Link>
          <div className="mb-8 grid size-11 place-items-center rounded-full bg-coral/10 text-coral"><Sparkles size={20} /></div>
          <p className="eyebrow">{signup ? 'Comece sua biblioteca' : 'Que bom ter você de volta'}</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">{signup ? 'Crie sua conta no Readr' : 'Bem-vindo ao Readr'}</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">{signup ? 'Cadastre seu nome, e-mail e escolha sua própria senha.' : 'Entre com os dados da sua conta para continuar sua leitura.'}</p>
          <div className="mt-9">{children}</div>
        </section>
      </section>
    </main>
  )
}
