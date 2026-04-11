'use server'

import { auth } from '@/auth'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
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
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

  let text: string
  try {
    const res = await fetch(csvUrl, { cache: 'no-store' })
    if (!res.ok) {
      return { created: 0, updated: 0, error: `Failed to fetch sheet (HTTP ${res.status})` }
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
    const parsedAge = ageRaw !== null && ageRaw !== undefined ? parseInt(ageRaw, 10) : NaN
    const age = isNaN(parsedAge) ? null : parsedAge

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

export async function createCharacter(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const race = formData.get('race') as string
  const gender = formData.get('gender') as string
  const ageRaw = formData.get('age') as string
  const parsedAge = ageRaw ? parseInt(ageRaw, 10) : NaN
  const age = isNaN(parsedAge) ? null : parsedAge
  const role = formData.get('role') as string
  const description = formData.get('description') as string
  const stats = formData.get('stats') as string
  const affiliation = formData.get('affiliation') as string
  const currentCase = formData.get('currentCase') as string
  const currentLocation = formData.get('currentLocation') as string
  const homeOrigin = formData.get('homeOrigin') as string
  const status = formData.get('status') as string

  await prisma.character.create({
    data: { name, firstName, lastName, race, gender, age, role, description, stats, affiliation, currentCase, currentLocation, homeOrigin, status: status || 'Active' },
  })
  revalidatePath('/characters')
  redirect('/characters')
}

export async function updateCharacter(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const race = formData.get('race') as string
  const gender = formData.get('gender') as string
  const ageRaw = formData.get('age') as string
  const parsedAge = ageRaw ? parseInt(ageRaw, 10) : NaN
  const age = isNaN(parsedAge) ? null : parsedAge
  const role = formData.get('role') as string
  const description = formData.get('description') as string
  const stats = formData.get('stats') as string
  const affiliation = formData.get('affiliation') as string
  const currentCase = formData.get('currentCase') as string
  const currentLocation = formData.get('currentLocation') as string
  const homeOrigin = formData.get('homeOrigin') as string
  const status = formData.get('status') as string

  await prisma.character.update({
    where: { id },
    data: { name, firstName, lastName, race, gender, age, role, description, stats, affiliation, currentCase, currentLocation, homeOrigin, status },
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
  const notes = formData.get('notes') as string

  await prisma.place.create({ data: { name, type, description, region, notes } })
  revalidatePath('/places')
  redirect('/places')
}

export async function updatePlace(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const description = formData.get('description') as string
  const region = formData.get('region') as string
  const notes = formData.get('notes') as string

  await prisma.place.update({ where: { id }, data: { name, type, description, region, notes } })
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

  await prisma.inventoryItem.create({ data: { name, description, effect, location, category, carrierId } })
  revalidatePath('/inventory')
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

  await prisma.inventoryItem.update({
    where: { id },
    data: { name, description, effect, location, category, carrierId },
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
  const peopleIds = (formData.getAll('peopleIds') as string[])
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n))

  await prisma.event.create({
    data: {
      name, description, date, significance, outcome,
      people: peopleIds.length > 0 ? { connect: peopleIds.map((id) => ({ id })) } : undefined,
    },
  })
  revalidatePath('/events')
  redirect('/events')
}

export async function updateEvent(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const significance = formData.get('significance') as string
  const outcome = formData.get('outcome') as string
  const peopleIds = (formData.getAll('peopleIds') as string[])
    .map((v) => parseInt(v, 10))
    .filter((n) => !isNaN(n))

  await prisma.event.update({
    where: { id },
    data: {
      name, description, date, significance, outcome,
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

export async function createPower(formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const personId = parseInt(formData.get('personId') as string, 10)

  await prisma.power.create({ data: { name, description, effect, personId } })
  revalidatePath('/powers')
  redirect('/powers')
}

export async function updatePower(id: number, formData: FormData) {
  await requireAuthorizedUser()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const effect = formData.get('effect') as string
  const personId = parseInt(formData.get('personId') as string, 10)

  await prisma.power.update({
    where: { id },
    data: { name, description, effect, personId },
  })
  revalidatePath('/powers')
  revalidatePath(`/powers/${id}`)
  redirect(`/powers/${id}`)
}

export async function deletePower(id: number) {
  await requireAuthorizedUser()

  await prisma.power.delete({ where: { id } })
  revalidatePath('/powers')
  redirect('/powers')
}

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
