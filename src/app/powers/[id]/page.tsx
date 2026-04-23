export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { normalizeReferenceLinks } from '@/lib/referenceLinks'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deletePower } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function PowerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const power = await prisma.power.findUnique({
    where: { id: parseInt(id) },
    include: { person: { select: { id: true, name: true } } },
  })
  if (!power) notFound()
  const referenceLinks = normalizeReferenceLinks(power.referenceLinks)

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/powers" className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Powers
        </Link>
      </div>
      <div className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#e2e8f0' }}>{power.name}</h1>
            <Link href={`/characters/${power.person.id}`} className="text-sm hover:text-purple-300" style={{ color: '#a78bfa' }}>
              👤 {power.person.name}
            </Link>
          </div>
          <div className="flex gap-2">
            <Link href={`/powers/${power.id}/edit`} className="text-xs px-3 py-1.5 rounded" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
            <DeleteButton action={deletePower.bind(null, power.id)} label={power.name} />
          </div>
        </div>
        <hr style={{ borderColor: '#1f2937', margin: '1rem 0' }} />
        <dl className="grid grid-cols-1 gap-4">
          {power.description && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Description</dt>
              <dd className="text-sm leading-6" style={{ color: '#e2e8f0' }}>{power.description}</dd>
            </div>
          )}
          {power.effect && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Effect</dt>
              <dd className="text-sm leading-6 p-3 rounded italic" style={{ color: '#f59e0b', backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>{power.effect}</dd>
            </div>
          )}
          {referenceLinks.length > 0 && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Reference Links</dt>
              <dd className="space-y-2">
                {referenceLinks.map((link) => (
                  <p key={`${link.url}-${link.note}`} className="text-sm" style={{ color: '#e2e8f0' }}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-300 break-all" style={{ color: '#a78bfa' }}>
                      {link.url}
                    </a>
                    {' — '}
                    <span>{link.note}</span>
                  </p>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
