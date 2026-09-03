export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole, LoreDocumentType } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getLoreDocuments, deleteLoreDocument } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'
import { LoreToggleButton } from '@/components/LoreToggleButton'

const TYPE_LABELS: Record<LoreDocumentType, string> = {
  CHARACTER_BACKSTORY: 'Backstory',
  CAMPAIGN_ARC: 'Campaign Arc',
  SPECIES_DETAIL: 'Species',
  FACTION_DETAIL: 'Faction',
  WORLD_LORE: 'World Lore',
  CUSTOM: 'Custom',
}

const TYPE_COLORS: Record<LoreDocumentType, string> = {
  CHARACTER_BACKSTORY: '#7c3aed',
  CAMPAIGN_ARC: '#d97706',
  SPECIES_DETAIL: '#059669',
  FACTION_DETAIL: '#dc2626',
  WORLD_LORE: '#2563eb',
  CUSTOM: '#6b7280',
}

export default async function AdminLorePage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const docs = await getLoreDocuments()

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/ai" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← AI / Language Model
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            📚 Lore Library
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            Manage world-building documents that ground AI generation and chat responses
          </p>
        </div>
        <Link
          href="/admin/lore/new"
          className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90"
          style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}
        >
          + New Document
        </Link>
      </div>

      {docs.length === 0 ? (
        <div className="card-arcane rounded-lg p-10 text-center" style={{ fontFamily: 'Georgia, serif' }}>
          <p className="text-sm mb-4" style={{ color: '#6b7280' }}>No lore documents yet.</p>
          <Link
            href="/admin/lore/new"
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Create your first document
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="card-arcane rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
              style={{ opacity: doc.isActive ? 1 : 0.55 }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold"
                    style={{ backgroundColor: TYPE_COLORS[doc.type] + '22', color: TYPE_COLORS[doc.type], border: `1px solid ${TYPE_COLORS[doc.type]}55` }}
                  >
                    {TYPE_LABELS[doc.type]}
                  </span>
                  {!doc.isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#6b7280', border: '1px solid #374151' }}>
                      inactive
                    </span>
                  )}
                  <span className="text-[11px]" style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}>
                    sort: {doc.sortOrder}
                  </span>
                </div>
                <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
                  {doc.title}
                </p>
                {doc.summary && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
                    {doc.summary}
                  </p>
                )}
                {doc.tags && (
                  <p className="text-[11px] mt-1" style={{ color: '#6b7280' }}>
                    🏷 {doc.tags}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <LoreToggleButton id={doc.id} isActive={doc.isActive} />
                <Link
                  href={`/admin/lore/${doc.id}/edit`}
                  className="px-3 py-1.5 rounded text-xs hover:opacity-80"
                  style={{ backgroundColor: '#1f2937', color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                >
                  Edit
                </Link>
                <DeleteButton
                  action={deleteLoreDocument.bind(null, doc.id)}
                  label={doc.title}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
