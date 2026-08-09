/**
 * Shared utilities used across all server action modules.
 * This file does NOT have 'use server' — it only exports helper functions.
 */

import { auth } from '@/auth'
import { AccessRole, Prisma } from '@/generated/prisma'
import { getLocalCharacterThumbnailUrl } from '@/lib/characterImage'
import { parseReferenceLinksText } from '@/lib/referenceLinks'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { convertGoogleDriveImageUrl } from '@/lib/imageUrl'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

export async function requireAuthorizedUser() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) throw new Error('Unauthorized')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed) throw new Error('Unauthorized')
  return { email, role: allowed.role }
}

export async function requireAdminUser() {
  const user = await requireAuthorizedUser()
  if (user.role !== AccessRole.ADMIN) throw new Error('Forbidden')
  return user
}

/**
 * Verifies that the current user owns the given character or is an admin.
 * Throws if the character doesn't exist or access is denied.
 */
export async function assertCharacterAccess(characterId: number, user: { email: string; role: AccessRole }) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, claimedByEmail: true },
  })
  if (!character) throw new Error(`Character ${characterId} not found`)
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error(`Access denied for character ${characterId}`)
  }
}

/**
 * Verifies the current user owns the given character or is an admin.
 * Uses the simpler "Character not found" / "Forbidden" error messages
 * expected by the sheet and rolls UI.
 */
export async function requireCharacterOwner(
  characterId: number,
  user: { email: string; role: AccessRole },
): Promise<void> {
  const character = await prisma.character.findUnique({ where: { id: characterId } })
  if (!character) throw new Error('Character not found')
  if (character.claimedByEmail !== user.email && user.role !== AccessRole.ADMIN) {
    throw new Error('Forbidden')
  }
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

export function getFormStrings(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value).trim())
}

export function getNullableString(value: string) {
  return value || null
}

export function parseTagsFromForm(formData: FormData): string[] {
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

export function toNullableInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = parseInt(trimmed, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

export function toNullableBigInt(value: unknown): bigint | null {
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

export function getReferenceLinksFromForm(formData: FormData) {
  const raw = (formData.get('referenceLinks') as string | null)?.trim() || ''
  const parsed = parseReferenceLinksText(raw)
  return parsed.length > 0 ? parsed : Prisma.JsonNull
}

// ─── URL / Image Helpers ──────────────────────────────────────────────────────

export function normalizeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

/** Normalises a URL string for image use: validates HTTP(S) and converts
 *  Google Drive share links to direct-access URLs. */
export function normalizeImageUrl(value: string | null | undefined): string | null {
  const base = normalizeHttpUrl(value)
  if (!base) return null
  return convertGoogleDriveImageUrl(base)
}

export const IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  // Non-standard alias occasionally returned by Google Drive and some CDNs.
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
}
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024
export const MAX_IMAGE_DOWNLOAD_BYTES = 10 * 1024 * 1024
export const LOCAL_IMAGE_PREFIX = '/uploads/'
const CHARACTER_IMAGES_DIR = path.join(process.cwd(), 'public', 'uploads', 'characters')

function getPublicFilePath(publicUrl: string): string {
  return path.join(process.cwd(), 'public', publicUrl.replace(/^\/+/, ''))
}

async function createThumbnailFromBuffer(bytes: Buffer, thumbnailPath: string) {
  await sharp(bytes)
    .resize(320, 320, {
      fit: 'contain',
      position: 'center',
      background: '#07070d',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(thumbnailPath)
}

async function storeCharacterImageBuffer(bytes: Buffer, extension: string) {
  const baseName = randomUUID()
  const imageFileName = `${baseName}${extension}`
  const thumbnailFileName = `${baseName}-thumb.webp`
  const imagePath = path.join(CHARACTER_IMAGES_DIR, imageFileName)
  const thumbnailPath = path.join(CHARACTER_IMAGES_DIR, thumbnailFileName)

  await mkdir(CHARACTER_IMAGES_DIR, { recursive: true })
  await writeFile(imagePath, bytes)
  await createThumbnailFromBuffer(bytes, thumbnailPath)

  return {
    imageUrl: `/uploads/characters/${imageFileName}`,
    thumbnailUrl: `/uploads/characters/${thumbnailFileName}`,
  }
}

export function isLocalHostedImageUrl(value: string | null | undefined): boolean {
  if (!value) return false
  return value.startsWith(LOCAL_IMAGE_PREFIX)
}

export function isRemoteHttpImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function getImageExtensionFromPathname(pathname: string): string | null {
  const extension = path.extname(pathname).toLowerCase()
  const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])
  if (!allowed.has(extension)) return null
  return extension === '.jpeg' ? '.jpg' : extension
}

export function getImageExtension(contentType: string | null, sourceUrl: string): string | null {
  const mimeType = contentType?.split(';')[0].trim().toLowerCase() ?? ''
  const mimeExtension = IMAGE_MIME_TO_EXTENSION[mimeType]
  if (mimeExtension) return mimeExtension

  try {
    const parsed = new URL(sourceUrl)
    return getImageExtensionFromPathname(parsed.pathname)
  } catch {
    return null
  }
}

export async function downloadCharacterImageToLocal(url: string): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'follow',
    headers: {
      // A browser-like User-Agent is required; Google Drive blocks server-side
      // requests that omit this header or send a bot-like UA.
      'User-Agent':
        'Mozilla/5.0 (compatible; ArcaneCodex/1.0; +https://github.com/RevCivic/Arcane-Codex)',
      // Hint to the server that we only want image data, not an HTML page.
      Accept: 'image/webp,image/jpeg,image/png,image/*,*/*;q=0.8',
    },
  })
  if (!response.ok) throw new Error(`Failed to download (${response.status})`)

  const contentType = response.headers.get('content-type') ?? ''

  // Guard against Google returning an HTML login/confirmation page (HTTP 200
  // with text/html) instead of the actual image.
  if (contentType.toLowerCase().startsWith('text/')) {
    throw new Error(`Expected an image but received content-type "${contentType}" — the file may not be publicly accessible`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength) {
    const length = Number.parseInt(contentLength, 10)
    if (Number.isFinite(length) && length > MAX_IMAGE_DOWNLOAD_BYTES) {
      throw new Error('File is larger than 10 MB')
    }
  }

  const extension = getImageExtension(contentType, url)
  if (!extension) throw new Error(`Unsupported image type (content-type: "${contentType}")`)

  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.byteLength > MAX_IMAGE_DOWNLOAD_BYTES) {
    throw new Error('File is larger than 10 MB')
  }

  return storeCharacterImageBuffer(bytes, extension)
}

