export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { AccessRole, ImportQueueStatus } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { BRPRuleImportQueueClient } from './BRPRuleImportQueueClient'

export default async function BRPRuleImportQueuePage() {
  const session = await auth()
  const sessionEmail = normalizeEmail(session?.user?.email)

  if (!sessionEmail) redirect('/login')

  const currentUser = await prisma.allowedEmail.findUnique({ where: { email: sessionEmail } })
  if (!currentUser || currentUser.role !== AccessRole.ADMIN) redirect('/')

  const items = await prisma.bRPRuleImport.findMany({
    where: { status: ImportQueueStatus.PENDING },
    orderBy: { createdAt: 'asc' },
  })

  // Convert BigInt-safe JSON for client components
  const serialized = items.map((item) => ({
    id: item.id,
    ruleId: item.ruleId,
    ruleName: item.ruleName,
    incomingData: item.incomingData as Record<string, string | null>,
    existingData: item.existingData as Record<string, string | null> | null,
    sourceUrl: item.sourceUrl,
    createdAt: item.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <h1
        className="text-2xl font-bold tracking-widest uppercase mb-2 arcane-glow"
        style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
      >
        📥 BRP Rules Import Queue
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
        Review the diff and approve or reject each imported rule before it is applied.
      </p>

      <BRPRuleImportQueueClient items={serialized} />
    </div>
  )
}
