/**
 * Converts Google Drive share/open links to a direct-access image URL so that
 * <img> tags can load the file without being redirected to the Drive UI.
 *
 * Supported input formats:
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/file/d/FILE_ID[/view[?...]]
 *   https://drive.google.com/uc?id=FILE_ID
 *
 * All are converted to:
 *   https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
 *
 * The thumbnail endpoint is used because the legacy uc?export=view format is
 * blocked by Google when embedded directly in <img> tags.
 *
 * Non-Drive URLs are returned unchanged.
 */
export function convertGoogleDriveImageUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'drive.google.com') return url

    // Already a thumbnail link — return as-is.
    if (parsed.pathname === '/thumbnail') {
      return url
    }

    // Already a uc link — extract id.
    if (parsed.pathname === '/uc') {
      const id = parsed.searchParams.get('id')
      if (!id) return url
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`
    }

    // /open?id=FILE_ID
    if (parsed.pathname === '/open') {
      const id = parsed.searchParams.get('id')
      if (!id) return url
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`
    }

    // /file/d/FILE_ID[/...]
    const fileMatch = parsed.pathname.match(/^\/file\/d\/([^/]+)/)
    if (fileMatch) {
      const id = fileMatch[1]
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`
    }
  } catch {
    // Not a valid URL — return as-is.
  }
  return url
}
