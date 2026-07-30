/**
 * Converts Google Drive share/open links to a direct-access image URL so that
 * <img> tags can load the file without being redirected to the Drive UI.
 *
 * Supported input formats:
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/file/d/FILE_ID[/view[?...]]
 *   https://drive.google.com/uc?id=FILE_ID  (missing export param)
 *
 * All are converted to:
 *   https://drive.google.com/uc?export=view&id=FILE_ID
 *
 * Non-Drive URLs are returned unchanged.
 */
export function convertGoogleDriveImageUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'drive.google.com') return url

    // Already a direct uc link — ensure export=view is present.
    if (parsed.pathname === '/uc') {
      const id = parsed.searchParams.get('id')
      if (!id) return url
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`
    }

    // /open?id=FILE_ID
    if (parsed.pathname === '/open') {
      const id = parsed.searchParams.get('id')
      if (!id) return url
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`
    }

    // /file/d/FILE_ID[/...]
    const fileMatch = parsed.pathname.match(/^\/file\/d\/([^/]+)/)
    if (fileMatch) {
      const id = fileMatch[1]
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`
    }
  } catch {
    // Not a valid URL — return as-is.
  }
  return url
}
