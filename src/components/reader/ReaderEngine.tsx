'use client'

import '@/styles/reader-v2.css'
import { useEffect, useState } from 'react'
import { useReaderStore } from '@/store/readerStore'
import { TextStackReader } from './v2/TextStackReader'
import { LiseurReader } from './v2/LiseurReader'
import { useBookData } from './v2/useBookData'

/* Breakpoint p/ trocar de leitor: desktop recebe o visual textstack e o
 * celular o visual liseur. Antes de 768px é mobile (mesmo critério do
 * restante do site). Durante o SSR a consulta ainda é desconhecida —
 * montamos um shell neutro e resolvemos no primeiro efeito. */
const MOBILE_QUERY = '(max-width: 767px)'

export function ReaderEngine({ bookId }: { bookId: string }) {
  const data = useBookData(bookId)
  const { theme, brightness } = useReaderStore()
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const apply = () => setIsMobile(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  return (
    <div className={isMobile ? 'rv-root liseur' : 'rv-root'} data-rv-theme={theme}>
      {isMobile === null ? (
        /* Enquanto o client-side resolve a media query, um placeholder neutro
         * evita mismatch de hidratação. */
        <div className="rv-boot" aria-hidden="true" />
      ) : isMobile ? (
        <LiseurReader data={data} />
      ) : (
        <TextStackReader data={data} />
      )}
      {brightness < 100 && (
        <div className="rv-dim" style={{ opacity: (100 - brightness) / 100 }} aria-hidden="true" />
      )}
    </div>
  )
}
