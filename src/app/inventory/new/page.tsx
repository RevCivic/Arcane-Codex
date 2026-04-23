export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { createInventoryItem } from '@/app/actions'
import Link from 'next/link'

export default async function NewInventoryPage() {
  const characters = await prisma.character.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/inventory" className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Inventory
        </Link>
      </div>
      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6 arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
        + New Item
      </h1>
      <form action={createInventoryItem} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Name *</label>
          <input name="name" required className="arcane-input" placeholder="e.g. Occult Grimoire" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Category</label>
          <input name="category" className="arcane-input" placeholder="e.g. Tome, Weapon, Equipment, Artifact" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} className="arcane-input" placeholder="Physical description and background..." />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Effect</label>
          <textarea name="effect" rows={2} className="arcane-input" placeholder="Mechanical or narrative effect..." />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Location</label>
          <input name="location" className="arcane-input" placeholder="e.g. Bureau Vault, Agent's possession" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Carried / Wielded By</label>
          <select name="carrierId" defaultValue="" className="arcane-input">
            <option value="">None</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Reference Links</label>
          <textarea name="referenceLinks" rows={4} className="arcane-input" placeholder={'One per line: URL | Note\nhttps://example.com/rules | Rules reference'} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>
            Create Item
          </button>
          <Link href="/inventory" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider" style={{ border: '1px solid #374151', color: '#9ca3af' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
