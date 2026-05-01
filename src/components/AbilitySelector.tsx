'use client'

import { useState } from 'react'

interface SkillOption {
  name: string
  category: string | null
}

interface AbilitySelectorProps {
  skills: SkillOption[]
  defaultValue?: string | null
}

const OTHER_VALUE = '__other__'

const ABILITY_SCORES = ['STR', 'CON', 'SIZ', 'DEX', 'INT', 'POW', 'CHA', 'APP', 'EDU', 'Luck', 'Sanity']

export function AbilitySelector({ skills, defaultValue }: AbilitySelectorProps) {
  const isKnownValue = defaultValue
    ? skills.some((s) => s.name === defaultValue) || ABILITY_SCORES.includes(defaultValue)
    : false

  const [selected, setSelected] = useState<string>(
    defaultValue ? (isKnownValue ? defaultValue : OTHER_VALUE) : '',
  )
  const [customValue, setCustomValue] = useState<string>(
    defaultValue && !isKnownValue ? defaultValue : '',
  )

  // The value that will actually be submitted.
  const abilityValue = selected === OTHER_VALUE ? customValue.trim() : selected

  // Build optgroup structure: category → sorted skill names.
  const categoryMap = new Map<string, string[]>()
  for (const skill of skills) {
    const cat = skill.category ?? 'Other'
    if (!categoryMap.has(cat)) categoryMap.set(cat, [])
    categoryMap.get(cat)!.push(skill.name)
  }
  const categories = Array.from(categoryMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-2">
      {/* Hidden input carries the resolved value into the form submission. */}
      <input type="hidden" name="baseAbility" value={abilityValue} />

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="arcane-input"
        aria-label="Ability"
      >
        <option value="">— None (passive / auto-success) —</option>
        <optgroup label="Ability Scores">
          {ABILITY_SCORES.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </optgroup>
        {categories.map(([cat, names]) => (
          <optgroup key={cat} label={cat}>
            {names.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </optgroup>
        ))}
        <option value={OTHER_VALUE}>Other (custom)…</option>
      </select>

      {selected === OTHER_VALUE && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          className="arcane-input"
          placeholder="Enter custom ability name"
          autoFocus
        />
      )}
    </div>
  )
}
