'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { saveRoll } from '@/app/actions'
import { getD100ResultType, type D100ResultType } from '@/lib/diceRules'
import { TIERS, applyDifficulty, useScrambleAnimation, type DifficultyTier } from './diceConsoleShared'
import { RollResultDisplay } from './RollResultDisplay'
import type { PowerEntry, HistoryEntry } from './DiceConsole'

// ─── Component ────────────────────────────────────────────────────────────

interface RollablePowersProps {
  characterId: number
  powers: PowerEntry[]
  initialHistory: HistoryEntry[]
}

/**
 * RollablePowers
 *
 * A focused component for rolling powers/supernatural abilities.
 * Extracted from DiceConsole to allow granular layout control.
 */
export function RollablePowers({
  characterId,
  powers,
  initialHistory,
}: RollablePowersProps) {
  const [selectedPowerId, setSelectedPowerId] = useState(powers[0]?.id ?? 0)
  const [tier, setTier] = useState<DifficultyTier>('Average')
  // Filter history to only show power rolls
  const [history, setHistory] = useState<HistoryEntry[]>(
    initialHistory.filter((h) => h.rollType === 'power')
  )
  const [markedAbilityIds, setMarkedAbilityIds] = useState<Set<number>>(
    () => new Set(powers.filter((p) => p.abilityId != null && p.markedForImprovement).map((p) => p.abilityId!))
  )

  const [isRolling, startRollTransition] = useTransition()
  const { isScrambling, scrambleRune, flavorText, startScramble } = useScrambleAnimation()

  const tempIdRef = useRef(-1)

  const handleRoll = useCallback(() => {
    const power = powers.find((p) => p.id === selectedPowerId)
    if (!power) return

    const roll = Math.floor(Math.random() * 100) + 1
    const target = applyDifficulty(power.effectiveValue, tier)
    const resultType = getD100ResultType(roll, target)

    const entry: Omit<HistoryEntry, 'id' | 'createdAt'> = {
      rollType: 'power',
      label: power.name,
      roll,
      target,
      difficulty: tier !== 'Average' ? tier : null,
      resultType: resultType ?? null,
      dice: null,
      modifier: null,
      luckSpent: null,
      mpSpent: null,
      sanitySpent: null,
      hpSpent: null,
      skillId: null,
      abilityId: power.abilityId,
    }

    startScramble(resultType)
    const tempId = tempIdRef.current--
    setHistory((prev) => [{ ...entry, id: tempId, createdAt: new Date().toISOString() }, ...prev].slice(0, 20))

    // Mark for improvement on failure/fumble
    if ((resultType === 'FAILURE' || resultType === 'FUMBLE') && power.abilityId != null) {
      setMarkedAbilityIds((prev) => new Set([...prev, power.abilityId!]))
    }

    startRollTransition(async () => {
      try {
        const saved = await saveRoll(characterId, {
          rollType: entry.rollType,
          label: entry.label,
          roll: entry.roll,
          target: entry.target,
          difficulty: entry.difficulty,
          resultType: entry.resultType,
          dice: null,
          modifier: null,
          skillId: null,
          abilityId: power.abilityId,
        })
        setHistory((prev) =>
          prev.map((r) =>
            r.id === tempId ? { ...r, id: saved.id, resultType: saved.resultType ?? r.resultType } : r
          )
        )
      } catch (error) {
        console.error('Failed to save roll:', error)
      }
    })
  }, [characterId, powers, selectedPowerId, tier, startScramble])

  const latest = history[0]
  const selectedPower = powers.find((p) => p.id === selectedPowerId)
  const isPowerMarked = selectedPower?.abilityId != null && markedAbilityIds.has(selectedPower.abilityId)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Power Selector */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            Power
          </label>
          {powers.length === 0 ? (
            <p className="text-xs" style={{ color: '#6b7280' }}>No rollable powers assigned.</p>
          ) : (
            <select
              value={selectedPowerId}
              onChange={(e) => setSelectedPowerId(Number(e.target.value))}
              className="arcane-input w-full"
            >
              {powers.map((p) => {
                const isMarked = p.abilityId != null && markedAbilityIds.has(p.abilityId)
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.effectiveValue}%){isMarked ? ' 📌' : ''}
                  </option>
                )
              })}
            </select>
          )}
          {isPowerMarked && (
            <div
              className="mt-2 text-xs px-2 py-1 rounded flex items-center gap-1"
              style={{ backgroundColor: '#1e1133', border: '1px solid #7c3aed66', color: '#a78bfa' }}
            >
              <span>📌</span>
              <span>Marked for improvement</span>
            </div>
          )}
        </div>

        {/* Difficulty Selector */}
        {powers.length > 0 && (
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
              Difficulty
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIERS.map((t) => (
                <button
                  key={t.tier}
                  type="button"
                  onClick={() => setTier(t.tier)}
                  className="rounded py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
                  style={{
                    backgroundColor: tier === t.tier ? `${t.color}33` : '#0d0d15',
                    border: `1px solid ${tier === t.tier ? t.color : '#1f2937'}`,
                    boxShadow: tier === t.tier ? `0 0 10px ${t.color}44` : 'none',
                    color: tier === t.tier ? t.color : '#6b7280',
                  }}
                >
                  {t.label}
                  <div className="text-[0.65rem] opacity-75">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Roll Button */}
        <button
          type="button"
          onClick={handleRoll}
          disabled={powers.length === 0 || isRolling}
          className={`w-full py-2 rounded uppercase tracking-wider text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed${isScrambling ? ' btn-channeling' : ''}`}
          style={{ backgroundColor: '#7c3aed', color: '#fff' }}
        >
          {isRolling ? 'Rolling…' : 'Roll d100'}
        </button>
      </div>

      {/* Result Display */}
      <RollResultDisplay
        latest={latest}
        history={history}
        isScrambling={isScrambling}
        scrambleRune={scrambleRune}
        flavorText={flavorText}
      />
    </div>
  )
}
