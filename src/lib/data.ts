// Camada de dados do Readr no Cloudflare: todas as funções conversam com o D1
// através de /api/rpc (o servidor resolve sessão, regras de acesso e SQL).
// As assinaturas são as mesmas da versão anterior para não reescrever os componentes.
import { parseBookFile } from '@/lib/reader/parseBook'
import { CreatedBookSource, ImportedBookSource, readerPageText, repaginateReaderContent } from '@/lib/reader/ReaderSource'
import { countWordsInText } from '@/lib/reader/blocks'
import type { RpcArgs, RpcNoArgs, RpcResults, Row } from '@/lib/rpc-contract'
import type { Book, BookSource, CreateBookPayload, CreatedBook, HighlightColor, ReaderHighlight, ReadingProgress, ShelfStatus, UserProfile } from '@/lib/types'

export interface ImportOptions {
  title?: string
  author?: string
  description?: string
  coverFile?: File | null
  genre?: string
  language?: string
  publishedYear?: number | null
  publisher?: string
  tags?: string[]
}
export interface ContinueReadingData { book: Book; progress: ReadingProgress; pageHtml: string; chapterTitle: string }

// Chamada RPC tipada pelo contrato (src/lib/rpc-contract.ts): op inexistente ou arg
// em forma errada falha em tsc. Ops sem args nem aceitam o segundo parâmetro.
interface RpcCallOpts {
  /** true = a chamada precisa sobreviver ao fechamento da aba (progresso em unload). */
  keepalive?: boolean
}

async function rpc<Op extends keyof RpcArgs>(
  op: Op,
  ...args: RpcArgs[Op] extends RpcNoArgs ? [opts?: RpcCallOpts] : [RpcArgs[Op], opts?: RpcCallOpts]
): Promise<RpcResults[Op]> {
  const [first, second] = args as [RpcArgs[Op] | RpcCallOpts | undefined, RpcCallOpts | undefined]
  let payload: unknown = first ?? {}
  let opts: RpcCallOpts | undefined = second
  if (!second && payload && typeof payload === 'object' && 'keepalive' in payload) {
    opts = payload as RpcCallOpts
    payload = {}
  }
  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op, args: payload }),
    credentials: 'same-origin',
    keepalive: opts?.keepalive === true,
  })
  const result = await response.json() as { ok?: boolean; data?: RpcResults[Op]; error?: string; code?: string }
  if (!response.ok || !result.ok) {
    // Item 23: o código estruturado viaja com o erro — o cliente reage a NOT_FOUND
    // sem decifrar a string (que ainda acompanha, para exibição direta).
    throw Object.assign(new Error(result.error || 'Não foi possível concluir a operação.'), { code: result.code })
  }
  return result.data as RpcResults[Op]
}

function importedBookOf(row: Row): Book {
  return {
    id: row.id, user_id: row.user_id, title: row.title || '', author: row.author || '', description: row.description || '', cover_url: row.cover_url,
    format: row.format, file_url: row.file_url, total_pages: Math.max(1, row.total_pages || 1), source: 'imported', content: Array.isArray(row.content) ? row.content : [],
    access: row.access === 'other' ? 'other' : row.access === 'owner' ? 'owner' : undefined,
    genre: row.genre || '', language: row.language || 'Português', published_year: row.published_year, publisher: row.publisher || '', tags: row.tags || [],
    reads_count: Number(row.reads_count || 0), created_at: row.created_at,
  }
}

function createdBookOf(row: Row): CreatedBook {
  const chapters = Array.isArray(row.chapters) ? [...row.chapters].sort((a, b) => a.order_index - b.order_index) : []
  const words = chapters.reduce((sum, chapter) => sum + countWordsInText(String(chapter.content || '')), 0)
  return {
    ...row, title: row.title || '', author: row.author || '', description: row.description || '', chapters, format: 'readr', source: 'created',
    total_pages: Math.max(1, row.total_pages || Math.ceil(words / 280)), reads_count: Number(row.reads_count || 0), tags: row.tags || [],
  } as CreatedBook
}

