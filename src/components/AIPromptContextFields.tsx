'use client'

import type { AIPromptContext } from '@/lib/aiPromptContext'
import {
  AI_ENTITY_TYPE_OPTIONS,
  AI_FACTION_ALIGNMENT_OPTIONS,
  AI_MECHANICAL_FOCUS_OPTIONS,
  AI_METAPHYSICAL_NATURE_OPTIONS,
  AI_PLAYER_RELATIONSHIP_OPTIONS,
  AI_THREAT_LEVEL_OPTIONS,
  AI_TONE_OPTIONS,
} from '@/lib/aiPromptContext'

type Props = {
  value: AIPromptContext
  onChange: (value: AIPromptContext) => void
}

const inputStyle = { backgroundColor: '#111827', border: '1px solid #374151', color: '#e2e8f0' } as const

function update(value: AIPromptContext, key: keyof AIPromptContext, next: string) {
  return { ...value, [key]: next }
}

export function AIPromptContextFields({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Entity Type</label>
        <select
          value={value.entityType}
          onChange={(e) => onChange(update(value, 'entityType', e.target.value))}
          className="w-full rounded px-2 py-1.5 text-xs"
          style={inputStyle}
        >
          <option value="">Infer from prompt</option>
          {AI_ENTITY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Narrative Role</label>
        <input
          value={value.narrativeRole}
          onChange={(e) => onChange(update(value, 'narrativeRole', e.target.value))}
          placeholder="e.g. hidden patron, doomed scholar, rival hunter"
          className="w-full rounded px-2 py-1.5 text-xs"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Tone</label>
        <select
          value={value.tone}
          onChange={(e) => onChange(update(value, 'tone', e.target.value))}
          className="w-full rounded px-2 py-1.5 text-xs"
          style={inputStyle}
        >
          {AI_TONE_OPTIONS.map((option) => (
            <option key={option.value || 'infer'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Player Relationship</label>
        <select
          value={value.playerRelationship}
          onChange={(e) => onChange(update(value, 'playerRelationship', e.target.value))}
          className="w-full rounded px-2 py-1.5 text-xs"
          style={inputStyle}
        >
          {AI_PLAYER_RELATIONSHIP_OPTIONS.map((option) => (
            <option key={option.value || 'infer'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Threat Level</label>
        <select
          value={value.threatLevel}
          onChange={(e) => onChange(update(value, 'threatLevel', e.target.value))}
          className="w-full rounded px-2 py-1.5 text-xs"
          style={inputStyle}
        >
          {AI_THREAT_LEVEL_OPTIONS.map((option) => (
            <option key={option.value || 'infer'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Faction Alignment</label>
        <select
          value={value.factionAlignment}
          onChange={(e) => onChange(update(value, 'factionAlignment', e.target.value))}
          className="w-full rounded px-2 py-1.5 text-xs"
          style={inputStyle}
        >
          {AI_FACTION_ALIGNMENT_OPTIONS.map((option) => (
            <option key={option.value || 'infer'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Nature</label>
        <select
          value={value.metaphysicalNature}
          onChange={(e) => onChange(update(value, 'metaphysicalNature', e.target.value))}
          className="w-full rounded px-2 py-1.5 text-xs"
          style={inputStyle}
        >
          {AI_METAPHYSICAL_NATURE_OPTIONS.map((option) => (
            <option key={option.value || 'infer'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>Mechanical Focus</label>
        <select
          value={value.mechanicalFocus}
          onChange={(e) => onChange(update(value, 'mechanicalFocus', e.target.value))}
          className="w-full rounded px-2 py-1.5 text-xs"
          style={inputStyle}
        >
          {AI_MECHANICAL_FOCUS_OPTIONS.map((option) => (
            <option key={option.value || 'infer'} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
