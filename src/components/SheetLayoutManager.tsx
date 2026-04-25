'use client'

import { useState, useCallback, useRef, useSyncExternalStore } from 'react'

export interface SheetModule {
  key: string
  label: string
  content: React.ReactNode
}

interface Props {
  modules: SheetModule[]
  isAdmin: boolean
  characterId: number
}

const BTN_BASE = 'text-xs px-3 py-1.5 rounded transition-colors hover:text-purple-300'
const BTN_PRIMARY = 'text-xs px-3 py-1.5 rounded transition-colors hover:opacity-80 font-semibold uppercase tracking-wider'

// ── Custom hook: reads/writes layout order from localStorage ──────────────────

interface OrderCache {
  raw: string | null
  result: string[]
}

function useStoredOrder(
  storageKey: string,
  defaultOrder: string[],
): [string[], (order: string[]) => void] {
  // Keep a stable ref to the default order so getSnapshot doesn't need it as a dep.
  // defaultOrder is derived from server props (module keys) which don't change at runtime.
  const defaultRef = useRef<string[]>(defaultOrder)

  // Cache last parsed result to ensure reference stability (useSyncExternalStore requires it).
  // Initialize raw as null: if no layout is stored, the first snapshot will also see null
  // and correctly return defaultOrder from the cache.
  const cacheRef = useRef<OrderCache>({ raw: null, result: defaultOrder })

  const subscribe = useCallback(
    (callback: () => void) => {
      window.addEventListener('storage', callback)
      return () => window.removeEventListener('storage', callback)
    },
    [],
  )

  const getSnapshot = useCallback((): string[] => {
    const raw = localStorage.getItem(storageKey)
    if (cacheRef.current.raw === raw) return cacheRef.current.result

    const defaults = defaultRef.current
    if (!raw) {
      cacheRef.current = { raw, result: defaults }
      return defaults
    }
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) {
        cacheRef.current = { raw, result: defaults }
        return defaults
      }
      const validKeys = new Set(defaults)
      const filtered = (parsed as string[]).filter((k) => validKeys.has(k))
      const missing = defaults.filter((k) => !filtered.includes(k))
      const result = [...filtered, ...missing]
      cacheRef.current = { raw, result }
      return result
    } catch {
      cacheRef.current = { raw, result: defaults }
      return defaults
    }
  }, [storageKey])

  const getServerSnapshot = useCallback(() => defaultRef.current, [])

  const order = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const saveOrder = useCallback(
    (newOrder: string[]) => {
      localStorage.setItem(storageKey, JSON.stringify(newOrder))
      // Notify other tabs and trigger our own subscription
      window.dispatchEvent(new StorageEvent('storage', { key: storageKey }))
    },
    [storageKey],
  )

  return [order, saveOrder]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SheetLayoutManager({ modules, isAdmin, characterId }: Props) {
  const storageKey = isAdmin
    ? 'arcane-layout:admin'
    : `arcane-layout:char:${characterId}`

  const defaultOrder = modules.map((m) => m.key)

  const [savedOrder, persistOrder] = useStoredOrder(storageKey, defaultOrder)
  const [isEditing, setIsEditing] = useState(false)
  const [draftOrder, setDraftOrder] = useState<string[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const expandAll = useCallback(() => window.dispatchEvent(new Event('arcane:expandAll')), [])
  const collapseAll = useCallback(() => window.dispatchEvent(new Event('arcane:collapseAll')), [])

  const enterEditMode = useCallback(() => {
    setDraftOrder([...savedOrder])
    setIsEditing(true)
    window.dispatchEvent(new Event('arcane:collapseAll'))
  }, [savedOrder])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setDraftOrder([])
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  const saveLayout = useCallback(() => {
    persistOrder(draftOrder)
    setIsEditing(false)
    setDraftOrder([])
    setDragIndex(null)
    setDragOverIndex(null)
  }, [persistOrder, draftOrder])

  // ── Drag handlers ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault()
      if (dragIndex === null || dragIndex === targetIndex) {
        setDragIndex(null)
        setDragOverIndex(null)
        return
      }
      const newOrder = [...draftOrder]
      const [removed] = newOrder.splice(dragIndex, 1)
      newOrder.splice(targetIndex, 0, removed)
      setDraftOrder(newOrder)
      setDragIndex(null)
      setDragOverIndex(null)
    },
    [dragIndex, draftOrder],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  // ── Resolve display order ────────────────────────────────────────────────────

  const currentOrder = isEditing ? draftOrder : savedOrder
  const orderedModules = currentOrder
    .map((key) => modules.find((m) => m.key === key))
    .filter((m): m is SheetModule => m != null)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Controls bar ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 mb-6 flex-wrap"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {isEditing ? (
          <>
            <span
              className="text-xs flex-1"
              style={{ color: '#a78bfa', fontFamily: 'Georgia, serif' }}
            >
              ✦ Drag modules to reorder — unsaved until you click Save Layout
            </span>
            <button
              type="button"
              onClick={saveLayout}
              className={BTN_PRIMARY}
              style={{ backgroundColor: '#7c3aed', color: '#fff' }}
            >
              💾 Save Layout
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className={BTN_BASE}
              style={{ color: '#9ca3af', border: '1px solid #374151' }}
            >
              ✕ Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={expandAll}
              className={BTN_BASE}
              style={{ color: '#9ca3af', border: '1px solid #1f2937' }}
            >
              ▾ Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className={BTN_BASE}
              style={{ color: '#9ca3af', border: '1px solid #1f2937' }}
            >
              ▸ Collapse All
            </button>
            <button
              type="button"
              onClick={enterEditMode}
              className={BTN_BASE}
              style={{ color: '#a78bfa', border: '1px solid #3b1f6e' }}
            >
              ✦ Edit Layout
            </button>
          </>
        )}
      </div>

      {/* ── Module list ─────────────────────────────────────────────────── */}
      <div className={isEditing ? 'select-none' : undefined}>
        {orderedModules.map((module, index) => {
          const isDragging = dragIndex === index
          const isDropTarget = isEditing && dragOverIndex === index && dragIndex !== index

          return (
            <div
              key={module.key}
              className="mb-8"
              draggable={isEditing}
              onDragStart={isEditing ? (e) => handleDragStart(e, index) : undefined}
              onDragOver={isEditing ? (e) => handleDragOver(e, index) : undefined}
              onDrop={isEditing ? (e) => handleDrop(e, index) : undefined}
              onDragEnd={isEditing ? handleDragEnd : undefined}
              style={{
                opacity: isDragging ? 0.4 : 1,
                transition: 'opacity 0.15s',
                outline: isDropTarget ? '2px dashed #7c3aed' : '2px solid transparent',
                outlineOffset: '4px',
                borderRadius: '8px',
                cursor: isEditing ? 'grab' : undefined,
              }}
            >
              {/* Drag handle — only visible in edit mode */}
              {isEditing && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    marginBottom: '6px',
                    backgroundColor: '#1e1133',
                    border: '1px solid #3b1f6e',
                    borderRadius: '6px',
                    color: '#a78bfa',
                    fontSize: '11px',
                    userSelect: 'none',
                    cursor: 'grab',
                    fontFamily: 'Georgia, serif',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span style={{ fontSize: '16px', lineHeight: 1, color: '#6b7280' }}>⠿</span>
                  {module.label}
                </div>
              )}

              {/* Module content — pointer events disabled during edit to avoid accidental toggles */}
              <div style={{ pointerEvents: isEditing ? 'none' : undefined }}>
                {module.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
