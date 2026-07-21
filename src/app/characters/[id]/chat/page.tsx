export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getChatSessions } from '@/app/actions'
import { ChatPanel } from '@/components/ChatPanel'

export default async function CharacterChatPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed) redirect('/login')

  const { id: idStr } = await params
  const characterId = parseInt(idStr, 10)
  if (isNaN(characterId)) notFound()

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, name: true, claimedByEmail: true },
  })
  if (!character) notFound()

  // Only the claimed user or admins can access
  if (allowed.role !== AccessRole.ADMIN && character.claimedByEmail !== email) {
    redirect('/')
  }

  const sessions = await getChatSessions(characterId)
  const sessionItems = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    characterId: s.characterId,
    characterName: s.characterName,
    updatedAt: s.updatedAt,
    messageCount: s.messageCount,
  }))

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <Link
          href={`/characters/${character.id}`}
          className="text-sm transition-colors hover:text-purple-300"
          style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}
        >
          ← {character.name}
        </Link>
      </div>

      <div className="mb-6">
        <h1
          className="text-2xl font-bold tracking-widest uppercase arcane-glow"
          style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
        >
          🔮 Chat — {character.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Discuss and develop {character.name}&apos;s story with your AI assistant
        </p>
      </div>

      <ChatPanel
        initialSessions={sessionItems}
        characterId={characterId}
        characterName={character.name}
      />
    </div>
  )
}
