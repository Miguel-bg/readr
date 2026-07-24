export type BookSource = 'imported' | 'created'
export type BookFormat = 'epub' | 'pdf' | 'docx' | 'readr'
export type ReaderTheme = 'light' | 'sepia' | 'dark'

export interface Book {
  id: string
  user_id?: string
  title: string
  author: string
  cover_url?: string | null
  format: BookFormat
  total_pages: number
  source: BookSource
  description?: string
  reads_count?: number
  file_url?: string | null
  content?: string[]
  created_at?: string
}

export interface CreatedBook extends Book {
  user_id: string
  status: 'draft' | 'published'
  reads_count: number
  created_at: string
  chapters?: Chapter[]
}

export interface Chapter {
  id?: string
  created_book_id?: string
  title: string
  content: string
  order_index: number
}

export interface ReadingProgress {
  id?: string
  user_id: string
  book_id: string
  book_source: BookSource
  current_page: number
  percent: number
  updated_at?: string
}

export interface UserProfile {
  id: string
  display_name: string
  avatar_url?: string | null
  created_at?: string
}

export interface CreateBookPayload {
  title: string
  author?: string
  cover_url?: string | null
  status: 'draft' | 'published'
  chapters: Omit<Chapter, 'id' | 'created_book_id'>[]
}

export interface ReaderPage {
  chapterTitle: string
  pageNumber: number
  html: string
}
