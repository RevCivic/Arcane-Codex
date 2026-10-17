'use client'

import { useState, useTransition, useRef, useCallback, useEffect, useMemo } from 'react'
import { saveRoll, spendLuckOnRoll, spendMpOnRoll, spendSanityOnRoll, spendHpOnRoll } from '@/app/actions'
import { getD100ResultType } from '@/lib/diceRules'
import {
  applyDifficulty,
  useScrambleAnimation,
  RESULT_CONFIG,
  TIERS,
  type DifficultyTier,
} from './diceConsoleShared'
import type { StatEntry, SkillEntry, PowerEntry, HistoryEntry } from './DiceConsole'

// ─── Types ────────────────────────────────────────────────────────────────────

type RollItemType = 'stat' | 'skill' | 'power'

interface RollItem {
  type: RollItemType
  id: string          // `stat:${key}` | `skill:${id}` | `power:${id}`
  label: string
  category: string
  target: number      // effective % value (before difficulty)
  skillId?: number
  abilityId?: number | null
  mpCost?: number | null
  sanityCost?: number | null
  hpCost?: number | null
  markedForImprovement?: boolean
}

// Stats that are rolled directly without ×5 multiplier
const STATS_NO_MULTIPLY = new Set(['luck', 'sanity'])

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface TierChipProps {
  tier: DifficultyTier
  active: boolean
  onSelect: (t: DifficultyTier) => void
}
function TierChip({ tier, active, onSelect }: TierChipProps) {
  const t = TIERS.find((x) => x.tier === tier)!
  return (
    <button
      type="button"
      onClick={() => onSelect(tier)}
      className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide transition-all"
      style={{
        backgroundColor: active ? `${t.color}33` : 'transparent',
        border: `1px solid ${active ? t.color : '#374151'}`,
        color: active ? t.color : '#6b7280',
      }}
    >
      {tier === 'Average' ? 'Avg' : tier.slice(0, 4)}
    </button>
  )
}

type PowerCostType = 'mp' | 'sanity' | 'hp'

interface PendingCost {
  rollId: number
  type: PowerCostType
  cost: number
}

