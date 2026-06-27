'use client'

import { useState } from 'react'
import { captureAIFeedback, generateCharacterTextSuggestion } from '@/app/actions'
import { AIPromptContextFields } from '@/components/AIPromptContextFields'
import { DEFAULT_AI_PROMPT_CONTEXT, type AIPromptContext } from '@/lib/aiPromptContext'

type Suggestion = {
  description: string
  affiliation: string
  currentCase: string
  currentLocation: string
  homeOrigin: string
  role: string
  entityType: string
  narrativeRole: string
  motivations: string
  demeanor: string
  mechanicalFocus: string
}

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

export function CharacterTextSuggestionPanel({ characterId }: { characterId?: number }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [promptContext, setPromptContext] = useState<AIPromptContext>(DEFAULT_AI_PROMPT_CONTEXT)
  const [showPrompt, setShowPrompt] = useState(false)

  async function handleGenerate(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest('form')
    if (!(form instanceof HTMLFormElement)) return

    setLoading(true)
    setError(null)

    const result = await generateCharacterTextSuggestion({
      characterId,
      name: getInputValue(form, 'name'),
      firstName: getInputValue(form, 'firstName'),
      lastName: getInputValue(form, 'lastName'),
      race: getInputValue(form, 'race'),
      gender: getInputValue(form, 'gender'),
      role: getInputValue(form, 'role'),
      affiliation: getInputValue(form, 'affiliation'),
      currentCase: getInputValue(form, 'currentCase'),
      currentLocation: getInputValue(form, 'currentLocation'),
      homeOrigin: getInputValue(form, 'homeOrigin'),
      description: getInputValue(form, 'description'),
      additionalPrompt,
      promptContext,
    })

    setLoading(false)
    if (!result.ok || !result.suggestion || !result.generationId) {
      setError(result.error ?? 'AI suggestion failed')
      return
    }

    setGenerationId(result.generationId)
    setSuggestion(result.suggestion)
  }

  async function handleFeedback(status: 'ACCEPTED' | 'EDITED' | 'REJECTED', event: React.MouseEvent<HTMLButtonElement>) {
    if (!generationId) return
    const form = event.currentTarget.closest('form')

    const finalValues =
      form instanceof HTMLFormElement
        ? {
            description: getInputValue(form, 'description'),
            affiliation: getInputValue(form, 'affiliation'),
            currentCase: getInputValue(form, 'currentCase'),
            currentLocation: getInputValue(form, 'currentLocation'),
            homeOrigin: getInputValue(form, 'homeOrigin'),
            role: getInputValue(form, 'role'),
            promptContext,
          }
        : undefined

    await captureAIFeedback({
      generationId,
      status,
      finalValues,
    })
  }

  async function handleApply(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest('form')
    if (!(form instanceof HTMLFormElement) || !suggestion) return

    setInputValue(form, 'description', suggestion.description)
    setInputValue(form, 'affiliation', suggestion.affiliation)
    setInputValue(form, 'currentCase', suggestion.currentCase)
    setInputValue(form, 'currentLocation', suggestion.currentLocation)
    setInputValue(form, 'homeOrigin', suggestion.homeOrigin)
    setInputValue(form, 'role', suggestion.role)

    await handleFeedback('ACCEPTED', event)
  }

  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wider" style={{ color: '#a78bfa' }}>
          AI Character Detail Suggestions
        </p>
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
            {loading ? 'Generating…' : 'Generate Details'}
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
              placeholder="e.g. Make the character an unreliable ally whose confidence hides a recent occult failure…"
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

      {suggestion && (
        <div className="mt-3 space-y-2">
          <p className="text-xs" style={{ color: '#9ca3af' }}>
            Suggested only: review and edit before saving.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]" style={{ color: '#cbd5e1' }}>
            <p><strong style={{ color: '#a78bfa' }}>Entity:</strong> {suggestion.entityType || 'Inferred'}</p>
            <p><strong style={{ color: '#a78bfa' }}>Narrative Role:</strong> {suggestion.narrativeRole || '—'}</p>
            <p><strong style={{ color: '#a78bfa' }}>Motivations:</strong> {suggestion.motivations || '—'}</p>
            <p><strong style={{ color: '#a78bfa' }}>Demeanor:</strong> {suggestion.demeanor || '—'}</p>
            <p className="sm:col-span-2"><strong style={{ color: '#a78bfa' }}>Mechanical Focus:</strong> {suggestion.mechanicalFocus || '—'}</p>
          </div>
          <p className="text-xs" style={{ color: '#e2e8f0' }}>
            {suggestion.description}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: '#7c3aed', color: '#fff' }}
            >
              Apply Suggestion
            </button>
            <button
              type="button"
              onClick={(event) => handleFeedback('EDITED', event)}
              className="px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wider"
              style={{ border: '1px solid #374151', color: '#9ca3af' }}
            >
              Mark Edited
            </button>
            <button
              type="button"
              onClick={(event) => handleFeedback('REJECTED', event)}
              className="px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wider"
              style={{ border: '1px solid #3f1212', color: '#f87171' }}
            >
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
