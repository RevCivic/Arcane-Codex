export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { referenceLinksToText } from '@/lib/referenceLinks'
import { notFound } from 'next/navigation'
import { updatePower } from '@/app/actions'
import { AbilitySelector } from '@/components/AbilitySelector'
import Link from 'next/link'

export default async function EditPowerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [power, skills] = await Promise.all([
    prisma.power.findUnique({ where: { id: parseInt(id) } }),
    prisma.skill.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { name: true, category: true } }),
  ])
  if (!power) notFound()

  const action = updatePower.bind(null, power.id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/powers/${power.id}`} className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← {power.name}
        </Link>
      </div>
      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
        ✏️ Edit Power
      </h1>
      <form action={action} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Name *</label>
          <input name="name" required defaultValue={power.name} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} defaultValue={power.description ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Effect</label>
          <textarea name="effect" rows={2} defaultValue={power.effect ?? ''} className="arcane-input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Base Ability</label>
            <AbilitySelector skills={skills} defaultValue={power.baseAbility} />
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Skill linked to this power, or none if passive</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Base %</label>
            <input name="basePercentage" type="number" min={0} max={100} defaultValue={power.basePercentage ?? ''} className="arcane-input" placeholder="0–100" />
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Standard skill percentage for this power</p>
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Reference Links</label>
          <textarea name="referenceLinks" rows={4} defaultValue={referenceLinksToText(power.referenceLinks)} className="arcane-input" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>
            Save Changes
          </button>
          <Link href={`/powers/${power.id}`} className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider" style={{ border: '1px solid #374151', color: '#9ca3af' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
