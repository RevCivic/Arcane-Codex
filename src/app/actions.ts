'use server'

import { auth } from '@/auth'
import { AIFeedbackStatus, AIGenerationType, AITrainingJobStatus, AccessRole, Prisma } from '@/generated/prisma'
import { getD100ResultType, getLuckGainForRoll } from '@/lib/diceRules'
import { parseReferenceLinksText } from '@/lib/referenceLinks'
import { normalizeEmail } from '@/lib/normalizeEmail'
import {
  generateCharacterBulkTextFromAI,
  generateCharacterStatsSkillsFromAI,
  generateCharacterTextFromAI,
  sendAIFeedbackToService,
  triggerAIRetrain,
} from '@/lib/aiClient'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// ─── Google Sheet Sync ────────────────────────────────────────────────────────

async function requireAuthorizedUser() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) throw new Error('Unauthorized')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed) throw new Error('Unauthorized')
  return { email, role: allowed.role }
}

async function requireAdminUser() {
  const user = await requireAuthorizedUser()
  if (user.role !== AccessRole.ADMIN) throw new Error('Forbidden')
  return user
}

function getFormStrings(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value).trim())
}

function getNullableString(value: string) {
  return value || null
}

function parseTagsFromForm(formData: FormData): string[] {
  const raw = (formData.get('tags') as string | null)?.trim()
  if (!raw) return []

  const deduped = new Map<string, string>()
  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const normalized = trimmed.toLowerCase()
    if (!deduped.has(normalized)) deduped.set(normalized, normalized)
  }

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        for (const value of parsed) {
          if (typeof value === 'string') addTag(value)
        }
        return [...deduped.values()]
      }
    } catch {
      // Fallback to delimiter parsing below.
    }
  }

  for (const value of raw.split(/[,\n;]/)) addTag(value)
  return [...deduped.values()]
}

function toNullableInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = parseInt(trimmed, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function toNullableBigInt(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (!/^-?\d+$/.test(trimmed)) return null
    try {
      return BigInt(trimmed)
    } catch {
      return null
    }
  }
  return null
}

const FOUNDRY_SKILL_CATEGORY_MAP: Record<string, string> = {
  zcmbtmod: 'Combat',
  cmbtmod: 'Combat',
  cmmnmod: 'Social',
  mntlmod: 'Academic',
  mnplmod: 'Technical',
  percmod: 'Investigation',
  physmod: 'Physical',
  spnlmod: 'Other',
  soclmod: 'Social',
  combat: 'Combat',
  social: 'Social',
  mental: 'Academic',
  technical: 'Technical',
  physical: 'Physical',
  investigation: 'Investigation',
  academic: 'Academic',
  other: 'Other',
}

function normalizeFoundrySkillCategory(rawCategory: unknown): string {
  if (typeof rawCategory !== 'string' || !rawCategory.trim()) return 'Other'
  const key = rawCategory.trim().toLowerCase().split('.').at(-1) ?? rawCategory.trim().toLowerCase()
  const mapped = FOUNDRY_SKILL_CATEGORY_MAP[key]
  if (mapped) return mapped
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function getFoundryLuck(system: Record<string, unknown>): number | null {
  const maybeLuck = toNullableInt(system.luck)
  if (maybeLuck !== null) return maybeLuck

  const parseLuckText = (value: unknown): number | null => {
    if (typeof value !== 'string') return null
    const first = value.match(/luck\s*[:\-]?\s*(-?\d+)/i)
    if (first) return toNullableInt(first[1])
    const second = value.match(/(-?\d+)\s*luck/i)
    if (second) return toNullableInt(second[1])
    return null
  }

  // Some Foundry exports contain this legacy misspelling.
  const legacyTypoWealthValue = system['welath']
  return parseLuckText(system.wealth) ?? parseLuckText(legacyTypoWealthValue) ?? parseLuckText(system.religion)
}

function getFoundrySkillValue(system: Record<string, unknown>): number | null {
  const direct = toNullableInt(system.value)
  if (direct !== null) return direct

  const fields = ['base', 'xp', 'culture', 'profession', 'personality', 'personal', 'effects']
  let hasAny = false
  let total = 0

  for (const field of fields) {
    const n = toNullableInt(system[field])
    if (n !== null) {
      hasAny = true
      total += n
    }
  }

  return hasAny ? total : null
}

const IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
}
const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024

