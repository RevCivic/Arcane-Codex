'use server'

import { AccessRole, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { getD100ResultType, getLuckGainForRoll } from '@/lib/diceRules'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  requireAuthorizedUser,
  requireCharacterOwner,
  toNullableInt,
  rollImprovementDie,
  FOUNDRY_SKILL_CATEGORY_MAP,
  normalizeFoundrySkillCategory,
  getFoundryLuck,
  getFoundrySkillValue,
} from './_shared'

/** Owner or admin can update the character sheet (BRP stats, derived stats, skills, notes). */
export async function updateCharacterSheet(characterId: number, formData: FormData) {
  const user = await requireAuthorizedUser()
  await requireCharacterOwner(characterId, user)

  const toInt = (key: string): number | null => {
    const val = (formData.get(key) as string | null)?.trim()
    if (!val) return null
    const n = parseInt(val, 10)
    return isNaN(n) ? null : n
  }

  const sheetData = {
    str:          toInt('str'),
    con:          toInt('con'),
    siz:          toInt('siz'),
    dex:          toInt('dex'),
    intelligence: toInt('intelligence'),
    pow:          toInt('pow'),
    cha:          toInt('cha'),
    app:          toInt('app'),
    edu:          toInt('edu'),
    currentHp:    toInt('currentHp'),
    maxHp:        toInt('maxHp'),
    currentSanity: toInt('currentSanity'),
    maxSanity:    toInt('maxSanity'),
    currentMp:    toInt('currentMp'),
    maxMp:        toInt('maxMp'),
    luck:         toInt('luck'),
    build:        toInt('build'),
    wounds:       (formData.get('wounds') as string | null) || null,
    notes:        (formData.get('notes') as string | null) || null,
  }

  const sheet = await prisma.characterSheet.upsert({
    where: { characterId },
    update: sheetData,
    create: { characterId, ...sheetData },
  })

  // Update skill values — form fields named `skill_<skillId>`
  const allSkills = await prisma.skill.findMany({ select: { id: true } })
  for (const skill of allSkills) {
    const raw = (formData.get(`skill_${skill.id}`) as string | null)?.trim() ?? ''
    if (raw === '') {
      // Clear any existing custom value so the base value is shown
      await prisma.characterSkillValue.deleteMany({
        where: { sheetId: sheet.id, skillId: skill.id },
      })
    } else {
      const val = parseInt(raw, 10)
      if (!isNaN(val)) {
        await prisma.characterSkillValue.upsert({
          where: { sheetId_skillId: { sheetId: sheet.id, skillId: skill.id } },
          update: { value: val },
          create: { sheetId: sheet.id, skillId: skill.id, value: val },
        })
      }
    }
  }

  revalidatePath(`/characters/${characterId}`)
  revalidatePath(`/characters/${characterId}/sheet`)
  revalidatePath('/my-character')
  redirect(`/characters/${characterId}/sheet`)
}

