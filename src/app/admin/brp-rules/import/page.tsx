export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BRPImportClient } from './BRPImportClient'

export default async function BRPImportPage() {
  const session = await auth()
  const sessionEmail = normalizeEmail(session?.user?.email)

  if (!sessionEmail) redirect('/login')

  const currentUser = await prisma.allowedEmail.findUnique({ where: { email: sessionEmail } })
  if (!currentUser || currentUser.role !== AccessRole.ADMIN) redirect('/')

  const existingRules = await prisma.bRPRule.findMany({
    select: { id: true, title: true },
  })

  const rulesByTitle = new Map(existingRules.map(r => [r.title.toLowerCase(), r.id]))

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/brp-rules" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← BRP Rules Wiki
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
          ⬇️ Import BRP Rules
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Parse rules from https://brp.chaosium.com/basic-roleplaying/ and review before importing
        </p>
      </div>

      <BRPImportClient existingRulesByTitle={Object.fromEntries(rulesByTitle)} />
    </div>
  )
}
