import { google } from 'googleapis'

// ─── CSV / Spreadsheet Parsing Utilities ─────────────────────────────────────

/** Splits a raw CSV string into a 2-D array of cell values. */
export function parseCSV(text: string): string[][] {
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

// Converts a 0-based column index to Excel-style A1 notation letters.
// Examples: 0 → "A", 25 → "Z", 26 → "AA", 27 → "AB".
export function colToLetter(index: number): string {
  let result = ''
  let n = index + 1
  while (n > 0) {
    const remainder = (n - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
}

export type SheetCellData = {
  formattedValue?: string | null
  hyperlink?: string | null
  textFormatRuns?: Array<{ format?: { link?: { uri?: string | null } | null } | null }> | null
  userEnteredValue?: { formulaValue?: string | null } | null
  userEnteredFormat?: { textFormat?: { link?: { uri?: string | null } | null } | null } | null
  effectiveFormat?: { textFormat?: { link?: { uri?: string | null } | null } | null } | null
}

export type ColMap = Partial<Record<
  'name' | 'firstName' | 'lastName' | 'race' | 'gender' | 'age' |
  'role' | 'description' | 'stats' | 'affiliation' |
  'currentCase' | 'currentLocation' | 'homeOrigin' | 'imageUrl' | 'status',
  number
>>

/** Maps the header row to the Character field indices we care about. */
export function mapHeaders(headers: string[]): ColMap {
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
    } else if (['image', 'image url', 'image link', 'picture', 'photo', 'portrait', 'avatar'].includes(h)) {
      map.imageUrl = i
    } else if (['status', 'state', 'condition'].includes(h)) {
      map.status = i
    }
  }
  return map
}

// ─── Google Sheets API Client ─────────────────────────────────────────────────

/**
 * Returns an authenticated Google Sheets API client using the service account
 * credentials supplied via environment variables.
 *
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  – the service account's email address
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY – the PEM private key (newlines as \n)
 *
 * Alternatively, set GOOGLE_SERVICE_ACCOUNT_JSON to the full JSON credential
 * blob (the file you download from Google Cloud Console), and both of the
 * above will be read from it automatically.
 */
export function getGoogleSheetsClient() {
  let email: string
  let privateKey: string

  const jsonBlob = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (jsonBlob) {
    const parsed = JSON.parse(jsonBlob) as { client_email: string; private_key: string }
    email = parsed.client_email
    privateKey = parsed.private_key
  } else {
    email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ''
    privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')
  }

  if (!email || !privateKey) {
    throw new Error(
      'Google service account credentials are not configured. ' +
        'Set GOOGLE_SERVICE_ACCOUNT_JSON or both GOOGLE_SERVICE_ACCOUNT_EMAIL ' +
        'and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in your environment.',
    )
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}
