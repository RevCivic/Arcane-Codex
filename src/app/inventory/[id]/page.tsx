export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteInventoryItem } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await prisma.inventoryItem.findUnique({
    where: { id: parseInt(id) },
    include: { carrier: true },
  })
  if (!item) notFound()

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/inventory" className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Inventory
        </Link>
      </div>
      <div className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#e2e8f0' }}>{item.name}</h1>
            {item.category && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1c1407', color: '#f59e0b' }}>{item.category}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/inventory/${item.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
            <DeleteButton action={deleteInventoryItem.bind(null, item.id)} label={item.name} />
          </div>
        </div>
        <hr style={{ borderColor: '#1f2937', margin: '1rem 0' }} />
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {item.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Description</dt>
              <dd className="text-sm leading-6" style={{ color: '#e2e8f0' }}>{item.description}</dd>
            </div>
          )}
          {item.effect && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Effect</dt>
              <dd className="text-sm leading-6 p-3 rounded italic" style={{ color: '#a78bfa', backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>{item.effect}</dd>
            </div>
          )}
          {item.location && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Location</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{item.location}</dd>
            </div>
          )}
          {item.carrier && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Carried / Wielded By</dt>
              <dd className="text-sm">
                <Link href={`/characters/${item.carrier.id}`} className="hover:text-purple-300" style={{ color: '#a78bfa' }}>
                  {item.carrier.name}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
