import { google } from 'googleapis'

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