export async function getImportedLibrary(userId: string): Promise<Book[]> {
  if (!userId) return []
  return (await rpc('library_mine')).map(importedBookOf)
}

export async function getPublicImportedBooks(userId?: string): Promise<Book[]> {
  void userId // a exclusão dos próprios livros é resolvida no servidor pela sessão
  return (await rpc('library_public')).map(importedBookOf)
}

export async function getImportedBook(bookId: string): Promise<Book | null> {
  const row = await rpc('book_get', { bookId })
  return row ? importedBookOf(row) : null
}

export async function getPublicBook(bookId: string, source: BookSource): Promise<Book | null> {
  if (source === 'created') return getCreatedBook(bookId)
  const row = await rpc('book_get', { bookId })
  return row ? importedBookOf(row) : null
}

export async function getPublicLibrary(): Promise<Book[]> {
  const [imports, authored] = await Promise.all([getPublicImportedBooks(), getCommunityBooks()])
  return [...imports, ...authored]
}

export const getCatalogBooks = getPublicLibrary
export const getCatalogBook = getPublicBook

export async function getShelf(userId: string): Promise<Book[]> {
  if (!userId) return []
  const [items, catalog, ownedImports] = await Promise.all([
    getShelfItems(userId),
    getPublicLibrary(),
    getImportedLibrary(userId),
  ])
  const available = new Map<string, Book>()
  ;[...catalog, ...ownedImports].forEach((book) => available.set(`${book.source}:${book.id}`, book))
  return items.flatMap((item) => {
    const book = available.get(`${item.book_source}:${item.book_id}`)
    return book ? [{ ...book, shelf_status: item.status as ShelfStatus }] : []
  })
}

export async function importBook(file: File, userId: string, options: ImportOptions = {}) {
  if (!userId) throw new Error('Entre na sua conta antes de importar um livro.')
  const parsed = await parseBookFile(file)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')

  // Arquivo original vai para o D1 (limite 25 MB). Acima disso o livro entra sem backup do arquivo bruto.
  let fileUrl: string | null = null
  if (file.size <= 25 * 1024 * 1024) {
    fileUrl = await uploadFile(file, 'book')
  }

  const extractedCover = parsed.coverBlob
    ? new File(
        [parsed.coverBlob],
        `${safeName.replace(/\.[^.]+$/, '')}-cover.${parsed.coverExtension || 'jpg'}`,
        { type: parsed.coverBlob.type || 'image/jpeg' },
      )
    : null
  const coverFile = options.coverFile || extractedCover
  const coverUrl = coverFile ? await uploadCover(coverFile, userId) : null

  const bookId = await rpc('book_create', {
    book: {
      title: options.title?.trim() || parsed.title,
      author: options.author?.trim() || parsed.author,
      description: options.description?.trim() || parsed.description || '',
      cover_url: coverUrl,
      format: parsed.format,
      file_url: fileUrl,
      total_pages: parsed.pages.length,
      content: parsed.pages,
      genre: options.genre || '',
      language: options.language || parsed.language || 'Português',
      published_year: options.publishedYear || parsed.publicationYear || null,
      publisher: options.publisher || parsed.publisher || '',
      tags: options.tags || [],
    },
  })

  return importedBookOf({
    id: bookId, user_id: userId, title: options.title?.trim() || parsed.title, author: options.author?.trim() || parsed.author,
    description: options.description?.trim() || parsed.description || '', cover_url: coverUrl, format: parsed.format, file_url: fileUrl,
    total_pages: parsed.pages.length, genre: options.genre || '', language: options.language || parsed.language || 'Português',
    published_year: options.publishedYear || parsed.publicationYear || null, publisher: options.publisher || parsed.publisher || '',
    tags: options.tags || [], reads_count: 0, created_at: new Date().toISOString(),
  })
}

export async function updateImportedBook(bookId: string, userId: string, changes: Partial<Pick<Book, 'title' | 'author' | 'description' | 'cover_url' | 'genre' | 'language' | 'published_year' | 'publisher' | 'tags'>>) {
  void userId // propriedade vale a sessão
  await rpc('book_update', { bookId, changes })
}

