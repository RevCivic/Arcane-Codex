'use server'

import { AccessRole } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  requireAuthorizedUser,
  requireAdminUser,
  getFormStrings,
  getNullableString,
  parseTagsFromForm,
  toNullableBigInt,
  getReferenceLinksFromForm,
  resolveCharacterImageUrlFromForm,
} from './_shared'
import { entityDestination, getListReturnPath } from '@/lib/listNavigation'

export async function createCharacter(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const race = formData.get('race') as string
  const gender = formData.get('gender') as string
  const age = toNullableBigInt(formData.get('age'))
  const role = formData.get('role') as string
  const description = formData.get('description') as string
  const stats = formData.get('stats') as string
  const affiliation = formData.get('affiliation') as string
  const currentCase = formData.get('currentCase') as string
  const currentLocation = formData.get('currentLocation') as string
  const homeOrigin = formData.get('homeOrigin') as string
  const status = formData.get('status') as string
  const imageUrl = await resolveCharacterImageUrlFromForm(formData)
  const referenceLinks = getReferenceLinksFromForm(formData)
  const tags = parseTagsFromForm(formData)

  await prisma.character.create({
    data: {
      name,
      firstName,
      lastName,
      race,
      gender,
      age,
      role,
      description,
      stats,
      affiliation,
      currentCase,
      currentLocation,
      homeOrigin,
      imageUrl,
      referenceLinks,
      status: status || 'Active',
      tags: tags.length
        ? {
            connectOrCreate: tags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          }
        : undefined,
    },
  })
  revalidatePath('/characters')
  redirect('/characters')
}

export async function createCharactersBulk(formData: FormData) {
  await requireAuthorizedUser()

  const names = getFormStrings(formData, 'name')
  const firstNames = getFormStrings(formData, 'firstName')
  const lastNames = getFormStrings(formData, 'lastName')
  const roles = getFormStrings(formData, 'role')
  const descriptions = getFormStrings(formData, 'description')
  const statuses = getFormStrings(formData, 'status')

  const rows = names
    .map((name, i) => {
      if (!name) return null
      return {
        name,
        firstName: getNullableString(firstNames[i] ?? ''),
        lastName: getNullableString(lastNames[i] ?? ''),
        role: getNullableString(roles[i] ?? ''),
        description: getNullableString(descriptions[i] ?? ''),
        status: getNullableString(statuses[i] ?? '') || 'Active',
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length > 0) {
    await prisma.character.createMany({ data: rows })
    revalidatePath('/characters')
  }

  redirect('/characters')
}

export async function updateCharacter(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const race = formData.get('race') as string
  const gender = formData.get('gender') as string
  const age = toNullableBigInt(formData.get('age'))
  const role = formData.get('role') as string
  const description = formData.get('description') as string
  const stats = formData.get('stats') as string
  const affiliation = formData.get('affiliation') as string
  const currentCase = formData.get('currentCase') as string
  const currentLocation = formData.get('currentLocation') as string
  const homeOrigin = formData.get('homeOrigin') as string
  const status = formData.get('status') as string
  const existingCharacter = await prisma.character.findUnique({ where: { id }, select: { imageUrl: true } })
  const imageUrl = await resolveCharacterImageUrlFromForm(formData, existingCharacter?.imageUrl)
  const referenceLinks = getReferenceLinksFromForm(formData)
  const tags = parseTagsFromForm(formData)
  const returnTo = getListReturnPath(formData.get('returnTo') as string | null, '/characters')

  await prisma.character.update({
    where: { id },
    data: {
      name,
      firstName,
      lastName,
      race,
      gender,
      age,
      role,
      description,
      stats,
      affiliation,
      currentCase,
      currentLocation,
      homeOrigin,
      imageUrl,
      referenceLinks,
      status,
      tags: tags.length
        ? {
            set: [],
            connectOrCreate: tags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          }
        : { set: [] },
    },
  })
  revalidatePath('/characters')
  revalidatePath(`/characters/${id}`)
  redirect(entityDestination(`/characters/${id}`, returnTo))
}

export async function deleteCharacter(id: number) {
  await requireAuthorizedUser()

  await prisma.character.delete({ where: { id } })
  revalidatePath('/characters')
  redirect('/characters')
}

/** Any signed-in USER can claim an unclaimed character (max one claim per user). */
export async function claimCharacter(characterId: number) {
  const user = await requireAuthorizedUser()

  const existingClaim = await prisma.character.findFirst({
    where: { claimedByEmail: user.email },
  })
  if (existingClaim) throw new Error('You already have a claimed character')

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail) throw new Error('This character is already claimed by another user')

  await prisma.character.update({ where: { id: characterId }, data: { claimedByEmail: user.email } })
  revalidatePath('/characters')
  revalidatePath(`/characters/${characterId}`)
  revalidatePath('/my-character')
}

/** The owning USER can unclaim their character; admins can unclaim any character. */
export async function unclaimCharacter(characterId: number) {
  const user = await requireAuthorizedUser()

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }

  await prisma.character.update({ where: { id: characterId }, data: { claimedByEmail: null } })
  revalidatePath('/characters')
  revalidatePath(`/characters/${characterId}`)
  revalidatePath('/my-character')
}

/** Admin only: assign (or clear) a character claim to any allowlisted email. */
export async function adminAssignCharacter(characterId: number, formData: FormData) {
  await requireAdminUser()

  const rawEmail = (formData.get('email') as string | null)?.trim() || null
  const targetEmail = rawEmail ? normalizeEmail(rawEmail) : null

  if (targetEmail) {
    const allowed = await prisma.allowedEmail.findUnique({ where: { email: targetEmail } })
    if (!allowed) throw new Error('Email is not on the allowlist')

    const existingClaim = await prisma.character.findFirst({
      where: { claimedByEmail: targetEmail, NOT: { id: characterId } },
    })
    if (existingClaim) throw new Error(`${targetEmail} already claims "${existingClaim.name}"`)
  }

  await prisma.character.update({ where: { id: characterId }, data: { claimedByEmail: targetEmail } })
  revalidatePath('/characters')
  revalidatePath(`/characters/${characterId}`)
  revalidatePath('/my-character')
}