function getReferenceLinksFromForm(formData: FormData) {
  const raw = (formData.get('referenceLinks') as string | null)?.trim() || ''
  const parsed = parseReferenceLinksText(raw)
  return parsed.length > 0 ? parsed : Prisma.JsonNull
}

async function resolveImageUrlFromForm(formData: FormData, existingImageUrl?: string | null) {
  const directImageUrl = (formData.get('imageUrl') as string | null)?.trim() || ''
  const maybeFile = formData.get('imageFile')

  if (maybeFile instanceof File && maybeFile.size > 0) {
    if (maybeFile.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error('Image upload must be 5 MB or less')
    }
    const extension = IMAGE_MIME_TO_EXTENSION[maybeFile.type]
    if (!extension) {
      throw new Error('Unsupported image format')
    }

    const fileName = `${randomUUID()}${extension}`
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    const destinationPath = path.join(uploadsDir, fileName)
    const bytes = Buffer.from(await maybeFile.arrayBuffer())

    await mkdir(uploadsDir, { recursive: true })
    await writeFile(destinationPath, bytes)
    return `/uploads/${fileName}`
  }

  if (directImageUrl) {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(directImageUrl)
    } catch {
      throw new Error('Image URL must be a valid URL')
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Image URL must use http or https')
    }
    return parsedUrl.toString()
  }
  return existingImageUrl ?? null
}

/** Splits a raw CSV string into a 2-D array of cell values. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++ // skip escaped quote
        } else {
          inQuotes = false
        }
      } else {
        cell += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(cell)
        cell = ''
      } else if (ch === '\n') {
        row.push(cell)
        rows.push(row)
        row = []
        cell = ''
      } else if (ch !== '\r') {
        cell += ch
      }
    }
  }
  // flush the last cell / row
  if (cell || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

type ColMap = Partial<Record<
  'name' | 'firstName' | 'lastName' | 'race' | 'gender' | 'age' |
  'role' | 'description' | 'stats' | 'affiliation' |
  'currentCase' | 'currentLocation' | 'homeOrigin' | 'status',
  number
>>

/** Maps the header row to the Character field indices we care about. */
function mapHeaders(headers: string[]): ColMap {
  const map: ColMap = {}
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].trim().toLowerCase()
    if (['name', 'character name', 'character'].includes(h)) {
      map.name = i
    } else if (['first name', 'firstname', 'first'].includes(h)) {
      map.firstName = i
    } else if (['last name', 'lastname', 'last', 'surname'].includes(h)) {
      map.lastName = i
    } else if (['race', 'species', 'type'].includes(h)) {
      map.race = i
    } else if (['gender', 'sex'].includes(h)) {
      map.gender = i
    } else if (['age'].includes(h)) {
      map.age = i
    } else if (['role', 'class', 'job', 'title'].includes(h)) {
      map.role = i
    } else if (['description', 'desc', 'background', 'notes', 'bio'].includes(h)) {
      map.description = i
    } else if (['stats', 'stats (brp)', 'brp stats', 'brp', 'attributes', 'stat'].includes(h)) {
      map.stats = i
    } else if (['affiliation', 'faction', 'group', 'organization', 'org'].includes(h)) {
      map.affiliation = i
    } else if (['case', 'case name', 'incident', 'investigation'].includes(h)) {
      map.currentCase = i
    } else if (['current location', 'location', 'current loc'].includes(h)) {
      map.currentLocation = i
    } else if (['home/origin', 'home', 'origin', 'hometown', 'home origin'].includes(h)) {
      map.homeOrigin = i
    } else if (['status', 'state', 'condition'].includes(h)) {
      map.status = i
    }
  }
  return map
}

