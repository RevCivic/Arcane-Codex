'use client'

import { TIERS, type DifficultyTier } from './diceConsoleShared'

interface DifficultySelectorProps {
  tier: DifficultyTier
  onTierChange: (tier: DifficultyTier) => void
}

/**
 * DifficultySelector
 *
 * Shared component for selecting a difficulty tier.
 * Used by RollableStats, RollableSkills, and RollablePowers.
 */
export function DifficultySelector({ tier, onTierChange }: DifficultySelectorProps) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
        Difficulty
      </label>
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((t) => (
          <button
            key={t.tier}
            type="button"
            onClick={() => onTierChange(t.tier)}
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
  )
}
