import type { Metadata } from 'next'
import './globals.css'
import { ProfileProvider } from '@/components/auth/ProfileProvider'
import { LanguageProvider } from '@/components/ui/LanguageProvider'

export const metadata: Metadata = {
  title: { default: 'Readr — sua leitura, do seu jeito', template: '%s | Readr' },
  description: 'Crie, organize e leia seus livros com uma experiência de página real.',
  applicationName: 'Readr',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><LanguageProvider><ProfileProvider>{children}</ProfileProvider></LanguageProvider></body>
    </html>
  )
}
