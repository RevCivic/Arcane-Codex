export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Suspense } from 'react'
import { deleteEvent } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'
import { ViewToggle } from '@/components/ViewToggle'

type SortOrder = 'asc' | 'desc'
const VALID_SORT_FIELDS = ['name', 'date', 'significance', 'createdAt'] as const
type SortField = (typeof VALID_SORT_FIELDS)[number]

function sortLink(view: string, currentSortBy: string, currentSortOrder: string, col: string) {
  const order = currentSortBy === col ? (currentSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
  return `?view=${view}&sortBy=${col}&sortOrder=${order}`
}

function SortIcon({ sortBy, sortOrder, column }: { sortBy: string; sortOrder: string; column: string }) {
  if (sortBy !== column) return <span style={{ color: '#374151', marginLeft: '3px' }}>↕</span>
  return <span style={{ color: '#a78bfa', marginLeft: '3px' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sortBy?: string; sortOrder?: string }>
}) {
  const { view = 'card', sortBy: rawSortBy = 'createdAt', sortOrder: rawSortOrder = 'desc' } = await searchParams
  const sortBy: SortField = VALID_SORT_FIELDS.includes(rawSortBy as SortField) ? (rawSortBy as SortField) : 'createdAt'
  const sortOrder: SortOrder = rawSortOrder === 'asc' ? 'asc' : 'desc'

  const events = await prisma.event.findMany({ orderBy: { [sortBy]: sortOrder }, include: { person: true } })

  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            📜 Events
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>Case incidents and milestones</p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <ViewToggle />
          </Suspense>
          <Link href="/events/new" className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}>
            + New Event
          </Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 rounded-lg" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          No events recorded.
        </div>
      ) : view === 'list' ? (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #1f2937' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Georgia, serif' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1f2937', backgroundColor: '#0d0d1a' }}>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'name')} style={{ color: sortBy === 'name' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Name<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="name" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'date')} style={{ color: sortBy === 'date' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Date<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="date" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'significance')} style={{ color: sortBy === 'significance' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Significance<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="significance" />
                  </Link>
                </th>
                <th style={{ ...thStyle, color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Person
                </th>
                <th style={{ ...thStyle, textAlign: 'right', color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="hover-row-arcane" style={{ borderBottom: '1px solid #1a1a2e' }}>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0', fontSize: '14px' }}>{event.name}</td>
                  <td style={{ padding: '10px 12px', color: '#f59e0b', fontSize: '13px' }}>
                    {event.date ?? <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#a78bfa', fontSize: '13px', fontStyle: 'italic' }}>
                    {event.significance ?? <span style={{ color: '#374151', fontStyle: 'normal' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                    {event.person
                      ? <Link href={`/characters/${event.person.id}`} className="hover:text-purple-300" style={{ color: '#a78bfa' }}>{event.person.name}</Link>
                      : <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/events/${event.id}`} className="text-xs px-3 py-1 rounded" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                      <Link href={`/events/${event.id}/edit`} className="text-xs px-3 py-1 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                      <DeleteButton action={deleteEvent.bind(null, event.id)} label={event.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div key={event.id} className="card-arcane rounded-lg p-5" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>{event.name}</h2>
              </div>
              {event.date && <p className="text-xs mb-2" style={{ color: '#f59e0b' }}>🗓 {event.date}</p>}
              {event.description && <p className="text-sm mb-2 line-clamp-2" style={{ color: '#9ca3af' }}>{event.description}</p>}
              {event.significance && (
                <p className="text-xs italic" style={{ color: '#a78bfa' }}>Significance: {event.significance}</p>
              )}
              {event.person && (
                <p className="text-xs mt-1">
                  <Link href={`/characters/${event.person.id}`} className="hover:text-purple-300" style={{ color: '#a78bfa' }}>👤 {event.person.name}</Link>
                </p>
              )}
              <div className="flex items-center gap-2 pt-3 mt-3" style={{ borderTop: '1px solid #1f2937' }}>
                <Link href={`/events/${event.id}`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                <Link href={`/events/${event.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                <div className="ml-auto">
                  <DeleteButton action={deleteEvent.bind(null, event.id)} label={event.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
