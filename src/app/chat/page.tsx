export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { redirect } from 'next/navigation'
import { getChatSessions } from '@/app/actions'
import { ChatPanel } from '@/components/ChatPanel'

export default async function ChatPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed) redirect('/login')

  const sessions = await getChatSessions()

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
        <h1
          className="text-2xl font-bold tracking-widest uppercase arcane-glow"
          style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
        >
          🔮 Arcanist Chat
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Talk through your characters, lore, and campaign ideas with your AI assistant
        </p>
      </div>

      <ChatPanel initialSessions={sessionItems} />
    </div>
  )
}
