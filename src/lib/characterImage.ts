import { convertGoogleDriveImageUrl } from '@/lib/imageUrl'

export function getLocalCharacterThumbnailUrl(imageUrl: string): string | null {
  if (!imageUrl.startsWith('/uploads/')) return null

  const queryIndex = imageUrl.indexOf('?')
  const pathOnly = queryIndex === -1 ? imageUrl : imageUrl.slice(0, queryIndex)
  if (pathOnly.endsWith('-thumb.webp')) return pathOnly

  const lastDotIndex = pathOnly.lastIndexOf('.')
  if (lastDotIndex === -1) return null

  return `${pathOnly.slice(0, lastDotIndex)}-thumb.webp`
}

export function getPreferredCharacterImageUrl(imageUrl: string, hasThumbnail = false): string {
  const thumbnailUrl = getLocalCharacterThumbnailUrl(imageUrl)
  if (thumbnailUrl && hasThumbnail) return thumbnailUrl
  if (thumbnailUrl) return imageUrl
  return convertGoogleDriveImageUrl(imageUrl)
}
