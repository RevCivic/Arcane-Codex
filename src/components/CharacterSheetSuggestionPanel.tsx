'use client'

import { useState } from 'react'
import { captureAIFeedback, generateCharacterStatsSkillsSuggestion } from '@/app/actions'
import { AIPromptContextFields } from '@/components/AIPromptContextFields'
import { DEFAULT_AI_PROMPT_CONTEXT, type AIPromptContext } from '@/lib/aiPromptContext'

type Props = {
  characterId: number
}

type StatSuggestion = {
  str: number
  con: number
  siz: number
  dex: number
  intelligence: number
  pow: number
  cha: number
  app: number
  edu: number
  currentHp: number
  maxHp: number
  currentSanity: number
  maxSanity: number
  currentMp: number
  maxMp: number
  luck: number
  build: number
}

type SkillSuggestion = { skillId: number; value: number }

function getInputValue(form: HTMLFormElement, name: string) {
  const node = form.elements.namedItem(name)
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) return node.value
  return ''
}

function setInputValue(form: HTMLFormElement, name: string, value: string) {
  const node = form.elements.namedItem(name)
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    node.value = value
    node.dispatchEvent(new Event('input', { bubbles: true }))
    node.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

export function CharacterSheetSuggestionPanel({ characterId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [stats, setStats] = useState<StatSuggestion | null>(null)
  const [skills, setSkills] = useState<SkillSuggestion[]>([])
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [promptContext, setPromptContext] = useState<AIPromptContext>(DEFAULT_AI_PROMPT_CONTEXT)
  const [showPrompt, setShowPrompt] = useState(false)

  async function handleGenerate(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest('form')
    if (!(form instanceof HTMLFormElement)) return

    setLoading(true)
    setError(null)

    const result = await generateCharacterStatsSkillsSuggestion({
      characterId,
      name: getInputValue(form, 'characterName'),
      role: getInputValue(form, 'characterRole'),
      race: getInputValue(form, 'characterRace'),
      description: getInputValue(form, 'characterDescription'),
      additionalPrompt,
      promptContext,
    })

    setLoading(false)
    if (!result.ok || !result.generationId || !result.suggestion) {
      setError(result.error ?? 'Failed to suggest stats and skills')
      return
    }

    setGenerationId(result.generationId)
    setStats(result.suggestion.stats)
    setSkills(result.suggestion.skills)
  }

  async function applySuggestions(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest('form')
    if (!(form instanceof HTMLFormElement) || !stats) return

    Object.entries(stats).forEach(([key, value]) => setInputValue(form, key, String(value)))
    for (const skill of skills) {
      setInputValue(form, `skill_${skill.skillId}`, String(skill.value))
    }

    if (generationId) {
      await captureAIFeedback({
        generationId,
        status: 'ACCEPTED',
        finalValues: { stats, skills, promptContext },
      })
    }
  }

  async function submitFeedback(status: 'EDITED' | 'REJECTED', event: React.MouseEvent<HTMLButtonElement>) {
    if (!generationId) return
    const form = event.currentTarget.closest('form')

    const finalValues =
      form instanceof HTMLFormElement
        ? {
            stats: {
              str: getInputValue(form, 'str'),
              con: getInputValue(form, 'con'),
              siz: getInputValue(form, 'siz'),
              dex: getInputValue(form, 'dex'),
              intelligence: getInputValue(form, 'intelligence'),
              pow: getInputValue(form, 'pow'),
              cha: getInputValue(form, 'cha'),
              app: getInputValue(form, 'app'),
              edu: getInputValue(form, 'edu'),
              currentHp: getInputValue(form, 'currentHp'),
              maxHp: getInputValue(form, 'maxHp'),
              currentSanity: getInputValue(form, 'currentSanity'),
              maxSanity: getInputValue(form, 'maxSanity'),
              currentMp: getInputValue(form, 'currentMp'),
              maxMp: getInputValue(form, 'maxMp'),
              luck: getInputValue(form, 'luck'),
              build: getInputValue(form, 'build'),
            },
            promptContext,
          }
        : undefined

    await captureAIFeedback({ generationId, status, finalValues })
  }

  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider" style={{ color: '#a78bfa' }}>
            AI Stat & Skill Suggestions
          </p>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Suggestions are not saved until you submit the sheet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider"
            style={{ border: '1px solid #374151', color: '#9ca3af' }}
          >
            {showPrompt ? 'Hide Prompt' : 'Add Prompt'}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#5b21b6', color: '#e9d5ff' }}
          >
            {loading ? 'Generating…' : 'Suggest Stats & Skills'}
          </button>
        </div>
      </div>

      {showPrompt && (
        <div className="mt-3 space-y-3">
          <AIPromptContextFields value={promptContext} onChange={setPromptContext} />
          <div>
            <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>
              Additional instructions for the AI
            </label>
            <textarea
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Build this as a fragile occult prodigy with excellent lore and weak endurance…"
              className="w-full rounded px-2 py-1.5 text-xs resize-y"
              style={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#e2e8f0' }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs mt-2" style={{ color: '#f87171' }}>
          ⚠ {error}
        </p>
      )}

      {stats && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applySuggestions}
            className="px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wider"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Apply Suggestion
          </button>
          <button
            type="button"
            onClick={(event) => submitFeedback('EDITED', event)}
            className="px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wider"
            style={{ border: '1px solid #374151', color: '#9ca3af' }}
          >
            Mark Edited
          </button>
          <button
            type="button"
            onClick={(event) => submitFeedback('REJECTED', event)}
            className="px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wider"
            style={{ border: '1px solid #3f1212', color: '#f87171' }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
