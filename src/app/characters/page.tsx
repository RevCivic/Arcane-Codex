export const dynamic = 'force-dynamic'

import { Prisma } from '@/generated/prisma'
import { getLocalCharacterThumbnailUrl, getPreferredCharacterImageUrl } from '@/lib/characterImage'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { access } from 'node:fs/promises'
import path from 'node:path'
import { Suspense } from 'react'
import { deleteCharacter, quickUpdateCharacter } from '@/app/actions'
import { auth } from '@/auth'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { CharacterQuickEdit, CharacterQuickEditProvider } from '@/components/CharacterQuickEdit'
import { DeleteButton } from '@/components/DeleteButton'
import { SyncFromSheetButton } from '@/components/SyncFromSheetButton'
import { ViewToggle } from '@/components/ViewToggle'
import { SearchBar } from '@/components/SearchBar'
import { TagFilter } from '@/components/TagFilter'
import { parseSortField, SortOrder } from '@/lib/sortParams'
import { EntityFilterPanel } from '@/components/EntityFilterPanel'
import { entityDestination } from '@/lib/listNavigation'

const VALID_SORT_FIELDS = ['name', 'role', 'status', 'race', 'age', 'affiliation'] as const
type SortField = (typeof VALID_SORT_FIELDS)[number]

function sortLink(params: URLSearchParams, currentSortBy: string, currentSortOrder: string, col: string) {
  const order = currentSortBy === col ? (currentSortOrder === 'asc' ? 'desc' : 'asc') : 'asc'
  const next = new URLSearchParams(params)
  next.set('sortBy', col)
  next.set('sortOrder', order)
  return `?${next.toString()}`
}

