'use client'

import { useState } from 'react'
import { syncCharactersFromSheet, syncCharactersToSheet } from '@/app/actions'

type FromSheetResult = { created: number; updated: number; queued: number; error?: string } | null
type ToSheetResult = { updated: number; skipped: number; error?: string } | null
type Direction = 'from' | 'to'

export function SyncFromSheetButton() {
  const [loading, setLoading] = useState(false)
  const [fromResult, setFromResult] = useState<FromSheetResult>(null)
  const [toResult, setToResult] = useState<ToSheetResult>(null)

  async function handleSync(direction: Direction) {
    setLoading(true)
    setFromResult(null)
    setToResult(null)
    try {
      if (direction === 'from') {
        const res = await syncCharactersFromSheet()
        setFromResult(res)
      } else {
        const res = await syncCharactersToSheet()
        setToResult(res)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error'
      if (direction === 'from') {
        setFromResult({ created: 0, updated: 0, queued: 0, error: msg })
      } else {
        setToResult({ updated: 0, skipped: 0, error: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  const buttonBase =
    'rounded px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-50'
  const buttonStyle = { backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857' }

  const activeResult = fromResult ?? toResult
  let resultMessage: string | null = null
  if (fromResult) {
    if (fromResult.error) {
      resultMessage = `⚠ ${fromResult.error}`
    } else {
      const parts = [`${fromResult.created} created`, `${fromResult.updated} unchanged`]
      if (fromResult.queued > 0) {
        parts.push(`${fromResult.queued} queued for review`)
      }
      resultMessage = `✓ ${parts.join(', ')}`
    }
  } else if (toResult) {
    resultMessage = toResult.error
      ? `⚠ ${toResult.error}`
      : `✓ ${toResult.updated} updated, ${toResult.skipped} skipped`
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row">
        <button
          onClick={() => handleSync('from')}
          disabled={loading}
          className={buttonBase}
          style={buttonStyle}
        >
          {loading ? '⏳ Syncing…' : '⬇ Sheet → DB'}
        </button>
        <button
          onClick={() => handleSync('to')}
          disabled={loading}
          className={buttonBase}
          style={buttonStyle}
        >
          {loading ? '⏳ Syncing…' : '⬆ DB → Sheet'}
        </button>
      </div>
      {resultMessage && (
        <p
          className="text-xs text-left sm:text-right"
          style={{
            color: activeResult?.error ? '#f87171' : '#4ade80',
          }}
        >
          {resultMessage}
        </p>
      )}
      {fromResult && !fromResult.error && fromResult.queued > 0 && (
        <a
          href="/admin/import-queue"
          className="text-xs text-left sm:text-right hover:underline"
          style={{ color: '#d97706' }}
        >
          → Review {fromResult.queued} pending change{fromResult.queued !== 1 ? 's' : ''} in Import Queue
        </a>
      )}
    </div>
  )
}
