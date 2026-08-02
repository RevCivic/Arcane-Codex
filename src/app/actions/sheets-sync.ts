'use server'

import { ImportQueueStatus } from '@/generated/prisma'
import { prisma } from '@/lib/prisma'
import { getGoogleSheetsClient, parseCSV, colToLetter, mapHeaders, type SheetCellData } from '@/lib/googleSheets'
import { revalidatePath } from 'next/cache'
import { requireAuthorizedUser, toNullableBigInt, normalizeImageUrl, normalizeHttpUrl } from './_shared'
import { convertGoogleDriveImageUrl } from '@/lib/imageUrl'

const DEFAULT_SHEET_ID = '1OZ2WHyECHeO3yB-7nYhVbl7jq-VagGR0zh9Td75GJi0'
const DEFAULT_SHEET_NAME = 'Sheet1'
const SHEET_HYPERLINK_FIELDS =
  'sheets(data(rowData(values(formattedValue,hyperlink,textFormatRuns(format(link)),userEnteredValue,userEnteredFormat(textFormat(link)),effectiveFormat(textFormat(link))))))'

function extractCellHyperlink(cell: SheetCellData | undefined): string | null {
  const direct =
    normalizeHttpUrl(cell?.hyperlink) ??
    normalizeHttpUrl(cell?.userEnteredFormat?.textFormat?.link?.uri) ??
    normalizeHttpUrl(cell?.effectiveFormat?.textFormat?.link?.uri)
  if (direct) return direct

  for (const run of cell?.textFormatRuns ?? []) {
    const runUrl = normalizeHttpUrl(run?.format?.link?.uri)
    if (runUrl) return runUrl
  }

  const formula = cell?.userEnteredValue?.formulaValue
  if (formula) {
    // Sheets formulas escape quotes by doubling them, e.g. "".
    const match = formula.match(/HYPERLINK\(\s*"((?:[^"]|"")+)"/i)
    const formulaUrl = normalizeHttpUrl(match?.[1]?.replace(/""/g, '"'))
    if (formulaUrl) return formulaUrl
  }

  return normalizeHttpUrl(cell?.formattedValue)
}

/** Fetches the public Google Sheet as CSV and upserts characters by name.
 *  - New characters are created immediately.
 *  - Existing characters with changed fields are placed in an approval queue
 *    instead of being overwritten directly.
 */
