export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { deduplicateTags, pruneUnusedTags } from '@/app/actions'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'

type AdminTagsPageProps = {
  searchParams: Promise<{
    connected?: string
    deduplicated?: string
    deleted?: string
    pruned?: string
  }>
}

export default async function AdminTagsPage({ searchParams }: AdminTagsPageProps) {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const result = await searchParams
  const tags = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { characters: true } } },
  })

  const duplicateGroupsMap = new Map<string, typeof tags>()
  for (const tag of tags) {
    const key = tag.name.toLowerCase()
    if (!duplicateGroupsMap.has(key)) duplicateGroupsMap.set(key, [])
    duplicateGroupsMap.get(key)!.push(tag)
  }

  const duplicateGroups = [...duplicateGroupsMap.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      tags: [...group].sort((left, right) => left.name.localeCompare(right.name)),
      totalCharacters: group.reduce((total, tag) => total + tag._count.characters, 0),
    }))
    .sort((left, right) => left.key.localeCompare(right.key))

  const unusedTagCount = tags.filter((tag) => tag._count.characters === 0).length

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/access" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Access Control
        </Link>
      </div>

      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            🏷️ Tag Management
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            Merge case-insensitive duplicates and prune unused tags.
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#1e1133', color: '#a78bfa', fontFamily: 'Georgia, serif' }}>
          {tags.length} tags
        </span>
      </div>

      {typeof result.deduplicated === 'string' && (
        <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: '#111118', border: '1px solid #2d1b69', color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
          Deduplicated {result.deduplicated} duplicate groups, removed {result.deleted ?? '0'} duplicate tags, and reconnected {result.connected ?? '0'} character links.
        </div>
      )}

      {typeof result.pruned === 'string' && (
        <div className="rounded-lg p-4 mb-8" style={{ backgroundColor: '#111118', border: '1px solid #451a03', color: '#f3f4f6', fontFamily: 'Georgia, serif' }}>
          Pruned {result.pruned} unused tags.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg p-5" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Total Tags</div>
          <div className="text-3xl font-bold" style={{ color: '#e2e8f0' }}>{tags.length}</div>
        </div>
        <div className="rounded-lg p-5" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Unused Tags</div>
          <div className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{unusedTagCount}</div>
        </div>
        <div className="rounded-lg p-5" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>Duplicate Groups</div>
          <div className="text-3xl font-bold" style={{ color: '#8b5cf6' }}>{duplicateGroups.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <form action={deduplicateTags} className="rounded-lg p-6 space-y-3" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
          <h2 className="text-sm uppercase tracking-widest" style={{ color: '#d97706' }}>Deduplicate Tags</h2>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Merge tags that differ only by case and keep one canonical lowercase record when possible.
          </p>
          <button
            type="submit"
            className="px-5 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Deduplicate Tags
          </button>
        </form>

        <form action={pruneUnusedTags} className="rounded-lg p-6 space-y-3" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
          <h2 className="text-sm uppercase tracking-widest" style={{ color: '#d97706' }}>Prune Unused Tags</h2>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Remove tags that are not attached to any characters.
          </p>
          <button
            type="submit"
            className="px-5 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#b45309', color: '#fff' }}
          >
            Prune Unused Tags
          </button>
        </form>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
        <div className="px-4 py-3" style={{ backgroundColor: '#111118', borderBottom: '1px solid #1f2937' }}>
          <h2 className="text-sm uppercase tracking-widest" style={{ color: '#d97706' }}>Case-Insensitive Duplicate Groups</h2>
        </div>
        {duplicateGroups.length === 0 ? (
          <div className="px-4 py-8 text-sm" style={{ color: '#6b7280' }}>
            No duplicate groups found.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: '#1f2937' }}>
            {duplicateGroups.map((group) => (
              <div key={group.key} className="px-4 py-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{group.key}</span>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#1e1133', color: '#c4b5fd' }}>
                    {group.tags.length} tags · {group.totalCharacters} total links
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
                      style={{ backgroundColor: '#0d0d15', color: '#9ca3af', border: '1px solid #1f2937' }}
                    >
                      <span>{tag.name}</span>
                      <span style={{ color: '#c4b5fd' }}>{tag._count.characters}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
