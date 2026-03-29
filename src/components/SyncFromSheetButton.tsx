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
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#065f46', color: '#6ee7b7', border: '1px solid #047857', fontFamily: 'Georgia, serif' }}
      >
        {loading ? '⏳ Syncing…' : '🔄 Sync from Sheet'}
      </button>
      {result && (
        <p
          className="text-xs"
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
