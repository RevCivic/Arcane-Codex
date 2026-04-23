export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { referenceLinksToText } from '@/lib/referenceLinks'
import { notFound } from 'next/navigation'
import { updateInventoryItem } from '@/app/actions'
import Link from 'next/link'

export default async function EditInventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [item, characters] = await Promise.all([
    prisma.inventoryItem.findUnique({ where: { id: parseInt(id) } }),
    prisma.character.findMany({ orderBy: { name: 'asc' } }),
  ])
  if (!item) notFound()

  const action = updateInventoryItem.bind(null, item.id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/inventory/${item.id}`} className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← {item.name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
        ✏️ Edit Item
      </h1>
      <form action={action} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Name *</label>
          <input name="name" required defaultValue={item.name} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Category</label>
          <input name="category" defaultValue={item.category ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} defaultValue={item.description ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Effect</label>
          <textarea name="effect" rows={2} defaultValue={item.effect ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Location</label>
          <input name="location" defaultValue={item.location ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Carried / Wielded By</label>
          <select name="carrierId" defaultValue={item.carrierId ?? ''} className="arcane-input">
            <option value="">None</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Reference Links</label>
          <textarea name="referenceLinks" rows={4} defaultValue={referenceLinksToText(item.referenceLinks)} className="arcane-input" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>
            Save Changes
          </button>
          <Link href={`/inventory/${item.id}`} className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider" style={{ border: '1px solid #374151', color: '#9ca3af' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
