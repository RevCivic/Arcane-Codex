import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getLoreDocumentById, updateLoreDocument } from '@/app/actions'
import { LoreDocumentForm } from '@/components/LoreDocumentForm'

export default async function EditLoreDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) notFound()

  const doc = await getLoreDocumentById(id)
  if (!doc) notFound()

  const action = updateLoreDocument.bind(null, id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/lore" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Lore Library
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
          ✏️ Edit Lore Document
        </h1>
        <p className="text-sm mt-1 truncate" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          {doc.title}
        </p>
      </div>

      <div className="card-arcane rounded-lg p-6">
        <LoreDocumentForm
          action={action}
          defaultValues={{
            title: doc.title,
            type: doc.type,
            summary: doc.summary,
            content: doc.content,
            isActive: doc.isActive,
            sortOrder: doc.sortOrder,
            tags: doc.tags,
          }}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}
