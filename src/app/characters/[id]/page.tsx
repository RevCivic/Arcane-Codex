export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteCharacter } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const character = await prisma.character.findUnique({
    where: { id: parseInt(id) },
    include: { powers: true },
  })

  if (!character) notFound()

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/characters" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Characters
        </Link>
      </div>

      <div className="card-arcane rounded-lg p-6 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#e2e8f0' }}>{character.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {character.role && (
                <span className="text-xs px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ backgroundColor: '#1e1133', color: '#a78bfa' }}>
                  {character.role}
                </span>
              )}
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: character.status === 'Active' ? '#052e16' : '#1f1210',
                  color: character.status === 'Active' ? '#4ade80' : '#f87171',
                }}
              >
                {character.status ?? 'Unknown'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/characters/${character.id}/edit`}
              className="text-xs px-3 py-1.5 rounded transition-colors hover:text-amber-300"
              style={{ color: '#d97706', border: '1px solid #451a03' }}
            >
              Edit
            </Link>
            <DeleteButton action={deleteCharacter.bind(null, character.id)} label={character.name} />
          </div>
        </div>

        <hr style={{ borderColor: '#1f2937', margin: '1rem 0' }} />

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {character.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Description</dt>
              <dd className="text-sm leading-6" style={{ color: '#e2e8f0' }}>{character.description}</dd>
            </div>
          )}
          {character.affiliation && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Affiliation</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{character.affiliation}</dd>
            </div>
          )}
          {character.stats && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Stats (BRP)</dt>
              <dd className="text-sm font-mono p-2 rounded" style={{ backgroundColor: '#0d0d15', color: '#a78bfa', border: '1px solid #1f2937' }}>
                {character.stats}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Powers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold uppercase tracking-widest" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            ⚡ Powers
          </h2>
          <Link
            href={`/powers/new?personId=${character.id}`}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{ color: '#a78bfa', border: '1px solid #3b1f6e', fontFamily: 'Georgia, serif' }}
          >
            + Add Power
          </Link>
        </div>
        {character.powers.length === 0 ? (
          <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>No powers recorded for this character.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {character.powers.map((power) => (
              <div key={power.id} className="card-arcane rounded-lg p-4" style={{ fontFamily: 'Georgia, serif' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold" style={{ color: '#e2e8f0' }}>{power.name}</h3>
                  <Link href={`/powers/${power.id}`} className="text-xs" style={{ color: '#8b5cf6' }}>View →</Link>
                </div>
                {power.description && <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>{power.description}</p>}
                {power.effect && <p className="text-xs italic" style={{ color: '#a78bfa' }}>Effect: {power.effect}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
