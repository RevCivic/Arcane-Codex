'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function ViewToggle() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const currentView = searchParams.get('view') ?? 'card'

  const setView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div
      className="flex items-center gap-1 p-0.5 rounded"
      style={{ border: '1px solid #1f2937' }}
      title="Toggle view"
    >
      <button
        onClick={() => setView('card')}
        title="Card view"
        className="rounded transition-colors"
        style={{
          padding: '5px 9px',
          backgroundColor: currentView === 'card' ? '#3b1f6e' : 'transparent',
          color: currentView === 'card' ? '#a78bfa' : '#6b7280',
          border: 'none',
          cursor: 'pointer',
          fontSize: '15px',
          lineHeight: 1,
        }}
      >
        ⊞
      </button>
      <button
        onClick={() => setView('list')}
        title="List view"
        className="rounded transition-colors"
        style={{
          padding: '5px 9px',
          backgroundColor: currentView === 'list' ? '#3b1f6e' : 'transparent',
          color: currentView === 'list' ? '#a78bfa' : '#6b7280',
          border: 'none',
          cursor: 'pointer',
          fontSize: '15px',
          lineHeight: 1,
        }}
      >
        ☰
      </button>
    </div>
  )
}
