'use client'

import React from 'react'
import Link from 'next/link'
import { DynamicDataGrid, ColumnConfig } from './DynamicDataGrid'
import { DeleteButton } from './DeleteButton'
import { CharacterQuickEdit } from './CharacterQuickEdit'
import { createQuickEditCharacter } from '@/lib/characterUtils'

interface CharacterRowData {
  id: number
  name: string
  role: string | null
  status: string | null
  race: string | null
  age: bigint | null
  affiliation: string | null
  imageUrl: string | null
  displayImageUrl: string | null
  tags: Array<{ id: number; name: string }>
}

interface CharacterGridProps {
  characters: CharacterRowData[]
  isAdmin: boolean
  destinationFor: (characterId: number, suffix?: string) => string
  deleteCharacter: (id: number) => Promise<void>
  quickUpdateCharacter: (id: number, updates: any) => Promise<void>
}

export function CharacterDataGrid({
  characters,
  isAdmin,
  destinationFor,
  deleteCharacter,
  quickUpdateCharacter,
}: CharacterGridProps) {
  const columns: ColumnConfig<CharacterRowData>[] = [
    {
      id: 'name',
      label: 'Name',
      field: 'name',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultWidth: '180px',
      renderer: (value, row) => (
        <div>
          <div style={{ color: '#e2e8f0' }}>{value}</div>
          {row.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {row.tags.map((tag) => (
                <span key={tag.id} className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: '#1e1133', color: '#a78bfa' }}>
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'photo',
      label: 'Photo',
      field: 'displayImageUrl' as any,
      sortable: false,
      filterable: false,
      defaultVisible: true,
      defaultWidth: '60px',
      renderer: (value, row) => (
        row.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value ?? row.imageUrl}
            alt={`${row.name} thumbnail`}
            loading="lazy"
            className="h-12 w-12 rounded object-contain"
            style={{ border: '1px solid #1f2937', backgroundColor: '#07070d' }}
          />
        ) : (
          <span style={{ color: '#374151' }}>—</span>
        )
      ),
    },
    {
      id: 'role',
      label: 'Role',
      field: 'role',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultWidth: '120px',
      renderer: (value) => (
        value ? (
          <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1e1133', color: '#a78bfa', fontSize: '12px' }}>
            {value}
          </span>
        ) : (
          <span style={{ color: '#374151' }}>—</span>
        )
      ),
    },
    {
      id: 'status',
      label: 'Status',
      field: 'status',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultWidth: '110px',
      renderer: (value) => (
        <span
          className="px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: value === 'Active' ? '#052e16' : '#1f1210',
            color: value === 'Active' ? '#4ade80' : '#f87171',
            fontSize: '12px',
          }}
        >
          {value ?? 'Unknown'}
        </span>
      ),
    },
    {
      id: 'race',
      label: 'Race',
      field: 'race',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultWidth: '100px',
    },
    {
      id: 'age',
      label: 'Age',
      field: 'age',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultWidth: '70px',
      renderer: (value) => (value != null ? value.toString() : <span style={{ color: '#374151' }}>—</span>),
    },
    {
      id: 'affiliation',
      label: 'Affiliation',
      field: 'affiliation',
      sortable: true,
      filterable: true,
      defaultVisible: true,
      defaultWidth: '130px',
    },
  ]

  return (
    <DynamicDataGrid<CharacterRowData>
      entityType="characters"
      columns={columns}
      rows={characters}
      rowKey="id"
      actions={(row) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href={destinationFor(row.id)}
            className="text-xs px-3 py-1 rounded transition-colors hover:text-purple-300"
            style={{ color: '#8b5cf6', border: '1px solid #3b1f6e' }}
          >
            View
          </Link>
          <Link
            href={destinationFor(row.id, '/sheet')}
            className="text-xs px-3 py-1 rounded transition-colors hover:text-cyan-300"
            style={{ color: '#06b6d4', border: '1px solid #164e63' }}
          >
            Sheet
          </Link>
          <Link
            href={destinationFor(row.id, '/edit')}
            className="text-xs px-3 py-1 rounded transition-colors hover:text-amber-300"
            style={{ color: '#d97706', border: '1px solid #451a03' }}
          >
            Edit
          </Link>
          <DeleteButton action={deleteCharacter.bind(null, row.id)} label={row.name} />
          {isAdmin && (
            <CharacterQuickEdit
              character={createQuickEditCharacter({
                name: row.name,
                role: row.role,
                status: row.status,
                affiliation: row.affiliation,
                currentCase: null,
                currentLocation: null,
                race: row.race,
                gender: null,
                age: row.age,
              })}
              action={quickUpdateCharacter.bind(null, row.id)}
            />
          )}
        </div>
      )}
    />
  )
}
