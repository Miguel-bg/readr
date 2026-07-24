import type { Metadata } from 'next'
import { BookEditor } from '@/components/editor/BookEditor'
export const metadata: Metadata = { title: 'Editar livro' }
export default function EditBookPage({ params }: { params: { id: string } }) { return <BookEditor bookId={params.id} /> }
