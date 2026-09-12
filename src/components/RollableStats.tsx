'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { saveRoll } from '@/app/actions'
import { getD100ResultType } from '@/lib/diceRules'
import { applyDifficulty, useScrambleAnimation, type DifficultyTier } from './diceConsoleShared'
import { RollResultDisplay } from './RollResultDisplay'
import { DifficultySelector } from './DifficultySelector'
import type { StatEntry, HistoryEntry } from './DiceConsole'

// ─── Helper Functions ─────────────────────────────────────────────────────

function calcAbilityTarget(statValue: number | null, tier: DifficultyTier): number | null {
  if (statValue == null || statValue <= 0) return null
  // Most stats are multiplied by 5 for BRP percentile
  const baseTarget = statValue * 5
  return applyDifficulty(baseTarget, tier)
}

// ─── Component ────────────────────────────────────────────────────────────

interface RollableStatsProps {
  characterId: number
  stats: StatEntry[]
  initialHistory: HistoryEntry[]
}

/**
 * RollableStats
 *
 * A focused component for rolling primary characteristics (abilities).
 * Extracted from DiceConsole to allow granular layout control.
 */
export function RollableStats({
  characterId,
  stats,
  initialHistory,
}: RollableStatsProps) {
  const availableStats = stats.filter((s) => s.value !== null && s.value > 0)
  const [selectedStat, setSelectedStat] = useState(availableStats[0]?.key ?? '')
  const [tier, setTier] = useState<DifficultyTier>('Average')
  // Filter history to only show ability rolls
  const [history, setHistory] = useState<HistoryEntry[]>(
    initialHistory.filter((h) => h.rollType === 'ability')
  )

  // Scrolling rolling state
  const [isRolling, startRollTransition] = useTransition()
  const { isScrambling, scrambleRune, flavorText, startScramble } = useScrambleAnimation()

  const tempIdRef = useRef(-1)

  const handleRoll = useCallback(() => {
    const statEntry = stats.find((s) => s.key === selectedStat)
    if (!statEntry || statEntry.value == null) return

    const roll = Math.floor(Math.random() * 100) + 1
    const target = calcAbilityTarget(statEntry.value, tier)
    if (target == null) return

    const resultType = getD100ResultType(roll, target)

    const entry: Omit<HistoryEntry, 'id' | 'createdAt'> = {
      rollType: 'ability',
      label: `${statEntry.label} Check`,
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
      abilityId: null,
    }

    startScramble(resultType)
    const tempId = tempIdRef.current--
    setHistory((prev) => [{ ...entry, id: tempId, createdAt: new Date().toISOString() }, ...prev].slice(0, 20))

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
          abilityId: null,
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
  }, [characterId, stats, selectedStat, tier, startScramble])

  const latest = history[0] ?? null

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Stat Selector */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            Ability
          </label>
          {availableStats.length === 0 ? (
            <p className="text-xs" style={{ color: '#6b7280' }}>No stats available to roll.</p>
          ) : (
            <select
              value={selectedStat}
              onChange={(e) => setSelectedStat(e.target.value)}
              className="arcane-input w-full"
            >
              {availableStats.map((stat) => (
                <option key={stat.key} value={stat.key}>
                  {stat.label} ({stat.value})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Difficulty Selector */}
        {availableStats.length > 0 && <DifficultySelector tier={tier} onTierChange={setTier} />}

        {/* Roll Button */}
        <button
          type="button"
          onClick={handleRoll}
          disabled={availableStats.length === 0 || isRolling}
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
