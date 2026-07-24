import { createClient } from '@/lib/supabase/client'
import { parseBookFile } from '@/lib/reader/parseBook'
import { CreatedBookSource } from '@/lib/reader/ReaderSource'
import type { Book, CreateBookPayload, CreatedBook, ReadingProgress, UserProfile } from '@/lib/types'

interface ImportOptions { title?: string; author?: string; coverFile?: File | null }
export interface ContinueReadingData { book: Book; progress: ReadingProgress; pageHtml: string; chapterTitle: string }

function imported(row: Record<string, any>): Book {
  return { id: row.id, user_id: row.user_id, title: row.title || '', author: row.author || '', cover_url: row.cover_url, format: row.format, file_url: row.file_url, total_pages: Math.max(1, row.total_pages || 1), source: 'imported', content: Array.isArray(row.content) ? row.content : [], created_at: row.created_at }
}
function created(row: Record<string, any>): CreatedBook {
  const chapters = Array.isArray(row.chapters) ? [...row.chapters].sort((a, b) => a.order_index - b.order_index) : []
  const words = chapters.reduce((sum, chapter) => sum + String(chapter.content || '').trim().split(/\s+/).filter(Boolean).length, 0)
  return { ...row, title: row.title || '', author: row.author || '', chapters, format: 'readr', source: 'created', total_pages: Math.max(1, Math.ceil(words / 280)), reads_count: Number(row.reads_count || 0) } as CreatedBook
}

export async function getImportedLibrary(userId: string): Promise<Book[]> {
  if (!userId) throw new Error('Entre na sua conta para acessar a biblioteca.')
  const { data, error } = await createClient().from('books').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(imported)
}
export async function getImportedBook(bookId: string, userId: string): Promise<Book | null> {
  const { data, error } = await createClient().from('books').select('*').eq('id', bookId).eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data ? imported(data) : null
}

export async function importBook(file: File, userId: string, options: ImportOptions = {}) {
  if (!userId) throw new Error('Entre na sua conta antes de importar um livro.')
  const parsed = await parseBookFile(file)
  const supabase = createClient()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const filePath = `${userId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file, { contentType: file.type || undefined })
  if (uploadError) throw uploadError
  try {
    const coverUrl = options.coverFile ? await uploadCover(options.coverFile, userId) : null
    const { data, error } = await supabase.from('books').insert({ user_id: userId, title: options.title?.trim() || parsed.title, author: options.author?.trim() || parsed.author, cover_url: coverUrl, format: parsed.format, file_url: filePath, total_pages: parsed.pages.length, content: parsed.pages }).select('*').single()
    if (error) throw error
    return imported(data)
  } catch (error) {
    await supabase.storage.from('uploads').remove([filePath])
    throw error
  }
}

export async function getCreatedBooks(userId: string): Promise<CreatedBook[]> {
  if (!userId) throw new Error('Entre na sua conta para acessar seus livros.')
  const { data, error } = await createClient().from('created_books').select('*, chapters(*)').eq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(created)
}
export async function getCommunityBooks(userId: string): Promise<CreatedBook[]> {
  if (!userId) throw new Error('Entre na sua conta para descobrir novos livros.')
  const { data, error } = await createClient().from('created_books').select('*, chapters(*)').eq('status', 'published').neq('user_id', userId).order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(created)
}
export async function getCreatedBook(bookId: string): Promise<CreatedBook | null> {
  const { data, error } = await createClient().from('created_books').select('*, chapters(*)').eq('id', bookId).maybeSingle()
  if (error) throw error
  return data ? created(data) : null
}

export async function createBook(payload: CreateBookPayload, userId: string) {
  const supabase = createClient()
  const { data: book, error } = await supabase.from('created_books').insert({ user_id: userId, title: payload.title, author: payload.author?.trim() || null, cover_url: payload.cover_url, status: payload.status }).select().single()
  if (error) throw error
  const chapters = payload.chapters.map((chapter, index) => ({ ...chapter, created_book_id: book.id, order_index: index }))
  const { error: chapterError } = await supabase.from('chapters').insert(chapters)
  if (chapterError) { await supabase.from('created_books').delete().eq('id', book.id); throw chapterError }
  return book.id as string
}
export async function updateBook(bookId: string, payload: CreateBookPayload, userId: string) {
  const supabase = createClient()
  const { data: owned, error: ownershipError } = await supabase.from('created_books').select('id').eq('id', bookId).eq('user_id', userId).maybeSingle()
  if (ownershipError) throw ownershipError
  if (!owned) throw new Error('Somente o proprietário pode editar este livro.')
  const { error } = await supabase.from('created_books').update({ title: payload.title, author: payload.author?.trim() || null, cover_url: payload.cover_url, status: payload.status }).eq('id', bookId).eq('user_id', userId)
  if (error) throw error
  const { error: deleteError } = await supabase.from('chapters').delete().eq('created_book_id', bookId)
  if (deleteError) throw deleteError
  const chapters = payload.chapters.map((chapter, index) => ({ ...chapter, created_book_id: bookId, order_index: index }))
  const { error: chapterError } = await supabase.from('chapters').insert(chapters)
  if (chapterError) throw chapterError
}

export async function updateReadingProgress(progress: Omit<ReadingProgress, 'id' | 'updated_at'>) {
  const { error } = await createClient().from('reading_progress').upsert({ ...progress, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book_id,book_source' })
  if (error) throw error
}
export async function getReadingProgress(userId: string, bookId: string, source: Book['source']) {
  const { data, error } = await createClient().from('reading_progress').select('*').eq('user_id', userId).eq('book_id', bookId).eq('book_source', source).maybeSingle()
  if (error) throw error
  return data as ReadingProgress | null
}
export async function getContinueReading(userId: string): Promise<ContinueReadingData | null> {
  const { data, error } = await createClient().from('reading_progress').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  if (!data) return null
  const progress = data as ReadingProgress
  if (progress.book_source === 'imported') {
    const book = await getImportedBook(progress.book_id, userId)
    if (!book) return null
    const index = Math.min(progress.current_page, Math.max(0, (book.content?.length || 1) - 1))
    return { book, progress, pageHtml: book.content?.[index] || '', chapterTitle: `Página ${index + 1}` }
  }
  const book = await getCreatedBook(progress.book_id)
  if (!book) return null
  const pages = await new CreatedBookSource(book, book.chapters || []).load()
  const index = Math.min(progress.current_page, Math.max(0, pages.length - 1))
  return { book: { ...book, total_pages: pages.length }, progress, pageHtml: pages[index]?.html || '', chapterTitle: pages[index]?.chapterTitle || '' }
}
export async function registerBookRead(bookId: string, readerId: string, ownerId?: string) {
  if (!readerId || readerId === ownerId) return
  const { error } = await createClient().rpc('increment_book_reads', { target_book_id: bookId })
  if (error) throw error
}

export async function uploadCover(file: File, userId: string) {
  if (!file.type.startsWith('image/')) throw new Error('A capa precisa ser uma imagem.')
  const supabase = createClient()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('covers').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
}
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw error
  return data || { id: user.id, display_name: String(user.user_metadata.display_name || user.email?.split('@')[0] || ''), avatar_url: null }
}
