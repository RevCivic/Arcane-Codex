'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { saveRoll } from '@/app/actions'
import { getD100ResultType, type D100ResultType } from '@/lib/diceRules'
import type { SkillEntry, HistoryEntry } from './DiceConsole'

type DifficultyTier = 'Easy' | 'Average' | 'Difficult' | 'Hard' | 'Extreme' | 'Impossible'

const TIERS: {
  tier: DifficultyTier
  label: string
  mult: number
  color: string
  desc: string
}[] = [
  { tier: 'Easy',       label: 'Easy',       mult: 2.00, color: '#4ade80', desc: '×2'  },
  { tier: 'Average',    label: 'Average',     mult: 1.00, color: '#60a5fa', desc: '×1'  },
  { tier: 'Difficult',  label: 'Difficult',   mult: 0.50, color: '#f59e0b', desc: '÷2'  },
  { tier: 'Hard',       label: 'Hard',        mult: 0.20, color: '#f97316', desc: '÷5'  },
  { tier: 'Extreme',    label: 'Extreme',     mult: 0.10, color: '#ef4444', desc: '÷10' },
  { tier: 'Impossible', label: 'Impossible',  mult: 0.00, color: '#dc2626', desc: '1%'  },
]

const RESULT_CONFIG: Record<
  D100ResultType,
  { color: string; bg: string; border: string; glow: string; emoji: string; label: string }
> = {
  CRITICAL: { color: '#fbbf24', bg: '#1c1407', border: '#fbbf2466', glow: 'rgba(251,191,36,0.4)',   emoji: '✨', label: 'Critical Success' },
  SUCCESS:  { color: '#4ade80', bg: '#052e16', border: '#4ade8066', glow: 'rgba(74,222,128,0.25)',  emoji: '✓',  label: 'Success'          },
  FAILURE:  { color: '#f87171', bg: '#1f0a0a', border: '#f8717166', glow: 'rgba(248,113,113,0.25)', emoji: '✗',  label: 'Failure'          },
  FUMBLE:   { color: '#dc2626', bg: '#1a0505', border: '#dc262666', glow: 'rgba(220,38,38,0.4)',    emoji: '💀', label: 'Fumble'           },
}

const ARCANE_RUNES = ['ᚱ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᛏ', 'ᚲ', 'ᛉ', 'ᛊ', 'ᛒ', 'ᛗ', 'ᛚ', 'ᚾ', 'ᚹ', 'ᚷ', 'ᛞ', 'ᛟ']

function applyDifficulty(baseTarget: number, tier: DifficultyTier): number {
  if (tier === 'Impossible') return 1
  return Math.max(1, Math.round(baseTarget * TIERS.find((t) => t.tier === tier)!.mult))
}

