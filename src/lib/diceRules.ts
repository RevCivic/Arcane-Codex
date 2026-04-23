export type D100ResultType = 'CRITICAL' | 'SUCCESS' | 'FAILURE' | 'FUMBLE'

export function getD100ResultType(roll: number, target: number): D100ResultType {
  if (roll === 1) return 'CRITICAL'
  if (roll === 100) return 'FUMBLE'
  if (target < 50 && roll >= 96) return 'FUMBLE'
  if (roll <= target) return 'SUCCESS'
  return 'FAILURE'
}

export function getLuckGainForRoll(resultType: D100ResultType): number {
  if (resultType === 'CRITICAL') return 1
  return 0
}
