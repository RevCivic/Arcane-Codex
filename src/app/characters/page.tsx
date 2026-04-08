export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Suspense } from 'react'
import { deleteCharacter } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'
import { SyncFromSheetButton } from '@/components/SyncFromSheetButton'
import { ViewToggle } from '@/components/ViewToggle'
import { SearchBar } from '@/components/SearchBar'

type SortOrder = 'asc' | 'desc'
const VALID_SORT_FIELDS = ['name', 'role', 'status', 'race', 'age', 'affiliation'] as const
type SortField = (typeof VALID_SORT_FIELDS)[number]

function sortLink(view: string, currentSortBy: string, currentSortOrder: string, col: string, search: string) {
  const order = currentSortBy === col ? (currentSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
  const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
  return `?view=${view}&sortBy=${col}&sortOrder=${order}${searchParam}`
}

function SortIcon({ sortBy, sortOrder, column }: { sortBy: string; sortOrder: string; column: string }) {
  if (sortBy !== column) return <span style={{ color: '#374151', marginLeft: '3px' }}>↕</span>
  return <span style={{ color: '#a78bfa', marginLeft: '3px' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
}

export default async function CharactersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; sortBy?: string; sortOrder?: string; search?: string }>
}) {
  const { view = 'card', sortBy: rawSortBy = 'name', sortOrder: rawSortOrder = 'asc', search = '' } = await searchParams
  const sortBy: SortField = VALID_SORT_FIELDS.includes(rawSortBy as SortField) ? (rawSortBy as SortField) : 'name'
  const sortOrder: SortOrder = rawSortOrder === 'desc' ? 'desc' : 'asc'

  const where = search
    ? {
        OR: [
          { name: { contains: search } },
          { role: { contains: search } },
          { status: { contains: search } },
          { race: { contains: search } },
          { affiliation: { contains: search } },
          { description: { contains: search } },
          { currentCase: { contains: search } },
          { gender: { contains: search } },
        ],
      }
    : {}

  const characters = await prisma.character.findMany({ where, orderBy: { [sortBy]: sortOrder } })

  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold tracking-widest uppercase arcane-glow"
            style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
          >
            👤 Characters
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            Agents, suspects, and persons of interest
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search characters…" />
          </Suspense>
          <Suspense fallback={null}>
            <ViewToggle />
          </Suspense>
          <SyncFromSheetButton />
          <Link
            href="/characters/new"
            className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}
          >
            + New Character
          </Link>
        </div>
      </div>

      {characters.length === 0 ? (
        <div
          className="text-center py-20 rounded-lg"
          style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}
        >
          No characters recorded. Begin by adding an agent or person of interest.
        </div>
      ) : view === 'list' ? (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #1f2937' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Georgia, serif' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1f2937', backgroundColor: '#0d0d1a' }}>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'name', search)} style={{ color: sortBy === 'name' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Name<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="name" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'role', search)} style={{ color: sortBy === 'role' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Role<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="role" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'status', search)} style={{ color: sortBy === 'status' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="status" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'race', search)} style={{ color: sortBy === 'race' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Race<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="race" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'age', search)} style={{ color: sortBy === 'age' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Age<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="age" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(view, sortBy, sortOrder, 'affiliation', search)} style={{ color: sortBy === 'affiliation' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Affiliation<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="affiliation" />
                  </Link>
                </th>
                <th style={{ ...thStyle, textAlign: 'right', color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {characters.map((character) => (
                <tr key={character.id} className="hover-row-arcane" style={{ borderBottom: '1px solid #1a1a2e' }}>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0', fontSize: '14px' }}>
                    {character.name}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                    {character.role ? (
                      <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1e1133', color: '#a78bfa' }}>
                        {character.role}
                      </span>
                    ) : <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                    <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: character.status === 'Active' ? '#052e16' : '#1f1210', color: character.status === 'Active' ? '#4ade80' : '#f87171' }}>
                      {character.status ?? 'Unknown'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '13px' }}>
                    {character.race ?? <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '13px' }}>
                    {character.age ?? <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '13px' }}>
                    {character.affiliation ?? <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/characters/${character.id}`} className="text-xs px-3 py-1 rounded transition-colors hover:text-purple-300" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                      <Link href={`/characters/${character.id}/edit`} className="text-xs px-3 py-1 rounded transition-colors hover:text-amber-300" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                      <DeleteButton action={deleteCharacter.bind(null, character.id)} label={character.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((character) => (
            <div key={character.id} className="card-arcane rounded-lg p-5" style={{ fontFamily: 'Georgia, serif' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
                    {character.name}
                  </h2>
                  {character.role && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ backgroundColor: '#1e1133', color: '#a78bfa' }}
                    >
                      {character.role}
                    </span>
                  )}
                </div>
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
              {character.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: '#9ca3af' }}>
                  {character.description}
                </p>
              )}
              {character.race && (
                <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
                  🧬 {character.race}{character.gender ? ` · ${character.gender}` : ''}{character.age ? ` · Age ${character.age}` : ''}
                </p>
              )}
              {character.affiliation && (
                <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
                  📎 {character.affiliation}
                </p>
              )}
              {character.currentCase && (
                <p className="text-xs mb-3" style={{ color: '#6b7280' }}>
                  🗂 {character.currentCase}
                </p>
              )}
              <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid #1f2937' }}>
                <Link
                  href={`/characters/${character.id}`}
                  className="text-xs px-3 py-1.5 rounded transition-colors hover:text-purple-300"
                  style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}
                >
                  View
                </Link>
                <Link
                  href={`/characters/${character.id}/edit`}
                  className="text-xs px-3 py-1.5 rounded transition-colors hover:text-amber-300"
                  style={{ color: '#d97706', border: '1px solid #451a03' }}
                >
                  Edit
                </Link>
                <div className="ml-auto">
                  <DeleteButton
                    action={deleteCharacter.bind(null, character.id)}
                    label={character.name}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
