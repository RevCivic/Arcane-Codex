import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatFreeRollExpression,
  isValidDieSides,
  rollFreeDicePool,
} from './freeRoll'

test('formatFreeRollExpression groups a mixed pool and includes its modifier', () => {
  assert.equal(formatFreeRollExpression([6, 4, 6, 20], 3), 'd4 + 2d6 + d20 + 3')
  assert.equal(formatFreeRollExpression([10, 10], -2), '2d10 - 2')
  assert.equal(formatFreeRollExpression([100], 0), 'd100')
})

test('rollFreeDicePool rolls each die and adds the modifier', () => {
  const samples = [0, 0.49, 0.999]
  const { results, total } = rollFreeDicePool([4, 6, 20], 2, () => samples.shift() ?? 0)

  assert.deepEqual(results, [1, 3, 20])
  assert.equal(total, 26)
})

test('rollFreeDicePool rejects empty and invalid pools', () => {
  assert.throws(() => rollFreeDicePool([], 0), /at least one die/i)
  assert.throws(() => rollFreeDicePool([1], 0), /2-1000 sides/i)
  assert.equal(isValidDieSides(2), true)
  assert.equal(isValidDieSides(1000), true)
  assert.equal(isValidDieSides(1001), false)
})
