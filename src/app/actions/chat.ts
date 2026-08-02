'use server'

import { AccessRole } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuthorizedUser } from './_shared'

export type ChatSessionRow = {
  id: number
  title: string
  characterId: number | null
  characterName: string | null
  createdAt: Date
  updatedAt: Date
  messageCount: number
}

export type ChatMessageRow = {
  id: number
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export async function getChatSessions(characterId?: number): Promise<ChatSessionRow[]> {
  const user = await requireAuthorizedUser()

  const sessions = await prisma.chatSession.findMany({
    where: {
      createdByEmail: user.email,
      ...(characterId !== undefined ? { characterId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      characterId: true,
      character: { select: { name: true } },
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })

  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    characterId: s.characterId,
    characterName: s.character?.name ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    messageCount: s._count.messages,
  }))
}

export async function getChatSessionWithMessages(
  sessionId: number,
): Promise<{ session: ChatSessionRow; messages: ChatMessageRow[] } | null> {
  const user = await requireAuthorizedUser()

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: {
      character: { select: { name: true } },
      messages: { orderBy: { createdAt: 'asc' } },
      _count: { select: { messages: true } },
    },
  })

  if (!session) return null
  if (session.createdByEmail !== user.email && user.role !== AccessRole.ADMIN) return null

  return {
    session: {
      id: session.id,
      title: session.title,
      characterId: session.characterId,
      characterName: session.character?.name ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session._count.messages,
    },
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.createdAt,
    })),
  }
}

export async function renameChatSession(sessionId: number, title: string) {
  const user = await requireAuthorizedUser()
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.createdByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Access denied')
  }

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { title: title.trim() || 'Untitled Session' },
  })

  revalidatePath('/chat')
}

export async function deleteChatSession(sessionId: number) {
  const user = await requireAuthorizedUser()
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.createdByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Access denied')
  }

  await prisma.chatSession.delete({ where: { id: sessionId } })
  revalidatePath('/chat')
}
