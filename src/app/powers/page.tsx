export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { deletePower } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function PowersPage() {
  const powers = await prisma.power.findMany({
    orderBy: { name: 'asc' },
    include: { person: { select: { id: true, name: true } } },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            ⚡ Powers
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>Supernatural abilities and phenomena</p>
        </div>
        <Link href="/powers/new" className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}>
          + New Power
        </Link>
      </div>

      {powers.length === 0 ? (
        <div className="text-center py-20 rounded-lg" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          No powers recorded.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {powers.map((power) => (
            <div key={power.id} className="card-arcane rounded-lg p-5" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>{power.name}</h2>
                <span className="text-2xl">⚡</span>
              </div>
              <Link href={`/characters/${power.person.id}`} className="text-xs mb-2 inline-block hover:text-purple-300" style={{ color: '#a78bfa' }}>
                👤 {power.person.name}
              </Link>
              {power.description && <p className="text-sm mb-2 line-clamp-2" style={{ color: '#9ca3af' }}>{power.description}</p>}
              {power.effect && <p className="text-xs italic" style={{ color: '#f59e0b' }}>⚡ {power.effect}</p>}
              <div className="flex items-center gap-2 pt-3 mt-3" style={{ borderTop: '1px solid #1f2937' }}>
                <Link href={`/powers/${power.id}`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                <Link href={`/powers/${power.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                <div className="ml-auto">
                  <DeleteButton action={deletePower.bind(null, power.id)} label={power.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