export async function ensureCharacterThumbnailForImageUrl(imageUrl: string): Promise<{ thumbnailUrl: string | null; existed: boolean }> {
  const thumbnailUrl = getLocalCharacterThumbnailUrl(imageUrl)
  if (!thumbnailUrl) return { thumbnailUrl: null, existed: false }

  const sourcePath = getPublicFilePath(imageUrl)
  const thumbnailPath = getPublicFilePath(thumbnailUrl)

  await access(sourcePath)

  let existed = true
  try {
    await access(thumbnailPath)
  } catch {
    existed = false
  }

  await mkdir(path.dirname(thumbnailPath), { recursive: true })
  await sharp(sourcePath)
    .resize(320, 320, {
      fit: 'contain',
      position: 'center',
      background: '#07070d',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toFile(thumbnailPath)

  return { thumbnailUrl, existed }
}

export async function resolveImageUrlFromForm(formData: FormData, existingImageUrl?: string | null) {
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
    if (directImageUrl.startsWith(LOCAL_IMAGE_PREFIX)) {
      return validateLocalImageReference(directImageUrl)
    }
    let parsedUrl: URL
    try {
      parsedUrl = new URL(directImageUrl)
    } catch {
      throw new Error('Image URL must be a valid URL')
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Image URL must use http or https')
    }
    return convertGoogleDriveImageUrl(parsedUrl.toString())
  }
  return existingImageUrl ?? null
}

export async function resolveCharacterImageUrlFromForm(formData: FormData, existingImageUrl?: string | null) {
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

    const bytes = Buffer.from(await maybeFile.arrayBuffer())
    const { imageUrl } = await storeCharacterImageBuffer(bytes, extension)
    return imageUrl
  }

  if (directImageUrl) {
    if (directImageUrl.startsWith(LOCAL_IMAGE_PREFIX)) {
      return validateLocalImageReference(directImageUrl)
    }
    let parsedUrl: URL
    try {
      parsedUrl = new URL(directImageUrl)
    } catch {
      throw new Error('Image URL must be a valid URL')
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Image URL must use http or https')
    }
    return convertGoogleDriveImageUrl(parsedUrl.toString())
  }

  return existingImageUrl ?? null
}

function validateLocalImageReference(imageReference: string): string {
  const pathOnly = imageReference.split(/[?#]/, 1)[0]
  let decodedPath: string

  try {
    decodedPath = decodeURIComponent(pathOnly)
  } catch {
    throw new Error('Local image path contains invalid encoding')
  }

  if (
    decodedPath.includes('\\') ||
    decodedPath.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('Local image path must stay within /uploads/')
  }

  return imageReference
}

// ─── Improvement Roll Helper ──────────────────────────────────────────────────

/**
 * Rolls 1d4-1 + modifier for post-mission improvement.
 * Range: 0–3 + modifier, minimum 0.
 */
export function rollImprovementDie(modifier: number): { die: number; gain: number } {
  const die = Math.floor(Math.random() * 4) + 1
  const gain = Math.max(0, die - 1 + modifier)
  return { die, gain }
}

// ─── Foundry Import Helpers ───────────────────────────────────────────────────

export const FOUNDRY_SKILL_CATEGORY_MAP: Record<string, string> = {
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

export function normalizeFoundrySkillCategory(rawCategory: unknown): string {
  if (typeof rawCategory !== 'string' || !rawCategory.trim()) return 'Other'
  const key = rawCategory.trim().toLowerCase().split('.').at(-1) ?? rawCategory.trim().toLowerCase()
  const mapped = FOUNDRY_SKILL_CATEGORY_MAP[key]
  if (mapped) return mapped
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function getFoundryLuck(system: Record<string, unknown>): number | null {
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

export function getFoundrySkillValue(system: Record<string, unknown>): number | null {
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
