export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { getBRPRules, type BRPRuleDetail } from '@/app/actions'
import Link from 'next/link'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import { AccessRole } from '@/generated/prisma'
import { BRPRulesWikiClient } from './BRPRulesWikiClient'

export const metadata = {
  title: 'BRP Rules Wiki - Arcane Codex',
  description: 'Basic Roleplaying game rules for the Arcane P.I. campaign',
}

export default async function BRPRulesPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  const allowed = email ? await prisma.allowedEmail.findUnique({ where: { email } }) : null
  const isAdmin = allowed?.role === AccessRole.ADMIN

  // Fetch all rules with content in a single query
  const rules = (await getBRPRules({ includeContent: true })) as (BRPRuleDetail)[]

  // Organize by section
  const sections = Array.from(new Set(rules.filter(r => r.section).map(r => r.section!)))
  const unsectionedRules = rules.filter(r => !r.section)

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-widest uppercase arcane-glow mb-2" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
                📖 BRP Rules Wiki
              </h1>
              <p style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
                Quick reference guide for Basic Roleplaying mechanics used in the Arcane P.I. campaign
              </p>
            </div>
            {isAdmin && (
              <Link
                href="/admin/brp-rules"
                className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: '#7c3aed', color: '#fff' }}
              >
                ✏️ Edit
              </Link>
            )}
          </div>
        </div>

        {rules.length === 0 ? (
          <div
            className="rounded-lg p-12 text-center"
            style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}
          >
            <p style={{ color: '#6b7280', fontFamily: 'Georgia, serif', marginBottom: '1rem' }}>
              No rules have been added yet.
            </p>
            {isAdmin && (
              <Link
                href="/admin/brp-rules/new"
                className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider inline-block"
                style={{ backgroundColor: '#7c3aed', color: '#fff' }}
              >
                Add First Rule
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Table of Contents */}
            <div className="lg:sticky lg:top-6 lg:h-fit">
              <div className="card-arcane rounded-lg p-4">
                <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
                  📑 Contents
                </h2>
                <nav className="space-y-2">
                  {unsectionedRules.length > 0 && (
                    <div className="space-y-1">
                      {unsectionedRules.map((rule) => (
                        <a
                          key={rule.id}
                          href={`#rule-${rule.id}`}
                          className="block text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                          style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                        >
                          {rule.title}
                        </a>
                      ))}
                    </div>
                  )}
                  
                  {sections.map((section) => {
                    const sectionRules = rules.filter(r => r.section === section)
                    return (
                      <div key={section} className="mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>
                          {section}
                        </p>
                        <div className="space-y-1 pl-2 border-l" style={{ borderColor: '#374151' }}>
                          {sectionRules.map((rule) => (
                            <a
                              key={rule.id}
                              href={`#rule-${rule.id}`}
                              className="block text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                              style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                            >
                              {rule.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <BRPRulesWikiClient rules={rules} isAdmin={isAdmin} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
