export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { generateCharacterThumbnails, localizeCharacterImages } from '@/app/actions'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type AdminImagesPageProps = {
  searchParams: Promise<{
    scanned?: string
    converted?: string
    skipped?: string
    failed?: string
    thumbnailScanned?: string
    thumbnailGenerated?: string
    thumbnailRefreshed?: string
    thumbnailSkipped?: string
    thumbnailFailed?: string
  }>
}

export default async function AdminImagesPage({ searchParams }: AdminImagesPageProps) {
  const session = await auth()
  const sessionEmail = normalizeEmail(session?.user?.email)

  if (!sessionEmail) redirect('/login')

  const currentUser = await prisma.allowedEmail.findUnique({ where: { email: sessionEmail } })
  if (!currentUser || currentUser.role !== AccessRole.ADMIN) redirect('/')

  const [allImageCount, localImageCount, remoteImageCount] = await Promise.all([
    prisma.character.count({ where: { imageUrl: { not: null } } }),
    prisma.character.count({ where: { imageUrl: { startsWith: '/uploads/' } } }),
    prisma.character.count({
      where: {
        imageUrl: { not: null, notIn: [''] },
        NOT: { imageUrl: { startsWith: '/uploads/' } },
      },
    }),
  ])
  const result = await searchParams

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/access" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Access
        </Link>
      </div>

      <h1
        className="text-2xl font-bold tracking-widest uppercase mb-2 arcane-glow"
        style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
      >
        🖼️ Image Hosting
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
        Download remote character images, store them locally, and generate thumbnails for list views.
      </p>

      {typeof result.scanned === 'string' && (
        <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#111118', border: '1px solid #2d1b69', color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
          Scanned {result.scanned} images · Converted {result.converted ?? '0'} · Skipped {result.skipped ?? '0'} · Failed {result.failed ?? '0'}
        </div>
      )}
      {typeof result.thumbnailScanned === 'string' && (
        <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: '#111118', border: '1px solid #164e63', color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
          Scanned {result.thumbnailScanned} images · Generated {result.thumbnailGenerated ?? '0'} · Refreshed {result.thumbnailRefreshed ?? '0'} · Skipped {result.thumbnailSkipped ?? '0'} · Failed {result.thumbnailFailed ?? '0'}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg p-5" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>With Images</div>
          <div className="text-3xl font-bold" style={{ color: '#e2e8f0' }}>{allImageCount}</div>
        </div>
        <div className="rounded-lg p-5" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Local</div>
          <div className="text-3xl font-bold" style={{ color: '#4ade80' }}>{localImageCount}</div>
        </div>
        <div className="rounded-lg p-5" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Remote</div>
          <div className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{remoteImageCount}</div>
        </div>
      </div>

      <form action={localizeCharacterImages} className="rounded-lg p-6 space-y-4" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
        <p className="text-sm" style={{ color: '#9ca3af' }}>
          This converts all non-local character image URLs to files in <code>/public/uploads/characters</code> and creates a <code>-thumb.webp</code> thumbnail for each one.
        </p>
        <button
          type="submit"
          className="px-5 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
          style={{ backgroundColor: '#7c3aed', color: '#fff' }}
        >
          Localize Remote Character Images
        </button>
      </form>

      <form action={generateCharacterThumbnails} className="mt-4 rounded-lg p-6 space-y-4" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
        <p className="text-sm" style={{ color: '#9ca3af' }}>
          This scans locally hosted character images, creates missing thumbnails, and refreshes existing ones for the character grid.
        </p>
        <button
          type="submit"
          className="px-5 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
          style={{ backgroundColor: '#0891b2', color: '#fff' }}
        >
          Generate Character Thumbnails
        </button>
      </form>
    </div>
  )
}
