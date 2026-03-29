import { prisma } from '@/lib/prisma'
import { createPower } from '@/app/actions'
import Link from 'next/link'

export default async function NewPowerPage({
  searchParams,
}: {
  searchParams: Promise<{ personId?: string }>
}) {
  const { personId } = await searchParams
  const characters = await prisma.character.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/powers" className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Powers
        </Link>
      </div>
      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6 arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
        + New Power
      </h1>
      <form action={createPower} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Name *</label>
          <input name="name" required className="arcane-input" placeholder="e.g. Arcane Sight" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Character *</label>
          <select name="personId" required defaultValue={personId ?? ''} className="arcane-input">
            <option value="" disabled>Select a character...</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} className="arcane-input" placeholder="How the power manifests..." />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Effect</label>
          <textarea name="effect" rows={2} className="arcane-input" placeholder="Mechanical or narrative effect in play..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>
            Create Power
          </button>
          <Link href="/powers" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider" style={{ border: '1px solid #374151', color: '#9ca3af' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
