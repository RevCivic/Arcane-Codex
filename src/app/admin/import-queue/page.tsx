import { auth } from '@/auth'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ImportQueueClient } from './ImportQueueClient'

export default async function ImportQueuePage() {
  const session = await auth()
  const sessionEmail = normalizeEmail(session?.user?.email)

  if (!sessionEmail) redirect('/login')

  const currentUser = await prisma.allowedEmail.findUnique({ where: { email: sessionEmail } })
  if (!currentUser || currentUser.role !== AccessRole.ADMIN) redirect('/')

  const items = await prisma.importQueueItem.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })

  // Convert BigInt-safe JSON for client components
  const serialized = items.map((item) => ({
    id: item.id,
    characterId: item.characterId,
    characterName: item.characterName,
    incomingData: item.incomingData as Record<string, string | null>,
    existingData: item.existingData as Record<string, string | null> | null,
    createdAt: item.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-5xl mx-auto">
      <h1
        className="text-2xl font-bold tracking-widest uppercase mb-2 arcane-glow"
        style={{ color: '#8b5cf6' }}
      >
        Import Approval Queue
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
        These characters were found in the Google Sheet with changes that differ from the current database.
        Review the diff and approve or reject each change before it is applied.
      </p>

      <ImportQueueClient items={serialized} />
    </div>
  )
}
