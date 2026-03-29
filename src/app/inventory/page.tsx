export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { deleteInventoryItem } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function InventoryPage() {
  const items = await prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            🎒 Inventory
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>Artifacts, equipment, and evidence</p>
        </div>
        <Link href="/inventory/new" className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}>
          + New Item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 rounded-lg" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          No items recorded.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="card-arcane rounded-lg p-5" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>{item.name}</h2>
                {item.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1c1407', color: '#f59e0b' }}>{item.category}</span>
                )}
              </div>
              {item.description && <p className="text-sm mb-2 line-clamp-2" style={{ color: '#9ca3af' }}>{item.description}</p>}
              {item.effect && <p className="text-xs mb-2 italic" style={{ color: '#a78bfa' }}>⚡ {item.effect}</p>}
              {item.location && <p className="text-xs" style={{ color: '#6b7280' }}>📍 {item.location}</p>}
              <div className="flex items-center gap-2 pt-3 mt-3" style={{ borderTop: '1px solid #1f2937' }}>
                <Link href={`/inventory/${item.id}`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                <Link href={`/inventory/${item.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                <div className="ml-auto">
                  <DeleteButton action={deleteInventoryItem.bind(null, item.id)} label={item.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
