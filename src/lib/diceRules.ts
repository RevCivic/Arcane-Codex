export type D100ResultType = 'CRITICAL' | 'SUCCESS' | 'FAILURE' | 'FUMBLE'

// Rolls that are always a critical success and award +5 luck, regardless of the target.
const HIGH_LUCK_BONUS_ROLLS = new Set([1, 69])

// All "double digit" repeating rolls (11, 22 ... 99).
// Under target → CRITICAL SUCCESS (+1 luck); over target → FUMBLE / critical failure (+1 luck).
const DOUBLE_DIGIT_ROLLS = new Set([11, 22, 33, 44, 55, 66, 77, 88, 99])

export function getD100ResultType(roll: number, target: number): D100ResultType {
  if (HIGH_LUCK_BONUS_ROLLS.has(roll)) return 'CRITICAL'
  if (DOUBLE_DIGIT_ROLLS.has(roll)) return roll <= target ? 'CRITICAL' : 'FUMBLE'
  if (roll === 100) return 'FUMBLE'
  if (target < 50 && roll >= 96) return 'FUMBLE'
  if (roll <= target) return 'SUCCESS'
  return 'FAILURE'
}

export function getLuckGainForRoll(roll: number, resultType: D100ResultType): number {
  if (HIGH_LUCK_BONUS_ROLLS.has(roll)) return 5
  if (resultType === 'CRITICAL' || resultType === 'FUMBLE') return 1
  return 0
}
