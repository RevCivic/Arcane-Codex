/**
 * Shared utilities and constants for dice console components
 * Used by RollableStats, RollableSkills, and RollablePowers
 */

import { getD100ResultType, type D100ResultType } from '@/lib/diceRules'

export type DifficultyTier = 'Easy' | 'Average' | 'Difficult' | 'Hard' | 'Extreme' | 'Impossible'

export const TIERS: {
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

export const RESULT_CONFIG: Record<
  D100ResultType,
  { color: string; bg: string; border: string; glow: string; emoji: string; label: string }
> = {
  CRITICAL: { color: '#fbbf24', bg: '#1c1407', border: '#fbbf2466', glow: 'rgba(251,191,36,0.4)',   emoji: '✨', label: 'Critical Success' },
  SUCCESS:  { color: '#4ade80', bg: '#052e16', border: '#4ade8066', glow: 'rgba(74,222,128,0.25)',  emoji: '✓',  label: 'Success'          },
  FAILURE:  { color: '#f87171', bg: '#1f0a0a', border: '#f8717166', glow: 'rgba(248,113,113,0.25)', emoji: '✗',  label: 'Failure'          },
  FUMBLE:   { color: '#dc2626', bg: '#1a0505', border: '#dc262666', glow: 'rgba(220,38,38,0.4)',    emoji: '💀', label: 'Fumble'           },
}

export const ARCANE_RUNES = ['ᚱ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᛏ', 'ᚲ', 'ᛉ', 'ᛊ', 'ᛒ', 'ᛗ', 'ᛚ', 'ᚾ', 'ᚹ', 'ᚷ', 'ᛞ', 'ᛟ']

export function applyDifficulty(baseTarget: number, tier: DifficultyTier): number {
  if (tier === 'Impossible') return 1
  return Math.max(1, Math.round(baseTarget * TIERS.find((t) => t.tier === tier)!.mult))
}

export function randomFlavor(rt: D100ResultType): string {
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
