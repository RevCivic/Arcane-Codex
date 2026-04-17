'use client'

import { useState } from 'react'
import { syncCharactersFromSheet } from '@/app/actions'

type SyncResult = { created: number; updated: number; error?: string } | null

export function SyncFromSheetButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SyncResult>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const res = await syncCharactersFromSheet()
      setResult(res)
    } catch (err) {
      setResult({ created: 0, updated: 0, error: err instanceof Error ? err.message : 'Unexpected error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <button
        onClick={handleSync}
        disabled={loading}
        className="w-full rounded px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-50 sm:w-auto"
        style={{ backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857', fontFamily: 'Georgia, serif' }}
      >
        {loading ? '⏳ Syncing…' : '🔄 Sync from Sheet'}
      </button>
      {result && (
        <p
          className="text-xs break-words text-left sm:text-right"
          style={{
            color: result.error ? '#f87171' : '#4ade80',
            fontFamily: 'Georgia, serif',
          }}
        >
          {result.error
            ? `⚠ ${result.error}`
            : `✓ ${result.created} created, ${result.updated} updated`}
        </p>
      )}
    </div>
  )
}
