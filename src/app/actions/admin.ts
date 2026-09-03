'use server'

import { AccessRole, ImportQueueStatus } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { convertGoogleDriveImageUrl } from '@/lib/imageUrl'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  requireAdminUser,
  requireAuthorizedUser,
  downloadCharacterImageToLocal,
  ensureCharacterThumbnailForImageUrl,
  isLocalHostedImageUrl,
  isRemoteHttpImageUrl,
} from './_shared'

// ─── Import Queue ─────────────────────────────────────────────────────────────

function applyIncomingDataToCharacter(incoming: Record<string, string | null>) {
  return {
    firstName: incoming.firstName ?? undefined,
    lastName: incoming.lastName ?? undefined,
    race: incoming.race ?? undefined,
    gender: incoming.gender ?? undefined,
    age: incoming.age != null ? BigInt(incoming.age) : undefined,
    role: incoming.role ?? undefined,
    description: incoming.description ?? undefined,
    stats: incoming.stats ?? undefined,
    affiliation: incoming.affiliation ?? undefined,
    currentCase: incoming.currentCase ?? undefined,
    currentLocation: incoming.currentLocation ?? undefined,
    homeOrigin: incoming.homeOrigin ?? undefined,
    imageUrl: incoming.imageUrl ?? undefined,
    status: incoming.status ?? undefined,
  }
}

