'use server'

import { AccessRole, AIFeedbackStatus, AIGenerationType, AITrainingJobStatus, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import {
  generateCharacterBulkTextFromAI,
  generateCharacterStatsSkillsFromAI,
  generateCharacterTextFromAI,
  getAIEvaluationSnapshotFromAI,
  sendAIFeedbackToService,
  triggerAIRetrain,
} from '@/lib/aiClient'
import type { AIPromptContext } from '@/lib/aiPromptContext'
import { revalidatePath } from 'next/cache'
import { requireAuthorizedUser, requireAdminUser } from './_shared'
import { getActiveLoreContext } from './lore'

// ─── Types ────────────────────────────────────────────────────────────────────

type CharacterTextSuggestionInput = {
  characterId?: number | null
  name?: string
  firstName?: string
  lastName?: string
  race?: string
  gender?: string
  role?: string
  affiliation?: string
  currentCase?: string
  currentLocation?: string
  homeOrigin?: string
  description?: string
  additionalPrompt?: string
  promptContext?: Partial<AIPromptContext>
}

type CharacterTextSuggestionResult = {
  ok: boolean
  generationId?: string
  suggestion?: {
    description: string
    affiliation: string
    currentCase: string
    currentLocation: string
    homeOrigin: string
    role: string
    entityType: string
    narrativeRole: string
    motivations: string
    demeanor: string
    mechanicalFocus: string
  }
  error?: string
}

type CharacterStatsSkillsSuggestionInput = {
  characterId?: number | null
  name?: string
  role?: string
  race?: string
  description?: string
  additionalPrompt?: string
  promptContext?: Partial<AIPromptContext>
}

type CharacterStatsSkillsSuggestionResult = {
  ok: boolean
  generationId?: string
  suggestion?: {
    stats: {
      str: number
      con: number
      siz: number
      dex: number
      intelligence: number
      pow: number
      cha: number
      app: number
      edu: number
      currentHp: number
      maxHp: number
      currentSanity: number
      maxSanity: number
      currentMp: number
      maxMp: number
      luck: number
      build: number
    }
    skills: Array<{ skillId: number; value: number }>
  }
  error?: string
}

type CharacterBulkSuggestionInput = {
  additionalPrompt?: string
  promptContext?: Partial<AIPromptContext>
  rows: Array<{
    rowIndex: number
    name?: string
    firstName?: string
    lastName?: string
    role?: string
    status?: string
  }>
}

type CharacterBulkSuggestionResult = {
  ok: boolean
  generationId?: string
  suggestions?: Array<{
    rowIndex: number
    role: string
    status: string
    description: string
  }>
  error?: string
}

type AIFeedbackInput = {
  generationId: string
  status: 'ACCEPTED' | 'EDITED' | 'REJECTED'
  finalValues?: Record<string, unknown>
  note?: string
}

type AITrainingRequestInput = {
  mode?: 'cpu' | 'gpu'
  baseModel?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertCharacterAccess(characterId: number, user: { email: string; role: AccessRole }) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, claimedByEmail: true },
  })
  if (!character) throw new Error(`Character ${characterId} not found`)
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error(`Access denied for character ${characterId}`)
  }
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function generateCharacterTextSuggestion(
  input: CharacterTextSuggestionInput,
): Promise<CharacterTextSuggestionResult> {
  const user = await requireAuthorizedUser()

  try {
    const characterId =
      typeof input.characterId === 'number' && Number.isFinite(input.characterId)
        ? Math.trunc(input.characterId)
        : null

    if (characterId !== null) await assertCharacterAccess(characterId, user)

    const aiPayload = {
      name: (input.name ?? '').trim(),
      firstName: (input.firstName ?? '').trim(),
      lastName: (input.lastName ?? '').trim(),
      race: (input.race ?? '').trim(),
      gender: (input.gender ?? '').trim(),
      role: (input.role ?? '').trim(),
      affiliation: (input.affiliation ?? '').trim(),
      currentCase: (input.currentCase ?? '').trim(),
      currentLocation: (input.currentLocation ?? '').trim(),
      homeOrigin: (input.homeOrigin ?? '').trim(),
      baseDescription: (input.description ?? '').trim(),
      additionalPrompt: (input.additionalPrompt ?? '').trim(),
      promptContext: {
        entityType: (input.promptContext?.entityType ?? '').trim(),
        narrativeRole: (input.promptContext?.narrativeRole ?? '').trim(),
        tone: (input.promptContext?.tone ?? '').trim(),
        playerRelationship: (input.promptContext?.playerRelationship ?? '').trim(),
        threatLevel: (input.promptContext?.threatLevel ?? '').trim(),
        factionAlignment: (input.promptContext?.factionAlignment ?? '').trim(),
        metaphysicalNature: (input.promptContext?.metaphysicalNature ?? '').trim(),
        mechanicalFocus: (input.promptContext?.mechanicalFocus ?? '').trim(),
      },
    }

    const [primaryPromptConfig, loreContext] = await Promise.all([
      prisma.aIConfig.findUnique({ where: { key: 'primaryPrompt' } }),
      getActiveLoreContext(),
    ])
    const systemPrompt = [primaryPromptConfig?.value ?? '', loreContext].filter(Boolean).join('\n\n')
    const ai = await generateCharacterTextFromAI({ ...aiPayload, systemPrompt })
    const generation = await prisma.aIGeneration.create({
      data: {
        type: AIGenerationType.CHARACTER_TEXT,
        createdByEmail: user.email,
        characterId,
        modelName: ai.modelName,
        modelVersion: ai.modelVersion,
        inputPayload: aiPayload,
        suggestion: ai.suggestion,
      },
      select: { id: true },
    })

    return { ok: true, generationId: generation.id, suggestion: ai.suggestion }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate character suggestion'
    console.error('[ai] character text suggestion failed', error)
    return { ok: false, error: message }
  }
}

