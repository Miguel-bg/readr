// Contrato tipado do RPC (banca item 11, parte 2): ÚNICA fonte dos nomes de op,
// das formas de argumento e dos formatos de retorno. O cliente (src/lib/data.ts)
// e o servidor (src/server/store.ts) são checados contra este mapa — op inexistente
// ou argumento errado falha em tsc, não em produção.
import type {
  Book,
  BookFormat,
  BookReview,
  BookSource,
  CreateBookPayload,
  HighlightColor,
  ReaderBookmark,
  ReaderHighlight,
  ReadingProgress,
  ShelfStatus,
  UserProfile,
} from './types'

/** Linha crua devolvida pelo D1 (colunas ≅ registro antes do mapeamento no cliente).
 * `any` deliberado e CONCENTRADO aqui: estes registros vêm de `select *` binário do D1;
 * os mappers (importedBookOf, createdBookOf, reviewOut...) traduzem para os tipos de domínio. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- única inca do repo; linhas cruas do D1
export type Row = Record<string, any>

/** Ops sem argumento no corpo da chamada. */
export type RpcNoArgs = Record<string, never>

/** Payload de importação de livro para o op book_create. */
export interface BookImportPayload {
  title?: string
  author?: string | null
  description?: string | null
  cover_url?: string | null
  format?: BookFormat
  file_url?: string | null
  total_pages?: number
  content?: unknown[]
  genre?: string
  language?: string
  published_year?: number | null
  publisher?: string
  tags?: string[]
}

/** Mudanças de livro importado (book_update). */
export type BookChanges = Partial<Pick<Book, 'title' | 'author' | 'description' | 'cover_url' | 'genre' | 'language' | 'published_year' | 'publisher' | 'tags'>>

/** Mudanças de perfil (profile_update). */
export type ProfileChanges = Partial<Pick<UserProfile, 'display_name' | 'bio' | 'avatar_url'>>

export interface BookSocial {
  likes: number
  dislikes: number
  reviews: BookReview[]
  averageRating: number
}

export interface FollowCounts {
  followers: number
  following: number
  isFollowing: boolean
}

export interface RankingEntry {
  profile: UserProfile
  booksRead: number
  pagesRead: number
  streak: number
}

/** Args de cada op — a forma EXATamente aceita pelo servidor. */
export interface RpcArgs {
  session_get: RpcNoArgs
  library_mine: RpcNoArgs
  library_public: RpcNoArgs
  book_get: { bookId: string }
  book_create: { book: BookImportPayload }
  book_update: { bookId: string; changes: BookChanges }
  book_delete: { bookId: string }
  created_list_mine: RpcNoArgs
  created_list_community: RpcNoArgs
  created_book_get: { bookId: string }
  created_create: CreateBookPayload
  created_update: CreateBookPayload & { bookId: string }
  read_register: { bookId: string; bookSource: BookSource }
  social_get: { bookId: string; bookSource: BookSource }
  reaction_set: { bookId: string; bookSource: BookSource; reaction: 'like' | 'dislike' }
  reaction_remove: { bookId: string; bookSource: BookSource }
  review_save: { bookId: string; bookSource: BookSource; rating: number; content: string }
  follow_toggle: { profileId: string; following: boolean }
  follow_get: { profileId: string }
  rankings_get: RpcNoArgs
  profiles_search: { query: string }
  profile_get: { profileId: string }
  profile_update: { changes: ProfileChanges }
  activities_list: { profileId: string }
  progress_upsert: Omit<ReadingProgress, 'id' | 'updated_at'>
  progress_get: { bookId: string; bookSource: BookSource }
  progress_latest: RpcNoArgs
  shelf_list: RpcNoArgs
  shelf_set: { bookId: string; bookSource: BookSource; status: ShelfStatus }
  bookmarks_list: { bookId: string; bookSource: BookSource }
  bookmarks_toggle: { bookId: string; bookSource: BookSource; pageNumber: number; note?: string; anchorOffset?: number }
  highlights_list: { bookId: string; bookSource: BookSource }
  highlights_create: { bookId: string; bookSource: BookSource; anchorStart: number; anchorEnd: number; selectedText: string; color?: HighlightColor; note?: string }
  highlights_update_note: { id: string; note: string }
  highlights_delete: { id: string }
  account_delete: RpcNoArgs
}

/** O que cada op devolve — o formato EXATamente que o cliente consome. */
export interface RpcResults {
  session_get: UserProfile | null
  library_mine: Row[]
  library_public: Row[]
  book_get: Row | null
  book_create: string
  book_update: void
  book_delete: void
  created_list_mine: Row[]
  created_list_community: Row[]
  created_book_get: Row | null
  created_create: string
  created_update: void
  read_register: boolean
  social_get: BookSocial
  reaction_set: boolean
  reaction_remove: boolean
  review_save: boolean
  follow_toggle: boolean
  follow_get: FollowCounts
  rankings_get: RankingEntry[]
  profiles_search: UserProfile[]
  profile_get: UserProfile | null
  profile_update: UserProfile
  activities_list: Row[]
  progress_upsert: boolean
  progress_get: ReadingProgress | null
  progress_latest: ReadingProgress | null
  shelf_list: Row[]
  shelf_set: boolean
  bookmarks_list: ReaderBookmark[]
  bookmarks_toggle: boolean
  highlights_list: ReaderHighlight[]
  highlights_create: ReaderHighlight
  highlights_update_note: boolean
  highlights_delete: boolean
  account_delete: boolean
}
