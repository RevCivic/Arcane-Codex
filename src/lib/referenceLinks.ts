export type ReferenceLink = {
  url: string
  note: string
}

export function parseReferenceLinksText(text: string | null | undefined): ReferenceLink[] {
  if (!text) return []

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawUrl, ...rawNoteParts] = line.split('|')
      const url = rawUrl?.trim() ?? ''
      const note = rawNoteParts.join('|').trim() || 'Reference'
      return { url, note }
    })
    .filter((entry) => entry.url.length > 0)
}

export function normalizeReferenceLinks(value: unknown): ReferenceLink[] {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const maybeUrl = 'url' in entry ? String(entry.url ?? '').trim() : ''
      const maybeNote = 'note' in entry ? String(entry.note ?? '').trim() : ''
      if (!maybeUrl) return null
      return { url: maybeUrl, note: maybeNote || 'Reference' }
    })
    .filter((entry): entry is ReferenceLink => entry !== null)
}

export function referenceLinksToText(value: unknown): string {
  return normalizeReferenceLinks(value)
    .map((entry) => `${entry.url} | ${entry.note}`)
    .join('\n')
}
