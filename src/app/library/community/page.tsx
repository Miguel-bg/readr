import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LibraryView } from '@/components/books/LibraryView'

export const metadata: Metadata = { title: 'Descobrir' }
export default function CommunityLibraryPage() { return <Suspense fallback={null}><LibraryView mode="community" /></Suspense> }
