export type D100ResultType = 'CRITICAL' | 'SUCCESS' | 'FAILURE' | 'FUMBLE'

const LUCK_BONUS_ROLLS = new Set([1, 69])
const DOUBLE_CRITICAL_ROLLS = new Set([11, 22, 33, 44])

export function getD100ResultType(roll: number, target: number): D100ResultType {
  if (LUCK_BONUS_ROLLS.has(roll)) return 'CRITICAL'
  if (DOUBLE_CRITICAL_ROLLS.has(roll) && roll <= target) return 'CRITICAL'
  if (roll === 100) return 'FUMBLE'
  if (target < 50 && roll >= 96) return 'FUMBLE'
  if (roll <= target) return 'SUCCESS'
  return 'FAILURE'
}

export function getLuckGainForCriticalRoll(roll: number, resultType: D100ResultType): number {
  if (LUCK_BONUS_ROLLS.has(roll)) return 5
  if (resultType === 'CRITICAL' || resultType === 'FUMBLE') return 1
  return 0
}
