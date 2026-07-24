import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LibraryView } from '@/components/books/LibraryView'

export const metadata: Metadata = { title: 'Livros criados' }
export default function CreatedLibraryPage() { return <Suspense fallback={null}><LibraryView mode="created" /></Suspense> }