interface ResultOverlayProps {
  entry: HistoryEntry | null
  isScrambling: boolean
  scrambleRune: string
  flavorText: string | null
  currentLuck: number | null
  pendingCost: PendingCost | null
  currentHp: number | null
  currentSanity: number | null
  currentMp: number | null
  onLuckSpend: () => void
  onCostSpend: () => void
  onDismiss: () => void
}
function ResultOverlay({
  entry,
  isScrambling,
  scrambleRune,
  flavorText,
  currentLuck,
  pendingCost,
  currentHp,
  currentSanity,
  currentMp,
  onLuckSpend,
  onCostSpend,
  onDismiss,
}: ResultOverlayProps) {
  if (!entry) return null
  const rt = entry.resultType as keyof typeof RESULT_CONFIG | null | undefined
  const cfg = rt ? RESULT_CONFIG[rt] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div
        className="pointer-events-auto rounded-2xl p-8 text-center shadow-2xl mx-4 max-w-sm w-full"
        style={
          cfg
            ? {
                backgroundColor: cfg.bg,
                border: `2px solid ${cfg.border}`,
                boxShadow: `0 0 60px ${cfg.glow}`,
              }
            : { backgroundColor: '#0d0d15', border: '2px solid #374151' }
        }
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-4 text-lg opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: '#9ca3af' }}
          aria-label="Dismiss result"
        >
          ×
        </button>

        <div className="text-sm uppercase tracking-widest mb-2" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
          {entry.label}
          {entry.difficulty && ` · ${entry.difficulty}`}
        </div>

        <div
          className="text-7xl font-bold mb-3"
          style={{
            color: isScrambling ? '#7c3aed' : cfg?.color ?? '#e2e8f0',
            textShadow: isScrambling
              ? '0 0 30px rgba(124,58,237,0.8)'
              : cfg
                ? `0 0 40px ${cfg.glow}`
                : 'none',
            fontFamily: 'Georgia, serif',
          }}
        >
          {isScrambling ? scrambleRune : entry.roll}
        </div>

        {!isScrambling && entry.target != null && (
          <div className="text-sm mb-3" style={{ color: '#9ca3af' }}>
            rolled {entry.roll} vs {entry.target}
          </div>
        )}

        {!isScrambling && cfg && rt && (
          <div
            className="inline-block text-sm font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-3"
            style={{
              color: cfg.color,
              border: `1px solid ${cfg.color}`,
              backgroundColor: cfg.bg,
            }}
          >
            {cfg.emoji} {cfg.label}
          </div>
        )}

        {!isScrambling && flavorText && (
          <div className="text-xs italic mt-1 mb-3" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            {flavorText}
          </div>
        )}

        {/* Luck spend option on FAILURE */}
        {!isScrambling && rt === 'FAILURE' && currentLuck != null && currentLuck >= entry.roll && (
          <button
            type="button"
            onClick={onLuckSpend}
            className="mt-2 px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider w-full transition-colors hover:opacity-90"
            style={{ backgroundColor: '#1c1407', color: '#f59e0b', border: '1px solid #d9770666' }}
          >
            🍀 Spend {entry.roll} Luck to Succeed
          </button>
        )}

        {/* Power cost spend */}
        {!isScrambling && pendingCost && (() => {
          const canAfford =
            pendingCost.type === 'mp' ? (currentMp ?? 0) >= pendingCost.cost
            : pendingCost.type === 'sanity' ? (currentSanity ?? 0) >= pendingCost.cost
            : (currentHp ?? 0) >= pendingCost.cost
          const costLabels: Record<PowerCostType, { emoji: string; label: string; color: string; bg: string; border: string }> = {
            mp:     { emoji: '✨', label: 'Magic Pts', color: '#60a5fa', bg: '#0c1b2e', border: '#1d4ed866' },
            sanity: { emoji: '🧠', label: 'Sanity',   color: '#a78bfa', bg: '#1e1133', border: '#7c3aed66' },
            hp:     { emoji: '❤️', label: 'HP',       color: '#4ade80', bg: '#0a1f14', border: '#16a34a66' },
          }
          const cl = costLabels[pendingCost.type]
          return (
            <button
              type="button"
              onClick={onCostSpend}
              disabled={!canAfford}
              className="mt-2 px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider w-full transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: cl.bg, color: cl.color, border: `1px solid ${cl.border}` }}
            >
              {cl.emoji} Spend {pendingCost.cost} {cl.label}
            </button>
          )
        })()}

        {!isScrambling && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 px-4 py-1.5 rounded text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface UnifiedRollSurfaceProps {
  characterId: number
  stats: StatEntry[]
  skills: SkillEntry[]
  powers: PowerEntry[]
  initialHistory: HistoryEntry[]
  currentLuck: number | null
  currentHp: number | null
  currentSanity: number | null
  currentMp: number | null
  onLuckSpent: (newLuck: number | null) => void
  onHpSpent?: (newHp: number) => void
  onSanitySpent?: (newSanity: number) => void
  onMpSpent?: (newMp: number) => void
}

/**
 * UnifiedRollSurface
 *
 * Play-mode roll interface: one searchable list of all rollable items
 * (skills, stats, powers) with inline difficulty tier picker and
 * auto-dismissing result overlay.
 */
export function UnifiedRollSurface({
  characterId,
  stats,
  skills,
  powers,
  initialHistory,
  currentLuck,
  currentHp,
  currentSanity,
  currentMp,
  onLuckSpent,
  onHpSpent,
  onSanitySpent,
  onMpSpent,
}: UnifiedRollSurfaceProps) {
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<DifficultyTier>('Average')
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory)
  const [latestEntry, setLatestEntry] = useState<HistoryEntry | null>(null)
  const [showOverlay, setShowOverlay] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [pendingCost, setPendingCost] = useState<PendingCost | null>(null)
  const [markedSkillIds, setMarkedSkillIds] = useState<Set<number>>(
    () => new Set(skills.filter((s) => s.markedForImprovement).map((s) => s.id))
  )
  const [markedAbilityIds, setMarkedAbilityIds] = useState<Set<number>>(
    () => new Set(powers.filter((p) => p.abilityId != null && p.markedForImprovement).map((p) => p.abilityId!))
  )

  const [isPending, startTransition] = useTransition()
  const { isScrambling, scrambleRune, flavorText, startScramble } = useScrambleAnimation()

  const tempIdRef = useRef(-1)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build unified roll items
  const allItems = useMemo<RollItem[]>(() => {
    const items: RollItem[] = []

    // Stats
    for (const s of stats) {
      if (s.value == null || s.value <= 0) continue
      const base = STATS_NO_MULTIPLY.has(s.key) ? s.value : s.value * 5
      items.push({
        type: 'stat',
        id: `stat:${s.key}`,
        label: s.label,
        category: 'Characteristics',
        target: base,
      })
    }

    // Skills
    for (const sk of skills) {
      items.push({
        type: 'skill',
        id: `skill:${sk.id}`,
        label: sk.name,
        category: sk.category ?? 'Skills',
        target: sk.effectiveValue,
        skillId: sk.id,
        markedForImprovement: markedSkillIds.has(sk.id),
      })
    }

    // Powers
    for (const p of powers) {
      items.push({
        type: 'power',
        id: `power:${p.id}`,
        label: p.name,
        category: 'Powers',
        target: p.effectiveValue,
        abilityId: p.abilityId,
        mpCost: p.mpCost,
        sanityCost: p.sanityCost,
        hpCost: p.hpCost,
        markedForImprovement: p.abilityId != null && markedAbilityIds.has(p.abilityId),
      })
    }

    return items
  }, [stats, skills, powers, markedSkillIds, markedAbilityIds])

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return allItems
    const q = search.toLowerCase()
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    )
  }, [allItems, search])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, RollItem[]>()
    // Order: Characteristics first, then Powers, then skills by category
    const order = ['Characteristics', 'Powers']
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    // Sort keys
    const sorted = new Map<string, RollItem[]>()
    for (const key of order) {
      if (map.has(key)) sorted.set(key, map.get(key)!)
    }
    for (const [key, val] of map) {
      if (!sorted.has(key)) sorted.set(key, val)
    }
    return sorted
  }, [filtered])

  const scheduleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = setTimeout(() => {
      setShowOverlay(false)
    }, 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const roll = useCallback(
    (item: RollItem) => {
      const effectiveTarget = applyDifficulty(item.target, tier)
      const rolled = Math.floor(Math.random() * 100) + 1
      const resultType = getD100ResultType(rolled, effectiveTarget)

      const entry: Omit<HistoryEntry, 'id' | 'createdAt'> = {
        rollType: item.type === 'stat' ? 'ability' : item.type,
        label: item.type === 'stat' ? `${item.label} Check` : item.label,
        roll: rolled,
        target: effectiveTarget,
        difficulty: tier !== 'Average' ? tier : null,
        resultType: resultType ?? null,
        dice: null,
        modifier: null,
        luckSpent: null,
        mpSpent: null,
        sanitySpent: null,
        hpSpent: null,
        skillId: item.skillId ?? null,
        abilityId: item.abilityId ?? null,
      }

      const tempId = tempIdRef.current--
      const tempEntry: HistoryEntry = { ...entry, id: tempId, createdAt: new Date().toISOString() }

      setHistory((prev) => [tempEntry, ...prev].slice(0, 20))
      setLatestEntry(tempEntry)
      setShowOverlay(true)
      startScramble(resultType)
      scheduleDismiss()

      if (resultType === 'FAILURE' || resultType === 'FUMBLE') {
        if (item.skillId) setMarkedSkillIds((prev) => new Set([...prev, item.skillId!]))
        if (item.abilityId) setMarkedAbilityIds((prev) => new Set([...prev, item.abilityId!]))
      }

      startTransition(async () => {
        try {
          const saved = await saveRoll(characterId, {
            rollType: entry.rollType,
            label: entry.label,
            roll: rolled,
            target: effectiveTarget,
            difficulty: entry.difficulty,
            resultType: entry.resultType,
            skillId: item.skillId ?? null,
            abilityId: item.abilityId ?? null,
          })
          setHistory((prev) =>
            prev.map((h) => (h.id === tempId ? { ...h, id: saved.id } : h))
          )
          setLatestEntry((prev) => (prev?.id === tempId ? { ...prev, id: saved.id } : prev))
          if (saved.currentLuck != null) onLuckSpent(saved.currentLuck)
          // Queue power cost prompt (MP > Sanity > HP priority)
          if (item.type === 'power') {
            if (item.mpCost && item.mpCost > 0) {
              setPendingCost({ rollId: saved.id, type: 'mp', cost: item.mpCost })
            } else if (item.sanityCost && item.sanityCost > 0) {
              setPendingCost({ rollId: saved.id, type: 'sanity', cost: item.sanityCost })
            } else if (item.hpCost && item.hpCost > 0) {
              setPendingCost({ rollId: saved.id, type: 'hp', cost: item.hpCost })
            }
          }
        } catch {
          // keep optimistic entry
        }
      })
    },
    [characterId, tier, startScramble, scheduleDismiss, onLuckSpent, startTransition]
  )

  const handleCostSpend = useCallback(() => {
    if (!pendingCost) return
    const { rollId, type, cost } = pendingCost
    setPendingCost(null)

    startTransition(async () => {
      try {
        if (type === 'mp') {
          await spendMpOnRoll(characterId, rollId, cost)
          if (currentMp != null) onMpSpent?.(Math.max(0, currentMp - cost))
          setLatestEntry((prev) => prev ? { ...prev, mpSpent: cost } : prev)
        } else if (type === 'sanity') {
          await spendSanityOnRoll(characterId, rollId, cost)
          if (currentSanity != null) onSanitySpent?.(Math.max(0, currentSanity - cost))
          setLatestEntry((prev) => prev ? { ...prev, sanitySpent: cost } : prev)
        } else {
          await spendHpOnRoll(characterId, rollId, cost)
          if (currentHp != null) onHpSpent?.(Math.max(0, currentHp - cost))
          setLatestEntry((prev) => prev ? { ...prev, hpSpent: cost } : prev)
        }
      } catch {
        // ignore; the roll history record remains without the cost annotated
      }
    })
  }, [pendingCost, characterId, currentMp, currentSanity, currentHp, onMpSpent, onSanitySpent, onHpSpent, startTransition])

  const handleLuckSpend = useCallback(() => {
    if (!latestEntry || latestEntry.id < 0) return
    const cost = latestEntry.roll
    if (currentLuck == null || currentLuck < cost) return

    const newLuck = currentLuck - cost
    onLuckSpent(newLuck)
    setShowOverlay(false)
    setLatestEntry((prev) => prev ? { ...prev, resultType: 'SUCCESS', luckSpent: cost } : prev)

    startTransition(async () => {
      try {
        await spendLuckOnRoll(characterId, latestEntry.id, cost)
      } catch {
        // revert
        onLuckSpent(currentLuck)
      }
    })
  }, [latestEntry, currentLuck, characterId, onLuckSpent, startTransition])

  return (
    <div className="space-y-4">
      {/* Result overlay */}
      {showOverlay && (
        <ResultOverlay
          entry={latestEntry}
          isScrambling={isScrambling}
          scrambleRune={scrambleRune}
          flavorText={flavorText}
          currentLuck={currentLuck}
          pendingCost={pendingCost}
          currentHp={currentHp}
          currentSanity={currentSanity}
          currentMp={currentMp}
          onLuckSpend={handleLuckSpend}
          onCostSpend={handleCostSpend}
          onDismiss={() => setShowOverlay(false)}
        />
      )}

      {/* Search + tier row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills, stats, powers…"
          className="arcane-input flex-1 min-w-0"
          style={{ color: '#e2e8f0' }}
          aria-label="Search rollable items"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {(['Easy', 'Average', 'Difficult', 'Hard', 'Extreme'] as DifficultyTier[]).map((t) => (
            <TierChip key={t} tier={t} active={tier === t} onSelect={setTier} />
          ))}
        </div>
      </div>

      {/* Roll list */}
      {grouped.size === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: '#4b5563' }}>
          No matching skills or stats.
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <div
                className="text-xs uppercase tracking-widest mb-2 pb-1"
                style={{ color: '#6b7280', borderBottom: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}
              >
                {category}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => {
                  const effectiveTarget = applyDifficulty(item.target, tier)
                  const tierMeta = TIERS.find((t) => t.tier === tier)!
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => roll(item)}
                      disabled={isPending}
                      className="flex items-center justify-between rounded-lg px-4 py-3 text-left transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                      style={{
                        backgroundColor: '#0d0d15',
                        border: '1px solid #1f2937',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>
                            {item.label}
                          </span>
                          {item.markedForImprovement && (
                            <span title="Marked for improvement" className="text-xs">📌</span>
                          )}
                          {(item.mpCost || item.sanityCost || item.hpCost) && (
                            <span className="text-xs" style={{ color: '#60a5fa' }}>
                              {[
                                item.mpCost ? `${item.mpCost}MP` : '',
                                item.sanityCost ? `${item.sanityCost}SAN` : '',
                                item.hpCost ? `${item.hpCost}HP` : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: '#4b5563' }}>
                          base {item.target}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <div
                          className="text-sm font-bold font-mono px-2 py-0.5 rounded"
                          style={{
                            color: tierMeta.color,
                            backgroundColor: `${tierMeta.color}22`,
                            border: `1px solid ${tierMeta.color}44`,
                          }}
                        >
                          {effectiveTarget}%
                        </div>
                        <span className="text-lg" aria-hidden="true">🎲</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Roll history (collapsed by default) */}
      {history.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs uppercase tracking-widest flex items-center gap-1 transition-colors hover:text-purple-300"
            style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}
          >
            <span style={{ transform: showHistory ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', display: 'inline-block' }}>▾</span>
            Roll History ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1 max-h-52 overflow-y-auto">
              {history.slice(0, 10).map((r) => {
                const rt = r.resultType as keyof typeof RESULT_CONFIG | null | undefined
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-xs rounded px-3 py-1.5"
                    style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}
                  >
                    <span className="flex-1 truncate" style={{ color: '#9ca3af' }}>
                      {r.label}
                      {r.difficulty ? ` · ${r.difficulty}` : ''}
                    </span>
                    <span className="font-bold ml-2 font-mono" style={{ color: rt ? RESULT_CONFIG[rt].color : '#e2e8f0' }}>
                      {r.roll}
                    </span>
                    {r.target != null && (
                      <span className="ml-1" style={{ color: '#4b5563' }}>/{r.target}</span>
                    )}
                    {rt && <span className="ml-1">{RESULT_CONFIG[rt].emoji}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
