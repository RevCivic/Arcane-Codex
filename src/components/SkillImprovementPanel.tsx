'use client'

import { useState, useTransition } from 'react'
import { rollSkillImprovement, clearSkillImprovementMarks } from '@/app/actions'

export interface MarkedSkill {
  id: number
  name: string
  category: string | null
  currentValue: number
}

export function SkillImprovementPanel({
  characterId,
  initialMarkedSkills,
}: {
  characterId: number
  initialMarkedSkills: MarkedSkill[]
}) {
  const [markedSkills, setMarkedSkills] = useState<MarkedSkill[]>(initialMarkedSkills)
  const [modifiers, setModifiers] = useState<Record<number, number>>({})
  const [results, setResults] = useState<
    Record<number, { die: number; modifier: number; gain: number; newValue: number }>
  >({})
  const [isRolling, startRollTransition] = useTransition()
  const [isClearing, startClearTransition] = useTransition()

  if (markedSkills.length === 0) return null

  const handleRoll = (skillId: number) => {
    const modifier = modifiers[skillId] ?? 0
    startRollTransition(async () => {
      try {
        const result = await rollSkillImprovement(characterId, skillId, modifier)
        setResults((prev) => ({ ...prev, [skillId]: result }))
        // Update the local skill value display
        setMarkedSkills((prev) =>
          prev.map((s) => (s.id === skillId ? { ...s, currentValue: result.newValue } : s))
        )
      } catch (err) {
        console.error('Improvement roll failed:', err)
      }
    })
  }

  const handleClearAll = () => {
    startClearTransition(async () => {
      try {
        await clearSkillImprovementMarks(characterId)
        setMarkedSkills([])
        setResults({})
      } catch (err) {
        console.error('Clear marks failed:', err)
      }
    })
  }

  return (
    <div style={{ fontFamily: 'Georgia, serif' }}>
      <p className="text-xs mb-4" style={{ color: '#9ca3af' }}>
        The following skills were failed during the mission. Roll{' '}
        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>1d4–1</span> + modifier for each
        to attempt an improvement. Clear all marks when done.
      </p>

      <div className="space-y-3 mb-4">
        {markedSkills.map((skill) => {
          const result = results[skill.id]
          const alreadyRolled = result !== undefined
          const mod = modifiers[skill.id] ?? 0

          return (
            <div
              key={skill.id}
              className="rounded-lg p-3"
              style={{
                backgroundColor: '#0d0d15',
                border: `1px solid ${alreadyRolled ? '#16a34a66' : '#d9770633'}`,
              }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                {/* Skill info */}
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    📌 {skill.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    {skill.category && <span>{skill.category} · </span>}
                    Current: <span style={{ color: '#a78bfa' }}>{skill.currentValue}%</span>
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
                              [skill.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="arcane-input text-center font-bold"
                          style={{ width: '4rem' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRoll(skill.id)}
                        disabled={isRolling}
                        className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: '#7c3aed', color: '#fff', marginTop: '1.25rem' }}
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
  )
}
