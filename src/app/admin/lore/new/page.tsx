import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createLoreDocument } from '@/app/actions'
import { LoreDocumentForm } from '@/components/LoreDocumentForm'

export default async function NewLoreDocumentPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/lore" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Lore Library
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
          📄 New Lore Document
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Create a document to add to the AI knowledge base
        </p>
      </div>

      <div className="card-arcane rounded-lg p-6">
        <LoreDocumentForm action={createLoreDocument} submitLabel="Create Document" />
      </div>
    </div>
  )
}
