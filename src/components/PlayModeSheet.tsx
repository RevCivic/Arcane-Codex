'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'
import { PlayModeResourcePools } from './PlayModeResourcePools'
import { UnifiedRollSurface } from './UnifiedRollSurface'
import type { StatEntry, SkillEntry, PowerEntry, HistoryEntry } from './DiceConsole'

type Resource = 'hp' | 'sanity' | 'mp' | 'luck'
type SheetMode = 'play' | 'edit'

// ─── Persistent mode hook ──────────────────────────────────────────────────────

function useSheetMode(characterId: number): [SheetMode, (m: SheetMode) => void] {
  const key = `arcane-sheet-mode:${characterId}`

  const subscribe = useCallback(
    (cb: () => void) => {
      window.addEventListener('storage', cb)
      return () => window.removeEventListener('storage', cb)
    },
    []
  )

  const getSnapshot = useCallback((): SheetMode => {
    const v = localStorage.getItem(key)
    return v === 'edit' ? 'edit' : 'play'
  }, [key])

  const getServerSnapshot = useCallback((): SheetMode => 'play', [])

  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setMode = useCallback(
    (m: SheetMode) => {
      localStorage.setItem(key, m)
      window.dispatchEvent(new StorageEvent('storage', { key }))
    },
    [key]
  )

  return [mode, setMode]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PlayModeSheetProps {
  characterId: number
  stats: StatEntry[]
  skills: SkillEntry[]
  powers: PowerEntry[]
  initialLuck: number | null
  initialMp: number | null
  initialSanity: number | null
  initialHp: number | null
  maxHp: number | null
  maxMp: number | null
  maxSanity: number | null
  initialBuild: number | null
  initialHistory: HistoryEntry[]
  pendingImprovements: number       // count of skills + abilities marked for improvement
  /** Edit-mode content rendered via SheetLayoutManager */
  editLayoutContent: React.ReactNode
  /** Bottom-zone collapsible content for play mode (inventory, powers, etc.) */
  playExtras: React.ReactNode
}

/**
 * PlayModeSheet
 *
 * Top-level client component managing the play/edit mode toggle.
 * - Play mode: resource pools + unified roll surface + collapsed extras
 * - Edit mode: the existing SheetLayoutManager content (editLayoutContent)
 */
export function PlayModeSheet({
  characterId,
  stats,
  skills,
  powers,
  initialLuck,
  initialMp,
  initialSanity,
  initialHp,
  maxHp,
  maxMp,
  maxSanity,
  initialBuild,
  initialHistory,
  pendingImprovements,
  editLayoutContent,
  playExtras,
}: PlayModeSheetProps) {
  const [mode, setMode] = useSheetMode(characterId)

  // Live resource values for passing down to roll surface (luck spend updates)
  const [currentLuck, setCurrentLuck] = useState(initialLuck)
  const [currentHp, setCurrentHp] = useState(initialHp)
  const [currentSanity, setCurrentSanity] = useState(initialSanity)
  const [currentMp, setCurrentMp] = useState(initialMp)

  // Sync luck when pool steppers change it
  function handleResourceChanged(resource: Resource, newValue: number | null) {
    if (resource === 'luck') setCurrentLuck(newValue)
    else if (resource === 'hp') setCurrentHp(newValue)
    else if (resource === 'sanity') setCurrentSanity(newValue)
    else if (resource === 'mp') setCurrentMp(newValue)
  }

  return (
    <div className="space-y-6">
      {/* ── Mode Toggle ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setMode(mode === 'play' ? 'edit' : 'play')}
          className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all hover:opacity-90"
          style={
            mode === 'play'
              ? { backgroundColor: '#1e1133', color: '#a78bfa', border: '1px solid #7c3aed66' }
              : { backgroundColor: '#0d0d15', color: '#9ca3af', border: '1px solid #374151' }
          }
        >
          {mode === 'play' ? '⚙ Edit Sheet' : '🎲 Play Mode'}
          {/* Badge for pending improvements */}
          {mode === 'play' && pendingImprovements > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] font-bold"
              style={{ backgroundColor: '#d97706', color: '#0d0d15' }}
              aria-label={`${pendingImprovements} improvement${pendingImprovements > 1 ? 's' : ''} pending`}
            >
              {pendingImprovements}
            </span>
          )}
        </button>
      </div>

      {/* ── Play Mode ───────────────────────────────────────────────────────── */}
      {mode === 'play' && (
        <div className="space-y-6">
          {/* Top zone: Resource Pools */}
          <PlayModeResourcePools
            characterId={characterId}
            initialHp={currentHp}
            maxHp={maxHp}
            initialSanity={currentSanity}
            maxSanity={maxSanity}
            initialMp={currentMp}
            maxMp={maxMp}
            initialLuck={currentLuck}
            initialBuild={initialBuild}
            onResourceChanged={handleResourceChanged}
          />

          {/* Middle zone: Unified Roll Surface */}
          <div
            className="card-arcane rounded-xl p-5"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            <h2
              className="text-sm font-semibold uppercase tracking-widest mb-5"
              style={{ color: '#d97706' }}
            >
              🎲 Roll
            </h2>
            <UnifiedRollSurface
              characterId={characterId}
              stats={stats}
              skills={skills}
              powers={powers}
              initialHistory={initialHistory}
              currentLuck={currentLuck}
              onLuckSpent={setCurrentLuck}
            />
          </div>

          {/* Bottom zone: extras (collapsed by default) */}
          {playExtras}
        </div>
      )}

      {/* ── Edit Mode ───────────────────────────────────────────────────────── */}
      {mode === 'edit' && editLayoutContent}
    </div>
  )
}
