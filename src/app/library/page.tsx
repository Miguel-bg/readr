import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LibraryView } from '@/components/books/LibraryView'

export const metadata: Metadata = { title: 'Biblioteca' }
export default function LibraryPage() { return <Suspense fallback={null}><LibraryView mode="imported" /></Suspense> }