export async function generateCharacterStatsSkillsSuggestion(
  input: CharacterStatsSkillsSuggestionInput,
): Promise<CharacterStatsSkillsSuggestionResult> {
  const user = await requireAuthorizedUser()

  try {
    const characterId =
      typeof input.characterId === 'number' && Number.isFinite(input.characterId)
        ? Math.trunc(input.characterId)
        : null
    if (characterId !== null) await assertCharacterAccess(characterId, user)

    const skills = await prisma.skill.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, category: true, baseValue: true },
    })

    const aiPayload = {
      name: (input.name ?? '').trim(),
      role: (input.role ?? '').trim(),
      race: (input.race ?? '').trim(),
      description: (input.description ?? '').trim(),
      additionalPrompt: (input.additionalPrompt ?? '').trim(),
      promptContext: {
        entityType: (input.promptContext?.entityType ?? '').trim(),
        narrativeRole: (input.promptContext?.narrativeRole ?? '').trim(),
        tone: (input.promptContext?.tone ?? '').trim(),
        playerRelationship: (input.promptContext?.playerRelationship ?? '').trim(),
        threatLevel: (input.promptContext?.threatLevel ?? '').trim(),
        factionAlignment: (input.promptContext?.factionAlignment ?? '').trim(),
        metaphysicalNature: (input.promptContext?.metaphysicalNature ?? '').trim(),
        mechanicalFocus: (input.promptContext?.mechanicalFocus ?? '').trim(),
      },
      skills,
    }

    const [primaryPromptConfig, loreContext] = await Promise.all([
      prisma.aIConfig.findUnique({ where: { key: 'primaryPrompt' } }),
      getActiveLoreContext(),
    ])
    const systemPrompt = [primaryPromptConfig?.value ?? '', loreContext].filter(Boolean).join('\n\n')
    const ai = await generateCharacterStatsSkillsFromAI({ ...aiPayload, systemPrompt })
    const generation = await prisma.aIGeneration.create({
      data: {
        type: AIGenerationType.CHARACTER_STATS_SKILLS,
        createdByEmail: user.email,
        characterId,
        modelName: ai.modelName,
        modelVersion: ai.modelVersion,
        inputPayload: {
          name: aiPayload.name,
          role: aiPayload.role,
          race: aiPayload.race,
          description: aiPayload.description,
          additionalPrompt: aiPayload.additionalPrompt,
          skillCatalog: skills,
        },
        suggestion: ai.suggestion,
      },
      select: { id: true },
    })

    return { ok: true, generationId: generation.id, suggestion: ai.suggestion }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate stats and skills suggestion'
    console.error('[ai] character stats/skills suggestion failed', error)
    return { ok: false, error: message }
  }
}

