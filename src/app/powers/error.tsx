'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function PowersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-2xl">
      <div className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: '#ef4444' }}>⚠ Error</h2>
        <p className="text-sm mb-6" style={{ color: '#e2e8f0' }}>{error.message}</p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-5 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Try Again
          </button>
          <Link
            href="/powers"
            className="px-5 py-2 rounded text-sm font-semibold uppercase tracking-wider"
            style={{ border: '1px solid #374151', color: '#9ca3af' }}
          >
            ← Powers
          </Link>
        </div>
      </div>
    </div>
  )
}
