import type { AIPromptContext } from '@/lib/aiPromptContext'

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const AI_MODE = process.env.AI_MODE === 'gpu' ? 'gpu' : 'cpu'
const REQUEST_TIMEOUT_MS = 15_000

export type CharacterTextSuggestion = {
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

export type CharacterStatsSuggestion = {
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

export type CharacterSkillSuggestion = {
  skillId: number
  value: number
}

export type CharacterBulkTextSuggestion = {
  rowIndex: number
  role: string
  status: string
  description: string
}

export type AIEvaluationSnapshot = {
  modelName: string
  modelVersion: string
  criteria: Array<{ key: string; label: string; description: string }>
  cases: Array<{
    id: string
    label: string
    entityType: string
    promptSummary: string
    suggestion: CharacterTextSuggestion
    scores: Record<string, number>
  }>
}

export type SkillPromptInput = {
  id: number
  name: string
  category: string | null
  baseValue: number
}

type ServiceEnvelope<T> = {
  modelName: string
  modelVersion: string
  mode: 'cpu' | 'gpu'
  suggestion?: T
  suggestions?: T[]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asInt(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim()) {
    const parsed = parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

async function fetchAI<TOutput>(path: string, init?: RequestInit): Promise<TOutput> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      cache: 'no-store',
      signal: controller.signal,
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })

    if (!res.ok) {
      throw new Error(`AI service request failed (${res.status})`)
    }

    return (await res.json()) as TOutput
  } finally {
    clearTimeout(timeout)
  }
}