function randomFlavor(rt: D100ResultType): string {
  const flavors: Record<D100ResultType, string[]> = {
    CRITICAL: [
      'The spirits favor you greatly.',
      'Fate bends to your will.',
      'An unexpected fortune smiles upon you.',
      'The stars align perfectly.',
    ],
    SUCCESS: [
      'You pull through with determination.',
      'Your effort pays off.',
      'The moment turns in your favor.',
      'You seize the advantage.',
    ],
    FAILURE: [
      'Luck eludes you... this time.',
      'The challenge proves greater than expected.',
      'You stumble, but can recover.',
      'Not quite enough.',
    ],
    FUMBLE: [
      'Disaster strikes.',
      'Your worst fears are realized.',
      'Everything goes wrong.',
      'Calamity befalls you.',
    ],
  }
  return flavors[rt][Math.floor(Math.random() * flavors[rt].length)]
}

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
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory)
  const [markedSkillIds, setMarkedSkillIds] = useState<Set<number>>(
    () => new Set(skills.filter((s) => s.markedForImprovement).map((s) => s.id))
  )

  const [isRolling, startRollTransition] = useTransition()
  const [isScrambling, setIsScrambling] = useState(false)
  const [scrambleRune, setScrambleRune] = useState('')
  const [flavorText, setFlavorText] = useState<string | null>(null)

  const tempIdRef = useRef(-1)
  const scrambleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrambleInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const startScramble = useCallback((resultType: D100ResultType | null) => {
    if (scrambleTimer.current) clearTimeout(scrambleTimer.current)
    if (scrambleInterval.current) clearInterval(scrambleInterval.current)

    setIsScrambling(true)
    setScrambleRune(ARCANE_RUNES[Math.floor(Math.random() * ARCANE_RUNES.length)])
    setFlavorText(null)

    scrambleInterval.current = setInterval(() => {
      setScrambleRune(ARCANE_RUNES[Math.floor(Math.random() * ARCANE_RUNES.length)])
    }, 80)

    scrambleTimer.current = setTimeout(() => {
      if (scrambleInterval.current) {
        clearInterval(scrambleInterval.current)
        scrambleInterval.current = null
      }
      setIsScrambling(false)
      if (resultType) setFlavorText(randomFlavor(resultType))
    }, 400)
  }, [])

  useEffect(() => {
    return () => {
      if (scrambleTimer.current) clearTimeout(scrambleTimer.current)
      if (scrambleInterval.current) clearInterval(scrambleInterval.current)
    }
  }, [])

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

  const latest = history[0]
  const latestRT = latest?.resultType as D100ResultType | null | undefined
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
        {skills.length > 0 && (
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
          disabled={skills.length === 0 || isRolling}
          className={`w-full py-2 rounded uppercase tracking-wider text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed${isScrambling ? ' btn-channeling' : ''}`}
          style={{ backgroundColor: '#7c3aed', color: '#fff' }}
        >
          {isRolling ? 'Rolling…' : 'Roll d100'}
        </button>
      </div>

      {/* Result Display */}
      {latest ? (
        <div className="rounded-lg p-4 text-center"
          style={
            latestRT
              ? {
                  backgroundColor: RESULT_CONFIG[latestRT].bg,
                  border: `1px solid ${RESULT_CONFIG[latestRT].border}`,
                  boxShadow: `0 0 20px ${RESULT_CONFIG[latestRT].glow}`,
                }
              : { backgroundColor: '#0d0d15', border: '1px solid #1f2937' }
          }>
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>
            {latest.label}{latest.difficulty && ` · ${latest.difficulty}`}
          </div>
          <div className="text-4xl font-bold mb-2"
            style={{
              color: isScrambling ? '#7c3aed' : (latestRT ? RESULT_CONFIG[latestRT].color : '#e2e8f0'),
              textShadow: isScrambling
                ? '0 0 20px rgba(124,58,237,0.8)'
                : (latestRT ? `0 0 30px ${RESULT_CONFIG[latestRT].glow}` : 'none'),
            }}>
            {isScrambling ? scrambleRune : latest.roll}
          </div>
          {!isScrambling && latest.target !== null && (
            <div className="text-xs mb-2" style={{ color: '#9ca3af' }}>
              rolled {latest.roll} vs target {latest.target}
            </div>
          )}
          {!isScrambling && latestRT && (
            <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{
                color: RESULT_CONFIG[latestRT].color,
                border: `1px solid ${RESULT_CONFIG[latestRT].color}`,
                backgroundColor: RESULT_CONFIG[latestRT].bg,
              }}>
              {RESULT_CONFIG[latestRT].emoji} {RESULT_CONFIG[latestRT].label}
            </div>
          )}
          {!isScrambling && flavorText && (
            <div className="mt-2 text-xs italic" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
              {flavorText}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg py-12"
          style={{ border: '1px dashed #1f2937' }}>
          <div style={{ fontSize: '2.5rem' }}>🎲</div>
          <div className="text-xs uppercase tracking-widest mt-2" style={{ color: '#374151' }}>
            Awaiting Roll
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#4b5563' }}>
            Recent Rolls
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.slice(1).map((r) => {
              const rt = r.resultType as D100ResultType | null | undefined
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-xs rounded px-2 py-1"
                  style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}
                >
                  <span className="flex-1 truncate" style={{ color: '#9ca3af' }}>
                    {r.label}{r.difficulty ? ` · ${r.difficulty}` : ''}
                  </span>
                  <span className="font-bold ml-2" style={{ color: rt ? RESULT_CONFIG[rt].color : '#e2e8f0', minWidth: '2rem', textAlign: 'right' }}>
                    {r.roll}
                  </span>
                  {r.target !== null && (
                    <span className="ml-1" style={{ color: '#4b5563' }}>
                      /{r.target}
                    </span>
                  )}
                  {rt && <span className="ml-1">{RESULT_CONFIG[rt].emoji}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