export async function getImportQueue() {
  await requireAdminUser()
  return prisma.importQueueItem.findMany({
    where: { status: ImportQueueStatus.PENDING },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getImportQueueCounts() {
  await requireAdminUser()
  const pending = await prisma.importQueueItem.count({ where: { status: ImportQueueStatus.PENDING } })
  return { pending }
}

export async function approveImportQueueItem(id: number) {
  const { email } = await requireAdminUser()

  const item = await prisma.importQueueItem.findUnique({ where: { id } })
  if (!item || item.status !== ImportQueueStatus.PENDING) {
    throw new Error('Queue item not found or already reviewed')
  }
  if (!item.characterId) {
    throw new Error('Cannot approve a queue item with no associated character')
  }

  const incoming = item.incomingData as Record<string, string | null>
  await prisma.$transaction([
    prisma.character.update({
      where: { id: item.characterId },
      data: applyIncomingDataToCharacter(incoming),
    }),
    prisma.importQueueItem.update({
      where: { id },
      data: { status: ImportQueueStatus.APPROVED, reviewedByEmail: email },
    }),
  ])

  revalidatePath('/characters')
  revalidatePath('/admin/import-queue')
}

export async function approveImportQueueItemFields(id: number, approvedFields: string[]) {
  const { email } = await requireAdminUser()

  const item = await prisma.importQueueItem.findUnique({ where: { id } })
  if (!item || item.status !== ImportQueueStatus.PENDING) {
    throw new Error('Queue item not found or already reviewed')
  }
  if (!item.characterId) {
    throw new Error('Cannot approve a queue item with no associated character')
  }

  const incoming = item.incomingData as Record<string, string | null>
  const filteredIncoming = Object.fromEntries(
    Object.entries(incoming).filter(([k]) => approvedFields.includes(k))
  )

  await prisma.$transaction([
    prisma.character.update({
      where: { id: item.characterId },
      data: applyIncomingDataToCharacter(filteredIncoming),
    }),
    prisma.importQueueItem.update({
      where: { id },
      data: { status: ImportQueueStatus.APPROVED, reviewedByEmail: email },
    }),
  ])

  revalidatePath('/characters')
  revalidatePath('/admin/import-queue')
}

export async function rejectImportQueueItem(id: number) {
  const { email } = await requireAdminUser()

  const item = await prisma.importQueueItem.findUnique({ where: { id } })
  if (!item || item.status !== ImportQueueStatus.PENDING) {
    throw new Error('Queue item not found or already reviewed')
  }

  await prisma.importQueueItem.update({
    where: { id },
    data: { status: ImportQueueStatus.REJECTED, reviewedByEmail: email },
  })

  revalidatePath('/admin/import-queue')
}

export async function approveAllImportQueueItems() {
  const { email } = await requireAdminUser()

  const items = await prisma.importQueueItem.findMany({
    where: { status: ImportQueueStatus.PENDING },
  })

  await prisma.$transaction([
    ...items
      .filter((item) => item.characterId !== null)
      .map((item) =>
        prisma.character.update({
          where: { id: item.characterId! },
          data: applyIncomingDataToCharacter(item.incomingData as Record<string, string | null>),
        })
      ),
    prisma.importQueueItem.updateMany({
      where: { status: ImportQueueStatus.PENDING },
      data: { status: ImportQueueStatus.APPROVED, reviewedByEmail: email },
    }),
  ])

  revalidatePath('/characters')
  revalidatePath('/admin/import-queue')
  return { approved: items.length }
}

export async function rejectAllImportQueueItems() {
  const { email } = await requireAdminUser()

  const result = await prisma.importQueueItem.updateMany({
    where: { status: ImportQueueStatus.PENDING },
    data: { status: ImportQueueStatus.REJECTED, reviewedByEmail: email },
  })

  revalidatePath('/admin/import-queue')
  return { rejected: result.count }
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function getAllTags() {
  await requireAuthorizedUser()
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    select: { name: true },
  })
  return tags.map((tag) => tag.name)
}

function chooseCanonicalTag<T extends { name: string; characters: { id: number }[] }>(tags: T[]) {
  if (tags.length === 0) {
    throw new Error('Cannot choose a canonical tag from an empty group during deduplication')
  }

  return [...tags].sort((left, right) => {
    const leftIsLowercase = left.name === left.name.toLowerCase()
    const rightIsLowercase = right.name === right.name.toLowerCase()

    if (leftIsLowercase !== rightIsLowercase) return leftIsLowercase ? -1 : 1
    if (left.characters.length !== right.characters.length) return right.characters.length - left.characters.length
    return left.name.localeCompare(right.name)
  })[0]
}

export async function deduplicateTags() {
  await requireAdminUser()

  const summary = await prisma.$transaction(async (tx) => {
    const tags = await tx.tag.findMany({
      orderBy: { name: 'asc' },
      include: { characters: { select: { id: true } } },
    })

    const groups = new Map<string, typeof tags>()
    for (const tag of tags) {
      const key = tag.name.toLowerCase()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tag)
    }

    let mergedGroups = 0
    let deletedTags = 0
    let connectedCharacters = 0

    for (const group of groups.values()) {
      if (group.length < 2) continue

      mergedGroups++
      const canonical = chooseCanonicalTag(group)
      const canonicalCharacterIds = new Set(canonical.characters.map((character) => character.id))
      const duplicateTags = group.filter((tag) => tag.id !== canonical.id)
      const missingCharacterIds = [...new Set(
        duplicateTags.flatMap((tag) => tag.characters.map((character) => character.id)),
      )].filter((characterId) => !canonicalCharacterIds.has(characterId))

      if (missingCharacterIds.length > 0) {
        await tx.tag.update({
          where: { id: canonical.id },
          data: {
            characters: {
              connect: missingCharacterIds.map((id) => ({ id })),
            },
          },
        })
        connectedCharacters += missingCharacterIds.length
      }

      await tx.tag.deleteMany({
        where: { id: { in: duplicateTags.map((tag) => tag.id) } },
      })
      deletedTags += duplicateTags.length
    }

    return { mergedGroups, deletedTags, connectedCharacters }
  })

  revalidatePath('/admin/tags')
  revalidatePath('/characters')
  redirect(
    `/admin/tags?deduplicated=${summary.mergedGroups}&deleted=${summary.deletedTags}&connected=${summary.connectedCharacters}`,
  )
}

export async function pruneUnusedTags() {
  await requireAdminUser()

  const deleted = await prisma.tag.deleteMany({
    where: { characters: { none: {} } },
  })

  revalidatePath('/admin/tags')
  revalidatePath('/characters')
  redirect(`/admin/tags?pruned=${deleted.count}`)
}

// ─── Images ───────────────────────────────────────────────────────────────────

export async function localizeCharacterImages() {
  await requireAdminUser()

  const characters = await prisma.character.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, imageUrl: true },
    orderBy: { id: 'asc' },
  })

  let scanned = 0
  let converted = 0
  let failed = 0
  let skipped = 0

  for (const character of characters) {
    const currentImage = character.imageUrl?.trim() || ''
    if (!currentImage) continue

    scanned++

    if (isLocalHostedImageUrl(currentImage)) {
      skipped++
      continue
    }
    if (!isRemoteHttpImageUrl(currentImage)) {
      skipped++
      continue
    }

    try {
      const { imageUrl } = await downloadCharacterImageToLocal(convertGoogleDriveImageUrl(currentImage))
      await prisma.character.update({
        where: { id: character.id },
        data: { imageUrl },
      })
      converted++
    } catch (err) {
      console.error(`[localizeCharacterImages] Failed to download character ${character.id} (${currentImage}):`, err)
      failed++
    }
  }

  revalidatePath('/characters')
  revalidatePath('/admin/images')
  redirect(`/admin/images?scanned=${scanned}&converted=${converted}&skipped=${skipped}&failed=${failed}`)
}

