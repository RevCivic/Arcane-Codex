export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Suspense } from 'react'
import { deleteInventoryItem } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'
import { ViewToggle } from '@/components/ViewToggle'
import { SearchBar } from '@/components/SearchBar'

type SortOrder = 'asc' | 'desc'
const VALID_SORT_FIELDS = ['name', 'category', 'location'] as const
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

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sortBy?: string; sortOrder?: string; search?: string }>
}) {
  const { view = 'card', sortBy: rawSortBy = 'name', sortOrder: rawSortOrder = 'asc', search = '' } = await searchParams
  const sortBy: SortField = VALID_SORT_FIELDS.includes(rawSortBy as SortField) ? (rawSortBy as SortField) : 'name'
  const sortOrder: SortOrder = rawSortOrder === 'desc' ? 'desc' : 'asc'

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { category: { contains: search } },
          { location: { contains: search } },
          { description: { contains: search } },
          { effect: { contains: search } },
        ],
      }
    : {}

  const items = await prisma.inventoryItem.findMany({ where, orderBy: { [sortBy]: sortOrder }, include: { carrier: true } })

  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            🎒 Inventory
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>Artifacts, equipment, and evidence</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search inventory…" />
          </Suspense>
          <Suspense fallback={null}>
            <ViewToggle />
          </Suspense>
          <Link href="/inventory/new" className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90 whitespace-nowrap" style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}>
            + New Item
          </Link>
          <Link href="/inventory/bulk" className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:text-purple-300 whitespace-nowrap" style={{ border: '1px solid #3b1f6e', color: '#a78bfa', fontFamily: 'Georgia, serif' }}>
            Bulk Entry
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 rounded-lg" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          No items recorded.
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
                  <Link href={sortLink(view, sortBy, sortOrder, 'category', search)} style={{ color: sortBy === 'category' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Category<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="category" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'location', search)} style={{ color: sortBy === 'location' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Location<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="location" />
                  </Link>
                </th>
                <th style={{ ...thStyle, color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Carrier
                </th>
                <th style={{ ...thStyle, textAlign: 'right', color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover-row-arcane" style={{ borderBottom: '1px solid #1a1a2e' }}>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0', fontSize: '14px' }}>{item.name}</td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                    {item.category ? (
                      <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1c1407', color: '#f59e0b' }}>{item.category}</span>
                    ) : <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '13px' }}>
                    {item.location ?? <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                    {item.carrier
                      ? <Link href={`/characters/${item.carrier.id}`} className="hover:text-purple-300" style={{ color: '#a78bfa' }}>{item.carrier.name}</Link>
                      : <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link href={`/inventory/${item.id}`} className="text-xs px-3 py-1 rounded" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                      <Link href={`/inventory/${item.id}/edit`} className="text-xs px-3 py-1 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                      <DeleteButton action={deleteInventoryItem.bind(null, item.id)} label={item.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card-arcane rounded-lg p-5" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>{item.name}</h2>
                {item.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1c1407', color: '#f59e0b' }}>{item.category}</span>
                )}
              </div>
              {item.description && <p className="text-sm mb-2 line-clamp-2" style={{ color: '#9ca3af' }}>{item.description}</p>}
              {item.effect && <p className="text-xs mb-2 italic" style={{ color: '#a78bfa' }}>⚡ {item.effect}</p>}
              {item.location && <p className="text-xs" style={{ color: '#6b7280' }}>📍 {item.location}</p>}
              {item.carrier && (
                <p className="text-xs mt-1">
                  <Link href={`/characters/${item.carrier.id}`} className="hover:text-purple-300" style={{ color: '#a78bfa' }}>👤 {item.carrier.name}</Link>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-3 mt-3" style={{ borderTop: '1px solid #1f2937' }}>
                <Link href={`/inventory/${item.id}`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                <Link href={`/inventory/${item.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                <div className="ml-auto">
                  <DeleteButton action={deleteInventoryItem.bind(null, item.id)} label={item.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
