import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ReaderEngine } from '@/components/reader/ReaderEngine'

export const metadata: Metadata = { title: 'Leitor' }

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <Suspense><ReaderEngine bookId={id} source="imported" chapters={[]} currentPage={0} onPageChange={() => {}} /></Suspense>
}