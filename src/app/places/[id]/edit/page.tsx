export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { referenceLinksToText } from '@/lib/referenceLinks'
import { notFound } from 'next/navigation'
import { updatePlace } from '@/app/actions'
import Link from 'next/link'

export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const place = await prisma.place.findUnique({ where: { id: parseInt(id) } })
  if (!place) notFound()

  const action = updatePlace.bind(null, place.id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/places/${place.id}`} className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← {place.name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
        ✏️ Edit Place
      </h1>
      <form action={action} encType="multipart/form-data" className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Name *</label>
          <input name="name" required defaultValue={place.name} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Type</label>
          <input name="type" defaultValue={place.type ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Region</label>
          <input name="region" defaultValue={place.region ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Coordinates</label>
          <input name="coordinates" defaultValue={place.coordinates ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Google Maps Link</label>
          <input name="mapsLink" type="url" defaultValue={place.mapsLink ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} defaultValue={place.description ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Image URL (Google Drive or hosted image)</label>
          <input name="imageUrl" type="url" defaultValue={place.imageUrl ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Or Upload Image</label>
          <input name="imageFile" type="file" accept="image/*" className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Notes</label>
          <textarea name="notes" rows={3} defaultValue={place.notes ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Reference Links</label>
          <textarea name="referenceLinks" rows={4} defaultValue={referenceLinksToText(place.referenceLinks)} className="arcane-input" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>
            Save Changes
          </button>
          <Link href={`/places/${place.id}`} className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider" style={{ border: '1px solid #374151', color: '#9ca3af' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
