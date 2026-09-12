'use client'

import { RESULT_CONFIG, type D100ResultType } from './diceConsoleShared'
import type { HistoryEntry } from './DiceConsole'

interface RollResultDisplayProps {
  latest: HistoryEntry | null
  history: HistoryEntry[]
  isScrambling: boolean
  scrambleRune: string
  flavorText: string | null
}

/**
 * RollResultDisplay
 *
 * Shared component for displaying dice roll results and history.
 * Used by RollableStats, RollableSkills, and RollablePowers.
 */
export function RollResultDisplay({
  latest,
  history,
  isScrambling,
  scrambleRune,
  flavorText,
}: RollResultDisplayProps) {
  const latestRT = latest?.resultType as D100ResultType | null | undefined

  return (
    <>
      {/* Result Display */}
      {latest ? (
        <div
          className="rounded-lg p-4 text-center"
          style={
            latestRT
              ? {
                  backgroundColor: RESULT_CONFIG[latestRT].bg,
                  border: `1px solid ${RESULT_CONFIG[latestRT].border}`,
                  boxShadow: `0 0 20px ${RESULT_CONFIG[latestRT].glow}`,
                }
              : { backgroundColor: '#0d0d15', border: '1px solid #1f2937' }
          }
        >
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280' }}>
            {latest.label}
            {latest.difficulty && ` · ${latest.difficulty}`}
          </div>
          <div
            className="text-4xl font-bold mb-2"
            style={{
              color: isScrambling ? '#7c3aed' : latestRT ? RESULT_CONFIG[latestRT].color : '#e2e8f0',
              textShadow: isScrambling
                ? '0 0 20px rgba(124,58,237,0.8)'
                : latestRT
                  ? `0 0 30px ${RESULT_CONFIG[latestRT].glow}`
                  : 'none',
            }}
          >
            {isScrambling ? scrambleRune : latest.roll}
          </div>
          {!isScrambling && latest.target !== null && (
            <div className="text-xs mb-2" style={{ color: '#9ca3af' }}>
              rolled {latest.roll} vs target {latest.target}
            </div>
          )}
          {!isScrambling && latestRT && (
            <div
              className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{
                color: RESULT_CONFIG[latestRT].color,
                border: `1px solid ${RESULT_CONFIG[latestRT].color}`,
                backgroundColor: RESULT_CONFIG[latestRT].bg,
              }}
            >
              {RESULT_CONFIG[latestRT].emoji} {RESULT_CONFIG[latestRT].label}
            </div>
          )}
          {!isScrambling && flavorText && (
            <div className="mt-2 text-xs italic" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
              {flavorText}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center rounded-lg py-12"
          style={{ border: '1px dashed #1f2937' }}
        >
          <div style={{ fontSize: '2.5rem' }}>🎲</div>
          <div className="text-xs uppercase tracking-widest mt-2" style={{ color: '#374151' }}>
            Awaiting Roll
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: '#4b5563' }}>
            Recent Rolls
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.slice(1).map((r) => {
              const rt = r.resultType as D100ResultType | null | undefined
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between text-xs rounded px-2 py-1"
                  style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}
                >
                  <span className="flex-1 truncate" style={{ color: '#9ca3af' }}>
                    {r.label}
                    {r.difficulty ? ` · ${r.difficulty}` : ''}
                  </span>
                  <span
                    className="font-bold ml-2"
                    style={{
                      color: rt ? RESULT_CONFIG[rt].color : '#e2e8f0',
                      minWidth: '2rem',
                      textAlign: 'right',
                    }}
                  >
                    {r.roll}
                  </span>
                  {r.target !== null && (
                    <span className="ml-1" style={{ color: '#4b5563' }}>
                      /{r.target}
                    </span>
                  )}
                  {rt && <span className="ml-1">{RESULT_CONFIG[rt].emoji}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
