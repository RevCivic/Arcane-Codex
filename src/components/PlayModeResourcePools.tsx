'use client'

import { useState, useTransition } from 'react'
import { adjustResourceDirect } from '@/app/actions'

type Resource = 'hp' | 'sanity' | 'mp' | 'luck'

interface PoolProps {
  label: string
  emoji: string
  resource: Resource
  current: number | null
  max?: number | null
  accent: string
  characterId: number
  onChanged: (resource: Resource, newValue: number | null) => void
}

function ResourcePool({
  label,
  emoji,
  resource,
  current,
  max,
  accent,
  characterId,
  onChanged,
}: PoolProps) {
  const [isPending, startTransition] = useTransition()

  const pct =
    current != null && max != null && max > 0
      ? Math.max(0, Math.min(100, (current / max) * 100))
      : null

  function adjust(delta: number) {
    // Optimistic update
    const optimistic =
      current == null
        ? Math.max(0, delta)
        : max != null
          ? Math.max(0, Math.min(max, current + delta))
          : Math.max(0, current + delta)
    onChanged(resource, optimistic)

    startTransition(async () => {
      try {
        const result = await adjustResourceDirect(characterId, resource, delta)
        onChanged(resource, result)
      } catch {
        // revert
        onChanged(resource, current)
      }
    })
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ backgroundColor: '#0d0d15', border: `1px solid ${accent}44` }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: accent, fontFamily: 'Georgia, serif' }}
        >
          {emoji} {label}
        </span>
        <span className="text-sm font-bold" style={{ color: '#e2e8f0' }}>
          {current ?? '—'}
          {max != null && <span style={{ color: '#6b7280' }}>/{max}</span>}
        </span>
      </div>

      {/* Progress bar */}
      {pct !== null && (
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1f2937' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: accent, opacity: isPending ? 0.6 : 1 }}
          />
        </div>
      )}

      {/* Stepper buttons */}
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={isPending || (current ?? 0) <= 0}
          className="flex-1 rounded py-1.5 text-sm font-bold transition-colors disabled:opacity-30"
          style={{
            backgroundColor: '#1f2937',
            color: '#f87171',
            border: '1px solid #374151',
          }}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={isPending || (max != null && (current ?? 0) >= max)}
          className="flex-1 rounded py-1.5 text-sm font-bold transition-colors disabled:opacity-30"
          style={{
            backgroundColor: '#1f2937',
            color: '#4ade80',
            border: '1px solid #374151',
          }}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

interface PlayModeResourcePoolsProps {
  characterId: number
  initialHp: number | null
  maxHp: number | null
  initialSanity: number | null
  maxSanity: number | null
  initialMp: number | null
  maxMp: number | null
  initialLuck: number | null
  initialBuild: number | null
  onResourceChanged?: (resource: Resource, newValue: number | null) => void
}

/**
 * PlayModeResourcePools
 *
 * Renders resource pools (HP, Sanity, MP, Luck) with inline ±1 stepper buttons
 * for manual mid-scene adjustments. No collapsible wrapper.
 * Build is display-only (derived stat, not adjusted manually).
 */
export function PlayModeResourcePools({
  characterId,
  initialHp,
  maxHp,
  initialSanity,
  maxSanity,
  initialMp,
  maxMp,
  initialLuck,
  initialBuild,
  onResourceChanged,
}: PlayModeResourcePoolsProps) {
  const [hp, setHp] = useState(initialHp)
  const [sanity, setSanity] = useState(initialSanity)
  const [mp, setMp] = useState(initialMp)
  const [luck, setLuck] = useState(initialLuck)

  function handleChange(resource: Resource, newValue: number | null) {
    if (resource === 'hp') setHp(newValue)
    else if (resource === 'sanity') setSanity(newValue)
    else if (resource === 'mp') setMp(newValue)
    else if (resource === 'luck') setLuck(newValue)
    onResourceChanged?.(resource, newValue)
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <ResourcePool
        label="Hit Points"
        emoji="❤️"
        resource="hp"
        current={hp}
        max={maxHp}
        accent="#4ade80"
        characterId={characterId}
        onChanged={handleChange}
      />
      <ResourcePool
        label="Sanity"
        emoji="🧠"
        resource="sanity"
        current={sanity}
        max={maxSanity}
        accent="#a78bfa"
        characterId={characterId}
        onChanged={handleChange}
      />
      <ResourcePool
        label="Magic Pts"
        emoji="✨"
        resource="mp"
        current={mp}
        max={maxMp}
        accent="#60a5fa"
        characterId={characterId}
        onChanged={handleChange}
      />
      <ResourcePool
        label="Luck"
        emoji="🍀"
        resource="luck"
        current={luck}
        accent="#f59e0b"
        characterId={characterId}
        onChanged={handleChange}
      />
      {initialBuild != null && (
        <div
          className="rounded-xl p-4 flex flex-col gap-1 col-span-2 sm:col-span-4"
          style={{ backgroundColor: '#0d0d15', border: '1px solid #37415133' }}
        >
          <span className="text-xs uppercase tracking-widest" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
            🔨 Build Modifier
          </span>
          <span className="text-lg font-bold" style={{ color: '#e2e8f0' }}>
            {initialBuild > 0 ? `+${initialBuild}` : initialBuild}
          </span>
        </div>
      )}
    </div>
  )
}