/** Fetches the public Google Sheet as CSV and upserts characters by name. */
export async function syncCharactersFromSheet(): Promise<{
  created: number
  updated: number
  error?: string
}> {
  await requireAuthorizedUser()

  const sheetId =
    process.env.GOOGLE_SHEET_ID ?? '1OZ2WHyECHeO3yB-7nYhVbl7jq-VagGR0zh9Td75GJi0'
  // Use the gviz/tq endpoint which reliably returns CSV without triggering
  // Google's HTML confirm-download warning page (which the /export endpoint
  // can return with a 200 status, silently breaking CSV parsing).
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=0`

  let text: string
  try {
    const res = await fetch(csvUrl, { cache: 'no-store' })
    if (!res.ok) {
      return { created: 0, updated: 0, error: `Failed to fetch sheet (HTTP ${res.status})` }
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('text/html')) {
      return {
        created: 0,
        updated: 0,
        error:
          'Google returned an HTML page instead of CSV data. ' +
          'Make sure the sheet is shared as "Anyone with the link can view".',
      }
    }
    text = await res.text()
  } catch {
    return { created: 0, updated: 0, error: 'Network error — could not reach Google Sheets' }
  }

  const rows = parseCSV(text)
  if (rows.length < 2) {
    return { created: 0, updated: 0, error: 'Sheet appears empty or has no data rows' }
  }

  const col = mapHeaders(rows[0])
  // Accept either a dedicated "name" column or a "first name" + "last name" pair
  if (col.name === undefined && col.firstName === undefined) {
    return {
      created: 0,
      updated: 0,
      error: 'Could not find a "Name" or "First Name" column in the sheet headers',
    }
  }

  let created = 0
  let updated = 0

  // Fetch all existing characters once to avoid N+1 queries inside the loop.
  const existing = await prisma.character.findMany({ select: { id: true, name: true } })
  const existingByName = new Map(existing.map((c) => [c.name, c.id]))

  for (const row of rows.slice(1)) {
    if (row.every((c) => !c.trim())) continue // skip blank rows

    const get = (idx: number | undefined) => (idx !== undefined ? row[idx]?.trim() || null : undefined)

    // Resolve full name: prefer dedicated "name" column, otherwise join first + last
    const firstName = get(col.firstName)
    const lastName = get(col.lastName)
    let name: string | null = null
    if (col.name !== undefined) {
      name = row[col.name]?.trim() || null
    } else if (firstName || lastName) {
      name = [firstName, lastName].filter(Boolean).join(' ')
    }
    if (!name) continue

    const ageRaw = get(col.age)
    const age = toNullableBigInt(ageRaw)

    const data = {
      firstName,
      lastName,
      race: get(col.race),
      gender: get(col.gender),
      age,
      role: get(col.role),
      description: get(col.description),
      stats: get(col.stats),
      affiliation: get(col.affiliation),
      currentCase: get(col.currentCase),
      currentLocation: get(col.currentLocation),
      homeOrigin: get(col.homeOrigin),
      status: (col.status !== undefined ? row[col.status]?.trim() : null) || 'Active',
    }

    const existingId = existingByName.get(name)
    if (existingId !== undefined) {
      await prisma.character.update({ where: { id: existingId }, data })
      updated++
    } else {
      const created_ = await prisma.character.create({ data: { name, ...data } })
      existingByName.set(name, created_.id)
      created++
    }
  }

  revalidatePath('/characters')
  return { created, updated }
}

// ─── Characters ───────────────────────────────────────────────────────────────

export async function getAllTags() {
  await requireAuthorizedUser()
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    select: { name: true },
  })
  return tags.map((tag) => tag.name)
}

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
  const imageUrl = await resolveImageUrlFromForm(formData)
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
  const imageUrl = await resolveImageUrlFromForm(formData, existingCharacter?.imageUrl)
  const referenceLinks = getReferenceLinksFromForm(formData)
  const tags = parseTagsFromForm(formData)

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
  redirect(`/characters/${id}`)
}

export async function deleteCharacter(id: number) {
  await requireAuthorizedUser()

  await prisma.character.delete({ where: { id } })
  revalidatePath('/characters')
  redirect('/characters')
}

// ─── Places ───────────────────────────────────────────────────────────────────

export async function createPlace(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const region = formData.get('region') as string
  const coordinates = formData.get('coordinates') as string
  const mapsLink = formData.get('mapsLink') as string
  const notes = formData.get('notes') as string
  const imageUrl = await resolveImageUrlFromForm(formData)
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.place.create({ data: { name, type, description, region, coordinates, mapsLink, imageUrl, referenceLinks, notes } })
  revalidatePath('/places')
  redirect('/places')
}

export async function createPlacesBulk(formData: FormData) {
  await requireAuthorizedUser()

  const names = getFormStrings(formData, 'name')
  const types = getFormStrings(formData, 'type')
  const regions = getFormStrings(formData, 'region')
  const descriptions = getFormStrings(formData, 'description')

  const rows = names
    .map((name, i) => {
      if (!name) return null
      return {
        name,
        type: getNullableString(types[i] ?? ''),
        region: getNullableString(regions[i] ?? ''),
        description: getNullableString(descriptions[i] ?? ''),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length > 0) {
    await prisma.place.createMany({ data: rows })
    revalidatePath('/places')
  }

  redirect('/places')
}

export async function updatePlace(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const region = formData.get('region') as string
  const coordinates = formData.get('coordinates') as string
  const mapsLink = formData.get('mapsLink') as string
  const notes = formData.get('notes') as string
  const existingPlace = await prisma.place.findUnique({ where: { id }, select: { imageUrl: true } })
  const imageUrl = await resolveImageUrlFromForm(formData, existingPlace?.imageUrl)
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.place.update({ where: { id }, data: { name, type, description, region, coordinates, mapsLink, imageUrl, referenceLinks, notes } })
  revalidatePath('/places')
  revalidatePath(`/places/${id}`)
  redirect(`/places/${id}`)
}

export async function deletePlace(id: number) {
  await requireAuthorizedUser()

  await prisma.place.delete({ where: { id } })
  revalidatePath('/places')
  redirect('/places')
}

// ─── Inventory Items ──────────────────────────────────────────────────────────

export async function createInventoryItem(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const location = formData.get('location') as string
  const category = formData.get('category') as string
  const carrierIdRaw = formData.get('carrierId') as string
  const carrierId = carrierIdRaw ? parseInt(carrierIdRaw, 10) : null
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.inventoryItem.create({ data: { name, description, effect, location, category, carrierId, referenceLinks } })
  revalidatePath('/inventory')
  redirect('/inventory')
}

export async function createInventoryItemsBulk(formData: FormData) {
  await requireAuthorizedUser()

  const names = getFormStrings(formData, 'name')
  const categories = getFormStrings(formData, 'category')
  const locations = getFormStrings(formData, 'location')
  const effects = getFormStrings(formData, 'effect')
  const carrierIds = getFormStrings(formData, 'carrierId')

  const rows = names
    .map((name, i) => {
      if (!name) return null

      const carrierRaw = carrierIds[i] ?? ''
      const parsedCarrier = carrierRaw ? parseInt(carrierRaw, 10) : NaN
      const carrierId = isNaN(parsedCarrier) ? null : parsedCarrier

      return {
        name,
        category: getNullableString(categories[i] ?? ''),
        location: getNullableString(locations[i] ?? ''),
        effect: getNullableString(effects[i] ?? ''),
        carrierId,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length > 0) {
    await prisma.inventoryItem.createMany({ data: rows })
    revalidatePath('/inventory')
  }

  redirect('/inventory')
}

export async function updateInventoryItem(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const location = formData.get('location') as string
  const category = formData.get('category') as string
  const carrierIdRaw = formData.get('carrierId') as string
  const carrierId = carrierIdRaw ? parseInt(carrierIdRaw, 10) : null
  const referenceLinks = getReferenceLinksFromForm(formData)

  await prisma.inventoryItem.update({
    where: { id },
    data: { name, description, effect, location, category, carrierId, referenceLinks },
  })
  revalidatePath('/inventory')
  revalidatePath(`/inventory/${id}`)
  redirect(`/inventory/${id}`)
}

export async function deleteInventoryItem(id: number) {
  await requireAuthorizedUser()

  await prisma.inventoryItem.delete({ where: { id } })
  revalidatePath('/inventory')
  redirect('/inventory')
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function createEvent(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const significance = formData.get('significance') as string
  const outcome = formData.get('outcome') as string
  const referenceLinks = getReferenceLinksFromForm(formData)
  const peopleIds = (formData.getAll('peopleIds') as string[])
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n))

  await prisma.event.create({
    data: {
      name, description, date, significance, outcome,
      referenceLinks,
      people: peopleIds.length > 0 ? { connect: peopleIds.map((id) => ({ id })) } : undefined,
    },
  })
  revalidatePath('/events')
  redirect('/events')
}

export async function createEventsBulk(formData: FormData) {
  await requireAuthorizedUser()

  const names = getFormStrings(formData, 'name')
  const dates = getFormStrings(formData, 'date')
  const significances = getFormStrings(formData, 'significance')
  const outcomes = getFormStrings(formData, 'outcome')

  const rows = names
    .map((name, i) => {
      if (!name) return null
      return {
        name,
        date: getNullableString(dates[i] ?? ''),
        significance: getNullableString(significances[i] ?? ''),
        outcome: getNullableString(outcomes[i] ?? ''),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length > 0) {
    await prisma.event.createMany({ data: rows })
    revalidatePath('/events')
  }

  redirect('/events')
}

export async function updateEvent(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const significance = formData.get('significance') as string
  const outcome = formData.get('outcome') as string
  const referenceLinks = getReferenceLinksFromForm(formData)
  const peopleIds = (formData.getAll('peopleIds') as string[])
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n))

  await prisma.event.update({
    where: { id },
    data: {
      name, description, date, significance, outcome, referenceLinks,
      people: { set: peopleIds.map((pid) => ({ id: pid })) },
    },
  })
  revalidatePath('/events')
  revalidatePath(`/events/${id}`)
  redirect(`/events/${id}`)
}

export async function deleteEvent(id: number) {
  await requireAuthorizedUser()

  await prisma.event.delete({ where: { id } })
  revalidatePath('/events')
  redirect('/events')
}

// ─── Powers ───────────────────────────────────────────────────────────────────

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
 * @param characterPowerId  The CharacterPower.id that owns this ability entry (used for sourceCharacterPowerId).
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

  // ── Remove old ability when the name changed ──────────────────────────────
  if (cleanPrev && cleanPrev !== cleanAbility) {
    await prisma.characterAbility.deleteMany({
      where: {
        characterId,
        name: cleanPrev,
        ...(previousEffectiveValue != null ? { currentValue: previousEffectiveValue } : {}),
      },
    })
  }

  // ── Nothing to create/update ─────────────────────────────────────────────
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
    // Update only when the value hasn't been independently changed
    if (previousEffectiveValue != null && existing.currentValue === previousEffectiveValue) {
      await prisma.characterAbility.update({
        where: { characterId_name: { characterId, name: cleanAbility } },
        data: { currentValue: effectiveValue },
      })
    }
    // If sourceCharacterPowerId isn't set yet, link it now
    if (characterPowerId && !existing.sourceCharacterPowerId) {
      await prisma.characterAbility.update({
        where: { characterId_name: { characterId, name: cleanAbility } },
        data: { sourceCharacterPowerId: characterPowerId },
      }).catch((err: unknown) => {
        // Ignore unique constraint violations (another power already holds this ability link)
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

  // Validate: no duplicate names in this batch.
  const seen = new Set<string>()
  for (const row of rows) {
    const key = row.name.toLowerCase()
    if (seen.has(key)) throw new Error(`Duplicate power name "${row.name}" in this batch.`)
    seen.add(key)
  }

  // Validate against existing powers.
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

  // Fetch old values so we can re-sync all character ability records.
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

  // Re-sync every character's ability record for this power.
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

  // Clean up CharacterAbility records for all assigned characters.
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

// ─── CharacterPower Assignment ────────────────────────────────────────────────

export async function assignPower(formData: FormData) {
  await requireAdminUser()

  const characterId = parseInt(formData.get('characterId') as string, 10)
  const powerId = parseInt(formData.get('powerId') as string, 10)
  const modifier = toNullableInt(formData.get('modifier') as string | null) ?? 0
  const notes = getNullableString((formData.get('notes') as string | null)?.trim() ?? '')

  // Prevent duplicate assignments.
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

// ─── CharacterAbility Admin CRUD ──────────────────────────────────────────────

/**
 * Admin: manually add a standalone ability to a character (not tied to a power).
 */
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

/**
 * Admin: update a character's ability name and/or value.
 */
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

/**
 * Admin: remove a character ability.
 */
export async function deleteCharacterAbility(id: number) {
  await requireAdminUser()

  const ability = await prisma.characterAbility.findUnique({ where: { id } })
  if (!ability) throw new Error('Ability not found.')

  await prisma.characterAbility.delete({ where: { id } })

  revalidatePath(`/characters/${ability.characterId}`)
  revalidatePath(`/characters/${ability.characterId}/sheet`)
  redirect(`/characters/${ability.characterId}`)
}

// ─── Character Claim / Ownership ─────────────────────────────────────────────

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

// ─── Character Sheet ──────────────────────────────────────────────────────────

/** Owner or admin can update the character sheet (BRP stats, derived stats, skills, notes). */
export async function updateCharacterSheet(characterId: number, formData: FormData) {
  const user = await requireAuthorizedUser()

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }

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
      category: normalizeFoundrySkillCategory(skillSystem.category),
      baseValue: toNullableInt(skillSystem.base) ?? 0,
      description: typeof skillSystem.description === 'string' && skillSystem.description.trim()
        ? skillSystem.description.trim()
        : null,
      sortOrder: toNullableInt(typedItem.sort) ?? 0,
      importedValue: getFoundrySkillValue(skillSystem),
    })
  }

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

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }

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

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }

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

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }

  const sheet = await prisma.characterSheet.findUnique({ where: { characterId } })
  if (!sheet) throw new Error('Character sheet not found')

  const skillDef = await prisma.skill.findUnique({ where: { id: skillId } })
  if (!skillDef) throw new Error('Skill not found')

  const existing = await prisma.characterSkillValue.findUnique({
    where: { sheetId_skillId: { sheetId: sheet.id, skillId } },
  })

  const currentValue = existing?.value ?? skillDef.baseValue

  // Roll 1d4 (range 1–4), subtract 1 to get effective range 0–3, then add modifier; minimum gain is 0
  const die = Math.floor(Math.random() * 4) + 1
  const gain = Math.max(0, die - 1 + modifier)
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

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }

  const sheet = await prisma.characterSheet.findUnique({ where: { characterId } })
  if (!sheet) return

  await prisma.characterSkillValue.updateMany({
    where: { sheetId: sheet.id, markedForImprovement: true },
    data: { markedForImprovement: false },
  })

  revalidatePath(`/characters/${characterId}/sheet`)
}

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

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }

  const ability = await prisma.characterAbility.findUnique({ where: { id: abilityId } })
  if (!ability || ability.characterId !== characterId) throw new Error('Ability not found')

  // Roll 1d4 (range 1–4), subtract 1 to get effective range 0–3, then add modifier; minimum gain is 0
  const die = Math.floor(Math.random() * 4) + 1
  const gain = Math.max(0, die - 1 + modifier)
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

  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }

  await prisma.characterAbility.updateMany({
    where: { characterId, markedForImprovement: true },
    data: { markedForImprovement: false },
  })

  revalidatePath(`/characters/${characterId}/sheet`)
}

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
  }
  error?: string
}

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
    }

    const ai = await generateCharacterTextFromAI(aiPayload)
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

type CharacterStatsSkillsSuggestionInput = {
  characterId?: number | null
  name?: string
  role?: string
  race?: string
  description?: string
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
      skills,
    }

    const ai = await generateCharacterStatsSkillsFromAI(aiPayload)
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

type CharacterBulkSuggestionInput = {
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

    if (rows.length === 0) return { ok: false, error: 'No rows were provided for AI enrichment.' }

    const ai = await generateCharacterBulkTextFromAI(rows)
    const generation = await prisma.aIGeneration.create({
      data: {
        type: AIGenerationType.CHARACTER_BULK_TEXT,
        createdByEmail: user.email,
        modelName: ai.modelName,
        modelVersion: ai.modelVersion,
        inputPayload: { rows },
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

type AIFeedbackInput = {
  generationId: string
  status: 'ACCEPTED' | 'EDITED' | 'REJECTED'
  finalValues?: Record<string, unknown>
  note?: string
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

type AITrainingRequestInput = {
  mode?: 'cpu' | 'gpu'
  baseModel?: string
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

  const job = await prisma.aITrainingJob.create({
    data: {
      requestedByEmail: user.email,
      status: AITrainingJobStatus.PENDING,
      mode,
      baseModel,
      payload: { trainingExamples: trainingExamples.length },
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
          metadata: { trainingExamples: trainingExamples.length, sourceJobId: job.id },
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

export async function createSkill(formData: FormData) {
  await requireAdminUser()

  const name = (formData.get('name') as string).trim()
  const category = (formData.get('category') as string | null)?.trim() || null
  const baseValue = parseInt(formData.get('baseValue') as string, 10)
  const description = (formData.get('description') as string | null)?.trim() || null
  const sortOrder = parseInt((formData.get('sortOrder') as string | null) ?? '0', 10)

  if (!name) throw new Error('Skill name is required')

  await prisma.skill.create({
    data: {
      name,
      category,
      baseValue: isNaN(baseValue) ? 0 : baseValue,
      description,
      sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
    },
  })
  revalidatePath('/admin/skills')
  redirect('/admin/skills')
}

export async function updateSkill(id: number, formData: FormData) {
  await requireAdminUser()

  const name = (formData.get('name') as string).trim()
  const category = (formData.get('category') as string | null)?.trim() || null
  const baseValue = parseInt(formData.get('baseValue') as string, 10)
  const description = (formData.get('description') as string | null)?.trim() || null
  const sortOrder = parseInt((formData.get('sortOrder') as string | null) ?? '0', 10)

  if (!name) throw new Error('Skill name is required')

  await prisma.skill.update({
    where: { id },
    data: {
      name,
      category,
      baseValue: isNaN(baseValue) ? 0 : baseValue,
      description,
      sortOrder: isNaN(sortOrder) ? 0 : sortOrder,
    },
  })
  revalidatePath('/admin/skills')
  redirect('/admin/skills')
}

export async function deleteSkill(id: number) {
  await requireAdminUser()
  await prisma.skill.delete({ where: { id } })
  revalidatePath('/admin/skills')
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