export async function generateCharacterBulkTextSuggestions(
  input: CharacterBulkSuggestionInput,
): Promise<CharacterBulkSuggestionResult> {
  const user = await requireAuthorizedUser()

  try {
    const rows = input.rows
      .map((row) => ({
        rowIndex: row.rowIndex,
        name: (row.name ?? '').trim(),
        firstName: (row.firstName ?? '').trim(),
        lastName: (row.lastName ?? '').trim(),
        role: (row.role ?? '').trim(),
        status: (row.status ?? '').trim(),
      }))
      .filter((row) => Number.isFinite(row.rowIndex))

    const promptContext = {
      entityType: (input.promptContext?.entityType ?? '').trim(),
      narrativeRole: (input.promptContext?.narrativeRole ?? '').trim(),
      tone: (input.promptContext?.tone ?? '').trim(),
      playerRelationship: (input.promptContext?.playerRelationship ?? '').trim(),
      threatLevel: (input.promptContext?.threatLevel ?? '').trim(),
      factionAlignment: (input.promptContext?.factionAlignment ?? '').trim(),
      metaphysicalNature: (input.promptContext?.metaphysicalNature ?? '').trim(),
      mechanicalFocus: (input.promptContext?.mechanicalFocus ?? '').trim(),
    }
    const additionalPrompt = (input.additionalPrompt ?? '').trim()

    if (rows.length === 0) return { ok: false, error: 'No rows were provided for AI enrichment.' }

    const [primaryPromptConfig, loreContext] = await Promise.all([
      prisma.aIConfig.findUnique({ where: { key: 'primaryPrompt' } }),
      getActiveLoreContext(),
    ])
    const systemPrompt = [primaryPromptConfig?.value ?? '', loreContext].filter(Boolean).join('\n\n')
    const ai = await generateCharacterBulkTextFromAI(rows, systemPrompt, promptContext, additionalPrompt)
    const generation = await prisma.aIGeneration.create({
      data: {
        type: AIGenerationType.CHARACTER_BULK_TEXT,
        createdByEmail: user.email,
        modelName: ai.modelName,
        modelVersion: ai.modelVersion,
        inputPayload: { rows, promptContext, additionalPrompt },
        suggestion: { suggestions: ai.suggestions },
      },
      select: { id: true },
    })

    return { ok: true, generationId: generation.id, suggestions: ai.suggestions }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enrich bulk rows'
    console.error('[ai] character bulk suggestion failed', error)
    return { ok: false, error: message }
  }
}

export async function captureAIFeedback(input: AIFeedbackInput): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAuthorizedUser()

  try {
    const generation = await prisma.aIGeneration.findUnique({
      where: { id: input.generationId },
      select: { id: true, createdByEmail: true },
    })
    if (!generation) throw new Error('AI generation record not found')
    if (generation.createdByEmail !== user.email && user.role !== AccessRole.ADMIN) throw new Error('Forbidden')

    await prisma.aIFeedback.create({
      data: {
        generationId: input.generationId,
        status: input.status as AIFeedbackStatus,
        createdByEmail: user.email,
        finalValues: (input.finalValues as Prisma.InputJsonValue | undefined) ?? undefined,
        note: input.note?.trim() || null,
      },
    })

    try {
      await sendAIFeedbackToService({
        generationId: input.generationId,
        status: input.status,
        finalValues: input.finalValues,
      })
    } catch (error) {
      console.error('[ai] feedback sync failed', error)
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to capture AI feedback'
    return { ok: false, error: message }
  }
}

