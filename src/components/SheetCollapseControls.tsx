'use client'

export function SheetCollapseControls() {
  const expandAll = () => window.dispatchEvent(new Event('arcane:expandAll'))
  const collapseAll = () => window.dispatchEvent(new Event('arcane:collapseAll'))

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={expandAll}
        className="text-xs px-3 py-1.5 rounded transition-colors hover:text-purple-300"
        style={{ color: '#9ca3af', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}
      >
        ↕ Expand All
      </button>
      <button
        type="button"
        onClick={collapseAll}
        className="text-xs px-3 py-1.5 rounded transition-colors hover:text-purple-300"
        style={{ color: '#9ca3af', border: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}
      >
        ↕ Collapse All
      </button>
    </div>
  )
}