export async function deleteImportedBook(bookId: string, userId: string) {
  void userId
  await rpc('book_delete', { bookId })
}

export async function getCreatedBooks(userId: string): Promise<CreatedBook[]> {
  if (!userId) return []
  return (await rpc('created_list_mine')).map(createdBookOf)
}

export async function getCommunityBooks(userId?: string): Promise<CreatedBook[]> {
  void userId
  return (await rpc('created_list_community')).map(createdBookOf)
}

export async function getCreatedBook(bookId: string): Promise<CreatedBook | null> {
  const row = await rpc('created_book_get', { bookId })
  return row ? createdBookOf(row) : null
}

export async function createBook(payload: CreateBookPayload, userId: string) {
  void userId
  return rpc('created_create', { ...payload })
}

export async function updateBook(bookId: string, payload: CreateBookPayload, userId: string) {
  void userId
  await rpc('created_update', { bookId, ...payload })
}

export async function updateReadingProgress(progress: Omit<ReadingProgress, 'id' | 'updated_at'>) {
  // Item 16 (banca): o último progresso antes de fechar a aba precisa chegar ao
  // servidor — keepalive: true amarra o POST ao ciclo do documento, não à página.
  await rpc('progress_upsert', { ...progress }, { keepalive: true })
}

export async function getReadingProgress(userId: string, bookId: string, source: BookSource) {
  void userId
  return rpc('progress_get', { bookId, bookSource: source })
}

export async function getContinueReading(userId: string): Promise<ContinueReadingData | null> {
  void userId
  const progress = await rpc('progress_latest')
  if (!progress) return null
  const book = progress.book_source === 'imported' ? await getImportedBook(progress.book_id) : await getCreatedBook(progress.book_id)
  if (!book) return null
  const source = progress.book_source === 'imported'
    ? await new ImportedBookSource(book).load()
    : await new CreatedBookSource(book, (book as CreatedBook).chapters || []).load()
  const pages = repaginateReaderContent(source, 165)
  const anchor = Number(progress.anchor_offset || 0)
  const index = anchor
    ? Math.max(0, pages.findLastIndex((page) => Number(page.anchor || 0) <= anchor))
    : Math.min(progress.current_page, Math.max(0, pages.length - 1))
  const page = pages[index]
  return { book: { ...book, total_pages: pages.length }, progress: { ...progress, current_page: index }, pageHtml: page ? readerPageText(page) : '', chapterTitle: page?.chapterTitle || '' }
}

export async function registerBookRead(bookId: string, source: BookSource) {
  await rpc('read_register', { bookId, bookSource: source })
}

export async function setShelfStatus(userId: string, bookId: string, source: BookSource, status: ShelfStatus) {
  void userId
  await rpc('shelf_set', { bookId, bookSource: source, status })
}

export async function getShelfItems(userId: string) {
  if (!userId) return []
  return rpc('shelf_list')
}

export async function setBookReaction(userId: string, bookId: string, source: BookSource, reaction: 'like' | 'dislike') {
  void userId
  await rpc('reaction_set', { bookId, bookSource: source, reaction })
}

/** Volta a reação para "vazia" (item 18 da banca). */
export async function removeBookReaction(userId: string, bookId: string, source: BookSource) {
  void userId
  await rpc('reaction_remove', { bookId, bookSource: source })
}

export async function getBookSocial(bookId: string, source: BookSource) {
  return rpc('social_get', { bookId, bookSource: source })
}

export async function saveReview(userId: string, bookId: string, source: BookSource, rating: number, content: string) {
  void userId
  await rpc('review_save', { bookId, bookSource: source, rating, content })
}

export async function getBookReviews(bookId: string, source: BookSource) {
  return (await getBookSocial(bookId, source)).reviews
}

export async function saveBookToShelf(userId: string, book: Book, status: 'want_to_read' | 'reading' | 'saved' | 'wishlist' | 'completed') {
  const normalized: ShelfStatus = status === 'want_to_read' ? 'wishlist' : status
  return setShelfStatus(userId, book.id, book.source, normalized)
}

