import { NextResponse } from 'next/server'
import { db } from '@/server/store'
import { getSessionUser } from '@/server/auth'

const CHUNK_BYTES = 512 * 1024
const MAX_BYTES: Record<string, number> = {
  cover: 4 * 1024 * 1024,
  avatar: 4 * 1024 * 1024,
  book: 25 * 1024 * 1024,
}

// Mime canônico do DOCX (nome comprido, mas é este que o browser/canvas espera).
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Whitelist por uso: capas/avatares são imagens; livro é EPUB/PDF/DOCX.
const ALLOWED_MIME: Record<string, string[]> = {
  cover: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  avatar: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  book: ['application/epub+zip', 'application/pdf', DOCX_MIME],
}

// Descobre o tipo REAL do arquivo pelos primeiros bytes (magic bytes).
// Nunca confiamos no Content-Type que o cliente declara.
function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  const ascii = (from: number, to: number) => {
    let text = ''
    for (let i = from; i < to; i += 1) text += String.fromCharCode(bytes[i])
    return text
  }

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  // GIF87a / GIF89a
  if (ascii(0, 3) === 'GIF' && (ascii(3, 6) === '87a' || ascii(3, 6) === '89a')) return 'image/gif'
  // WEBP: RIFF .... WEBP
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  // PDF: %PDF-
  if (ascii(0, 5) === '%PDF-') return 'application/pdf'
  // Família ZIP: EPUB (mimetype como primeira entrada, sem compressão) ou DOCX ([Content_Types].xml).
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const head = ascii(0, Math.min(bytes.length, 128))
    if (head.includes('application/epub+zip')) return 'application/epub+zip'
    if (head.includes('[Content_Types].xml') || head.includes('word/')) return DOCX_MIME
    return null
  }
  return null
}

// Upload de arquivo: bytes ficam em D1 (files/file_chunks). Devolve a URL pública /api/files/<id>.
// O mime gravado é o detectado no servidor; o que o cliente declara é ignorado.
export async function POST(request: Request) {
  const user = await getSessionUser(request)
  if (!user) return NextResponse.json({ ok: false, error: 'Entre na sua conta antes de enviar arquivos.' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const kind = String(form?.get('kind') || '')
  if (!form || !(file instanceof File)) return NextResponse.json({ ok: false, error: 'Arquivo ausente ou inválido.' }, { status: 400 })
  if (!(kind in MAX_BYTES)) return NextResponse.json({ ok: false, error: 'Uso de arquivo não suportado.' }, { status: 400 })
  if (file.size > MAX_BYTES[kind]) {
    return NextResponse.json({ ok: false, error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Limite: ${MAX_BYTES[kind] / 1024 / 1024} MB.` }, { status: 413 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const mime = sniffMime(bytes)
  if (!mime || !ALLOWED_MIME[kind].includes(mime)) {
    return NextResponse.json({ ok: false, error: kind === 'book'
      ? 'Formato inválido. Esperamos EPUB, PDF ou DOCX de verdade — confira o arquivo.'
      : 'Imagem inválida. Use PNG, JPEG, WEBP ou GIF.' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  const chunkCount = Math.max(1, Math.ceil(bytes.length / CHUNK_BYTES))
  const statements = [
    db().prepare('insert into files (id, kind, owner_id, mime, size, chunk_count, is_public, created_at) values (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, kind, user.id, mime, bytes.length, chunkCount, kind === 'book' ? 0 : 1, new Date().toISOString()),
  ]
  for (let index = 0; index < chunkCount; index += 1) {
    statements.push(db().prepare('insert into file_chunks (file_id, chunk_index, data) values (?, ?, ?)')
      .bind(id, index, bytes.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES)))
  }
  try {
    await db().batch(statements)
  } catch {
    return NextResponse.json({ ok: false, error: 'Não foi possível salvar o arquivo. Tente novamente.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, url: `/api/files/${id}`, mime })
}
