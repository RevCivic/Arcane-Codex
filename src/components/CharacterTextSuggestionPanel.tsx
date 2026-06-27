'use client'

import { useState } from 'react'
import { captureAIFeedback, generateCharacterTextSuggestion } from '@/app/actions'

type Suggestion = {
  description: string
  affiliation: string
  currentCase: string
  currentLocation: string
  homeOrigin: string
  role: string
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
