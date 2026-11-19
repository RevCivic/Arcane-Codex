export const STANDARD_FREE_ROLL_DICE = [2, 4, 6, 8, 10, 12, 20, 100] as const

export const MIN_FREE_ROLL_SIDES = 2
export const MAX_FREE_ROLL_SIDES = 1000
export const MAX_FREE_ROLL_DICE = 20

export function isValidDieSides(sides: number): boolean {
  return Number.isInteger(sides) && sides >= MIN_FREE_ROLL_SIDES && sides <= MAX_FREE_ROLL_SIDES
}

export function formatFreeRollExpression(dicePool: number[], modifier: number): string {
  const counts = new Map<number, number>()
  for (const sides of dicePool) {
    counts.set(sides, (counts.get(sides) ?? 0) + 1)
  }

  const diceExpression = Array.from(counts.entries())
    .sort(([left], [right]) => left - right)
    .map(([sides, quantity]) => `${quantity > 1 ? quantity : ''}d${sides}`)
    .join(' + ')

  if (modifier === 0) return diceExpression
  const modifierExpression = modifier > 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`
  return diceExpression ? `${diceExpression} ${modifierExpression}` : String(modifier)
}

export function rollFreeDicePool(
  dicePool: number[],
  modifier: number,
  random: () => number = Math.random
): { results: number[]; total: number } {
  if (dicePool.length === 0) throw new Error('Add at least one die before rolling')
  if (dicePool.length > MAX_FREE_ROLL_DICE) {
    throw new Error(`Free rolls are limited to ${MAX_FREE_ROLL_DICE} dice`)
  }
  if (!dicePool.every(isValidDieSides)) {
    throw new Error(`Dice must have ${MIN_FREE_ROLL_SIDES}-${MAX_FREE_ROLL_SIDES} sides`)
  }

  const results = dicePool.map((sides) => Math.floor(random() * sides) + 1)
  const total = results.reduce((sum, result) => sum + result, modifier)
  return { results, total }
}
