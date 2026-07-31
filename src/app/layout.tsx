import type { Metadata } from 'next'
import './globals.css'
import { ProfileProvider } from '@/components/auth/ProfileProvider'
import { LanguageProvider } from '@/components/ui/LanguageProvider'
import { AppThemeProvider } from '@/components/ui/AppThemeProvider'

export const metadata: Metadata = {
  title: { default: 'Readr — sua leitura, do seu jeito', template: '%s | Readr' },
  description: 'Crie, organize e leia seus livros com uma experiência de página real.',
  applicationName: 'Readr',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><AppThemeProvider><LanguageProvider><ProfileProvider>{children}</ProfileProvider></LanguageProvider></AppThemeProvider></body>
    </html>
  )
}
