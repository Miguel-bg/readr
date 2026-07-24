import type { Metadata } from 'next'
import { BookEditor } from '@/components/editor/BookEditor'
export const metadata: Metadata = { title: 'Criar livro' }
export default function CreatePage() { return <BookEditor /> }
