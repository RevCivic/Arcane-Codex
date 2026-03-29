export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { deleteEvent } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function EventsPage() {
  const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            📜 Events
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>Case incidents and milestones</p>
        </div>
        <Link href="/events/new" className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}>
          + New Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 rounded-lg" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          No events recorded.
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