async function callAI<TInput, TOutput>(path: string, payload: TInput): Promise<TOutput> {
  return fetchAI<TOutput>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function generateCharacterTextFromAI(input: {
  name: string
  firstName: string
  lastName: string
  race: string
  gender: string
  role: string
  affiliation: string
  currentCase: string
  currentLocation: string
  homeOrigin: string
  baseDescription: string
  additionalPrompt: string
  systemPrompt?: string
  promptContext?: Partial<AIPromptContext>
}): Promise<{ modelName: string; modelVersion: string; mode: 'cpu' | 'gpu'; suggestion: CharacterTextSuggestion }> {
  const result = await callAI<typeof input, ServiceEnvelope<unknown>>('/v1/generate/character-text', input)
  const raw = asObject(result.suggestion)

  return {
    modelName: asString(result.modelName) || (AI_MODE === 'gpu' ? 'gpu-model' : 'cpu-model'),
    modelVersion: asString(result.modelVersion) || 'unknown',
    mode: result.mode === 'gpu' ? 'gpu' : 'cpu',
    suggestion: {
      description: asString(raw.description),
      affiliation: asString(raw.affiliation),
      currentCase: asString(raw.currentCase),
      currentLocation: asString(raw.currentLocation),
      homeOrigin: asString(raw.homeOrigin),
      role: asString(raw.role),
      entityType: asString(raw.entityType),
      narrativeRole: asString(raw.narrativeRole),
      motivations: asString(raw.motivations),
      demeanor: asString(raw.demeanor),
      mechanicalFocus: asString(raw.mechanicalFocus),
    },
  }
}

function validateStatsSuggestion(value: unknown): CharacterStatsSuggestion {
  const obj = asObject(value)
  return {
    str: clamp(asInt(obj.str, 10), 1, 30),
    con: clamp(asInt(obj.con, 10), 1, 30),
    siz: clamp(asInt(obj.siz, 10), 1, 30),
    dex: clamp(asInt(obj.dex, 10), 1, 30),
    intelligence: clamp(asInt(obj.intelligence, 10), 1, 30),
    pow: clamp(asInt(obj.pow, 10), 1, 30),
    cha: clamp(asInt(obj.cha, 10), 1, 30),
    app: clamp(asInt(obj.app, 10), 1, 30),
    edu: clamp(asInt(obj.edu, 10), 1, 30),
    currentHp: clamp(asInt(obj.currentHp, 10), 1, 99),
    maxHp: clamp(asInt(obj.maxHp, 10), 1, 99),
    currentSanity: clamp(asInt(obj.currentSanity, 50), 1, 99),
    maxSanity: clamp(asInt(obj.maxSanity, 50), 1, 99),
    currentMp: clamp(asInt(obj.currentMp, 10), 1, 99),
    maxMp: clamp(asInt(obj.maxMp, 10), 1, 99),
    luck: clamp(asInt(obj.luck, 50), 1, 99),
    build: clamp(asInt(obj.build, 0), -2, 4),
  }
}

function validateSkillSuggestions(value: unknown, skills: SkillPromptInput[]): CharacterSkillSuggestion[] {
  if (!Array.isArray(value)) return []

  const skillIds = new Set(skills.map((s) => s.id))
  return value
    .map((item) => {
      const obj = asObject(item)
      const skillId = asInt(obj.skillId, -1)
      const raw = asInt(obj.value, 0)
      if (!skillIds.has(skillId)) return null
      return { skillId, value: clamp(raw, 0, 100) }
    })
    .filter((item): item is CharacterSkillSuggestion => item !== null)
}

export async function generateCharacterStatsSkillsFromAI(input: {
  name: string
  role: string
  race: string
  description: string
  additionalPrompt: string
  systemPrompt?: string
  promptContext?: Partial<AIPromptContext>
  skills: SkillPromptInput[]
}): Promise<{
  modelName: string
  modelVersion: string
  mode: 'cpu' | 'gpu'
  suggestion: { stats: CharacterStatsSuggestion; skills: CharacterSkillSuggestion[] }
}> {
  const result = await callAI<typeof input, ServiceEnvelope<unknown>>('/v1/generate/character-stats-skills', input)
  const suggestion = asObject(result.suggestion)

  return {
    modelName: asString(result.modelName) || (AI_MODE === 'gpu' ? 'gpu-model' : 'cpu-model'),
    modelVersion: asString(result.modelVersion) || 'unknown',
    mode: result.mode === 'gpu' ? 'gpu' : 'cpu',
    suggestion: {
      stats: validateStatsSuggestion(suggestion.stats),
      skills: validateSkillSuggestions(suggestion.skills, input.skills),
    },
  }
}

export async function generateCharacterBulkTextFromAI(rows: Array<{
  rowIndex: number
  name: string
  firstName: string
  lastName: string
  role: string
  status: string
  promptContext?: Partial<AIPromptContext>
}>, systemPrompt?: string, promptContext?: Partial<AIPromptContext>, additionalPrompt?: string): Promise<{
  modelName: string
  modelVersion: string
  mode: 'cpu' | 'gpu'
  suggestions: CharacterBulkTextSuggestion[]
}> {
  const payload = rows.map((r) => ({
    ...r,
    ...(systemPrompt ? { systemPrompt } : {}),
    ...(promptContext ? { promptContext } : {}),
    ...(additionalPrompt ? { additionalPrompt } : {}),
  }))
  const result = await callAI<typeof payload, ServiceEnvelope<unknown>>('/v1/generate/character-bulk-text', payload)
  const suggestions = Array.isArray(result.suggestions) ? result.suggestions : []

  return {
    modelName: asString(result.modelName) || (AI_MODE === 'gpu' ? 'gpu-model' : 'cpu-model'),
    modelVersion: asString(result.modelVersion) || 'unknown',
    mode: result.mode === 'gpu' ? 'gpu' : 'cpu',
    suggestions: suggestions
      .map((item) => {
        const obj = asObject(item)
        return {
          rowIndex: asInt(obj.rowIndex, -1),
          role: asString(obj.role),
          status: asString(obj.status),
          description: asString(obj.description),
        }
      })
      .filter((item) => item.rowIndex >= 0),
  }
}

export async function sendAIFeedbackToService(payload: {
  generationId: string
  status: 'ACCEPTED' | 'EDITED' | 'REJECTED'
  finalValues?: Record<string, unknown>
}): Promise<void> {
  await callAI('/v1/train/feedback', payload)
}

export async function triggerAIRetrain(payload: {
  mode: 'cpu' | 'gpu'
  baseModel: string
  trainingExamples: Array<Record<string, unknown>>
}): Promise<{ modelName: string; modelVersion: string; mode: 'cpu' | 'gpu' }> {
  const result = await callAI<typeof payload, Record<string, unknown>>('/v1/train/retrain', payload)
  return {
    modelName: asString(result.modelName),
    modelVersion: asString(result.modelVersion),
    mode: result.mode === 'gpu' ? 'gpu' : 'cpu',
  }
}

export async function getAIEvaluationSnapshotFromAI(): Promise<AIEvaluationSnapshot> {
  const result = await fetchAI<Record<string, unknown>>('/v1/evaluate/character-generators', { method: 'GET' })
  const criteria = Array.isArray(result.criteria) ? result.criteria : []
  const cases = Array.isArray(result.cases) ? result.cases : []

  return {
    modelName: asString(result.modelName) || (AI_MODE === 'gpu' ? 'gpu-model' : 'cpu-model'),
    modelVersion: asString(result.modelVersion) || 'unknown',
    criteria: criteria.map((item) => {
      const obj = asObject(item)
      return {
        key: asString(obj.key),
        label: asString(obj.label),
        description: asString(obj.description),
      }
    }),
    cases: cases.map((item) => {
      const obj = asObject(item)
      const scores = asObject(obj.scores)
      return {
        id: asString(obj.id),
        label: asString(obj.label),
        entityType: asString(obj.entityType),
        promptSummary: asString(obj.promptSummary),
        suggestion: {
          description: asString(asObject(obj.suggestion).description),
          affiliation: asString(asObject(obj.suggestion).affiliation),
          currentCase: asString(asObject(obj.suggestion).currentCase),
          currentLocation: asString(asObject(obj.suggestion).currentLocation),
          homeOrigin: asString(asObject(obj.suggestion).homeOrigin),
          role: asString(asObject(obj.suggestion).role),
          entityType: asString(asObject(obj.suggestion).entityType),
          narrativeRole: asString(asObject(obj.suggestion).narrativeRole),
          motivations: asString(asObject(obj.suggestion).motivations),
          demeanor: asString(asObject(obj.suggestion).demeanor),
          mechanicalFocus: asString(asObject(obj.suggestion).mechanicalFocus),
        },
        scores: Object.fromEntries(
          Object.entries(scores).map(([key, value]) => [key, clamp(asInt(value, 0), 0, 5)]),
        ),
      }
    }),
  }
}
