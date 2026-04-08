export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteEvent } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await prisma.event.findUnique({
    where: { id: parseInt(id) },
    include: { person: true },
  })
  if (!event) notFound()

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/events" className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Events
        </Link>
      </div>
      <div className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#e2e8f0' }}>{event.name}</h1>
            {event.date && <p className="text-sm" style={{ color: '#f59e0b' }}>🗓 {event.date}</p>}
          </div>
          <div className="flex gap-2">
            <Link href={`/events/${event.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
            <DeleteButton action={deleteEvent.bind(null, event.id)} label={event.name} />
          </div>
        </div>
        <hr style={{ borderColor: '#1f2937', margin: '1rem 0' }} />
        <dl className="grid grid-cols-1 gap-4">
          {event.description && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Description</dt>
              <dd className="text-sm leading-6" style={{ color: '#e2e8f0' }}>{event.description}</dd>
            </div>
          )}
          {event.significance && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Significance</dt>
              <dd className="text-sm leading-6 p-3 rounded italic" style={{ color: '#a78bfa', backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>{event.significance}</dd>
            </div>
          )}
          {event.outcome && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Outcome</dt>
              <dd className="text-sm leading-6 p-3 rounded" style={{ color: '#4ade80', backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>{event.outcome}</dd>
            </div>
          )}
          {event.person && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Person Involved</dt>
              <dd className="text-sm">
                <Link href={`/characters/${event.person.id}`} className="hover:text-purple-300" style={{ color: '#a78bfa' }}>
                  {event.person.name}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
