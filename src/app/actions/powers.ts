'use server'

import { Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  requireAdminUser,
  getNullableString,
  toNullableInt,
  getReferenceLinksFromForm,
  getFormStrings,
} from './_shared'

/**
 * Sync a single character's CharacterAbility for a power's baseAbility.
 *
 * effectiveValue = power.basePercentage + characterPower.modifier
 *
 * Behaviour:
 *  - If abilityName is set and effectiveValue > 0:
 *      • Create the ability if it doesn't exist yet.
 *      • Update its currentValue ONLY when the stored value still matches
 *        previousEffectiveValue (i.e. the player hasn't manually changed or
 *        improved it).
 *  - If abilityName differs from previousAbilityName (name was renamed):
 *      • Remove the old ability record if its value still matches
 *        previousEffectiveValue.
 *  - If abilityName is null / effectiveValue ≤ 0 (power removed):
 *      • Remove the ability record matching previousAbilityName, guarded by
 *        previousEffectiveValue so we don't erase a value the player improved.
 *
 * @param characterPowerId  The CharacterPower.id that owns this ability entry.
 */
async function syncCharacterPowerAbility(
  characterId: number,
  characterPowerId: number | null,
  abilityName: string | null,
  effectiveValue: number | null,
  previousAbilityName?: string | null,
  previousEffectiveValue?: number | null,
): Promise<void> {
  const cleanAbility = abilityName?.trim() || null
  const cleanPrev    = previousAbilityName?.trim() || null

  if (cleanPrev && cleanPrev !== cleanAbility) {
    await prisma.characterAbility.deleteMany({
      where: {
        characterId,
        name: cleanPrev,
        ...(previousEffectiveValue != null ? { currentValue: previousEffectiveValue } : {}),
      },
    })
  }

  if (!cleanAbility || !effectiveValue || effectiveValue <= 0) return

  const existing = await prisma.characterAbility.findUnique({
    where: { characterId_name: { characterId, name: cleanAbility } },
  })

  if (!existing) {
    await prisma.characterAbility.create({
      data: {
        characterId,
        name: cleanAbility,
        currentValue: effectiveValue,
        sourceCharacterPowerId: characterPowerId ?? undefined,
      },
    })
  } else {
    if (previousEffectiveValue != null && existing.currentValue === previousEffectiveValue) {
      await prisma.characterAbility.update({
        where: { characterId_name: { characterId, name: cleanAbility } },
        data: { currentValue: effectiveValue },
      })
    }
    if (characterPowerId && !existing.sourceCharacterPowerId) {
      await prisma.characterAbility.update({
        where: { characterId_name: { characterId, name: cleanAbility } },
        data: { sourceCharacterPowerId: characterPowerId },
      }).catch((err: unknown) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return
        throw err
      })
    }
  }
}

export async function createPower(formData: FormData) {
  await requireAdminUser()

  const name = (formData.get('name') as string).trim()
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const baseAbility = getNullableString((formData.get('baseAbility') as string | null)?.trim() ?? '')
  const basePercentage = toNullableInt(formData.get('basePercentage') as string | null)
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.power.create({ data: { name, description, effect, baseAbility, basePercentage, referenceLinks } })
  revalidatePath('/powers')
  redirect('/powers')
}

