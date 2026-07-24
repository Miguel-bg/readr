import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageFlipReader } from '@/components/reader/PageFlipReader'
export const metadata: Metadata = { title: 'Leitor' }
export default function BookPage({ params }: { params: { id: string } }) { return <Suspense><PageFlipReader bookId={params.id} /></Suspense> }