export async function requestAIModelRetrain(
  input: AITrainingRequestInput = {},
): Promise<{ ok: boolean; jobId?: number; modelVersion?: string; error?: string }> {
  const user = await requireAdminUser()
  const mode = input.mode === 'gpu' ? 'gpu' : 'cpu'
  const baseModel =
    input.baseModel?.trim() ||
    (mode === 'gpu'
      ? process.env.AI_MODEL_GPU || process.env.AI_MODEL_CPU || 'model'
      : process.env.AI_MODEL_CPU || process.env.AI_MODEL_GPU || 'model')

  const trainingSet = await prisma.aIFeedback.findMany({
    where: { status: { in: [AIFeedbackStatus.ACCEPTED, AIFeedbackStatus.EDITED] } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      generation: {
        select: {
          type: true,
          inputPayload: true,
          suggestion: true,
          modelName: true,
          modelVersion: true,
        },
      },
    },
  })

  const trainingExamples = trainingSet.map((item) => ({
    generationType: item.generation.type,
    inputPayload: item.generation.inputPayload,
    suggestedOutput: item.generation.suggestion,
    status: item.status,
    finalValues: item.finalValues,
    sourceModelName: item.generation.modelName,
    sourceModelVersion: item.generation.modelVersion,
  }))

  const groupedByEntityType = trainingExamples.reduce<Record<string, number>>((acc, example) => {
    const payload = typeof example.inputPayload === 'object' && example.inputPayload ? example.inputPayload : {}
    const promptContext =
      'promptContext' in payload && typeof payload.promptContext === 'object' && payload.promptContext
        ? (payload.promptContext as Record<string, unknown>)
        : {}
    const entityType = typeof promptContext.entityType === 'string' && promptContext.entityType.trim()
      ? promptContext.entityType.trim()
      : 'unspecified'
    acc[entityType] = (acc[entityType] ?? 0) + 1
    return acc
  }, {})

  const job = await prisma.aITrainingJob.create({
    data: {
      requestedByEmail: user.email,
      status: AITrainingJobStatus.PENDING,
      mode,
      baseModel,
      payload: { trainingExamples: trainingExamples.length, groupedByEntityType },
    },
    select: { id: true },
  })

  try {
    await prisma.aITrainingJob.update({
      where: { id: job.id },
      data: { status: AITrainingJobStatus.RUNNING, startedAt: new Date() },
    })

    const retrain = await triggerAIRetrain({
      mode,
      baseModel,
      trainingExamples,
    })

    await prisma.$transaction([
      prisma.aIModelVersion.updateMany({ data: { isActive: false } }),
      prisma.aIModelVersion.create({
        data: {
          modelName: retrain.modelName,
          version: retrain.modelVersion,
          mode: retrain.mode,
          metadata: { trainingExamples: trainingExamples.length, sourceJobId: job.id, groupedByEntityType },
          isActive: true,
        },
      }),
      prisma.aITrainingJob.update({
        where: { id: job.id },
        data: {
          status: AITrainingJobStatus.SUCCEEDED,
          completedAt: new Date(),
          result: retrain,
        },
      }),
    ])

    revalidatePath('/admin/skills')
    return { ok: true, jobId: job.id, modelVersion: retrain.modelVersion }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI retraining failed'
    await prisma.aITrainingJob.update({
      where: { id: job.id },
      data: {
        status: AITrainingJobStatus.FAILED,
        completedAt: new Date(),
        error: message,
      },
    })
    console.error('[ai] retraining failed', error)
    return { ok: false, jobId: job.id, error: message }
  }
}

export async function getAITrainingDashboard() {
  await requireAdminUser()

  const [activeModel, recentJobs] = await Promise.all([
    prisma.aIModelVersion.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.aITrainingJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { requestedBy: { select: { email: true } } },
    }),
  ])

  return { activeModel, recentJobs }
}

export async function getAIEvaluationSnapshot() {
  await requireAdminUser()

  try {
    return await getAIEvaluationSnapshotFromAI()
  } catch (error) {
    return {
      modelName: '',
      modelVersion: '',
      criteria: [],
      cases: [],
      error: error instanceof Error ? error.message : 'Failed to load AI evaluation snapshot',
    }
  }
}

export async function getAIPrimaryPrompt(): Promise<string> {
  await requireAdminUser()
  const config = await prisma.aIConfig.findUnique({ where: { key: 'primaryPrompt' } })
  return config?.value ?? ''
}

export async function saveAIPrimaryPrompt(formData: FormData) {
  await requireAdminUser()
  const prompt = (formData.get('primaryPrompt') as string | null)?.trim() ?? ''
  await prisma.aIConfig.upsert({
    where: { key: 'primaryPrompt' },
    update: { value: prompt },
    create: { key: 'primaryPrompt', value: prompt },
  })
  revalidatePath('/admin/ai')
}
