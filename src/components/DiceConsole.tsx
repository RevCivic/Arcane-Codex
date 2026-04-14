'use client'

import { useState, useCallback, useRef } from 'react'

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

interface RollRecord {
  id: number
  type: 'check' | 'free'
  label: string
  roll: number
  dice?: number[]
  total?: number
  modifier?: number
  target?: number
  difficulty?: DifficultyTier
  resultType?: ResultType
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: {
  tier: DifficultyTier
  label: string
  mult: number
  color: string
  desc: string
}[] = [
  { tier: 'Easy',       label: 'Easy',       mult: 2.00, color: '#4ade80', desc: '×2' },
  { tier: 'Average',    label: 'Average',     mult: 1.00, color: '#60a5fa', desc: '×1' },
  { tier: 'Difficult',  label: 'Difficult',   mult: 0.75, color: '#f59e0b', desc: '×¾' },
  { tier: 'Hard',       label: 'Hard',        mult: 0.50, color: '#f97316', desc: '×½' },
  { tier: 'Extreme',    label: 'Extreme',     mult: 0.20, color: '#ef4444', desc: '×⅕' },
  { tier: 'Impossible', label: 'Impossible',  mult: 0.00, color: '#dc2626', desc: '1%' },
]

const DICE_TYPES: DiceType[] = [2, 4, 6, 8, 10, 12, 20, 100]

const RESULT_CONFIG: Record<
  ResultType,
  { color: string; bg: string; border: string; glow: string; emoji: string; label: string }
> = {
  CRITICAL: {
    color: '#fbbf24',
    bg: '#1c1407',
    border: '#fbbf2466',
    glow: 'rgba(251,191,36,0.4)',
    emoji: '✨',
    label: 'Critical Success',
  },
  SUCCESS: {
    color: '#4ade80',
    bg: '#052e16',
    border: '#4ade8066',
    glow: 'rgba(74,222,128,0.25)',
    emoji: '✓',
    label: 'Success',
  },
  FAILURE: {
    color: '#f87171',
    bg: '#1f0a0a',
    border: '#f8717166',
    glow: 'rgba(248,113,113,0.25)',
    emoji: '✗',
    label: 'Failure',
  },
  FUMBLE: {
    color: '#dc2626',
    bg: '#1a0505',
    border: '#dc262666',
    glow: 'rgba(220,38,38,0.4)',
    emoji: '💀',
    label: 'Fumble',
  },
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

function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
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
      <div
        className="text-xs uppercase tracking-wider mb-2"
        style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
      >
        Difficulty
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {TIERS.map((t) => {
          const effective = baseTarget !== null ? applyDifficulty(baseTarget, t.tier) : null
          const isSelected = selected === t.tier
          return (
            <button
              key={t.tier}
              type="button"
              onClick={() => onChange(t.tier)}
              className="rounded px-2 py-2 text-center transition-all"
              style={{
                backgroundColor: '#0d0d15',
                border: `1px solid ${isSelected ? t.color : '#1f2937'}`,
                boxShadow: isSelected ? `0 0 8px ${t.color}55` : 'none',
              }}
            >
              <div
                className="text-xs font-semibold"
                style={{
                  color: isSelected ? t.color : '#6b7280',
                  fontFamily: 'Georgia, serif',
                }}
              >
                {t.label}
              </div>
              <div className="text-xs" style={{ color: '#4b5563' }}>
                {t.desc}
              </div>
              {effective !== null && (
                <div
                  className="text-xs font-bold mt-0.5"
                  style={{ color: isSelected ? t.color : '#374151' }}
                >
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

// ─── DiceConsole ──────────────────────────────────────────────────────────────

export function DiceConsole({
  stats,
  skills,
}: {
  stats: StatEntry[]
  skills: SkillEntry[]
}) {
  const [tab, setTab] = useState<ActiveTab>('ability')

  // Ability check state
  const availableStats = stats.filter((s) => s.value !== null && s.value > 0)
  const [selectedStat, setSelectedStat] = useState<string>(availableStats[0]?.key ?? '')
  const [abilityTier, setAbilityTier] = useState<DifficultyTier>('Average')

  // Skill check state
  const [selectedSkillId, setSelectedSkillId] = useState<number>(skills[0]?.id ?? 0)
  const [skillTier, setSkillTier] = useState<DifficultyTier>('Average')

  // Free roll state
  const [selectedDie, setSelectedDie] = useState<DiceType>(20)
  const [quantity, setQuantity] = useState(1)
  const [modifier, setModifier] = useState(0)

  // Roll history (ephemeral, client-only)
  const [history, setHistory] = useState<RollRecord[]>([])
  const nextId = useRef(1)

  const pushResult = useCallback((record: Omit<RollRecord, 'id'>) => {
    setHistory((prev) =>
      [{ ...record, id: nextId.current++ }, ...prev].slice(0, 8)
    )
  }, [])

  // ── Roll handlers ──────────────────────────────────────────────────────────

  const handleAbilityRoll = () => {
    const stat = availableStats.find((s) => s.key === selectedStat)
    if (!stat?.value) return
    const base = stat.value * 5
    const target = applyDifficulty(base, abilityTier)
    const roll = rollD100()
    pushResult({
      type: 'check',
      label: `${stat.label} Check`,
      roll,
      target,
      difficulty: abilityTier,
      resultType: getResultType(roll, target),
    })
  }

  const handleSkillRoll = () => {
    const skill = skills.find((s) => s.id === selectedSkillId)
    if (!skill) return
    const target = applyDifficulty(skill.effectiveValue, skillTier)
    const roll = rollD100()
    pushResult({
      type: 'check',
      label: skill.name,
      roll,
      target,
      difficulty: skillTier,
      resultType: getResultType(roll, target),
    })
  }

  const handleFreeRoll = () => {
    const dice: number[] = Array.from({ length: quantity }, () => rollDie(selectedDie))
    const total = dice.reduce((a, b) => a + b, 0) + modifier
    const rollLabel = `${quantity > 1 ? quantity : ''}d${selectedDie}${
      modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : ''
    }`
    pushResult({
      type: 'free',
      label: rollLabel,
      roll: total,
      dice,
      modifier,
      total,
    })
  }

  const latest = history[0]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
      {/* Header */}
      <h2
        className="text-sm font-semibold uppercase tracking-widest mb-1"
        style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
      >
        🎲 Dice Console
      </h2>
      <p className="text-xs mb-5" style={{ color: '#4b5563' }}>
        Roll ability checks, skill checks, or free dice
      </p>

      {/* Tab bar */}
      <div
        className="flex mb-6 rounded overflow-hidden"
        style={{ border: '1px solid #1f2937' }}
      >
        {(
          [
            ['ability', '⚡ Ability'],
            ['skill', '📖 Skill'],
            ['free', '🎲 Free Roll'],
          ] as [ActiveTab, string][]
        ).map(([t, lbl], i, arr) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-xs uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: tab === t ? '#3b1f6e' : '#0d0d15',
              color: tab === t ? '#c4b5fd' : '#6b7280',
              borderRight: i < arr.length - 1 ? '1px solid #1f2937' : 'none',
              fontFamily: 'Georgia, serif',
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Two-column layout: controls + result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left: Controls ── */}
        <div className="space-y-4">
          {/* ── Ability Check ── */}
          {tab === 'ability' && (
            <>
              <div>
                <div
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                >
                  Characteristic
                </div>
                {availableStats.length === 0 ? (
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    No stats set on this sheet yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableStats.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSelectedStat(s.key)}
                        className="rounded p-2 text-center transition-all"
                        style={{
                          backgroundColor:
                            selectedStat === s.key ? '#1e1133' : '#0d0d15',
                          border: `1px solid ${
                            selectedStat === s.key ? '#7c3aed' : '#1f2937'
                          }`,
                          boxShadow:
                            selectedStat === s.key
                              ? '0 0 10px rgba(124,58,237,0.35)'
                              : 'none',
                        }}
                      >
                        <div
                          className="text-xs uppercase"
                          style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                        >
                          {s.label}
                        </div>
                        <div
                          className="text-lg font-bold"
                          style={{ color: '#a78bfa' }}
                        >
                          {s.value}
                        </div>
                        <div className="text-xs" style={{ color: '#4b5563' }}>
                          → {(s.value ?? 0) * 5}%
                        </div>
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
                disabled={availableStats.length === 0 || !selectedStat}
                className="w-full py-3 rounded uppercase tracking-wider text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Roll d100
              </button>
            </>
          )}

          {/* ── Skill Check ── */}
          {tab === 'skill' && (
            <>
              <div>
                <div
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                >
                  Skill
                </div>
                {skills.length === 0 ? (
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    No skills defined yet.
                  </p>
                ) : (
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(Number(e.target.value))}
                    className="arcane-input"
                  >
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.effectiveValue}%)
                        {s.category ? ` — ${s.category}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {skills.length > 0 && (
                <DifficultySelector
                  selected={skillTier}
                  onChange={setSkillTier}
                  baseTarget={
                    skills.find((s) => s.id === selectedSkillId)?.effectiveValue ?? null
                  }
                />
              )}

              <button
                type="button"
                onClick={handleSkillRoll}
                disabled={skills.length === 0}
                className="w-full py-3 rounded uppercase tracking-wider text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Roll d100
              </button>
            </>
          )}

          {/* ── Free Roll ── */}
          {tab === 'free' && (
            <>
              <div>
                <div
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                >
                  Die Type
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {DICE_TYPES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDie(d)}
                      className="rounded py-2 text-center font-bold transition-all"
                      style={{
                        backgroundColor:
                          selectedDie === d ? '#1e1133' : '#0d0d15',
                        border: `1px solid ${
                          selectedDie === d ? '#7c3aed' : '#1f2937'
                        }`,
                        boxShadow:
                          selectedDie === d
                            ? '0 0 10px rgba(124,58,237,0.35)'
                            : 'none',
                        color: selectedDie === d ? '#c4b5fd' : '#6b7280',
                        fontSize: '0.8rem',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      d{d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="text-xs uppercase tracking-wider block mb-1"
                    style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                  >
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    min={1}
                    max={20}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Math.min(20, parseInt(e.target.value) || 1))
                      )
                    }
                    className="arcane-input text-center font-bold"
                  />
                </div>
                <div>
                  <label
                    className="text-xs uppercase tracking-wider block mb-1"
                    style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                  >
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
                className="w-full py-3 rounded uppercase tracking-wider text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Roll {quantity > 1 ? quantity : ''}d{selectedDie}
                {modifier !== 0
                  ? modifier > 0
                    ? `+${modifier}`
                    : `${modifier}`
                  : ''}
              </button>
            </>
          )}
        </div>

        {/* ── Right: Result display ── */}
        <div>
          {latest ? (
            <div key={latest.id} className="dice-result-reveal space-y-3">
              {/* Result card */}
              <div
                className="rounded-lg p-5 text-center"
                style={
                  latest.resultType
                    ? {
                        backgroundColor: RESULT_CONFIG[latest.resultType].bg,
                        border: `1px solid ${RESULT_CONFIG[latest.resultType].border}`,
                        boxShadow: `0 0 28px ${RESULT_CONFIG[latest.resultType].glow}`,
                      }
                    : { backgroundColor: '#0d0d15', border: '1px solid #1f2937' }
                }
              >
                {/* Label + difficulty */}
                <div
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}
                >
                  {latest.label}
                  {latest.difficulty && ` · ${latest.difficulty}`}
                </div>

                {/* Big roll number */}
                <div
                  className="font-bold mb-2"
                  style={{
                    fontSize: '5rem',
                    lineHeight: 1,
                    color: latest.resultType
                      ? RESULT_CONFIG[latest.resultType].color
                      : '#e2e8f0',
                    textShadow: latest.resultType
                      ? `0 0 40px ${RESULT_CONFIG[latest.resultType].glow}`
                      : 'none',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {latest.type === 'free' ? latest.total : latest.roll}
                </div>

                {/* vs target (checks only) */}
                {latest.type === 'check' && latest.target !== undefined && (
                  <div
                    className="text-sm mb-3"
                    style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                  >
                    rolled {latest.roll} · target {latest.target}
                  </div>
                )}

                {/* Individual dice for multi-die free rolls */}
                {latest.type === 'free' &&
                  latest.dice &&
                  latest.dice.length > 1 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                      {latest.dice.map((d, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: '#111118',
                            color: '#a78bfa',
                            border: '1px solid #3b1f6e',
                            fontFamily: 'Georgia, serif',
                          }}
                        >
                          {d}
                        </span>
                      ))}
                      {latest.modifier !== undefined && latest.modifier !== 0 && (
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: '#111118',
                            color: '#6b7280',
                            border: '1px solid #1f2937',
                          }}
                        >
                          {latest.modifier > 0 ? '+' : ''}
                          {latest.modifier}
                        </span>
                      )}
                    </div>
                  )}

                {/* Result badge */}
                {latest.resultType && (
                  <div
                    className="inline-block text-sm font-bold uppercase tracking-widest px-4 py-1 rounded-full"
                    style={{
                      color: RESULT_CONFIG[latest.resultType].color,
                      border: `1px solid ${RESULT_CONFIG[latest.resultType].color}`,
                      backgroundColor: RESULT_CONFIG[latest.resultType].bg,
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    {RESULT_CONFIG[latest.resultType].emoji}{' '}
                    {RESULT_CONFIG[latest.resultType].label}
                  </div>
                )}
              </div>

              {/* Roll history */}
              {history.length > 1 && (
                <div>
                  <div
                    className="text-xs uppercase tracking-wider mb-2"
                    style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}
                  >
                    Recent
                  </div>
                  <div className="space-y-1">
                    {history.slice(1).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between text-xs rounded px-3 py-1.5"
                        style={{
                          backgroundColor: '#0d0d15',
                          border: '1px solid #1f2937',
                        }}
                      >
                        <span
                          style={{
                            color: '#6b7280',
                            fontFamily: 'Georgia, serif',
                          }}
                        >
                          {r.label}
                          {r.difficulty ? ` · ${r.difficulty}` : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              color: r.resultType
                                ? RESULT_CONFIG[r.resultType].color
                                : '#e2e8f0',
                              fontFamily: 'Georgia, serif',
                            }}
                          >
                            {r.type === 'free' ? r.total : r.roll}
                          </span>
                          {r.resultType && (
                            <span>{RESULT_CONFIG[r.resultType].emoji}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Awaiting-roll placeholder */
            <div
              className="flex flex-col items-center justify-center rounded-lg min-h-48"
              style={{ border: '1px dashed #1f2937' }}
            >
              <div style={{ fontSize: '3.5rem' }}>🎲</div>
              <div
                className="text-xs uppercase tracking-widest mt-2"
                style={{ color: '#374151', fontFamily: 'Georgia, serif' }}
              >
                Awaiting Roll
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
