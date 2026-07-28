'use client'

import { useState, useTransition } from 'react'
import {
  approveImportQueueItem,
  rejectImportQueueItem,
  approveAllImportQueueItems,
  rejectAllImportQueueItems,
} from '@/app/actions'

type QueueItem = {
  id: number
  characterId: number | null
  characterName: string
  incomingData: Record<string, string | null>
  existingData: Record<string, string | null> | null
  createdAt: string
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  race: 'Race',
  gender: 'Gender',
  age: 'Age',
  role: 'Role',
  description: 'Description',
  stats: 'Stats',
  affiliation: 'Affiliation',
  currentCase: 'Current Case',
  currentLocation: 'Current Location',
  homeOrigin: 'Home / Origin',
  status: 'Status',
}

function DiffRow({
  field,
  incoming,
  existing,
}: {
  field: string
  incoming: string | null
  existing: string | null | undefined
}) {
  const label = FIELD_LABELS[field] ?? field
  const changed = incoming !== (existing ?? null)
  if (!changed) return null

  return (
    <tr style={{ borderTop: '1px solid #1f2937' }}>
      <td className="px-3 py-2 text-xs align-top" style={{ color: '#d97706', fontFamily: 'Georgia, serif', minWidth: '8rem' }}>
        {label}
      </td>
      <td className="px-3 py-2 text-xs align-top max-w-xs break-words" style={{ color: '#f87171' }}>
        {existing ?? <span className="italic" style={{ color: '#6b7280' }}>—</span>}
      </td>
      <td className="px-3 py-2 text-xs align-top max-w-xs break-words" style={{ color: '#4ade80' }}>
        {incoming ?? <span className="italic" style={{ color: '#6b7280' }}>—</span>}
      </td>
    </tr>
  )
}

function QueueCard({ item, onReviewed }: { item: QueueItem; onReviewed: (id: number) => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handle(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        onReviewed(item.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  const changedFields = Object.keys(item.incomingData).filter(
    (k) => item.incomingData[k] !== (item.existingData?.[k] ?? null)
  )

  const buttonBase = 'rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-50'

  return (
    <div
      className="rounded-lg mb-4"
      style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1f2937' }}>
        <div>
          <span className="font-semibold" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
            {item.characterName}
          </span>
          <span className="ml-2 text-xs" style={{ color: '#6b7280' }}>
            {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} changed · queued{' '}
            {new Date(item.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handle(() => approveImportQueueItem(item.id))}
            disabled={isPending}
            className={buttonBase}
            style={{ backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857' }}
          >
            ✓ Approve
          </button>
          <button
            onClick={() => handle(() => rejectImportQueueItem(item.id))}
            disabled={isPending}
            className={buttonBase}
            style={{ backgroundColor: '#450a0a', color: '#f87171', border: '1px solid #7f1d1d' }}
          >
            ✗ Reject
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#0d0d14' }}>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>Field</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider" style={{ color: '#f87171' }}>Current (DB)</th>
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider" style={{ color: '#4ade80' }}>Incoming (Sheet)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(item.incomingData).map((field) => (
              <DiffRow
                key={field}
                field={field}
                incoming={item.incomingData[field]}
                existing={item.existingData?.[field]}
              />
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="px-4 py-2 text-xs" style={{ color: '#f87171', borderTop: '1px solid #1f2937' }}>
          ⚠ {error}
        </p>
      )}
    </div>
  )
}

export function ImportQueueClient({ items: initialItems }: { items: QueueItem[] }) {
  const [items, setItems] = useState<QueueItem[]>(initialItems)
  const [bulkPending, startBulkTransition] = useTransition()
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  function handleReviewed(id: number) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  function handleBulk(action: () => Promise<{ approved?: number; rejected?: number }>, label: string) {
    setBulkMessage(null)
    setBulkError(null)
    startBulkTransition(async () => {
      try {
        const result = await action()
        const count = result.approved ?? result.rejected ?? 0
        setBulkMessage(`✓ ${count} item${count !== 1 ? 's' : ''} ${label}`)
        setItems([])
      } catch (err) {
        setBulkError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  const buttonBase = 'rounded px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-50'

  if (items.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-center"
        style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}
      >
        {bulkMessage ? (
          <p style={{ color: '#4ade80', fontFamily: 'Georgia, serif' }}>{bulkMessage}</p>
        ) : (
          <p style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            No pending import changes. Sync from the sheet to populate this queue.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
          {items.length} pending change{items.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleBulk(approveAllImportQueueItems, 'approved')}
            disabled={bulkPending}
            className={buttonBase}
            style={{ backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857', fontFamily: 'Georgia, serif' }}
          >
            ✓ Approve All
          </button>
          <button
            onClick={() => handleBulk(rejectAllImportQueueItems, 'rejected')}
            disabled={bulkPending}
            className={buttonBase}
            style={{ backgroundColor: '#450a0a', color: '#f87171', border: '1px solid #7f1d1d', fontFamily: 'Georgia, serif' }}
          >
            ✗ Reject All
          </button>
        </div>
      </div>

      {bulkError && (
        <p className="mb-4 text-sm" style={{ color: '#f87171', fontFamily: 'Georgia, serif' }}>
          ⚠ {bulkError}
        </p>
      )}

      {items.map((item) => (
        <QueueCard key={item.id} item={item} onReviewed={handleReviewed} />
      ))}
    </div>
  )
}