export async function generateCharacterThumbnails() {
  await requireAdminUser()

  const characters = await prisma.character.findMany({
    where: {
      imageUrl: { not: null, notIn: [''] },
    },
    select: { imageUrl: true },
  })

  let scanned = 0
  let generated = 0
  let refreshed = 0
  let skipped = 0
  let failed = 0

  for (const character of characters) {
    const currentImage = character.imageUrl?.trim() || ''
    if (!currentImage) continue

    scanned++

    if (!isLocalHostedImageUrl(currentImage)) {
      skipped++
      continue
    }

    try {
      const result = await ensureCharacterThumbnailForImageUrl(currentImage)
      if (!result.thumbnailUrl) {
        skipped++
        continue
      }
      if (result.existed) {
        refreshed++
      } else {
        generated++
      }
    } catch (err) {
      console.error(`[generateCharacterThumbnails] Failed to generate thumbnail for (${currentImage}):`, err)
      failed++
    }
  }

  revalidatePath('/characters')
  revalidatePath('/admin/images')
  redirect(
    `/admin/images?thumbnailScanned=${scanned}&thumbnailGenerated=${generated}&thumbnailRefreshed=${refreshed}&thumbnailSkipped=${skipped}&thumbnailFailed=${failed}`,
  )
}

// ─── Access Control ───────────────────────────────────────────────────────────

export async function addAllowedEmail(formData: FormData) {
  await requireAdminUser()

  const rawEmail = formData.get('email') as string
  const rawRole = formData.get('role') as string
  const email = normalizeEmail(rawEmail)
  if (!email) throw new Error('Email is required')

  const role = rawRole === AccessRole.ADMIN ? AccessRole.ADMIN : AccessRole.USER

  await prisma.allowedEmail.upsert({
    where: { email },
    update: { role },
    create: { email, role },
  })

  revalidatePath('/admin/access')
}

// ─── Roll History ─────────────────────────────────────────────────────────────

export async function getAllRollHistory(limit: number = 500) {
  await requireAdminUser()
  return prisma.rollHistory.findMany({
    select: {
      id: true,
      createdAt: true,
      rollType: true,
      label: true,
      roll: true,
      target: true,
      difficulty: true,
      resultType: true,
      character: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function getRollHistoryCount() {
  await requireAdminUser()
  return prisma.rollHistory.count()
}