export async function syncCharactersFromSheet(): Promise<{
  created: number
  updated: number
  queued: number
  error?: string
}> {
  await requireAuthorizedUser()

  const sheetId = process.env.GOOGLE_SHEET_ID ?? DEFAULT_SHEET_ID
  let rows: string[][] = []
  const rowImageLinks = new Map<number, string>()

  try {
    const sheets = getGoogleSheetsClient()
    const valuesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: DEFAULT_SHEET_NAME,
    })
    rows = (valuesResponse.data.values ?? []) as string[][]

    const headerRow = rows[0] ?? []
    const col = mapHeaders(headerRow)
    // We read hyperlink metadata from the name cells because the source sheet
    // stores primary image links as rich links on First Name / Name.
    const imageColumnIndices = [...new Set([col.firstName, col.name].filter((value): value is number => value !== undefined))]

    for (const colIdx of imageColumnIndices) {
      const colLetter = colToLetter(colIdx)
      const range = `${DEFAULT_SHEET_NAME}!${colLetter}1:${colLetter}${Math.max(rows.length, 1)}`
      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        ranges: [range],
        includeGridData: true,
        fields: SHEET_HYPERLINK_FIELDS,
      })

      const rowData = response.data.sheets?.[0]?.data?.[0]?.rowData ?? []
      const maxRows = Math.min(rows.length, rowData.length)
      for (let rowIndex = 1; rowIndex < maxRows; rowIndex++) {
        const cell = rowData[rowIndex]?.values?.[0] as SheetCellData | undefined
        const imageUrl = extractCellHyperlink(cell)
        // Keep the first discovered link so "First Name" can take precedence
        // when both name columns contain links.
        if (imageUrl && !rowImageLinks.has(rowIndex)) {
          rowImageLinks.set(rowIndex, imageUrl)
        }
      }
    }
  } catch {
    // Fall back to public CSV import when service-account access is unavailable.
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=0`
    let text: string
    try {
      const res = await fetch(csvUrl, { cache: 'no-store' })
      if (!res.ok) {
        return { created: 0, updated: 0, queued: 0, error: `Failed to fetch sheet (HTTP ${res.status})` }
      }
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('text/html')) {
        return {
          created: 0,
          updated: 0,
          queued: 0,
          error:
            'Google returned an HTML page instead of CSV data. ' +
            'Make sure the sheet is shared as "Anyone with the link can view".',
        }
      }
      text = await res.text()
    } catch {
      return { created: 0, updated: 0, queued: 0, error: 'Network error — could not reach Google Sheets' }
    }
    rows = parseCSV(text)
  }

  if (rows.length < 2) {
    return { created: 0, updated: 0, queued: 0, error: 'Sheet appears empty or has no data rows' }
  }

  const col = mapHeaders(rows[0])
  // Accept either a dedicated "name" column or a "first name" + "last name" pair
  if (col.name === undefined && col.firstName === undefined) {
    return {
      created: 0,
      updated: 0,
      queued: 0,
      error: 'Could not find a "Name" or "First Name" column in the sheet headers',
    }
  }

  let created = 0
  let updated = 0
  let queued = 0

  // Fetch all existing characters once to avoid N+1 queries inside the loop.
  const existing = await prisma.character.findMany({
    select: {
      id: true, name: true, firstName: true, lastName: true, race: true,
      gender: true, age: true, role: true, description: true, stats: true,
      affiliation: true, currentCase: true, currentLocation: true, homeOrigin: true, imageUrl: true, status: true,
    },
  })
  const existingByName = new Map(existing.map((c) => [c.name, c]))

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
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
    const explicitImageUrl = normalizeImageUrl(get(col.imageUrl))
    const linkedImageUrl = rowImageLinks.get(rowIndex) ? convertGoogleDriveImageUrl(rowImageLinks.get(rowIndex)!) : null

    const incomingData = {
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      race: get(col.race) ?? null,
      gender: get(col.gender) ?? null,
      age: age !== null ? String(age) : null,
      role: get(col.role) ?? null,
      description: get(col.description) ?? null,
      stats: get(col.stats) ?? null,
      affiliation: get(col.affiliation) ?? null,
      currentCase: get(col.currentCase) ?? null,
      currentLocation: get(col.currentLocation) ?? null,
      homeOrigin: get(col.homeOrigin) ?? null,
      // Explicit image URL column wins when present; otherwise fall back to
      // hyperlink metadata attached to the name/first-name cell.
      imageUrl: explicitImageUrl ?? linkedImageUrl,
      status: (col.status !== undefined ? row[col.status]?.trim() : null) || 'Active',
    }

    const existingChar = existingByName.get(name)
    if (existingChar !== undefined) {
      // Check whether any field actually differs before queuing.
      const existingData = {
        firstName: existingChar.firstName ?? null,
        lastName: existingChar.lastName ?? null,
        race: existingChar.race ?? null,
        gender: existingChar.gender ?? null,
        age: existingChar.age !== null ? String(existingChar.age) : null,
        role: existingChar.role ?? null,
        description: existingChar.description ?? null,
        stats: existingChar.stats ?? null,
        affiliation: existingChar.affiliation ?? null,
        currentCase: existingChar.currentCase ?? null,
        currentLocation: existingChar.currentLocation ?? null,
        homeOrigin: existingChar.homeOrigin ?? null,
        imageUrl: existingChar.imageUrl ?? null,
        status: existingChar.status ?? 'Active',
      }

      const hasChanges = (Object.keys(incomingData) as (keyof typeof incomingData)[]).some(
        (k) => incomingData[k] !== existingData[k]
      )

      if (!hasChanges) {
        // Data is identical — nothing to do.
        updated++ // count as "handled" for consistency
        continue
      }

      // Replace any existing PENDING entry for this character while preserving
      // reviewed history rows.
      await prisma.$transaction(async (tx) => {
        const existingPending = await tx.importQueueItem.findFirst({
          where: {
            characterId: existingChar.id,
            status: ImportQueueStatus.PENDING,
          },
          select: { id: true },
        })

        if (existingPending) {
          await tx.importQueueItem.update({
            where: { id: existingPending.id },
            data: {
              incomingData,
              existingData,
              updatedAt: new Date(),
            },
          })
          return
        }

        await tx.importQueueItem.create({
          data: {
            characterId: existingChar.id,
            characterName: name,
            incomingData,
            existingData,
            status: ImportQueueStatus.PENDING,
          },
        })
      })
      queued++
    } else {
      const dbData = {
        firstName: incomingData.firstName,
        lastName: incomingData.lastName,
        race: incomingData.race,
        gender: incomingData.gender,
        age: age,
        role: incomingData.role,
        description: incomingData.description,
        stats: incomingData.stats,
        affiliation: incomingData.affiliation,
        currentCase: incomingData.currentCase,
        currentLocation: incomingData.currentLocation,
        homeOrigin: incomingData.homeOrigin,
        imageUrl: incomingData.imageUrl,
        status: incomingData.status,
      }
      const created_ = await prisma.character.create({ data: { name, ...dbData } })
      existingByName.set(name, { id: created_.id, name: created_.name, ...dbData, age: created_.age })
      created++
    }
  }

  revalidatePath('/characters')
  revalidatePath('/admin/import-queue')
  return { created, updated, queued }
}

/** Reads all characters from the database and writes their values back to the
 *  Google Sheet, touching only columns that already exist in the sheet header
 *  row.  No new columns or rows are created.
 *
 *  Requires GOOGLE_SERVICE_ACCOUNT_JSON (or the individual email/key vars) and
 *  the service account must have Editor access on the sheet.
 */
export async function syncCharactersToSheet(): Promise<{
  updated: number
  skipped: number
  error?: string
}> {
  await requireAuthorizedUser()

  const sheetId = process.env.GOOGLE_SHEET_ID ?? DEFAULT_SHEET_ID

  let sheets: ReturnType<typeof getGoogleSheetsClient>
  try {
    sheets = getGoogleSheetsClient()
  } catch (err) {
    return {
      updated: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : 'Failed to initialise Google Sheets client',
    }
  }

  // Read the entire first sheet to get headers + name column in one round-trip.
  let sheetValues: string[][]
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: DEFAULT_SHEET_NAME,
    })
    sheetValues = (response.data.values ?? []) as string[][]
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { updated: 0, skipped: 0, error: `Failed to read sheet: ${msg}` }
  }

  if (sheetValues.length < 2) {
    return { updated: 0, skipped: 0, error: 'Sheet appears empty or has no data rows' }
  }

  const headerRow = sheetValues[0]
  const col = mapHeaders(headerRow)

  if (col.name === undefined && col.firstName === undefined) {
    return {
      updated: 0,
      skipped: 0,
      error: 'Could not find a "Name" or "First Name" column in the sheet headers',
    }
  }

  // Build a map of character name → 1-based row index (row 1 = header).
  const nameToRow = new Map<string, number>()
  for (let i = 1; i < sheetValues.length; i++) {
    const row = sheetValues[i]
    if (!row || row.every((c) => !c?.trim())) continue

    let name: string | null = null
    if (col.name !== undefined) {
      name = row[col.name]?.trim() || null
    } else {
      const first = col.firstName !== undefined ? row[col.firstName]?.trim() : ''
      const last = col.lastName !== undefined ? row[col.lastName]?.trim() : ''
      name = [first, last].filter(Boolean).join(' ') || null
    }
    if (name) nameToRow.set(name, i + 1) // +1 because Sheets rows are 1-based
  }

  // Fetch all characters from the database.
  const characters = await prisma.character.findMany({
    select: {
      name: true,
      firstName: true,
      lastName: true,
      race: true,
      gender: true,
      age: true,
      role: true,
      description: true,
      stats: true,
      affiliation: true,
      currentCase: true,
      currentLocation: true,
      homeOrigin: true,
      imageUrl: true,
      status: true,
    },
  })

  // Map from Character field name → column index in the sheet.
  const fieldToCol: Partial<Record<string, number>> = {
    firstName: col.firstName,
    lastName: col.lastName,
    race: col.race,
    gender: col.gender,
    age: col.age,
    role: col.role,
    description: col.description,
    stats: col.stats,
    affiliation: col.affiliation,
    currentCase: col.currentCase,
    currentLocation: col.currentLocation,
    homeOrigin: col.homeOrigin,
    imageUrl: col.imageUrl,
    status: col.status,
  }

  // Build batched value updates.
  const data: { range: string; values: string[][] }[] = []
  let updated = 0
  let skipped = 0

  for (const char of characters) {
    const rowNum = nameToRow.get(char.name)
    if (rowNum === undefined) {
      skipped++
      continue
    }

    for (const [field, colIdx] of Object.entries(fieldToCol)) {
      if (colIdx === undefined) continue
      const letter = colToLetter(colIdx)
      const cellRange = `${DEFAULT_SHEET_NAME}!${letter}${rowNum}`

      let value: string
      if (field === 'age') {
        const raw = char[field as keyof typeof char]
        value = raw !== null && raw !== undefined ? String(raw) : ''
      } else {
        value = (char[field as keyof typeof char] as string | null) ?? ''
      }

      data.push({ range: cellRange, values: [[value]] })
    }

    updated++
  }

  if (data.length === 0) {
    return { updated: 0, skipped }
  }

  try {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { updated: 0, skipped, error: `Failed to write to sheet: ${msg}` }
  }

  return { updated, skipped }
}
