import { auth } from '@/auth'
import { AccessRole, ChatMessageRole } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { chatWithAI } from '@/lib/aiClient'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: number
    message?: string
    characterId?: number
  }

  const userMessage = (body.message ?? '').trim()
  if (!userMessage) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // Resolve or create chat session
  let sessionId = body.sessionId ?? null
  let characterId: number | null = body.characterId ?? null

  if (sessionId) {
    const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } })
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    characterId = existing.characterId
  } else {
    // Auto-title from first message (truncated)
    const autoTitle = userMessage.length > 60 ? userMessage.slice(0, 57) + '…' : userMessage
    const newSession = await prisma.chatSession.create({
      data: {
        title: autoTitle,
        characterId: characterId ?? null,
        createdByEmail: email,
      },
    })
    sessionId = newSession.id
  }

  // Persist user message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: ChatMessageRole.user,
      content: userMessage,
    },
  })

  // Load message history (last 20)
  const historyRecords = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const messages = historyRecords.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Build context
  const [primaryPromptConfig, loreDocs, character, recentCharacters, recentEvents, recentPlaces, recentInventory] = await Promise.all([
    prisma.aIConfig.findUnique({ where: { key: 'primaryPrompt' } }),
    prisma.loreDocument.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { title: true, type: true, summary: true, content: true },
    }),
    characterId
      ? prisma.character.findUnique({
          where: { id: characterId },
          select: {
            id: true,
            name: true,
            race: true,
            gender: true,
            role: true,
            description: true,
            affiliation: true,
            currentCase: true,
            currentLocation: true,
            homeOrigin: true,
            status: true,
          },
        })
      : Promise.resolve(null),
    prisma.character.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        name: true,
        role: true,
        affiliation: true,
        currentLocation: true,
        currentCase: true,
        status: true,
      },
    }),
    prisma.event.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        date: true,
        significance: true,
        outcome: true,
      },
    }),
    prisma.place.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        type: true,
        region: true,
        notes: true,
      },
    }),
    prisma.inventoryItem.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        category: true,
        location: true,
        effect: true,
        carrier: { select: { name: true } },
      },
    }),
  ])

  let aiResponse: string
  try {
    const result = await chatWithAI({
      messages,
      context: {
        primaryPrompt: primaryPromptConfig?.value ?? '',
        loreDocuments: loreDocs.map((d) => ({
          title: d.title,
          type: d.type,
          summary: d.summary ?? '',
          content: d.content,
        })),
        character: character
          ? ({
              ...character,
              campaignContext: {
                characters: recentCharacters,
                events: recentEvents,
                places: recentPlaces,
                inventoryItems: recentInventory.map((item) => ({
                  ...item,
                  carrierName: item.carrier?.name ?? null,
                })),
              },
            } as Record<string, unknown>)
          : ({
              campaignContext: {
                characters: recentCharacters,
                events: recentEvents,
                places: recentPlaces,
                inventoryItems: recentInventory.map((item) => ({
                  ...item,
                  carrierName: item.carrier?.name ?? null,
                })),
              },
            } as Record<string, unknown>),
      },
    })
    aiResponse = result.response || 'I was unable to generate a response. Please try again.'
  } catch (err) {
    console.error('[chat] AI service error', err)
    aiResponse = 'The AI service is currently unavailable. Please try again later.'
  }

  // Persist assistant message
  const assistantMsg = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: ChatMessageRole.assistant,
      content: aiResponse,
    },
  })

  // Update session updatedAt
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  })

  return NextResponse.json({
    sessionId,
    messageId: assistantMsg.id,
    response: aiResponse,
  })
}
