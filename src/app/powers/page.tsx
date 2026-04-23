export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Suspense } from 'react'
import { deletePower } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'
import { ViewToggle } from '@/components/ViewToggle'
import { SearchBar } from '@/components/SearchBar'

type SortOrder = 'asc' | 'desc'
const VALID_SORT_FIELDS = ['name', 'effect', 'person'] as const
type SortField = (typeof VALID_SORT_FIELDS)[number]

function sortLink(view: string, currentSortBy: string, currentSortOrder: string, col: string, search: string) {
  const order = currentSortBy === col ? (currentSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
  return `?view=${view}&sortBy=${col}&sortOrder=${order}${searchParam}`
}

function SortIcon({ sortBy, sortOrder, column }: { sortBy: string; sortOrder: string; column: string }) {
  if (sortBy !== column) return <span style={{ color: '#374151', marginLeft: '3px' }}>↕</span>
  return <span style={{ color: '#a78bfa', marginLeft: '3px' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
}

export default async function PowersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sortBy?: string; sortOrder?: string; search?: string }>
}) {
  const { view = 'card', sortBy: rawSortBy = 'name', sortOrder: rawSortOrder = 'asc', search = '' } = await searchParams
  const sortBy: SortField = VALID_SORT_FIELDS.includes(rawSortBy as SortField) ? (rawSortBy as SortField) : 'name'
  const sortOrder: SortOrder = rawSortOrder === 'desc' ? 'desc' : 'asc'

  const orderBy =
    sortBy === 'person'
      ? { person: { name: sortOrder } }
      : { [sortBy]: sortOrder }

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { description: { contains: search } },
          { effect: { contains: search } },
          { person: { name: { contains: search } } },
        ],
      }
    : {}

  const powers = await prisma.power.findMany({
    where,
    orderBy,
    include: { person: { select: { id: true, name: true } } },
  })

  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            ⚡ Powers
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>Supernatural abilities and phenomena</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search powers…" />
          </Suspense>
          <Suspense fallback={null}>
            <ViewToggle />
          </Suspense>
          <Link href="/powers/new" className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90 whitespace-nowrap" style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}>
            + New Power
          </Link>
          <Link href="/powers/bulk" className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:text-purple-300 whitespace-nowrap" style={{ border: '1px solid #3b1f6e', color: '#a78bfa', fontFamily: 'Georgia, serif' }}>
            Bulk Entry
          </Link>
        </div>
      </div>

      {powers.length === 0 ? (
        <div className="text-center py-20 rounded-lg" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          No powers recorded.
        </div>
      ) : view === 'list' ? (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #1f2937' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Georgia, serif' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1f2937', backgroundColor: '#0d0d1a' }}>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'name', search)} style={{ color: sortBy === 'name' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Name<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="name" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'person', search)} style={{ color: sortBy === 'person' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Character<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="person" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'effect', search)} style={{ color: sortBy === 'effect' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Effect<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="effect" />
                  </Link>
                </th>
                <th style={{ ...thStyle, textAlign: 'right', color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {powers.map((power) => (
                <tr key={power.id} className="hover-row-arcane" style={{ borderBottom: '1px solid #1a1a2e' }}>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0', fontSize: '14px' }}>{power.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                    <Link href={`/characters/${power.person.id}`} className="hover:text-purple-300" style={{ color: '#a78bfa', textDecoration: 'none' }}>
                      {power.person.name}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#f59e0b', fontSize: '13px', fontStyle: 'italic' }}>
                    {power.effect ?? <span style={{ color: '#374151', fontStyle: 'normal' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link href={`/powers/${power.id}`} className="text-xs px-3 py-1 rounded" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                      <Link href={`/powers/${power.id}/edit`} className="text-xs px-3 py-1 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                      <DeleteButton action={deletePower.bind(null, power.id)} label={power.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {powers.map((power) => (
            <div key={power.id} className="card-arcane rounded-lg p-5" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>{power.name}</h2>
                <span className="text-2xl">⚡</span>
              </div>
              <Link href={`/characters/${power.person.id}`} className="text-xs mb-2 inline-block hover:text-purple-300" style={{ color: '#a78bfa' }}>
                👤 {power.person.name}
              </Link>
              {power.description && <p className="text-sm mb-2 line-clamp-2" style={{ color: '#9ca3af' }}>{power.description}</p>}
              {power.effect && <p className="text-xs italic" style={{ color: '#f59e0b' }}>⚡ {power.effect}</p>}
              <div className="flex flex-wrap items-center gap-2 pt-3 mt-3" style={{ borderTop: '1px solid #1f2937' }}>
                <Link href={`/powers/${power.id}`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                <Link href={`/powers/${power.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                <div className="ml-auto">
                  <DeleteButton action={deletePower.bind(null, power.id)} label={power.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