export async function createPowersBulk(formData: FormData) {
  await requireAdminUser()

  const names = getFormStrings(formData, 'name')
  const descriptions = getFormStrings(formData, 'description')
  const effects = getFormStrings(formData, 'effect')
  const baseAbilities = getFormStrings(formData, 'baseAbility')
  const basePercentages = getFormStrings(formData, 'basePercentage')

  const rows = names
    .map((name, i) => {
      if (!name) return null
      return {
        name,
        description: getNullableString(descriptions[i] ?? ''),
        effect: getNullableString(effects[i] ?? ''),
        baseAbility: getNullableString(baseAbilities[i] ?? ''),
        basePercentage: toNullableInt(basePercentages[i] ?? ''),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const seen = new Set<string>()
  for (const row of rows) {
    const key = row.name.toLowerCase()
    if (seen.has(key)) throw new Error(`Duplicate power name "${row.name}" in this batch.`)
    seen.add(key)
  }

  for (const row of rows) {
    const duplicate = await prisma.power.findFirst({
      where: { name: { equals: row.name, mode: 'insensitive' } },
    })
    if (duplicate) throw new Error(`A power named "${row.name}" already exists.`)
  }

  for (const row of rows) {
    await prisma.power.create({ data: row })
  }

  revalidatePath('/powers')
  redirect('/powers')
}

export async function updatePower(id: number, formData: FormData) {
  await requireAdminUser()

  const name = (formData.get('name') as string).trim()
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const baseAbility = getNullableString((formData.get('baseAbility') as string | null)?.trim() ?? '')
  const basePercentage = toNullableInt(formData.get('basePercentage') as string | null)
  const referenceLinks = getReferenceLinksFromForm(formData)

  const existing = await prisma.power.findUnique({
    where: { id },
    select: {
      baseAbility: true,
      basePercentage: true,
      characterPowers: { select: { id: true, characterId: true, modifier: true } },
    },
  })

  await prisma.power.update({
    where: { id },
    data: { name, description, effect, baseAbility, basePercentage, referenceLinks },
  })

  if (existing) {
    for (const cp of existing.characterPowers) {
      const prevEffective = existing.basePercentage != null
        ? existing.basePercentage + cp.modifier
        : null
      const newEffective = basePercentage != null ? basePercentage + cp.modifier : null
      await syncCharacterPowerAbility(
        cp.characterId,
        cp.id,
        baseAbility,
        newEffective,
        existing.baseAbility,
        prevEffective,
      )
      revalidatePath(`/characters/${cp.characterId}`)
      revalidatePath(`/characters/${cp.characterId}/sheet`)
    }
  }

  revalidatePath('/powers')
  revalidatePath(`/powers/${id}`)
  redirect(`/powers/${id}`)
}

export async function deletePower(id: number) {
  await requireAdminUser()

  const power = await prisma.power.findUnique({
    where: { id },
    select: {
      baseAbility: true,
      basePercentage: true,
      characterPowers: { select: { id: true, characterId: true, modifier: true } },
    },
  })

  await prisma.power.delete({ where: { id } })

  if (power?.baseAbility) {
    for (const cp of power.characterPowers) {
      const effectiveValue = power.basePercentage != null ? power.basePercentage + cp.modifier : null
      await syncCharacterPowerAbility(cp.characterId, cp.id, null, null, power.baseAbility, effectiveValue)
      revalidatePath(`/characters/${cp.characterId}`)
      revalidatePath(`/characters/${cp.characterId}/sheet`)
    }
  }

  revalidatePath('/powers')
  redirect('/powers')
}

export async function assignPower(formData: FormData) {
  await requireAdminUser()

  const characterId = parseInt(formData.get('characterId') as string, 10)
  const powerId = parseInt(formData.get('powerId') as string, 10)
  const modifier = toNullableInt(formData.get('modifier') as string | null) ?? 0
  const notes = getNullableString((formData.get('notes') as string | null)?.trim() ?? '')

  const existing = await prisma.characterPower.findUnique({
    where: { characterId_powerId: { characterId, powerId } },
  })
  if (existing) throw new Error('This character already has that power assigned.')

  const power = await prisma.power.findUnique({
    where: { id: powerId },
    select: { baseAbility: true, basePercentage: true },
  })
  if (!power) throw new Error('Power not found.')

  const cp = await prisma.characterPower.create({ data: { characterId, powerId, modifier, notes } })

  const effectiveValue = power.basePercentage != null ? power.basePercentage + modifier : null
  await syncCharacterPowerAbility(characterId, cp.id, power.baseAbility, effectiveValue)

  revalidatePath(`/characters/${characterId}`)
  revalidatePath(`/characters/${characterId}/sheet`)
  revalidatePath(`/powers/${powerId}`)
  redirect(`/characters/${characterId}`)
}

export async function updateCharacterPower(id: number, formData: FormData) {
  await requireAdminUser()

  const modifier = toNullableInt(formData.get('modifier') as string | null) ?? 0
  const notes = getNullableString((formData.get('notes') as string | null)?.trim() ?? '')

  const cp = await prisma.characterPower.findUnique({
    where: { id },
    select: {
      characterId: true,
      modifier: true,
      power: { select: { id: true, baseAbility: true, basePercentage: true } },
    },
  })
  if (!cp) throw new Error('Assignment not found.')

  const prevEffective = cp.power.basePercentage != null ? cp.power.basePercentage + cp.modifier : null
  const newEffective = cp.power.basePercentage != null ? cp.power.basePercentage + modifier : null

  await prisma.characterPower.update({ where: { id }, data: { modifier, notes } })

  await syncCharacterPowerAbility(
    cp.characterId,
    id,
    cp.power.baseAbility,
    newEffective,
    cp.power.baseAbility,
    prevEffective,
  )

  revalidatePath(`/characters/${cp.characterId}`)
  revalidatePath(`/characters/${cp.characterId}/sheet`)
  revalidatePath(`/powers/${cp.power.id}`)
  redirect(`/characters/${cp.characterId}`)
}

export async function removeCharacterPower(id: number) {
  await requireAdminUser()

  const cp = await prisma.characterPower.findUnique({
    where: { id },
    select: {
      characterId: true,
      modifier: true,
      power: { select: { id: true, baseAbility: true, basePercentage: true } },
    },
  })
  if (!cp) throw new Error('Assignment not found.')

  await prisma.characterPower.delete({ where: { id } })

  const effectiveValue = cp.power.basePercentage != null ? cp.power.basePercentage + cp.modifier : null
  await syncCharacterPowerAbility(cp.characterId, id, null, null, cp.power.baseAbility, effectiveValue)

  revalidatePath(`/characters/${cp.characterId}`)
  revalidatePath(`/characters/${cp.characterId}/sheet`)
  revalidatePath(`/powers/${cp.power.id}`)
  redirect(`/characters/${cp.characterId}`)
}

/** Admin: manually add a standalone ability to a character (not tied to a power). */
export async function createCharacterAbility(formData: FormData) {
  await requireAdminUser()

  const characterId = parseInt(formData.get('characterId') as string, 10)
  const name = (formData.get('name') as string | null)?.trim() || ''
  const currentValue = toNullableInt(formData.get('currentValue') as string | null) ?? 0

  if (!name) throw new Error('Ability name is required.')
  if (currentValue < 0 || currentValue > 200) throw new Error('Value must be 0–200.')

  await prisma.characterAbility.create({
    data: { characterId, name, currentValue },
  })

  revalidatePath(`/characters/${characterId}`)
  revalidatePath(`/characters/${characterId}/sheet`)
  redirect(`/characters/${characterId}`)
}

/** Admin: update a character's ability name and/or value. */
export async function updateCharacterAbility(id: number, formData: FormData) {
  await requireAdminUser()

  const name = (formData.get('name') as string | null)?.trim() || ''
  const currentValue = toNullableInt(formData.get('currentValue') as string | null) ?? 0

  if (!name) throw new Error('Ability name is required.')

  const ability = await prisma.characterAbility.findUnique({ where: { id } })
  if (!ability) throw new Error('Ability not found.')

  await prisma.characterAbility.update({
    where: { id },
    data: { name, currentValue },
  })

  revalidatePath(`/characters/${ability.characterId}`)
  revalidatePath(`/characters/${ability.characterId}/sheet`)
  redirect(`/characters/${ability.characterId}`)
}

/** Admin: remove a character ability. */
export async function deleteCharacterAbility(id: number) {
  await requireAdminUser()

  const ability = await prisma.characterAbility.findUnique({ where: { id } })
  if (!ability) throw new Error('Ability not found.')

  await prisma.characterAbility.delete({ where: { id } })

  revalidatePath(`/characters/${ability.characterId}`)
  revalidatePath(`/characters/${ability.characterId}/sheet`)
  redirect(`/characters/${ability.characterId}`)
}
