'use client'

import { useState, useCallback, useRef, useSyncExternalStore, useEffect } from 'react'
import { saveSheetLayoutPreference, type SheetLayoutPreferenceData } from '@/app/actions/sheetLayout'

export interface SheetModule {
  key: string
  label: string
  content: React.ReactNode
}

interface Props {
  modules: SheetModule[]
  isAdmin: boolean
  characterId: number
  initialPreference?: SheetLayoutPreferenceData
}

const BTN_BASE = 'text-xs px-3 py-1.5 rounded transition-colors hover:text-purple-300'
const BTN_PRIMARY = 'text-xs px-3 py-1.5 rounded transition-colors hover:opacity-80 font-semibold uppercase tracking-wider'

// ── Custom hook: reads/writes layout data from localStorage & server ────────

interface PreferenceCache {
  raw: string | null
  result: SheetLayoutPreferenceData
}

function useStoredPreference(
  storageKey: string,
  defaultModules: string[],
  initialPreference?: SheetLayoutPreferenceData,
): [SheetLayoutPreferenceData, (pref: SheetLayoutPreferenceData) => Promise<void>] {
  const defaultRef = useRef<SheetLayoutPreferenceData>({
    hiddenModules: [],
    moduleOrder: defaultModules,
    moduleSizes: {},
  })

  const cacheRef = useRef<PreferenceCache>({
    raw: null,
    result: (initialPreference && initialPreference.moduleOrder.length > 0) ? initialPreference : defaultRef.current,
  })

  const subscribe = useCallback(
    (callback: () => void) => {
      window.addEventListener('storage', callback)
      return () => window.removeEventListener('storage', callback)
    },
    [],
  )

  const getSnapshot = useCallback((): SheetLayoutPreferenceData => {
    const raw = localStorage.getItem(storageKey)
    if (cacheRef.current.raw === raw) return cacheRef.current.result

    const defaults = defaultRef.current
    if (!raw) {
      // Use initialPreference if it has a valid moduleOrder, otherwise use defaults
      const result = (initialPreference && initialPreference.moduleOrder.length > 0) ? initialPreference : defaults
      cacheRef.current = { raw, result }
      return result
    }
    try {
      const parsed = JSON.parse(raw) as unknown
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'hiddenModules' in parsed &&
        'moduleOrder' in parsed &&
        'moduleSizes' in parsed
      ) {
        const pref = parsed as SheetLayoutPreferenceData
        cacheRef.current = { raw, result: pref }
        return pref
      }
      cacheRef.current = { raw, result: defaults }
      return defaults
    } catch {
      cacheRef.current = { raw, result: defaults }
      return defaults
    }
  }, [storageKey, initialPreference])

  const getServerSnapshot = useCallback(() => (initialPreference && initialPreference.moduleOrder.length > 0) ? initialPreference : defaultRef.current, [initialPreference])

  const preference = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const savePreference = useCallback(
    (newPref: SheetLayoutPreferenceData) => {
      localStorage.setItem(storageKey, JSON.stringify(newPref))
      window.dispatchEvent(new StorageEvent('storage', { key: storageKey }))
      return Promise.resolve()
    },
    [storageKey],
  )

  return [preference, savePreference]
}

// ── Custom hook: detects touch-primary devices ────────────────────────────────

