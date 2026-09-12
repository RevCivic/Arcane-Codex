'use client'

import { useState } from 'react'
import { DiceConsole } from './DiceConsole'
import { ResourcePoolDisplay } from './ResourcePoolDisplay'
import type { StatEntry, SkillEntry, PowerEntry, HistoryEntry } from './DiceConsole'
import { CollapsibleSection } from './CollapsibleSection'

interface DiceConsoleWithResourceDisplayProps {
  characterId: number
  stats: StatEntry[]
  skills: SkillEntry[]
  powers: PowerEntry[]
  initialLuck: number | null
  initialMp: number | null
  initialSanity: number | null
  initialHp: number | null
  maxHp: number | null
  maxMp: number | null
  maxSanity: number | null
  initialHistory: HistoryEntry[]
}

/**
 * DiceConsoleWithResourceDisplay
 *
 * A combined component that shows live-updating resource pools alongside the dice console.
 * When the user spends resources in the console, the displays update in real-time.
 */
export function DiceConsoleWithResourceDisplay({
  characterId,
  stats,
  skills,
  powers,
  initialLuck,
  initialMp,
  initialSanity,
  initialHp,
  maxHp,
  maxMp,
  maxSanity,
  initialHistory,
}: DiceConsoleWithResourceDisplayProps) {
  // Track live resource values
  const [currentLuck, setCurrentLuck] = useState(initialLuck)
  const [currentMp, setCurrentMp] = useState(initialMp)
  const [currentSanity, setCurrentSanity] = useState(initialSanity)
  const [currentHp, setCurrentHp] = useState(initialHp)

  // Handle resource spending from DiceConsole
  const handleResourceSpent = (type: 'luck' | 'mp' | 'sanity' | 'hp', newValue: number | null) => {
    switch (type) {
      case 'luck':
        setCurrentLuck(newValue)
        break
      case 'mp':
        setCurrentMp(newValue)
        break
      case 'sanity':
        setCurrentSanity(newValue)
        break
      case 'hp':
        setCurrentHp(newValue)
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Resource Pools */}
      <CollapsibleSection
        storageKey="derived-statistics"
        className="card-arcane rounded-lg p-6"
        style={{ fontFamily: 'Georgia, serif' }}
        title={
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#a78bfa' }}>
            ✦ Derived Statistics
          </h2>
        }
      >
        <ResourcePoolDisplay
          initialHp={currentHp}
          maxHp={maxHp}
          initialSanity={currentSanity}
          maxSanity={maxSanity}
          initialMp={currentMp}
          maxMp={maxMp}
          initialLuck={currentLuck}
        />
      </CollapsibleSection>

      {/* Dice Console */}
      <CollapsibleSection
        storageKey="dice-console"
        title={
          <h2 className="text-lg font-semibold uppercase tracking-widest" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            🎲 Dice Console
          </h2>
        }
      >
        <DiceConsole
          characterId={characterId}
          stats={stats}
          skills={skills}
          powers={powers}
          initialLuck={currentLuck}
          initialMp={currentMp}
          initialSanity={currentSanity}
          initialHp={currentHp}
          initialHistory={initialHistory}
          onResourceSpent={handleResourceSpent}
        />
      </CollapsibleSection>
    </div>
  )
}