function SortIcon({ sortBy, sortOrder, column }: { sortBy: string; sortOrder: string; column: string }) {
  if (sortBy !== column) return <span style={{ color: '#374151', marginLeft: '3px' }}>↕</span>
  return <span style={{ color: '#a78bfa', marginLeft: '3px' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
}

async function hasLocalThumbnail(imageUrl: string): Promise<boolean> {
  const thumbnailUrl = getLocalCharacterThumbnailUrl(imageUrl)
  if (!thumbnailUrl) return false

  try {
    await access(path.join(process.cwd(), 'public', thumbnailUrl.replace(/^\/+/, '')))
    return true
  } catch {
    return false
  }
}

export default async function CharactersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const rawParams = await searchParams
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  const accessRecord = email ? await prisma.allowedEmail.findUnique({ where: { email }, select: { role: true } }) : null
  const isAdmin = accessRecord?.role === AccessRole.ADMIN
  const value = (name: string) => typeof rawParams[name] === 'string' ? rawParams[name] : ''
  const view = value('view') || 'card'
  const rawSortBy = value('sortBy') || 'name'
  const rawSortOrder = value('sortOrder') || 'asc'
  const search = value('search')
  const tags = value('tags')
  const sortBy: SortField = parseSortField(VALID_SORT_FIELDS, rawSortBy, 'name')
  const sortOrder: SortOrder = rawSortOrder === 'desc' ? 'desc' : 'asc'
  const selectedTags = tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const whereClauses: Prisma.CharacterWhereInput[] = []

  if (search) {
    whereClauses.push({
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
    })
  }

  if (selectedTags.length > 0) {
    whereClauses.push({
      AND: selectedTags.map((tag) => ({
        tags: {
          some: { name: tag },
        },
      })),
    })
  }

  const exactFilters = ['status', 'affiliation', 'race', 'gender', 'role', 'currentCase', 'currentLocation'] as const
  for (const field of exactFilters) {
    const filterValue = value(field)
    if (filterValue) whereClauses.push({ [field]: filterValue })
  }

  const minimumAge = /^\d+$/.test(value('ageMin')) ? BigInt(value('ageMin')) : null
  const maximumAge = /^\d+$/.test(value('ageMax')) ? BigInt(value('ageMax')) : null
  if (minimumAge !== null || maximumAge !== null) {
    whereClauses.push({ age: { gte: minimumAge ?? undefined, lte: maximumAge ?? undefined } })
  }

  if (value('hasImage') === 'yes') {
    whereClauses.push({ imageUrl: { not: null } }, { NOT: { imageUrl: '' } })
  } else if (value('hasImage') === 'no') {
    whereClauses.push({ OR: [{ imageUrl: null }, { imageUrl: '' }] })
  }

  const where = whereClauses.length > 0 ? ({ AND: whereClauses } satisfies Prisma.CharacterWhereInput) : undefined

  const [characters, allTags, filterCharacters] = await Promise.all([
    prisma.character.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      include: { tags: { orderBy: { name: 'asc' } } },
    }),
    prisma.tag.findMany({ orderBy: { name: 'asc' }, select: { name: true } }),
    prisma.character.findMany({
      select: { status: true, affiliation: true, race: true, gender: true, role: true, currentCase: true, currentLocation: true },
    }),
  ])
  const optionsFor = (field: keyof (typeof filterCharacters)[number]) =>
    [...new Set(filterCharacters.map((character) => character[field]).filter((item): item is string => Boolean(item)))].sort((a, b) => a.localeCompare(b))
  const queryParams = new URLSearchParams()
  for (const [name, paramValue] of Object.entries(rawParams)) {
    if (typeof paramValue === 'string' && paramValue) queryParams.set(name, paramValue)
  }
  const listPath = `/characters${queryParams.size ? `?${queryParams.toString()}` : ''}`
  const destinationFor = (characterId: number, suffix = '') => entityDestination(`/characters/${characterId}${suffix}`, `${listPath}#character-${characterId}`)
  const charactersWithDisplayImages = await Promise.all(
    characters.map(async (character) => ({
      ...character,
      displayImageUrl: character.imageUrl
        ? getPreferredCharacterImageUrl(character.imageUrl, await hasLocalThumbnail(character.imageUrl))
        : null,
    })),
  )

  const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'left', fontFamily: 'Georgia, serif', whiteSpace: 'nowrap' }

  const quickCharacter = (character: (typeof charactersWithDisplayImages)[number]) => ({
    name: character.name, role: character.role, status: character.status,
    affiliation: character.affiliation, currentCase: character.currentCase,
    currentLocation: character.currentLocation, race: character.race, gender: character.gender,
    age: character.age?.toString() ?? null,
  })

  const content = (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
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
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <Suspense fallback={null}>
            <SearchBar placeholder="Search characters…" />
          </Suspense>
          <div className="flex flex-wrap items-center gap-2">
            <Suspense fallback={null}>
              <ViewToggle />
            </Suspense>
            <SyncFromSheetButton />
            <Link
              href="/characters/new"
              className="w-full px-4 py-2 rounded text-center text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 sm:w-auto sm:text-left sm:whitespace-nowrap"
              style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}
            >
              + New Character
            </Link>
            <Link
              href="/characters/bulk"
              className="w-full px-4 py-2 rounded text-center text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:text-purple-300 sm:w-auto sm:text-left sm:whitespace-nowrap"
              style={{ border: '1px solid #3b1f6e', color: '#a78bfa', fontFamily: 'Georgia, serif' }}
            >
              Bulk Entry
            </Link>
          </div>
        </div>
      </div>
      <Suspense fallback={null}>
        <TagFilter tags={allTags.map((tag) => tag.name)} />
      </Suspense>
      <Suspense fallback={null}>
        <EntityFilterPanel
          storageKey="arcane-codex:default-filter:characters"
          managedParams={['status', 'affiliation', 'race', 'gender', 'role', 'currentCase', 'currentLocation', 'ageMin', 'ageMax', 'hasImage', 'tags']}
          fields={[
            { name: 'status', label: 'Status', options: optionsFor('status') },
            { name: 'affiliation', label: 'Affiliation', options: optionsFor('affiliation') },
            { name: 'race', label: 'Race', options: optionsFor('race') },
            { name: 'gender', label: 'Gender', options: optionsFor('gender') },
            { name: 'role', label: 'Role', options: optionsFor('role') },
            { name: 'currentCase', label: 'Case', options: optionsFor('currentCase') },
            { name: 'currentLocation', label: 'Location', options: optionsFor('currentLocation') },
            { name: 'ageMin', label: 'Minimum age', type: 'number', placeholder: 'From' },
            { name: 'ageMax', label: 'Maximum age', type: 'number', placeholder: 'To' },
            { name: 'hasImage', label: 'Has image', options: ['yes', 'no'] },
          ]}
        />
      </Suspense>

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
                  <Link href={sortLink(queryParams, sortBy, sortOrder, 'name')} style={{ color: sortBy === 'name' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Name<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="name" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <span style={{ color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Photo
                  </span>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(queryParams, sortBy, sortOrder, 'role')} style={{ color: sortBy === 'role' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Role<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="role" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(queryParams, sortBy, sortOrder, 'status')} style={{ color: sortBy === 'status' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="status" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(queryParams, sortBy, sortOrder, 'race')} style={{ color: sortBy === 'race' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Race<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="race" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(queryParams, sortBy, sortOrder, 'age')} style={{ color: sortBy === 'age' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Age<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="age" />
                  </Link>
                </th>
                <th style={thStyle}>
                  <Link href={sortLink(queryParams, sortBy, sortOrder, 'affiliation')} style={{ color: sortBy === 'affiliation' ? '#a78bfa' : '#6b7280', textDecoration: 'none', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Affiliation<SortIcon sortBy={sortBy} sortOrder={sortOrder} column="affiliation" />
                  </Link>
                </th>
                <th style={{ ...thStyle, textAlign: 'right', color: '#6b7280', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {charactersWithDisplayImages.map((character) => (
                <tr id={`character-${character.id}`} key={character.id} className="hover-row-arcane" style={{ borderBottom: '1px solid #1a1a2e' }}>
                  <td style={{ padding: '10px 12px', color: '#e2e8f0', fontSize: '14px' }}>
                    <div>{character.name}</div>
                    {character.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {character.tags.map((tag) => (
                          <span key={tag.id} className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: '#1e1133', color: '#a78bfa' }}>
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {character.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={character.displayImageUrl ?? character.imageUrl}
                        alt={`${character.name} thumbnail`}
                        loading="lazy"
                        className="h-12 w-12 rounded object-contain"
                        style={{ border: '1px solid #1f2937', backgroundColor: '#07070d' }}
                      />
                    ) : (
                      <span style={{ color: '#374151' }}>—</span>
                    )}
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
                    {character.age !== null && character.age !== undefined ? character.age.toString() : <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '13px' }}>
                    {character.affiliation ?? <span style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link href={destinationFor(character.id)} className="text-xs px-3 py-1 rounded transition-colors hover:text-purple-300" style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}>View</Link>
                      <Link href={destinationFor(character.id, '/sheet')} className="text-xs px-3 py-1 rounded transition-colors hover:text-cyan-300" style={{ color: '#06b6d4', border: '1px solid #164e63' }}>Sheet</Link>
                      <Link href={destinationFor(character.id, '/edit')} className="text-xs px-3 py-1 rounded transition-colors hover:text-amber-300" style={{ color: '#d97706', border: '1px solid #451a03' }}>Edit</Link>
                      <DeleteButton action={deleteCharacter.bind(null, character.id)} label={character.name} />
                    </div>
                    {isAdmin && <CharacterQuickEdit character={quickCharacter(character)} action={quickUpdateCharacter.bind(null, character.id)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {charactersWithDisplayImages.map((character) => (
            <div id={`character-${character.id}`} key={character.id} className="card-arcane rounded-lg p-5" style={{ fontFamily: 'Georgia, serif' }}>
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
              {character.imageUrl && (
                <div className="mb-3">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded" style={{ border: '1px solid #1f2937', backgroundColor: '#07070d' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={character.displayImageUrl ?? character.imageUrl}
                      alt={`${character.name} thumbnail`}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              )}
              {character.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: '#9ca3af' }}>
                  {character.description}
                </p>
              )}
              {character.race && (
                <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
                  🧬 {character.race}{character.gender ? ` · ${character.gender}` : ''}{character.age !== null && character.age !== undefined ? ` · Age ${character.age.toString()}` : ''}
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
              {character.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {character.tags.map((tag) => (
                    <span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#1e1133', color: '#a78bfa' }}>
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-2" style={{ borderTop: '1px solid #1f2937' }}>
                <Link
                  href={destinationFor(character.id)}
                  className="text-xs px-3 py-1.5 rounded transition-colors hover:text-purple-300"
                  style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}
                >
                  View
                </Link>
                <Link
                  href={destinationFor(character.id, '/sheet')}
                  className="text-xs px-3 py-1.5 rounded transition-colors hover:text-cyan-300"
                  style={{ color: '#06b6d4', border: '1px solid #164e63' }}
                >
                  Sheet
                </Link>
                <Link
                  href={destinationFor(character.id, '/edit')}
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
              {isAdmin && <CharacterQuickEdit character={quickCharacter(character)} action={quickUpdateCharacter.bind(null, character.id)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return isAdmin ? <CharacterQuickEditProvider>{content}</CharacterQuickEditProvider> : content
}
