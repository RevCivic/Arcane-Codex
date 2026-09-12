'use client'

import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'

interface DerivedBoxProps {
  label: string
  currentName: string
  maxName: string
  current: number | null | undefined
  max: number | null | undefined
  accent: string
  description?: string
}

interface SimpleStatBoxProps {
  label: string
  name: string
  value: number | null | undefined
  accent: string
  description?: string
  min: number
  max: number
}

interface InfoTooltipButtonProps {
  label: string
  description: string
  tooltipId: string
  color: string
}

function InfoBubbleIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9v4" />
      <path d="M10 6h.01" />
    </svg>
  )
}

function InfoTooltipButton({ label, description, tooltipId, color }: InfoTooltipButtonProps) {
  return (
    <button
      type="button"
      className="group relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-600/60 cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0d0d15]"
      style={{ color }}
      aria-label={`${label} explanation`}
      aria-describedby={tooltipId}
    >
      <InfoBubbleIcon />
      <div
        id={tooltipId}
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-32 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-gray-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        role="tooltip"
      >
        {description}
      </div>
    </button>
  )
}

function DerivedBox({
  label, currentName, maxName,
  current, max,
  accent,
  description,
}: DerivedBoxProps) {
  const tooltipId = `derived-help-${currentName}`

  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: '#0d0d15', border: `1px solid ${accent}33` }}>
      <div className="text-xs uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1" style={{ color: accent, fontFamily: 'Georgia, serif' }}>
        <span>{label}</span>
        {description && (
          <InfoTooltipButton label={label} description={description} tooltipId={tooltipId} color={accent} />
        )}
      </div>
      <div className="flex items-center gap-2 justify-center">
        <input
          name={currentName}
          type="number"
          value={current ?? ''}
          min={0}
          max={999}
          readOnly
          className="arcane-input text-center w-16 text-base font-bold bg-gray-900 cursor-default"
          style={{ color: '#e2e8f0' }}
          placeholder="—"
        />
        <span style={{ color: '#6b7280' }}>/</span>
        <input
          name={maxName}
          type="number"
          value={max ?? ''}
          min={0}
          max={999}
          readOnly
          className="arcane-input text-center w-16 text-base font-bold bg-gray-900 cursor-default"
          style={{ color: '#6b7280' }}
          placeholder="—"
        />
      </div>
    </div>
  )
}

function SimpleStatBox({
  label, name,
  value,
  accent,
  description,
  min, max,
}: SimpleStatBoxProps) {
  const tooltipId = `simple-stat-help-${name}`

  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: '#0d0d15', border: `1px solid ${accent}33` }}>
      <div className="text-xs uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1" style={{ color: accent, fontFamily: 'Georgia, serif' }}>
        <span>{label}</span>
        {description && (
          <InfoTooltipButton label={label} description={description} tooltipId={tooltipId} color={accent} />
        )}
      </div>
      <input
        name={name}
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        readOnly
        className="w-full text-center text-base font-bold arcane-input bg-gray-900 cursor-default"
        style={{ color: '#e2e8f0' }}
        placeholder="—"
      />
    </div>
  )
}

/**
 * ResourcePoolDisplay
 *
 * Renders the resource pool display boxes (HP, Sanity, MP, Luck) with live-updating values.
 * When DiceConsole spends a resource, it calls the onUpdate callback on this component
 * to immediately reflect the change in the display.
 */
interface ResourcePoolDisplayProps {
  initialHp: number | null | undefined
  maxHp: number | null | undefined
  initialSanity: number | null | undefined
  maxSanity: number | null | undefined
  initialMp: number | null | undefined
  maxMp: number | null | undefined
  initialLuck: number | null | undefined
  initialBuild: number | null | undefined
  onUpdate?: (resources: {
    hp: number | null
    sanity: number | null
    mp: number | null
    luck: number | null
  }) => void
}
export const ResourcePoolDisplay = ({
  initialHp, maxHp,
  initialSanity, maxSanity,
  initialMp, maxMp,
  initialLuck,
  initialBuild,
  onUpdate,
}: ResourcePoolDisplayProps) => {
  const [currentHp, setCurrentHp] = useState<number | null | undefined>(initialHp)
  const [currentSanity, setCurrentSanity] = useState<number | null | undefined>(initialSanity)
  const [currentMp, setCurrentMp] = useState<number | null | undefined>(initialMp)
  const [currentLuck, setCurrentLuck] = useState<number | null | undefined>(initialLuck)

  // Sync with initial values if they change
  useEffect(() => {
    setCurrentHp(initialHp)
  }, [initialHp])

  useEffect(() => {
    setCurrentSanity(initialSanity)
  }, [initialSanity])

  useEffect(() => {
    setCurrentMp(initialMp)
  }, [initialMp])

  useEffect(() => {
    setCurrentLuck(initialLuck)
  }, [initialLuck])

  // Notify parent of updates
  useEffect(() => {
    onUpdate?.({
      hp: currentHp ?? null,
      sanity: currentSanity ?? null,
      mp: currentMp ?? null,
      luck: currentLuck ?? null,
    })
  }, [currentHp, currentSanity, currentMp, currentLuck, onUpdate])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <DerivedBox label="Hit Points" currentName="currentHp" maxName="maxHp"
        current={currentHp} max={maxHp} accent="#4ade80"
        description="Current and maximum hit points. Lose HP when damaged. Unconscious or dead at 0 or below." />
      <DerivedBox label="Sanity"     currentName="currentSanity" maxName="maxSanity"
        current={currentSanity} max={maxSanity} accent="#a78bfa"
        description="Current and maximum sanity points. Lose Sanity from witnessing horrific events. Phobias and manias form at 0." />
      <DerivedBox label="Magic Pts"  currentName="currentMp" maxName="maxMp"
        current={currentMp} max={maxMp} accent="#60a5fa"
        description="Current and maximum magic points. Spend to cast powers. Recovers with rest." />
      <SimpleStatBox label="Luck" name="luck" value={currentLuck} accent="#f59e0b"
        description="Luck points remaining. Spend to convert a Failed roll to a Success. Recovers with time." min={0} max={99} />
      <SimpleStatBox label="Build" name="build" value={initialBuild} accent="#9ca3af"
        description="Modifier for damage dice based on STR and SIZ. Positive builds add dice; negative builds subtract." min={-2} max={4} />
    </div>
  )
}
