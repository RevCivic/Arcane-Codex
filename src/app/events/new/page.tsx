import { createEvent } from '@/app/actions'
import Link from 'next/link'

export default function NewEventPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/events" className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Events
        </Link>
      </div>
      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6 arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
        + New Event
      </h1>
      <form action={createEvent} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Name *</label>
          <input name="name" required className="arcane-input" placeholder="e.g. The Millbrook Incident" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Date</label>
          <input name="date" className="arcane-input" placeholder="e.g. October 12, 1987 or Day 3 of Operation" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} className="arcane-input" placeholder="What happened..." />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Significance</label>
          <textarea name="significance" rows={2} className="arcane-input" placeholder="Why this matters to the case..." />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Outcome</label>
          <textarea name="outcome" rows={2} className="arcane-input" placeholder="Resolution or aftermath..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>
            Create Event
          </button>
          <Link href="/events" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider" style={{ border: '1px solid #374151', color: '#9ca3af' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
