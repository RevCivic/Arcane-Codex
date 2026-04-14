'use client'

import { useState, useRef, useTransition } from 'react'
import { saveRoll, spendLuckOnRoll } from '@/app/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type DifficultyTier = 'Easy' | 'Average' | 'Difficult' | 'Hard' | 'Extreme' | 'Impossible'
type DiceType = 2 | 4 | 6 | 8 | 10 | 12 | 20 | 100
type ActiveTab = 'ability' | 'skill' | 'free'
type ResultType = 'CRITICAL' | 'SUCCESS' | 'FAILURE' | 'FUMBLE'

export interface StatEntry {
  key: string
  label: string
  value: number | null
}

export interface SkillEntry {
  id: number
  name: string
  category: string | null
  effectiveValue: number
}

export interface HistoryEntry {
  id: number
  rollType: string
  label: string
  roll: number
  target: number | null
  difficulty: string | null
  resultType: string | null
  /** JSON-encoded number[] for free rolls, null otherwise */
  dice: string | null
  modifier: number | null
  luckSpent: number | null
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

// BRP fractions: Difficult = ÷2, Hard = ÷5, Extreme = ÷10
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

const DICE_TYPES: DiceType[] = [2, 4, 6, 8, 10, 12, 20, 100]

const RESULT_CONFIG: Record<
  ResultType,
  { color: string; bg: string; border: string; glow: string; emoji: string; label: string }
> = {
  CRITICAL: { color: '#fbbf24', bg: '#1c1407', border: '#fbbf2466', glow: 'rgba(251,191,36,0.4)',   emoji: '✨', label: 'Critical Success' },
  SUCCESS:  { color: '#4ade80', bg: '#052e16', border: '#4ade8066', glow: 'rgba(74,222,128,0.25)',  emoji: '✓',  label: 'Success'          },
  FAILURE:  { color: '#f87171', bg: '#1f0a0a', border: '#f8717166', glow: 'rgba(248,113,113,0.25)', emoji: '✗',  label: 'Failure'          },
  FUMBLE:   { color: '#dc2626', bg: '#1a0505', border: '#dc262666', glow: 'rgba(220,38,38,0.4)',    emoji: '💀', label: 'Fumble'           },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyDifficulty(base: number, tier: DifficultyTier): number {
  if (tier === 'Impossible') return 1
  const t = TIERS.find((t) => t.tier === tier)!
  return Math.max(1, Math.min(99, Math.floor(base * t.mult)))
}

function getResultType(roll: number, target: number): ResultType {
  if (roll === 1) return 'CRITICAL'
  if (roll === 100) return 'FUMBLE'
  if (target < 50 && roll >= 96) return 'FUMBLE'
  if (roll <= target) return 'SUCCESS'
  return 'FAILURE'
}

function rollD100(): number { return Math.floor(Math.random() * 100) + 1 }
function rollDie(sides: number): number { return Math.floor(Math.random() * sides) + 1 }

function parseDice(json: string | null): number[] | null {
  if (!json) return null
  try { return JSON.parse(json) as number[] } catch { return null }
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  if (diff < 60_000)    return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(isoStr).toLocaleDateString()
}

// ─── DifficultySelector ───────────────────────────────────────────────────────

function DifficultySelector({
  selected,
  onChange,
  baseTarget,
}: {
  selected: DifficultyTier
  onChange: (t: DifficultyTier) => void
  baseTarget: number | null
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
        Difficulty
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {TIERS.map((t) => {
          const effective = baseTarget !== null ? applyDifficulty(baseTarget, t.tier) : null
          const isSel = selected === t.tier
          return (
            <button
              key={t.tier}
              type="button"
              onClick={() => onChange(t.tier)}
              className="rounded px-2 py-2 text-center transition-all"
              style={{
                backgroundColor: '#0d0d15',
                border: `1px solid ${isSel ? t.color : '#1f2937'}`,
                boxShadow: isSel ? `0 0 8px ${t.color}55` : 'none',
              }}
            >
              <div className="text-xs font-semibold" style={{ color: isSel ? t.color : '#6b7280', fontFamily: 'Georgia, serif' }}>
                {t.label}
              </div>
              <div className="text-xs" style={{ color: '#4b5563' }}>{t.desc}</div>
              {effective !== null && (
                <div className="text-xs font-bold mt-0.5" style={{ color: isSel ? t.color : '#374151' }}>
                  {effective}%
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── LuckSpendPrompt ─────────────────────────────────────────────────────────

function LuckSpendPrompt({
  rollHistoryId,
  cost,
  currentLuck,
  onSpend,
  onDismiss,
  isPending,
}: {
  rollHistoryId: number
  cost: number
  currentLuck: number | null
  onSpend: (id: number, cost: number) => void
  onDismiss: () => void
  isPending: boolean
}) {
  const canAfford = (currentLuck ?? 0) >= cost
  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: '#1a0f00', border: '1px solid #92400e66' }}>
      <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#f59e0b', fontFamily: 'Georgia, serif' }}>
        🍀 Spend Luck?
      </div>
      <p className="text-xs mb-3" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
        Spend{' '}
        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{cost}</span>{' '}
        Luck to convert this Failure into a Success.
        {!canAfford && (
          <span style={{ color: '#f87171' }}> (Not enough — you have {currentLuck ?? 0})</span>
        )}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canAfford || isPending}
          onClick={() => onSpend(rollHistoryId, cost)}
          className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#92400e', color: '#fef3c7', fontFamily: 'Georgia, serif' }}
        >
          {isPending ? '…' : `Spend ${cost} Luck`}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1.5 rounded text-xs uppercase tracking-wider"
          style={{ border: '1px solid #374151', color: '#6b7280', fontFamily: 'Georgia, serif' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── DiceConsole ──────────────────────────────────────────────────────────────

export function DiceConsole({
  characterId,
  stats,
  skills,
  initialLuck,
  initialHistory,
}: {
  characterId: number
  stats: StatEntry[]
  skills: SkillEntry[]
  initialLuck: number | null
  initialHistory: HistoryEntry[]
}) {
  const [tab, setTab]             = useState<ActiveTab>('ability')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Ability check
  const availableStats = stats.filter((s) => s.value !== null && s.value > 0)
  const [selectedStat, setSelectedStat] = useState(availableStats[0]?.key ?? '')
  const [abilityTier, setAbilityTier]   = useState<DifficultyTier>('Average')

  // Skill check
  const [selectedSkillId, setSelectedSkillId] = useState(skills[0]?.id ?? 0)
  const [skillTier, setSkillTier]             = useState<DifficultyTier>('Average')

  // Free roll
  const [selectedDie, setSelectedDie] = useState<DiceType>(20)
  const [quantity, setQuantity]       = useState(1)
  const [modifier, setModifier]       = useState(0)

  // Luck (optimistic)
  const [clientLuck, setClientLuck]   = useState<number | null>(initialLuck)
  const [pendingLuck, setPendingLuck] = useState<{ rollHistoryId: number; cost: number } | null>(null)

  // History: initialised from server, new rolls prepended
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory)
  const tempIdRef = useRef(-1)

  // React 19 async transitions
  const [isRolling,  startRollTransition]  = useTransition()
  const [isSpending, startSpendTransition] = useTransition()

  // ── Core roll dispatcher ──────────────────────────────────────────────────

  function dispatchRoll(
    entry: Omit<HistoryEntry, 'id' | 'createdAt'>,
    rawRoll: number,
    effectiveTarget: number | null
  ) {
    const tempId = tempIdRef.current--
    setHistory((prev) => [{ ...entry, id: tempId, createdAt: new Date().toISOString() }, ...prev].slice(0, 20))
    setPendingLuck(null)

    startRollTransition(async () => {
      try {
        const saved = await saveRoll(characterId, {
          rollType:   entry.rollType,
          label:      entry.label,
          roll:       entry.roll,
          target:     entry.target,
          difficulty: entry.difficulty,
          resultType: entry.resultType,
          dice:       parseDice(entry.dice),
          modifier:   entry.modifier,
        })
        setHistory((prev) => prev.map((r) => (r.id === tempId ? { ...r, id: saved.id } : r)))

        if (entry.resultType === 'FAILURE' && effectiveTarget !== null) {
          const cost = rawRoll - effectiveTarget
          if (cost > 0 && (clientLuck ?? 0) >= cost) {
            setPendingLuck({ rollHistoryId: saved.id, cost })
          }
        }
      } catch {
        // Keep optimistic entry; luck-spend prompt won't appear (no real id)
      }
    })
  }

  // ── Roll handlers ─────────────────────────────────────────────────────────

  const handleAbilityRoll = () => {
    const stat = availableStats.find((s) => s.key === selectedStat)
    if (!stat?.value) return
    const base   = stat.value * 5
    const target = applyDifficulty(base, abilityTier)
    const roll   = rollD100()
    dispatchRoll(
      { rollType: 'ability', label: `${stat.label} Check`, roll, target, difficulty: abilityTier,
        resultType: getResultType(roll, target), dice: null, modifier: null, luckSpent: null },
      roll, target
    )
  }

  const handleSkillRoll = () => {
    const skill = skills.find((s) => s.id === selectedSkillId)
    if (!skill) return
    const target = applyDifficulty(skill.effectiveValue, skillTier)
    const roll   = rollD100()
    dispatchRoll(
      { rollType: 'skill', label: skill.name, roll, target, difficulty: skillTier,
        resultType: getResultType(roll, target), dice: null, modifier: null, luckSpent: null },
      roll, target
    )
  }

  const handleFreeRoll = () => {
    const dice  = Array.from({ length: quantity }, () => rollDie(selectedDie))
    const total = dice.reduce((a, b) => a + b, 0) + modifier
    const label = `${quantity > 1 ? quantity : ''}d${selectedDie}${
      modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''
    }`
    dispatchRoll(
      { rollType: 'free', label, roll: total, target: null, difficulty: null,
        resultType: null, dice: JSON.stringify(dice), modifier, luckSpent: null },
      total, null
    )
  }

  // ── Luck spend ────────────────────────────────────────────────────────────

  const handleSpendLuck = (rollHistoryId: number, cost: number) => {
    startSpendTransition(async () => {
      try {
        await spendLuckOnRoll(characterId, rollHistoryId, cost)
        setClientLuck((prev) => (prev !== null ? prev - cost : null))
        setHistory((prev) =>
          prev.map((r) =>
            r.id === rollHistoryId ? { ...r, resultType: 'SUCCESS', luckSpent: cost } : r
          )
        )
        setPendingLuck(null)
      } catch {
        // State unchanged; user can retry
      }
    })
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const latest = history[0]
  const latestRT = latest?.resultType as ResultType | null | undefined

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="card-arcane rounded-lg" style={{ fontFamily: 'Georgia, serif' }}>

      {/* ── Collapsible header ── */}
      <button
        type="button"
        onClick={() => setIsCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-6 text-left"
        style={{ borderBottom: isCollapsed ? 'none' : '1px solid #1f2937' }}
      >
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#d97706' }}>
            🎲 Arcane Dice Console
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
            Ability checks · Skill checks · Free rolls
            {clientLuck !== null && (
              <span style={{ color: '#f59e0b' }}> · 🍀 Luck: {clientLuck}</span>
            )}
          </p>
        </div>
        <span className="text-xs ml-4 shrink-0" style={{ color: '#4b5563' }}>
          {isCollapsed ? '▼ expand' : '▲ collapse'}
        </span>
      </button>

      {!isCollapsed && (
        <div className="p-6 pt-5 space-y-6">

          {/* Tab bar */}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid #1f2937' }}>
            {(
              [
                ['ability', '⚡ Ability'],
                ['skill',   '📖 Skill'],
                ['free',    '🎲 Free Roll'],
              ] as [ActiveTab, string][]
            ).map(([t, lbl], i, arr) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="flex-1 py-2 text-xs uppercase tracking-wider transition-colors"
                style={{
                  backgroundColor: tab === t ? '#3b1f6e' : '#0d0d15',
                  color:           tab === t ? '#c4b5fd' : '#6b7280',
                  borderRight:     i < arr.length - 1 ? '1px solid #1f2937' : 'none',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Two-column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Controls ── */}
            <div className="space-y-4">

              {/* Ability Check */}
              {tab === 'ability' && (
                <>
                  <div>
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706' }}>
                      Characteristic
                    </div>
                    {availableStats.length === 0 ? (
                      <p className="text-xs" style={{ color: '#6b7280' }}>No stats set on this sheet yet.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableStats.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setSelectedStat(s.key)}
                            className="rounded p-2 text-center transition-all"
                            style={{
                              backgroundColor: selectedStat === s.key ? '#1e1133' : '#0d0d15',
                              border: `1px solid ${selectedStat === s.key ? '#7c3aed' : '#1f2937'}`,
                              boxShadow: selectedStat === s.key ? '0 0 10px rgba(124,58,237,0.35)' : 'none',
                            }}
                          >
                            <div className="text-xs uppercase" style={{ color: '#d97706' }}>{s.label}</div>
                            <div className="text-lg font-bold" style={{ color: '#a78bfa' }}>{s.value}</div>
                            <div className="text-xs" style={{ color: '#4b5563' }}>→ {(s.value ?? 0) * 5}%</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <DifficultySelector
                    selected={abilityTier}
                    onChange={setAbilityTier}
                    baseTarget={
                      availableStats.find((s) => s.key === selectedStat)?.value != null
                        ? availableStats.find((s) => s.key === selectedStat)!.value! * 5
                        : null
                    }
                  />

                  <button
                    type="button"
                    onClick={handleAbilityRoll}
                    disabled={availableStats.length === 0 || !selectedStat || isRolling}
                    className="w-full py-3 rounded uppercase tracking-wider text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#7c3aed', color: '#fff' }}
                  >
                    {isRolling ? 'Rolling…' : 'Roll d100'}
                  </button>
                </>
              )}

              {/* Skill Check */}
              {tab === 'skill' && (
                <>
                  <div>
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706' }}>Skill</div>
                    {skills.length === 0 ? (
                      <p className="text-xs" style={{ color: '#6b7280' }}>No skills defined yet.</p>
                    ) : (
                      <select
                        value={selectedSkillId}
                        onChange={(e) => setSelectedSkillId(Number(e.target.value))}
                        className="arcane-input"
                      >
                        {skills.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.effectiveValue}%){s.category ? ` — ${s.category}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {skills.length > 0 && (
                    <DifficultySelector
                      selected={skillTier}
                      onChange={setSkillTier}
                      baseTarget={skills.find((s) => s.id === selectedSkillId)?.effectiveValue ?? null}
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleSkillRoll}
                    disabled={skills.length === 0 || isRolling}
                    className="w-full py-3 rounded uppercase tracking-wider text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#7c3aed', color: '#fff' }}
                  >
                    {isRolling ? 'Rolling…' : 'Roll d100'}
                  </button>
                </>
              )}

              {/* Free Roll */}
              {tab === 'free' && (
                <>
                  <div>
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706' }}>Die Type</div>
                    <div className="grid grid-cols-4 gap-2">
                      {DICE_TYPES.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDie(d)}
                          className="rounded py-2 text-center font-bold transition-all"
                          style={{
                            backgroundColor: selectedDie === d ? '#1e1133' : '#0d0d15',
                            border: `1px solid ${selectedDie === d ? '#7c3aed' : '#1f2937'}`,
                            boxShadow: selectedDie === d ? '0 0 10px rgba(124,58,237,0.35)' : 'none',
                            color: selectedDie === d ? '#c4b5fd' : '#6b7280',
                            fontSize: '0.8rem',
                          }}
                        >
                          d{d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#d97706' }}>
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={quantity}
                        min={1}
                        max={20}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="arcane-input text-center font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider block mb-1" style={{ color: '#d97706' }}>
                        Modifier
                      </label>
                      <input
                        type="number"
                        value={modifier}
                        min={-99}
                        max={99}
                        onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
                        className="arcane-input text-center font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFreeRoll}
                    disabled={isRolling}
                    className="w-full py-3 rounded uppercase tracking-wider text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                    style={{ backgroundColor: '#7c3aed', color: '#fff' }}
                  >
                    {isRolling
                      ? 'Rolling…'
                      : `Roll ${quantity > 1 ? quantity : ''}d${selectedDie}${
                          modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : ''
                        }`}
                  </button>
                </>
              )}

              {/* Luck spend prompt */}
              {pendingLuck && (
                <LuckSpendPrompt
                  rollHistoryId={pendingLuck.rollHistoryId}
                  cost={pendingLuck.cost}
                  currentLuck={clientLuck}
                  onSpend={handleSpendLuck}
                  onDismiss={() => setPendingLuck(null)}
                  isPending={isSpending}
                />
              )}
            </div>

            {/* ── Right: Result + History ── */}
            <div className="space-y-4">

              {/* Current result */}
              {latest ? (
                <div key={latest.id} className="dice-result-reveal">
                  <div
                    className="rounded-lg p-5 text-center"
                    style={
                      latestRT
                        ? {
                            backgroundColor: RESULT_CONFIG[latestRT].bg,
                            border: `1px solid ${RESULT_CONFIG[latestRT].border}`,
                            boxShadow: `0 0 28px ${RESULT_CONFIG[latestRT].glow}`,
                          }
                        : { backgroundColor: '#0d0d15', border: '1px solid #1f2937' }
                    }
                  >
                    <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>
                      {latest.label}{latest.difficulty && ` · ${latest.difficulty}`}
                    </div>

                    <div
                      className="font-bold mb-2"
                      style={{
                        fontSize: '5rem',
                        lineHeight: 1,
                        color: latestRT ? RESULT_CONFIG[latestRT].color : '#e2e8f0',
                        textShadow: latestRT ? `0 0 40px ${RESULT_CONFIG[latestRT].glow}` : 'none',
                      }}
                    >
                      {latest.roll}
                    </div>

                    {latest.target !== null && (
                      <div className="text-sm mb-3" style={{ color: '#9ca3af' }}>
                        rolled {latest.roll} · target {latest.target}
                      </div>
                    )}

                    {latest.rollType === 'free' && (() => {
                      const dice = parseDice(latest.dice)
                      return dice && dice.length > 1 ? (
                        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                          {dice.map((d, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: '#111118', color: '#a78bfa', border: '1px solid #3b1f6e' }}>
                              {d}
                            </span>
                          ))}
                          {latest.modifier !== null && latest.modifier !== 0 && (
                            <span className="text-xs px-2 py-1 rounded"
                              style={{ backgroundColor: '#111118', color: '#6b7280', border: '1px solid #1f2937' }}>
                              {latest.modifier > 0 ? '+' : ''}{latest.modifier}
                            </span>
                          )}
                        </div>
                      ) : null
                    })()}

                    {latestRT && (
                      <div
                        className="inline-block text-sm font-bold uppercase tracking-widest px-4 py-1 rounded-full"
                        style={{
                          color: RESULT_CONFIG[latestRT].color,
                          border: `1px solid ${RESULT_CONFIG[latestRT].color}`,
                          backgroundColor: RESULT_CONFIG[latestRT].bg,
                        }}
                      >
                        {RESULT_CONFIG[latestRT].emoji} {RESULT_CONFIG[latestRT].label}
                        {latest.luckSpent ? ` (${latest.luckSpent} Luck)` : ''}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg min-h-48"
                  style={{ border: '1px dashed #1f2937' }}>
                  <div style={{ fontSize: '3.5rem' }}>🎲</div>
                  <div className="text-xs uppercase tracking-widest mt-2" style={{ color: '#374151' }}>
                    Awaiting Roll
                  </div>
                </div>
              )}

              {/* Roll history */}
              {history.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#4b5563' }}>
                    Roll History
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {history.map((r) => {
                      const rt = r.resultType as ResultType | null | undefined
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-xs rounded px-3 py-1.5"
                          style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}
                        >
                          <div className="flex flex-col min-w-0 mr-2">
                            <span className="truncate" style={{ color: '#9ca3af' }}>
                              {r.label}{r.difficulty ? ` · ${r.difficulty}` : ''}
                            </span>
                            <span style={{ color: '#374151', fontSize: '0.65rem' }}>
                              {relativeTime(r.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-bold" style={{ color: rt ? RESULT_CONFIG[rt].color : '#e2e8f0' }}>
                              {r.roll}
                            </span>
                            {r.target !== null && (
                              <span style={{ color: '#4b5563' }}>/{r.target}</span>
                            )}
                            {rt && <span>{RESULT_CONFIG[rt].emoji}</span>}
                            {r.luckSpent ? (
                              <span title={`${r.luckSpent} Luck spent`} style={{ color: '#f59e0b', fontSize: '0.65rem' }}>
                                🍀
                              </span>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