export async function toggleBookLike(userId: string, book: Book, liked: boolean) {
  if (liked) return setBookReaction(userId, book.id, book.source, 'like')
  await rpc('reaction_remove', { bookId: book.id, bookSource: book.source })
}

export async function getProfiles(query = '') {
  return rpc('profiles_search', { query })
}

export async function toggleFollow(currentUserId: string, profileId: string, following: boolean) {
  void currentUserId
  await rpc('follow_toggle', { profileId, following })
}

export async function getFollowCounts(profileId: string, currentUserId?: string) {
  void currentUserId
  return rpc('follow_get', { profileId })
}

export async function getRankings() {
  return rpc('rankings_get')
}

export async function getPublicProfile(profileId: string) {
  return rpc('profile_get', { profileId })
}

export async function getProfileActivities(profileId: string) {
  return rpc('activities_list', { profileId })
}

export async function getBookmarks(userId: string, bookId: string, source: BookSource) {
  void userId
  return rpc('bookmarks_list', { bookId, bookSource: source })
}

export async function toggleBookmark(userId: string, bookId: string, source: BookSource, pageNumber: number, note = '', anchorOffset = 0) {
  void userId
  return rpc('bookmarks_toggle', { bookId, bookSource: source, pageNumber, note, anchorOffset })
}

export async function getHighlights(userId: string, bookId: string, source: BookSource): Promise<ReaderHighlight[]> {
  void userId
  return rpc('highlights_list', { bookId, bookSource: source })
}

export async function createHighlight(input: {
  userId: string
  bookId: string
  source: BookSource
  anchorStart: number
  anchorEnd: number
  selectedText: string
  color: HighlightColor
  note?: string
}) {
  // userId fica no cliente só para assinatura; o servidor usa a sessão.
  const { userId, source, ...rest } = input
  void userId
  // BUG corrigido (banca): antes ia `source` e o handler lia `args.bookSource` —
  // todo highlight era gravado com book_source="undefined" e nunca listado.
  return rpc('highlights_create', { bookSource: source, ...rest })
}

export async function updateHighlightNote(id: string, userId: string, note: string) {
  void userId
  await rpc('highlights_update_note', { id, note })
}

export async function deleteHighlight(id: string, userId: string) {
  void userId
  await rpc('highlights_delete', { id })
}

async function uploadFile(file: File | Blob, kind: 'cover' | 'avatar' | 'book'): Promise<string> {
  const form = new FormData()
  const name = file instanceof File ? file.name : `${kind}.jpg`
  form.append('file', file instanceof File ? file : new File([file], name, { type: file.type || 'image/jpeg' }))
  form.append('kind', kind)
  const response = await fetch('/api/files/upload', { method: 'POST', body: form, credentials: 'same-origin' })
  const result = await response.json() as { ok?: boolean; url?: string; error?: string }
  if (!response.ok || !result.url) throw new Error(result.error || 'Não foi possível enviar o arquivo.')
  return result.url
}

export async function uploadCover(file: File, userId: string) {
  void userId
  if (!file.type.startsWith('image/')) throw new Error('A capa precisa ser uma imagem.')
  return uploadFile(file, 'cover')
}

/** Avatar do perfil (usado pela página Meu perfil). */
export async function uploadAvatar(file: File, userId: string) {
  void userId
  if (!file.type.startsWith('image/')) throw new Error('O avatar precisa ser uma imagem.')
  const url = await uploadFile(file, 'avatar')
  await updateProfile({ avatar_url: url })
  return url
}

export async function updateProfile(changes: Partial<Pick<UserProfile, 'display_name' | 'bio' | 'avatar_url'>>) {
  return rpc('profile_update', { changes })
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
  const result = await response.json() as { profile?: UserProfile | null }
  return result.profile ?? null
}

export async function deleteAccount(): Promise<void> {
  const response = await fetch('/api/auth/delete-account', { method: 'DELETE', credentials: 'same-origin' })
  const result = await response.json() as { ok?: boolean; error?: string }
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível excluir a conta.')
}
