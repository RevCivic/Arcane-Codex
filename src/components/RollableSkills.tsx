'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { saveRoll } from '@/app/actions'
import { getD100ResultType } from '@/lib/diceRules'
import { applyDifficulty, useScrambleAnimation, type DifficultyTier } from './diceConsoleShared'
import { RollResultDisplay } from './RollResultDisplay'
import { DifficultySelector } from './DifficultySelector'
import type { SkillEntry, HistoryEntry } from './DiceConsole'

// ─── Component ────────────────────────────────────────────────────────────

interface RollableSkillsProps {
  characterId: number
  skills: SkillEntry[]
  initialHistory: HistoryEntry[]
}

/**
 * RollableSkills
 *
 * A focused component for rolling skills.
 * Extracted from DiceConsole to allow granular layout control.
 */
export function RollableSkills({
  characterId,
  skills,
  initialHistory,
}: RollableSkillsProps) {
  const [selectedSkillId, setSelectedSkillId] = useState(skills[0]?.id ?? 0)
  const [tier, setTier] = useState<DifficultyTier>('Average')
  // Filter history to only show skill rolls
  const [history, setHistory] = useState<HistoryEntry[]>(
    initialHistory.filter((h) => h.rollType === 'skill')
  )
  const [markedSkillIds, setMarkedSkillIds] = useState<Set<number>>(
    () => new Set(skills.filter((s) => s.markedForImprovement).map((s) => s.id))
  )

  const [isRolling, startRollTransition] = useTransition()
  const { isScrambling, scrambleRune, flavorText, startScramble } = useScrambleAnimation()

  const tempIdRef = useRef(-1)

  const handleRoll = useCallback(() => {
    const skill = skills.find((s) => s.id === selectedSkillId)
    if (!skill) return

    const roll = Math.floor(Math.random() * 100) + 1
    const target = applyDifficulty(skill.effectiveValue, tier)
    const resultType = getD100ResultType(roll, target)

    const entry: Omit<HistoryEntry, 'id' | 'createdAt'> = {
      rollType: 'skill',
      label: skill.name,
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
      skillId: skill.id,
      abilityId: null,
    }

    startScramble(resultType)
    const tempId = tempIdRef.current--
    setHistory((prev) => [{ ...entry, id: tempId, createdAt: new Date().toISOString() }, ...prev].slice(0, 20))

    // Mark for improvement on failure/fumble
    if (resultType === 'FAILURE' || resultType === 'FUMBLE') {
      setMarkedSkillIds((prev) => new Set([...prev, skill.id]))
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
          skillId: skill.id,
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
  }, [characterId, skills, selectedSkillId, tier, startScramble])

  const latest = history[0] ?? null
  const selectedSkill = skills.find((s) => s.id === selectedSkillId)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Skill Selector */}
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            Skill
          </label>
          {skills.length === 0 ? (
            <p className="text-xs" style={{ color: '#6b7280' }}>No skills assigned.</p>
          ) : (
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(Number(e.target.value))}
              className="arcane-input w-full"
            >
              {skills.map((s) => {
                const isMarked = markedSkillIds.has(s.id)
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.effectiveValue}%){isMarked ? ' 📌' : ''}
                  </option>
                )
              })}
            </select>
          )}
          {selectedSkill && markedSkillIds.has(selectedSkill.id) && (
            <div
              className="mt-2 text-xs px-2 py-1 rounded flex items-center gap-1"
              style={{ backgroundColor: '#1c1407', border: '1px solid #d9770666', color: '#d97706' }}
            >
              <span>📌</span>
              <span>Marked for improvement</span>
            </div>
          )}
        </div>

        {/* Difficulty Selector */}
        {skills.length > 0 && <DifficultySelector tier={tier} onTierChange={setTier} />}

        {/* Roll Button */}
        <button
          type="button"
          onClick={handleRoll}
          disabled={skills.length === 0 || isRolling}
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
