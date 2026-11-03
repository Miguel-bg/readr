import type { Metadata } from 'next'
import { Atkinson_Hyperlegible, Literata, Source_Sans_3 } from 'next/font/google'
import './globals.css'
import { ProfileProvider } from '@/components/auth/ProfileProvider'
import { LanguageProvider } from '@/components/ui/LanguageProvider'
import { AppThemeProvider } from '@/components/ui/AppThemeProvider'

// Fontes do leitor (mesma família visual dos referências: Literata é a serif do ler
// desktop textstack e do liseur no celular; Source Sans 3 é a sans do textstack).
const literata = Literata({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--reader-font-literata', display: 'swap' })
const sourceSans = Source_Sans_3({ subsets: ['latin'], style: ['normal', 'italic'], variable: '--reader-font-source-sans', display: 'swap' })
const atkinson = Atkinson_Hyperlegible({ subsets: ['latin'], weight: ['400', '700'], variable: '--reader-font-atkinson', display: 'swap' })
const readerFontVariables = [literata, sourceSans, atkinson].map((font) => font.variable).join(' ')

export const metadata: Metadata = {
  title: { default: 'Readr — sua leitura, do seu jeito', template: '%s | Readr' },
  description: 'Crie, organize e leia seus livros com uma experiência de página real.',
  applicationName: 'Readr',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={readerFontVariables}><AppThemeProvider><LanguageProvider><ProfileProvider>{children}</ProfileProvider></LanguageProvider></AppThemeProvider></body>
    </html>
  )
}