/** Owner or admin can import FoundryVTT exported stats/skills JSON into the character sheet. */
export async function importFoundryCharacterSheet(characterId: number, formData: FormData) {
  const user = await requireAuthorizedUser()

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error(`Character with ID ${characterId} does not exist`)
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('You do not have permission to import data for this character')
  }

  const rawJson = (formData.get('foundryJson') as string | null)?.trim() ?? ''
  if (!rawJson) throw new Error('No JSON data provided. Paste your FoundryVTT actor export in the import field.')

  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch (error) {
    const detail = error instanceof Error ? ` Details: ${error.message}` : ''
    throw new Error(`Invalid JSON format. Please paste a complete FoundryVTT actor export.${detail}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Foundry JSON must be an object export')
  }

  const foundry = parsed as Record<string, unknown>
  const system = (foundry.system && typeof foundry.system === 'object' ? foundry.system : {}) as Record<string, unknown>
  const stats = (system.stats && typeof system.stats === 'object' ? system.stats : {}) as Record<string, unknown>

  const getStatBase = (key: string): number | null => {
    const stat = stats[key]
    if (!stat || typeof stat !== 'object') return null
    return toNullableInt((stat as Record<string, unknown>).base)
  }

  const health = (system.health && typeof system.health === 'object' ? system.health : {}) as Record<string, unknown>
  const sanity = (system.sanity && typeof system.sanity === 'object' ? system.sanity : {}) as Record<string, unknown>
  const power = (system.power && typeof system.power === 'object' ? system.power : {}) as Record<string, unknown>

  const importedSheetData: {
    str?: number
    con?: number
    siz?: number
    dex?: number
    intelligence?: number
    pow?: number
    cha?: number
    edu?: number
    currentHp?: number
    maxHp?: number
    currentSanity?: number
    maxSanity?: number
    currentMp?: number
    maxMp?: number
    luck?: number
  } = {}
  const setImportedNumber = (key: keyof typeof importedSheetData, value: number | null) => {
    if (value !== null) importedSheetData[key] = value
  }

  setImportedNumber('str', getStatBase('str'))
  setImportedNumber('con', getStatBase('con'))
  setImportedNumber('siz', getStatBase('siz'))
  setImportedNumber('dex', getStatBase('dex'))
  setImportedNumber('intelligence', getStatBase('int'))
  setImportedNumber('pow', getStatBase('pow'))
  setImportedNumber('cha', getStatBase('cha'))
  setImportedNumber('edu', getStatBase('edu'))
  setImportedNumber('currentHp', toNullableInt(health.value))
  setImportedNumber('maxHp', toNullableInt(health.max))
  setImportedNumber('currentSanity', toNullableInt(sanity.value))
  setImportedNumber('maxSanity', toNullableInt(sanity.max))
  setImportedNumber('currentMp', toNullableInt(power.value))
  setImportedNumber('maxMp', toNullableInt(power.max))
  setImportedNumber('luck', getFoundryLuck(system))

  const existingSheet = await prisma.characterSheet.findUnique({ where: { characterId } })
  let sheet
  if (existingSheet) {
    if (Object.keys(importedSheetData).length > 0) {
      sheet = await prisma.characterSheet.update({
        where: { characterId },
        data: importedSheetData,
      })
    } else {
      sheet = existingSheet
    }
  } else {
    sheet = await prisma.characterSheet.create({
      data: {
        characterId,
        ...importedSheetData,
      },
    })
  }

  const items = Array.isArray(foundry.items) ? foundry.items : []
  const importedSkillsByName = new Map<string, {
    name: string
    category: string
    baseValue: number
    description: string | null
    sortOrder: number
    importedValue: number | null
  }>()

  for (const item of items) {
    if (!item || typeof item !== 'object') continue
    const typedItem = item as Record<string, unknown>
    if (typedItem.type !== 'skill') continue

    const skillName = typeof typedItem.name === 'string' ? typedItem.name.trim() : ''
    if (!skillName) continue

    const skillSystem = (typedItem.system && typeof typedItem.system === 'object'
      ? typedItem.system
      : {}) as Record<string, unknown>

    importedSkillsByName.set(skillName, {
      name: skillName,
      category: normalizeFoundrySkillCategory(
        (skillSystem.category as string | undefined) ??
        (skillSystem.group as string | undefined)
      ),
      baseValue: toNullableInt(skillSystem.base) ?? 0,
      description: typeof skillSystem.description === 'string' && skillSystem.description.trim()
        ? skillSystem.description.trim()
        : null,
      sortOrder: toNullableInt(typedItem.sort) ?? 0,
      importedValue: getFoundrySkillValue(skillSystem),
    })
  }

  // Suppress unused variable warning — category map is referenced for normalizeFoundrySkillCategory
  void FOUNDRY_SKILL_CATEGORY_MAP

  const importedSkills = Array.from(importedSkillsByName.values())
  if (importedSkills.length > 0) {
    const importedSkillNames = importedSkills.map((s) => s.name)
    const existingSkills = await prisma.skill.findMany({
      where: { name: { in: importedSkillNames } },
      select: { name: true },
    })
    const existingSkillNameSet = new Set(existingSkills.map((s) => s.name))

    const skillsToCreate = importedSkills
      .filter((skill) => !existingSkillNameSet.has(skill.name))
      .map((skill) => ({
        name: skill.name,
        category: skill.category,
        baseValue: skill.baseValue,
        description: skill.description,
        sortOrder: skill.sortOrder,
      }))

    if (skillsToCreate.length > 0) {
      await prisma.skill.createMany({
        data: skillsToCreate,
        skipDuplicates: true,
      })
    }

    const allImportedSkills = await prisma.skill.findMany({
      where: { name: { in: importedSkillNames } },
      select: { id: true, name: true },
    })
    const skillIdByName = new Map(allImportedSkills.map((s) => [s.name, s.id]))

    const skillValueUpsertPromises: ReturnType<typeof prisma.characterSkillValue.upsert>[] = []
    for (const skill of importedSkills) {
      if (skill.importedValue === null) continue
      const skillId = skillIdByName.get(skill.name)
      if (!skillId) continue
      skillValueUpsertPromises.push(
        prisma.characterSkillValue.upsert({
          where: { sheetId_skillId: { sheetId: sheet.id, skillId } },
          update: { value: skill.importedValue },
          create: { sheetId: sheet.id, skillId, value: skill.importedValue },
        })
      )
    }

    if (skillValueUpsertPromises.length > 0) {
      const batchSize = 100
      for (let i = 0; i < skillValueUpsertPromises.length; i += batchSize) {
        await prisma.$transaction(skillValueUpsertPromises.slice(i, i + batchSize))
      }
    }
  }

  revalidatePath(`/characters/${characterId}`)
  revalidatePath(`/characters/${characterId}/sheet`)
  revalidatePath('/my-character')
  redirect(`/characters/${characterId}/sheet`)
}

// ─── Roll History ─────────────────────────────────────────────────────────────

/**
 * Persists a single roll to the database.
 * Returns the created record (including its auto-assigned id).
 * When a skill roll results in FAILURE or FUMBLE, the associated skill is
 * automatically marked for post-mission improvement.
 * When a power roll results in FAILURE or FUMBLE, the associated CharacterAbility
 * is automatically marked for post-mission improvement.
 * Accessible to the character owner or any admin.
 */
export async function saveRoll(
  characterId: number,
  data: {
    rollType: string
    label: string
    roll: number
    target?: number | null
    difficulty?: string | null
    resultType?: string | null
    dice?: number[] | null
    modifier?: number | null
    skillId?: number | null
    abilityId?: number | null
  }
) {
  const user = await requireAuthorizedUser()
  await requireCharacterOwner(characterId, user)

  const target = data.target ?? null
  const d100ResultType = target !== null ? getD100ResultType(data.roll, target) : null
  const resultType = d100ResultType ?? data.resultType ?? null
  const luckAwarded = d100ResultType ? getLuckGainForRoll(data.roll, d100ResultType) : 0

  const shouldMarkSkillImprovement =
    data.rollType === 'skill' &&
    data.skillId != null &&
    (resultType === 'FAILURE' || resultType === 'FUMBLE')

  const shouldMarkAbilityImprovement =
    data.rollType === 'power' &&
    data.abilityId != null &&
    (resultType === 'FAILURE' || resultType === 'FUMBLE')

  return prisma.$transaction(async (tx) => {
    const createdRoll = await tx.rollHistory.create({
      data: {
        characterId,
        rollType: data.rollType,
        label: data.label,
        roll: data.roll,
        target,
        difficulty: data.difficulty ?? null,
        resultType,
        dice: data.dice ? JSON.stringify(data.dice) : null,
        modifier: data.modifier ?? null,
        skillId: data.skillId ?? null,
        abilityId: data.abilityId ?? null,
      },
    })

    // Mark the skill for improvement when a failure/fumble is rolled
    if (shouldMarkSkillImprovement) {
      const sheet = await tx.characterSheet.findUnique({
        where: { characterId },
        select: { id: true },
      })
      if (sheet) {
        // Upsert the CharacterSkillValue row so the mark is always set
        const skill = await tx.skill.findUnique({
          where: { id: data.skillId! },
          select: { baseValue: true },
        })
        await tx.characterSkillValue.upsert({
          where: { sheetId_skillId: { sheetId: sheet.id, skillId: data.skillId! } },
          update: { markedForImprovement: true },
          create: {
            sheetId: sheet.id,
            skillId: data.skillId!,
            value: skill?.baseValue ?? 0,
            markedForImprovement: true,
          },
        })
      }
    }

    // Mark the ability for improvement when a failure/fumble is rolled on a power
    if (shouldMarkAbilityImprovement) {
      await tx.characterAbility.update({
        where: { id: data.abilityId! },
        data: { markedForImprovement: true },
      }).catch((err: unknown) => {
        // Ability may have been deleted between roll and mark — ignore not-found errors
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return
        throw err
      })
    }

    if (luckAwarded <= 0) {
      return { ...createdRoll, luckAwarded: 0, currentLuck: null }
    }

    const existingSheet = await tx.characterSheet.findUnique({
      where: { characterId },
      select: { luck: true },
    })

    if (!existingSheet) {
      const createdSheet = await tx.characterSheet.create({
        data: { characterId, luck: luckAwarded },
        select: { luck: true },
      })
      return { ...createdRoll, luckAwarded, currentLuck: createdSheet.luck }
    }

    const updatedSheet = await tx.characterSheet.update({
      where: { characterId },
      data: { luck: (existingSheet.luck ?? 0) + luckAwarded },
      select: { luck: true },
    })

    return { ...createdRoll, luckAwarded, currentLuck: updatedSheet.luck }
  })
}

/**
 * Converts a FAILURE roll to SUCCESS by spending Luck points.
 * Deducts `luckToSpend` from the character's sheet and marks the roll record.
 * Accessible to the character owner or any admin.
 */
export async function spendLuckOnRoll(
  characterId: number,
  rollHistoryId: number,
  luckToSpend: number
) {
  const user = await requireAuthorizedUser()
  await requireCharacterOwner(characterId, user)

  const roll = await prisma.rollHistory.findUnique({ where: { id: rollHistoryId } })
  if (!roll || roll.characterId !== characterId) throw new Error('Roll not found')
  if (roll.resultType !== 'FAILURE') throw new Error('Can only spend Luck on a Failure')

  const sheet = await prisma.characterSheet.findUnique({ where: { characterId } })
  const currentLuck = sheet?.luck ?? 0
  if (currentLuck < luckToSpend) throw new Error('Not enough Luck')

  await prisma.$transaction([
    prisma.rollHistory.update({
      where: { id: rollHistoryId },
      data: { resultType: 'SUCCESS', luckSpent: luckToSpend },
    }),
    prisma.characterSheet.update({
      where: { characterId },
      data: { luck: currentLuck - luckToSpend },
    }),
  ])

  revalidatePath(`/characters/${characterId}/sheet`)
}

// ─── Skill Improvement ────────────────────────────────────────────────────────

/**
 * Rolls 1d4-1 + modifier for post-mission skill improvement and applies the
 * result to the character's skill value. Clears the improvement mark regardless
 * of the roll outcome (even a 0 counts as having attempted improvement).
 * Accessible to the character owner or any admin.
 *
 * Returns the die value, the modifier, the total gain, and the new skill value.
 */
export async function rollSkillImprovement(
  characterId: number,
  skillId: number,
  modifier: number
): Promise<{ die: number; modifier: number; gain: number; newValue: number }> {
  const user = await requireAuthorizedUser()
  await requireCharacterOwner(characterId, user)

  const sheet = await prisma.characterSheet.findUnique({ where: { characterId } })
  if (!sheet) throw new Error('Character sheet not found')

  const skillDef = await prisma.skill.findUnique({ where: { id: skillId } })
  if (!skillDef) throw new Error('Skill not found')

  const existing = await prisma.characterSkillValue.findUnique({
    where: { sheetId_skillId: { sheetId: sheet.id, skillId } },
  })

  const currentValue = existing?.value ?? skillDef.baseValue
  const { die, gain } = rollImprovementDie(modifier)
  const newValue = currentValue + gain

  await prisma.characterSkillValue.upsert({
    where: { sheetId_skillId: { sheetId: sheet.id, skillId } },
    update: { value: newValue, markedForImprovement: false },
    create: { sheetId: sheet.id, skillId, value: newValue, markedForImprovement: false },
  })

  revalidatePath(`/characters/${characterId}/sheet`)
  return { die, modifier, gain, newValue }
}

/**
 * Clears all skill improvement marks for a character (e.g. at end of mission).
 * Accessible to the character owner or any admin.
 */
export async function clearSkillImprovementMarks(characterId: number): Promise<void> {
  const user = await requireAuthorizedUser()
  await requireCharacterOwner(characterId, user)

  const sheet = await prisma.characterSheet.findUnique({ where: { characterId } })
  if (!sheet) return

  await prisma.characterSkillValue.updateMany({
    where: { sheetId: sheet.id, markedForImprovement: true },
    data: { markedForImprovement: false },
  })

  revalidatePath(`/characters/${characterId}/sheet`)
}

// ─── Ability Improvement ──────────────────────────────────────────────────────

/**
 * Rolls 1d4-1 + modifier for post-mission ability improvement and applies the
 * result to the character-specific ability. Clears the improvement mark regardless
 * of the roll outcome (even a 0 counts as having attempted improvement).
 * Accessible to the character owner or any admin.
 *
 * Returns the die value, the modifier, the total gain, and the new ability value.
 */
export async function rollAbilityImprovement(
  characterId: number,
  abilityId: number,
  modifier: number
): Promise<{ die: number; modifier: number; gain: number; newValue: number }> {
  const user = await requireAuthorizedUser()
  await requireCharacterOwner(characterId, user)

  const ability = await prisma.characterAbility.findUnique({ where: { id: abilityId } })
  if (!ability || ability.characterId !== characterId) throw new Error('Ability not found')

  const { die, gain } = rollImprovementDie(modifier)
  const newValue = ability.currentValue + gain

  await prisma.characterAbility.update({
    where: { id: abilityId },
    data: { currentValue: newValue, markedForImprovement: false },
  })

  revalidatePath(`/characters/${characterId}/sheet`)
  return { die, modifier, gain, newValue }
}

/**
 * Clears all ability improvement marks for a character (e.g. at end of mission).
 * Accessible to the character owner or any admin.
 */
export async function clearAbilityImprovementMarks(characterId: number): Promise<void> {
  const user = await requireAuthorizedUser()
  await requireCharacterOwner(characterId, user)

  await prisma.characterAbility.updateMany({
    where: { characterId, markedForImprovement: true },
    data: { markedForImprovement: false },
  })

  revalidatePath(`/characters/${characterId}/sheet`)
}
