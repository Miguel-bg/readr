import { NextResponse } from 'next/server'
import { db } from '@/server/store'
import { getSessionUser } from '@/server/auth'

// Tipos considerados seguros para render inline. Qualquer coisa fora disso
// (o mime do banco só vale para estes, e os bytes têm que bater) sai como
// download obrigatório, sem render no origin.
const SAFE_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

// Sniff dos primeiros bytes: protege contra linhas antigas com mime forjado pelo cliente.
function sniffType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  const ascii = (from: number, to: number) => {
    let text = ''
    for (let i = from; i < to; i += 1) text += String.fromCharCode(bytes[i])
    return text
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (ascii(0, 3) === 'GIF' && (ascii(3, 6) === '87a' || ascii(3, 6) === '89a')) return 'image/gif'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  if (ascii(0, 5) === '%PDF-') return 'application/pdf'
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const head = ascii(0, Math.min(bytes.length, 128))
    if (head.includes('application/epub+zip')) return 'application/epub+zip'
    if (head.includes('[Content_Types].xml') || head.includes('word/')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    return 'application/zip'
  }
  return null
}

// Serve um arquivo guardado em D1. Capas e avatares são públicos; arquivos de livro ficam privados do dono.
export async function GET(request: Request, next: { params: Promise<{ id: string }> }) {
  const { id } = await next.params
  if (!id) return new NextResponse(null, { status: 404, headers: noSniffHeaders() })

  const row = await db().prepare('select kind, owner_id, mime, size, is_public from files where id = ?').bind(id).first<Record<string, any>>()
  if (!row) return new NextResponse(null, { status: 404, headers: noSniffHeaders() })

  if (!Number(row.is_public)) {
    const user = await getSessionUser(request)
    if (!user || user.id !== row.owner_id) return new NextResponse(null, { status: 404, headers: noSniffHeaders() })
  }

  const { results } = await db().prepare('select data from file_chunks where file_id = ? order by chunk_index').bind(id).all<{ data: ArrayBuffer }>()
  if (!(results || []).length) return new NextResponse(null, { status: 404, headers: noSniffHeaders() })

  const buffer = new Uint8Array(Math.ceil(Number(row.size || 0)))
  let offset = 0
  for (const chunk of results) {
    const part = new Uint8Array(chunk.data)
    buffer.set(part, offset)
    offset += part.length
  }
  const body = buffer.subarray(0, offset)

  const headers = noSniffHeaders()
  // Inline só quando: mime declarado é imagem segura E os bytes confirmam o mesmo tipo.
  const sniffed = sniffType(body)
  const stored = String(row.mime || '')
  const isTrustedImage = (row.kind === 'cover' || row.kind === 'avatar')
    && SAFE_IMAGE_MIME.has(stored)
    && stored === sniffed

  if (isTrustedImage && sniffed) {
    headers.set('Content-Type', sniffed)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
  } else {
    // Bytes com origem parcial do usuário: nunca renderizam no domínio do app.
    headers.set('Content-Type', 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${id}"`)
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
    headers.set('Cache-Control', 'private, no-store')
  }
  headers.set('Content-Length', String(offset))
  return new Response(body, { headers })
}

function noSniffHeaders(): Headers {
  const headers = new Headers()
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
  return headers
}
