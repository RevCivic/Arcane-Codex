export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function MyCharacterPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed) redirect('/login')

  // Admins manage all characters — /my-character is for players only
  if (allowed.role === AccessRole.ADMIN) redirect('/characters')

  const claimed = await prisma.character.findMany({
    where: { claimedByEmail: email },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  })
  if (claimed.length === 1) redirect(`/characters/${claimed[0].id}/sheet`)

  if (claimed.length > 1) {
    return (
      <div className="max-w-2xl mx-auto mt-12" style={{ fontFamily: 'Georgia, serif' }}>
        <h1 className="text-2xl font-bold uppercase tracking-widest mb-2 arcane-glow" style={{ color: '#8b5cf6' }}>
          My Characters
        </h1>
        <p className="mb-6" style={{ color: '#9ca3af' }}>Choose a character sheet to open.</p>
        <div className="grid gap-3">
          {claimed.map((character) => (
            <Link
              key={character.id}
              href={`/characters/${character.id}/sheet`}
              className="card-arcane flex items-center justify-between rounded-lg p-4 transition-colors hover:border-purple-500"
            >
              <span className="font-semibold" style={{ color: '#e2e8f0' }}>{character.name}</span>
              <span className="text-sm" style={{ color: '#a78bfa' }}>{character.role ?? 'Character'} →</span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // No claimed character — show empty state with guidance
  return (
    <div className="max-w-2xl mx-auto mt-16 text-center" style={{ fontFamily: 'Georgia, serif' }}>
      <div className="text-5xl mb-6">🧭</div>
      <h1
        className="text-2xl font-bold uppercase tracking-widest mb-4 arcane-glow"
        style={{ color: '#8b5cf6' }}
      >
        No Character Claimed
      </h1>
      <p className="mb-8 text-base leading-7" style={{ color: '#9ca3af' }}>
        You haven&apos;t claimed a character yet. Browse the roster, find your character, and
        click <strong style={{ color: '#e2e8f0' }}>Claim</strong> to link it to your account.
      </p>
      <Link
        href="/characters"
        className="inline-block px-8 py-3 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90 transition-all"
        style={{ backgroundColor: '#7c3aed', color: '#fff' }}
      >
        👤 Browse Characters
      </Link>
    </div>
  )
}