function useIsTouchDevice(): boolean {
  const getMatches = () =>
    typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false

  const [isTouch, setIsTouch] = useState(getMatches)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const handler = (e: MediaQueryListEvent) => setIsTouch(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isTouch
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SheetLayoutManager({
  modules,
  isAdmin,
  characterId,
  initialPreference,
}: Props) {
  const storageKey = isAdmin
    ? 'arcane-layout:admin'
    : `arcane-layout:char:${characterId}`

  const defaultOrder = modules.map((m) => m.key)
  const [preference, savePreferenceLocal] = useStoredPreference(
    storageKey,
    defaultOrder,
    initialPreference,
  )

  const [isEditing, setIsEditing] = useState(false)
  const [draftPreference, setDraftPreference] = useState<SheetLayoutPreferenceData>({ ...preference })
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showHiddenMenu, setShowHiddenMenu] = useState(false)

  const isTouchDevice = useIsTouchDevice()

  const expandAll = useCallback(() => window.dispatchEvent(new Event('arcane:expandAll')), [])
  const collapseAll = useCallback(() => window.dispatchEvent(new Event('arcane:collapseAll')), [])

  const enterEditMode = useCallback(() => {
    setDraftPreference({ ...preference })
    setIsEditing(true)
    window.dispatchEvent(new Event('arcane:collapseAll'))
  }, [preference])

  const cancelEdit = useCallback(() => {
    setIsEditing(false)
    setDraftPreference({ ...preference })
    setDragIndex(null)
    setDragOverIndex(null)
  }, [preference])

  const saveLayout = useCallback(async () => {
    await savePreferenceLocal(draftPreference)
    // Sync to server
    try {
      await saveSheetLayoutPreference(characterId, draftPreference)
    } catch {
      // Silently fail - local preference is still saved
    }
    setIsEditing(false)
    setDragIndex(null)
    setDragOverIndex(null)
  }, [draftPreference, characterId, savePreferenceLocal])

  const toggleHideModule = useCallback((key: string) => {
    setDraftPreference((prev) => {
      const hidden = new Set(prev.hiddenModules)
      if (hidden.has(key)) {
        hidden.delete(key)
      } else {
        hidden.add(key)
      }
      return { ...prev, hiddenModules: Array.from(hidden) }
    })
  }, [])

  const restoreModule = useCallback((key: string) => {
    setDraftPreference((prev) => ({
      ...prev,
      hiddenModules: prev.hiddenModules.filter((k) => k !== key),
    }))
  }, [])

  // ── Touch reorder handlers ───────────────────────────────────────────────────

  const moveUp = useCallback((index: number) => {
    setDraftPreference((prev) => {
      if (index === 0) return prev
      const newOrder = [...prev.moduleOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      return { ...prev, moduleOrder: newOrder }
    })
  }, [])

  const moveDown = useCallback((index: number) => {
    setDraftPreference((prev) => {
      if (index >= prev.moduleOrder.length - 1) return prev
      const newOrder = [...prev.moduleOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      return { ...prev, moduleOrder: newOrder }
    })
  }, [])

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

      setDraftPreference((prev) => {
        const newOrder = [...prev.moduleOrder]
        const [removed] = newOrder.splice(dragIndex, 1)
        newOrder.splice(targetIndex, 0, removed)
        return { ...prev, moduleOrder: newOrder }
      })

      setDragIndex(null)
      setDragOverIndex(null)
    },
    [dragIndex],
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  // ── Resolve display order ────────────────────────────────────────────────────

  const currentOrder = draftPreference.moduleOrder
  const orderedModules = currentOrder
    .map((key) => modules.find((m) => m.key === key))
    .filter((m): m is SheetModule => m != null)

  const visibleModules = orderedModules.filter((m) => !draftPreference.hiddenModules.includes(m.key))
  const hiddenModules = orderedModules.filter((m) => draftPreference.hiddenModules.includes(m.key))

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Controls bar ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 mb-6 flex-wrap"
        style={{  }}
      >
        {isEditing ? (
          <>
            <span
              className="text-xs flex-1"
              style={{ color: '#a78bfa' }}
            >
              {`✦ ${isTouchDevice ? 'Use ▲ ▼ buttons to reorder' : 'Drag modules to reorder'} — ${
                hiddenModules.length > 0 ? `${hiddenModules.length} hidden` : 'check visibility'
              }`}
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
              style={{ color: '#9ca3af', border: '1px solid #2a2a3e' }}
            >
              ▾ Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className={BTN_BASE}
              style={{ color: '#9ca3af', border: '1px solid #2a2a3e' }}
            >
              ▸ Collapse All
            </button>
            {hiddenModules.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHiddenMenu(!showHiddenMenu)}
                  className={BTN_BASE}
                  style={{ color: '#f59e0b', border: '1px solid #b45309' }}
                  title={`${hiddenModules.length} hidden module(s)`}
                >
                  👁️ {hiddenModules.length} Hidden
                </button>
                {showHiddenMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      backgroundColor: '#0d0d15',
                      border: '1px solid #3b1f6e',
                      borderRadius: '6px',
                      padding: '8px 0',
                      minWidth: '200px',
                      zIndex: 50,
                      marginTop: '4px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {hiddenModules.map((module) => (
                      <button
                        key={module.key}
                        type="button"
                        onClick={() => {
                          restoreModule(module.key)
                          setShowHiddenMenu(false)
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 12px',
                          textAlign: 'left',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#a78bfa',
                          fontSize: '12px',
                          cursor: 'pointer',
                          ,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1e1133'
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                        }}
                      >
                        👁️ {module.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
        {orderedModules.map((module, moduleIndex) => {
          const isHidden = draftPreference.hiddenModules.includes(module.key)
          const isDragging = dragIndex === moduleIndex
          const isDropTarget = isEditing && dragOverIndex === moduleIndex && dragIndex !== moduleIndex

          if (!isEditing && isHidden) {
            // Don't render hidden modules in non-edit mode
            return null
          }

          return (
            <div
              key={module.key}
              className="mb-8"
              draggable={isEditing && !isTouchDevice && !isHidden}
              onDragStart={isEditing && !isTouchDevice && !isHidden ? (e) => handleDragStart(e, moduleIndex) : undefined}
              onDragOver={isEditing && !isTouchDevice && !isHidden ? (e) => handleDragOver(e, moduleIndex) : undefined}
              onDrop={isEditing && !isTouchDevice && !isHidden ? (e) => handleDrop(e, moduleIndex) : undefined}
              onDragEnd={isEditing && !isTouchDevice && !isHidden ? handleDragEnd : undefined}
              style={{
                opacity: isDragging ? 0.4 : isHidden && isEditing ? 0.6 : 1,
                transition: 'opacity 0.15s',
                outline: isDropTarget ? '2px dashed #7c3aed' : '2px solid transparent',
                outlineOffset: '4px',
                borderRadius: '8px',
                cursor: isEditing && !isTouchDevice && !isHidden ? 'grab' : undefined,
                position: 'relative',
              }}
            >
              {/* Drag handle & module controls — only visible in edit mode */}
              {isEditing && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    marginBottom: '6px',
                    backgroundColor: isHidden ? '#2d1a4e' : '#1e1133',
                    border: `1px solid ${isHidden ? '#4b2971' : '#3b1f6e'}`,
                    borderRadius: '6px',
                    color: '#a78bfa',
                    fontSize: '11px',
                    userSelect: 'none',
                    cursor: isTouchDevice ? 'default' : isHidden ? 'default' : 'grab',
                    ,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {!isTouchDevice && !isHidden && (
                    <span style={{ fontSize: '16px', lineHeight: 1, color: '#a0a9b8' }}>⠿</span>
                  )}
                  <span style={{ flex: 1 }}>{module.label}</span>
                  <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    {isTouchDevice && !isHidden && (
                      <>
                        <button
                          type="button"
                          aria-label={`Move ${module.label} up`}
                          disabled={moduleIndex === 0}
                          onClick={() => moveUp(moduleIndex)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '4px',
                            border: '1px solid #3b1f6e',
                            backgroundColor: moduleIndex === 0 ? '#12091f' : '#2d1a4e',
                            color: moduleIndex === 0 ? '#6b7380' : '#a78bfa',
                            fontSize: '14px',
                            cursor: moduleIndex === 0 ? 'not-allowed' : 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${module.label} down`}
                          disabled={moduleIndex === orderedModules.length - 1}
                          onClick={() => moveDown(moduleIndex)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '4px',
                            border: '1px solid #3b1f6e',
                            backgroundColor: moduleIndex === orderedModules.length - 1 ? '#12091f' : '#2d1a4e',
                            color: moduleIndex === orderedModules.length - 1 ? '#6b7380' : '#a78bfa',
                            fontSize: '14px',
                            cursor: moduleIndex === orderedModules.length - 1 ? 'not-allowed' : 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          ▼
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      aria-label={isHidden ? `Show ${module.label}` : `Hide ${module.label}`}
                      onClick={() => toggleHideModule(module.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '4px',
                        border: '1px solid #3b1f6e',
                        backgroundColor: isHidden ? '#4b2971' : '#2d1a4e',
                        color: isHidden ? '#f59e0b' : '#a78bfa',
                        fontSize: '14px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                      title={isHidden ? 'Show module' : 'Hide module'}
                    >
                      {isHidden ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>
              )}

              {/* Module content — pointer events disabled during edit to avoid accidental toggles */}
              <div
                style={{
                  pointerEvents: isEditing ? 'none' : undefined,
                  opacity: isHidden && isEditing ? 0.5 : 1,
                }}
              >
                {module.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
