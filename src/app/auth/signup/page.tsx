import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/AuthShell'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Criar conta' }
export default function SignupPage() { return <AuthShell mode="signup"><SignupForm /></AuthShell> }
