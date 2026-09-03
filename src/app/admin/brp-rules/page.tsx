export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getBRPRules, deleteBRPRule } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function AdminBRPRulesPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const rules = await getBRPRules()
  const sections = Array.from(new Set(rules.filter(r => r.section).map(r => r.section!)))

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Admin
        </Link>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            📖 BRP Rules Wiki
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            Manage Basic Roleplaying game rules for the campaign
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/brp-rules/import-queue"
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#2563eb', color: '#fff', fontFamily: 'Georgia, serif' }}
          >
            📥 Import Queue
          </Link>
          <Link
            href="/admin/brp-rules/import"
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}
          >
            ⬇️ Import Rules
          </Link>
          <Link
            href="/admin/brp-rules/new"
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#059669', color: '#fff', fontFamily: 'Georgia, serif' }}
          >
            + New Rule
          </Link>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="card-arcane rounded-lg p-10 text-center" style={{ fontFamily: 'Georgia, serif' }}>
          <p className="text-sm mb-4" style={{ color: '#6b7280' }}>No rules yet.</p>
          <Link
            href="/admin/brp-rules/new"
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Create your first rule
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.length > 0 && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>Sections</p>
              <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                  <span
                    key={section}
                    className="text-[10px] px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#374151', color: '#d1d5db' }}
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="card-arcane rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {rule.section && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold"
                        style={{ backgroundColor: '#3f3f46', color: '#a1a1aa' }}
                      >
                        {rule.section}
                      </span>
                    )}
                    <span className="text-[11px]" style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}>
                      sort: {rule.sortOrder}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
                    {rule.title}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
                    Updated {rule.updatedAt.toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/brp-rules/${rule.id}/edit`}
                    className="px-3 py-1.5 rounded text-xs hover:opacity-80"
                    style={{ backgroundColor: '#1f2937', color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                  >
                    Edit
                  </Link>
                  <DeleteButton
                    action={deleteBRPRule.bind(null, rule.id)}
                    label={rule.title}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
