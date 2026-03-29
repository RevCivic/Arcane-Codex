import { createPlace } from '@/app/actions'
import Link from 'next/link'

export default function NewPlacePage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/places" className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Places
        </Link>
      </div>
      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6 arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
        + New Place
      </h1>
      <form action={createPlace} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
            Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input name="name" required className="arcane-input" placeholder="e.g. Bureau Headquarters" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Type</label>
          <input name="type" className="arcane-input" placeholder="e.g. Government Building, Haunted Site" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Region</label>
          <input name="region" className="arcane-input" placeholder="e.g. Washington D.C." />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} className="arcane-input" placeholder="Describe this location..." />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Notes</label>
          <textarea name="notes" rows={3} className="arcane-input" placeholder="Operational notes, hazards..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>
            Create Place
          </button>
          <Link href="/places" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider" style={{ border: '1px solid #374151', color: '#9ca3af' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
