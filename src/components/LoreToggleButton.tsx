'use client'

import { useTransition } from 'react'
import { toggleLoreDocumentActive } from '@/app/actions'

type Props = { id: number; isActive: boolean }

export function LoreToggleButton({ id, isActive }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await toggleLoreDocumentActive(id, !isActive)
        })
      }}
      className="px-3 py-1.5 rounded text-xs hover:opacity-80 disabled:opacity-50"
      style={{
        backgroundColor: isActive ? '#052e16' : '#1f2937',
        color: isActive ? '#86efac' : '#9ca3af',
        border: `1px solid ${isActive ? '#16a34a44' : '#37415144'}`,
        fontFamily: 'Georgia, serif',
      }}
      title={isActive ? 'Deactivate (remove from AI context)' : 'Activate (include in AI context)'}
    >
      {isPending ? '…' : isActive ? 'Active' : 'Inactive'}
    </button>
  )
}
