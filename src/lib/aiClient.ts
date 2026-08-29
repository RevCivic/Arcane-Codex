import type { AIPromptContext } from '@/lib/aiPromptContext'

const DEFAULT_GATEWAY_MODEL = 'balanced'
const REQUEST_TIMEOUT_MS = Number(process.env.AI_GATEWAY_TIMEOUT_MS) || 200_000
const MAX_TOKENS = Number(process.env.AI_MAX_TOKENS) || 700
const TEMPERATURE = Number(process.env.AI_TEMPERATURE) || 0.4
const MAX_DIAGNOSTIC_RESPONSE_LENGTH = 4_000

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
  str: number; con: number; siz: number; dex: number; intelligence: number; pow: number
  cha: number; app: number; edu: number; currentHp: number; maxHp: number
  currentSanity: number; maxSanity: number; currentMp: number; maxMp: number
  luck: number; build: number
}

export type CharacterSkillSuggestion = { skillId: number; value: number }
export type CharacterBulkTextSuggestion = { rowIndex: number; role: string; status: string; description: string }
export type SkillPromptInput = { id: number; name: string; category: string | null; baseValue: number }
type AIPromptContextInput = Partial<Omit<AIPromptContext, 'entityType'>> & { entityType?: string }
type GatewayResult<T> = { modelName: string; modelVersion: string; value: T }
type GatewayMessage = { role: 'system' | 'user' | 'assistant'; content: string }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asString(value: unknown) { return typeof value === 'string' ? value.trim() : '' }

function contentPartText(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  const part = asObject(value)
  return asString(part.text) || asString(asObject(part.text).value) || asString(part.content)
}

export function extractGatewayContent(value: unknown): string {
  if (typeof value === 'string') return value.trim()

  const payload = asObject(value)
  const choice = asObject(Array.isArray(payload.choices) ? payload.choices[0] : undefined)
  const messageContent = asObject(choice.message).content
  if (Array.isArray(messageContent)) {
    const content = messageContent.map(contentPartText).filter(Boolean).join('\n').trim()
    if (content) return content
  }

  return contentPartText(messageContent)
    || asString(choice.text)
    || asString(payload.output_text)
    || asString(payload.response)
    || contentPartText(payload.content)
}

export function formatGatewayResponseForLog(responseText: string, maxLength = MAX_DIAGNOSTIC_RESPONSE_LENGTH) {
  if (responseText.length <= maxLength) return responseText
  return `${responseText.slice(0, maxLength)}… [truncated ${responseText.length - maxLength} characters]`
}

function asInt(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

function parseJson(content: string): unknown {
  const unfenced = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(unfenced) } catch {
    const start = Math.min(...['{', '['].map((token) => { const index = unfenced.indexOf(token); return index < 0 ? Infinity : index }))
    const end = Math.max(unfenced.lastIndexOf('}'), unfenced.lastIndexOf(']'))
    if (Number.isFinite(start) && end > start) return JSON.parse(unfenced.slice(start, end + 1))
    throw new Error('AI gateway returned a response that was not valid JSON')
  }
}

export function resolveGatewayEndpoint(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, '')
  if (!normalized) throw new Error('AI_GATEWAY_URL is not configured')
  if (/\/chat\/completions$/i.test(normalized)) return normalized
  if (/\/v1$/i.test(normalized)) return `${normalized}/chat/completions`
  return `${normalized}/v1/chat/completions`
}

export function resolveGatewayUrl(env: NodeJS.ProcessEnv = process.env) {
  const configuredUrl = env.AI_GATEWAY_URL?.trim()
  if (configuredUrl) return configuredUrl

  const host = env.AI_GATEWAY_HOST?.trim()
  if (!host) throw new Error('AI_GATEWAY_URL or AI_GATEWAY_HOST is not configured')

  const protocol = env.AI_GATEWAY_PROTOCOL?.trim().replace(/:$/, '') || 'http'
  if (protocol !== 'http' && protocol !== 'https') {
    throw new Error('AI_GATEWAY_PROTOCOL must be http or https')
  }

  const port = env.AI_GATEWAY_PORT?.trim()
  if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
    throw new Error('AI_GATEWAY_PORT must be a number between 1 and 65535')
  }

  // URL requires brackets around a bare IPv6 address. Already-bracketed values
  // remain untouched, while DNS names and IPv4 addresses pass through as-is.
  const normalizedHost = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host
  return `${protocol}://${normalizedHost}${port ? `:${port}` : ''}`
}

export function resolveGatewayHeaders(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.AI_GATEWAY_API_KEY?.trim()
  return {
    'content-type': 'application/json',
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  }
}

export function resolveGatewayModel(env: NodeJS.ProcessEnv = process.env) {
  return env.AI_GATEWAY_MODEL?.trim() || DEFAULT_GATEWAY_MODEL
}

