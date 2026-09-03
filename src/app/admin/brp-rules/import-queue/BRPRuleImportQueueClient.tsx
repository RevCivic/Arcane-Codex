'use client'

import { useState, useTransition } from 'react'
import {
  approveBRPRuleImport,
  rejectBRPRuleImport,
} from '@/app/actions'

type QueueItem = {
  id: number
  ruleId: number | null
  ruleName: string
  incomingData: Record<string, string | null>
  existingData: Record<string, string | null> | null
  sourceUrl: string | null
  createdAt: string
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  section: 'Section',
  content: 'Content',
  sortOrder: 'Sort Order',
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

  const incomingPreview = incoming
    ? incoming.length > 200
      ? incoming.slice(0, 200) + '…'
      : incoming
    : '—'
  const existingPreview = existing
    ? existing.length > 200
      ? existing.slice(0, 200) + '…'
      : existing
    : '—'

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

  const changedFields = Object.keys(item.incomingData).filter(
    (k) => item.incomingData[k] !== (item.existingData?.[k] ?? null)
  )

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

  const buttonBase = 'rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-50'

  return (
    <div
      className="rounded-lg mb-4"
      style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1f2937' }}>
        <div>
          <span className="font-semibold" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
            {item.ruleName}
          </span>
          <span className="ml-2 text-xs" style={{ color: '#6b7280' }}>
            {item.ruleId ? 'Update' : 'New'} · {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} · queued{' '}
            {new Date(item.createdAt).toLocaleString()}
          </span>
          {item.sourceUrl && (
            <span className="ml-2 text-xs" style={{ color: '#6b7280' }}>
              📍 {item.sourceUrl}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handle(() => approveBRPRuleImport(item.id))}
            disabled={isPending}
            className={buttonBase}
            style={{ backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857' }}
          >
            ✓ Approve
          </button>
          <button
            onClick={() => handle(() => rejectBRPRuleImport(item.id))}
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
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wider" style={{ color: '#4ade80' }}>Incoming</th>
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

export function BRPRuleImportQueueClient({ items: initialItems }: { items: QueueItem[] }) {
  const [items, setItems] = useState<QueueItem[]>(initialItems)

  function handleReviewed(id: number) {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-center"
        style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}
      >
        <p style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          No pending rule imports. Import rules from https://brp.chaosium.com/basic-roleplaying/ to populate this queue.
        </p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
        {items.length} pending change{items.length !== 1 ? 's' : ''}
      </p>

      {items.map((item) => (
        <QueueCard key={item.id} item={item} onReviewed={handleReviewed} />
      ))}
    </div>
  )
}
