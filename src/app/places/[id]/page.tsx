export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deletePlace } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const place = await prisma.place.findUnique({ where: { id: parseInt(id) } })
  if (!place) notFound()

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/places" className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Places
        </Link>
      </div>
      <div className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#e2e8f0' }}>{place.name}</h1>
            {place.type && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1c1407', color: '#f59e0b' }}>{place.type}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/places/${place.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
            <DeleteButton action={deletePlace.bind(null, place.id)} label={place.name} />
          </div>
        </div>
        <hr style={{ borderColor: '#1f2937', margin: '1rem 0' }} />
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {place.region && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Region</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{place.region}</dd>
            </div>
          )}
          {place.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Description</dt>
              <dd className="text-sm leading-6" style={{ color: '#e2e8f0' }}>{place.description}</dd>
            </div>
          )}
          {place.notes && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Notes</dt>
              <dd className="text-sm leading-6 p-3 rounded" style={{ color: '#a78bfa', backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>{place.notes}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