async function complete(messages: GatewayMessage[], json = false): Promise<GatewayResult<unknown>> {
  const gatewayUrl = resolveGatewayUrl()
  const gatewayModel = resolveGatewayModel()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(resolveGatewayEndpoint(gatewayUrl), {
      method: 'POST', cache: 'no-store', signal: controller.signal,
      headers: resolveGatewayHeaders(),
      body: JSON.stringify({
        model: gatewayModel, messages, temperature: TEMPERATURE, max_tokens: MAX_TOKENS,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500)
      const authenticationHint = response.status === 401
        ? ' Verify that AI_GATEWAY_API_KEY is set to a gateway-issued key in the running app container, then recreate the container.'
        : ''
      const modelHint = response.status === 400 && detail.includes('Unknown model class')
        ? ' Set AI_GATEWAY_MODEL to a model class supported by the gateway (for example: fast, balanced, heavy, or background), then recreate the container.'
        : ''
      throw new Error(`AI gateway request failed (${response.status})${detail ? `: ${detail}` : ''}.${authenticationHint}${modelHint}`)
    }
    const responseText = await response.text()
    let responsePayload: unknown
    try {
      responsePayload = JSON.parse(responseText)
    } catch {
      responsePayload = responseText
    }
    const payload = asObject(responsePayload)
    const content = extractGatewayContent(responsePayload)
    if (!content) {
      console.error('[ai-gateway] Unable to extract text from successful chat completion response', {
        status: response.status,
        contentType: response.headers.get('content-type'),
        responseBody: formatGatewayResponseForLog(responseText),
      })
      const responseKeys = Object.keys(payload)
      const detail = responseKeys.length ? ` (response fields: ${responseKeys.join(', ')})` : ''
      throw new Error(`AI gateway returned a successful response without text content${detail}`)
    }
    return {
      modelName: asString(payload.model) || gatewayModel,
      modelVersion: asString(payload.id) || 'gateway',
      value: json ? parseJson(content) : content,
    }
  } finally { clearTimeout(timeout) }
}

function contextMessage(systemPrompt?: string) {
  return [
    'You assist the game master of Arcane P.I., a modern supernatural Basic Roleplaying campaign.',
    'Treat supplied campaign lore as authoritative. Do not invent contradictions.',
    systemPrompt,
  ].filter(Boolean).join('\n\n')
}

function validateStats(value: unknown): CharacterStatsSuggestion {
  const o = asObject(value)
  return {
    str: clamp(asInt(o.str, 10), 1, 30), con: clamp(asInt(o.con, 10), 1, 30),
    siz: clamp(asInt(o.siz, 10), 1, 30), dex: clamp(asInt(o.dex, 10), 1, 30),
    intelligence: clamp(asInt(o.intelligence, 10), 1, 30), pow: clamp(asInt(o.pow, 10), 1, 30),
    cha: clamp(asInt(o.cha, 10), 1, 30), app: clamp(asInt(o.app, 10), 1, 30),
    edu: clamp(asInt(o.edu, 10), 1, 30), currentHp: clamp(asInt(o.currentHp, 10), 1, 99),
    maxHp: clamp(asInt(o.maxHp, 10), 1, 99), currentSanity: clamp(asInt(o.currentSanity, 50), 1, 99),
    maxSanity: clamp(asInt(o.maxSanity, 50), 1, 99), currentMp: clamp(asInt(o.currentMp, 10), 1, 99),
    maxMp: clamp(asInt(o.maxMp, 10), 1, 99), luck: clamp(asInt(o.luck, 50), 1, 99),
    build: clamp(asInt(o.build, 0), -2, 4),
  }
}

export async function generateCharacterTextFromAI(input: {
  name: string; firstName: string; lastName: string; race: string; gender: string; role: string
  affiliation: string; currentCase: string; currentLocation: string; homeOrigin: string
  baseDescription: string; additionalPrompt: string; systemPrompt?: string; promptContext?: AIPromptContextInput
}): Promise<Omit<GatewayResult<CharacterTextSuggestion>, 'value'> & { suggestion: CharacterTextSuggestion }> {
  const result = await complete([
    { role: 'system', content: `${contextMessage(input.systemPrompt)}\n\nReturn only a JSON object with these string fields: description, affiliation, currentCase, currentLocation, homeOrigin, role, entityType, narrativeRole, motivations, demeanor, mechanicalFocus.` },
    { role: 'user', content: `Create or enrich this character. Preserve supplied facts.\n${JSON.stringify({ ...input, systemPrompt: undefined }, null, 2)}` },
  ], true)
  const raw = asObject(result.value)
  const suggestion = Object.fromEntries(['description', 'affiliation', 'currentCase', 'currentLocation', 'homeOrigin', 'role', 'entityType', 'narrativeRole', 'motivations', 'demeanor', 'mechanicalFocus'].map((key) => [key, asString(raw[key])])) as CharacterTextSuggestion
  return { modelName: result.modelName, modelVersion: result.modelVersion, suggestion }
}

export async function generateCharacterStatsSkillsFromAI(input: {
  name: string; role: string; race: string; description: string; additionalPrompt: string
  systemPrompt?: string; promptContext?: AIPromptContextInput; skills: SkillPromptInput[]
}) {
  const result = await complete([
    { role: 'system', content: `${contextMessage(input.systemPrompt)}\n\nUse faithful BRP ranges. Return only JSON: {"stats":{all requested characteristic and derived-stat fields},"skills":[{"skillId":number,"value":number}]}. Only use skill IDs from the catalog.` },
    { role: 'user', content: `Suggest a BRP character sheet for:\n${JSON.stringify({ ...input, systemPrompt: undefined }, null, 2)}` },
  ], true)
  const raw = asObject(result.value)
  const validIds = new Set(input.skills.map(({ id }) => id))
  const skills = (Array.isArray(raw.skills) ? raw.skills : []).map(asObject).map((item) => ({ skillId: asInt(item.skillId, -1), value: clamp(asInt(item.value), 0, 100) })).filter(({ skillId }) => validIds.has(skillId))
  return { modelName: result.modelName, modelVersion: result.modelVersion, suggestion: { stats: validateStats(raw.stats), skills } }
}

export async function generateCharacterBulkTextFromAI(rows: Array<{ rowIndex: number; name: string; firstName: string; lastName: string; role: string; status: string }>, systemPrompt?: string, promptContext?: AIPromptContextInput, additionalPrompt?: string) {
  const result = await complete([
    { role: 'system', content: `${contextMessage(systemPrompt)}\n\nReturn only JSON with a "suggestions" array. Each entry must have rowIndex, role, status, and description. Return exactly one entry per input row.` },
    { role: 'user', content: JSON.stringify({ rows, promptContext, additionalPrompt }, null, 2) },
  ], true)
  const list = asObject(result.value).suggestions
  const suggestions = (Array.isArray(list) ? list : []).map(asObject).map((item) => ({ rowIndex: asInt(item.rowIndex, -1), role: asString(item.role), status: asString(item.status), description: asString(item.description) })).filter(({ rowIndex }) => rowIndex >= 0)
  return { modelName: result.modelName, modelVersion: result.modelVersion, suggestions }
}

export type ChatMessageInput = { role: 'user' | 'assistant'; content: string }
export type ChatLoreDocument = { title: string; type: string; summary: string; content: string }
export type ChatContext = { primaryPrompt?: string; loreDocuments?: ChatLoreDocument[]; character?: Record<string, unknown> }

export async function chatWithAI(input: { messages: ChatMessageInput[]; context?: ChatContext }) {
  const context = input.context
  const lore = context?.loreDocuments?.map((document) => `# ${document.title} (${document.type})\n${document.summary}\n${document.content}`).join('\n\n')
  const result = await complete([
    { role: 'system', content: contextMessage([context?.primaryPrompt, lore, context?.character ? `Character context:\n${JSON.stringify(context.character)}` : ''].filter(Boolean).join('\n\n')) },
    ...input.messages,
  ])
  return { modelName: result.modelName, modelVersion: result.modelVersion, response: asString(result.value) }
}

export type CharacterTextSuggestionInput = Parameters<typeof generateCharacterTextFromAI>[0] & { characterId?: number | null; description?: string }
export type CharacterTextSuggestionResult = { ok: boolean; generationId?: string; suggestion?: CharacterTextSuggestion; error?: string }
export type CharacterStatsSkillsSuggestionInput = { characterId?: number | null; name?: string; role?: string; race?: string; description?: string; additionalPrompt?: string; promptContext?: Partial<AIPromptContext> }
export type CharacterStatsSkillsSuggestionResult = { ok: boolean; generationId?: string; suggestion?: { stats: CharacterStatsSuggestion; skills: CharacterSkillSuggestion[] }; error?: string }
export type CharacterBulkSuggestionInput = { additionalPrompt?: string; promptContext?: Partial<AIPromptContext>; rows: Array<{ rowIndex: number; name?: string; firstName?: string; lastName?: string; role?: string; status?: string }> }
export type CharacterBulkSuggestionResult = { ok: boolean; generationId?: string; suggestions?: CharacterBulkTextSuggestion[]; error?: string }
export type AIFeedbackInput = { generationId: string; status: 'ACCEPTED' | 'EDITED' | 'REJECTED'; finalValues?: Record<string, unknown>; note?: string }
