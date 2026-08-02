import { access } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'node:stream'

// This route uses Node.js fs APIs so it must run on the Node.js runtime.
export const runtime = 'nodejs'

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

const EXTENSION_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
}

/**
 * Serves locally-uploaded image files from the `public/uploads/` directory.
 *
 * Next.js static file serving from `public/` works well in most scenarios, but
 * having an explicit API route gives us:
 *  - Reliable serving even when the volume-mounted uploads directory is written
 *    after the initial build (avoids any edge-case caching in the server).
 *  - A clear place to add cache headers, auth checks, or CDN support later.
 *  - Path traversal protection via strict validation.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params

  // Reject any segment that would escape the uploads directory.
  if (!segments || segments.length === 0 || segments.some((s) => s === '..' || s === '.' || s.includes('/'))) {
    return new NextResponse(null, { status: 400 })
  }

  const fileName = segments[segments.length - 1]
  const ext = path.extname(fileName).toLowerCase()

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return new NextResponse(null, { status: 400 })
  }

  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads')
  const filePath = path.join(uploadsRoot, ...segments)

  // Double-check the resolved path stays within the uploads root.
  if (!filePath.startsWith(uploadsRoot + path.sep) && filePath !== uploadsRoot) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    await access(filePath)
  } catch {
    return new NextResponse(null, { status: 404 })
  }

  const contentType = EXTENSION_MIME[ext] ?? 'application/octet-stream'
  const nodeStream = createReadStream(filePath)
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': contentType,
      // Cache for 1 year — image filenames are content-addressed (UUID-based)
      // so a new upload always gets a new URL.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
