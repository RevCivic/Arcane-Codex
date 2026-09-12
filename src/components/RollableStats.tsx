'use client'

import { useState, useTransition, useCallback, useRef, useEffect } from 'react'
import { saveRoll } from '@/app/actions'
import { getD100ResultType, type D100ResultType } from '@/lib/diceRules'
import { TIERS, RESULT_CONFIG, ARCANE_RUNES, applyDifficulty, randomFlavor, type DifficultyTier } from './diceConsoleShared'
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

  const latest = history[0]
  const latestRT = latest?.resultType as D100ResultType | null | undefined

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
        {availableStats.length > 0 && (
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
          disabled={availableStats.length === 0 || isRolling}
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
