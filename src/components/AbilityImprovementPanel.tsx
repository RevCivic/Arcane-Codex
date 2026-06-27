'use client'

import { useState, useTransition } from 'react'
import { rollAbilityImprovement, clearAbilityImprovementMarks } from '@/app/actions'

export interface MarkedAbility {
  id: number
  name: string
  currentValue: number
}

export function AbilityImprovementPanel({
  characterId,
  initialMarkedAbilities,
}: {
  characterId: number
  initialMarkedAbilities: MarkedAbility[]
}) {
  const [markedAbilities, setMarkedAbilities] = useState<MarkedAbility[]>(initialMarkedAbilities)
  const [modifiers, setModifiers] = useState<Record<number, number>>({})
  const [results, setResults] = useState<
    Record<number, { die: number; modifier: number; gain: number; newValue: number }>
  >({})
  const [isRolling, startRollTransition] = useTransition()
  const [isClearing, startClearTransition] = useTransition()
  const [rollAllFailures, setRollAllFailures] = useState<string[]>([])

  if (markedAbilities.length === 0) return null

  const handleRoll = (abilityId: number) => {
    const modifier = modifiers[abilityId] ?? 0
    startRollTransition(async () => {
      try {
        const result = await rollAbilityImprovement(characterId, abilityId, modifier)
        setResults((prev) => ({ ...prev, [abilityId]: result }))
        setMarkedAbilities((prev) =>
          prev.map((a) => (a.id === abilityId ? { ...a, currentValue: result.newValue } : a))
        )
      } catch (err) {
        console.error('Ability improvement roll failed:', err)
      }
    })
  }

  const handleRollAllPending = () => {
    const pendingAbilities = markedAbilities.filter((ability) => results[ability.id] === undefined)
    if (pendingAbilities.length === 0) return

    startRollTransition(async () => {
      setRollAllFailures([])

      const rollAttempts = pendingAbilities.map(async (ability) => {
        const modifier = modifiers[ability.id] ?? 0
        try {
          const result = await rollAbilityImprovement(characterId, ability.id, modifier)
          return { ability, result, error: null as Error | null }
        } catch (error) {
          return { ability, result: null as { die: number; modifier: number; gain: number; newValue: number } | null, error: error as Error | null }
        }
      })

      const completed = await Promise.all(rollAttempts)
      const failedNames: string[] = []
      for (const attempt of completed) {
        if (attempt.result) {
          const { ability, result } = attempt
          setResults((prev) => ({ ...prev, [ability.id]: result }))
          setMarkedAbilities((prev) =>
            prev.map((a) => (a.id === ability.id ? { ...a, currentValue: result.newValue } : a))
          )
        } else {
          failedNames.push(attempt.ability.name)
          console.error(`Ability improvement roll failed for ${attempt.ability.name}:`, attempt.error)
        }
      }
      setRollAllFailures(failedNames)
    })
  }

  const handleClearAll = () => {
    startClearTransition(async () => {
      try {
        await clearAbilityImprovementMarks(characterId)
        setMarkedAbilities([])
        setResults({})
      } catch (err) {
        console.error('Clear ability marks failed:', err)
      }
    })
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif' }}>
      <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
        The following abilities were failed during the mission. Roll{' '}
        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>1d4–1</span> + modifier for each
        to attempt an improvement. Clear all marks when done.
      </p>

      <div className="space-y-3 mb-4">
        {markedAbilities.map((ability) => {
          const result = results[ability.id]
          const alreadyRolled = result !== undefined
          const mod = modifiers[ability.id] ?? 0

          return (
            <div
              key={ability.id}
              className="rounded-lg p-3"
              style={{
                backgroundColor: '#0d0d15',
                border: `1px solid ${alreadyRolled ? '#16a34a66' : '#7c3aed33'}`,
              }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                {/* Ability info */}
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    📌 {ability.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    Current:{' '}
                    <span style={{ color: '#c4b5fd' }}>{ability.currentValue}%</span>
                    {alreadyRolled && result.gain > 0 && (
                      <span style={{ color: '#4ade80' }}>
                        {' '}→ <strong>{result.newValue}%</strong> (+{result.gain})
                      </span>
                    )}
                    {alreadyRolled && result.gain === 0 && (
                      <span style={{ color: '#6b7280' }}> — no improvement</span>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {!alreadyRolled && (
                    <>
                      <div className="flex flex-col items-center">
                        <label
                          className="text-xs uppercase tracking-wider mb-1"
                          style={{ color: '#d97706' }}
                        >
                          Mod
                        </label>
                        <input
                          type="number"
                          value={mod}
                          min={-10}
                          max={10}
                          onChange={(e) =>
                            setModifiers((prev) => ({
                              ...prev,
                              [ability.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="arcane-input text-center font-bold"
                          style={{ width: '4rem' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRoll(ability.id)}
                        disabled={isRolling}
                        className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: '#5b21b6', color: '#fff', marginTop: '1.25rem' }}
                      >
                        {isRolling ? '…' : 'Roll 1d4–1'}
                      </button>
                    </>
                  )}
                  {alreadyRolled && (
                    <div
                      className="text-xs px-3 py-1.5 rounded font-semibold"
                      style={{
                        backgroundColor: result.gain > 0 ? '#052e16' : '#111118',
                        border: `1px solid ${result.gain > 0 ? '#16a34a66' : '#374151'}`,
                        color: result.gain > 0 ? '#4ade80' : '#6b7280',
                      }}
                    >
                      {result.gain > 0 ? (
                        <>
                          ✓ d4={result.die}
                          {result.modifier !== 0
                            ? ` ${result.modifier > 0 ? '+' : ''}${result.modifier}`
                            : ''}
                          {' → '}+{result.gain}
                        </>
                      ) : (
                        <>
                          d4={result.die}
                          {result.modifier !== 0
                            ? ` ${result.modifier > 0 ? '+' : ''}${result.modifier}`
                            : ''}
                          {' → no gain'}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRollAllPending}
          disabled={isRolling || markedAbilities.every((a) => results[a.id] !== undefined)}
          className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#5b21b6', color: '#fff' }}
        >
          {isRolling ? 'Rolling…' : '🎲 Roll All Pending'}
        </button>

        <button
          type="button"
          onClick={handleClearAll}
          disabled={isClearing}
          className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: '1px solid #374151', color: '#9ca3af', backgroundColor: '#0d0d15' }}
        >
          {isClearing ? 'Clearing…' : '✗ Clear All Marks'}
        </button>
      </div>
      {rollAllFailures.length > 0 && (
        <p className="text-xs mt-2" style={{ color: '#fca5a5' }}>
          Some rolls failed. Retry individually for: {rollAllFailures.join(', ')}.
        </p>
      )}
    </div>
  )
}
