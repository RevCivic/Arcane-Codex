'use client'

import { useState } from 'react'
import { captureAIFeedback, generateCharacterBulkTextSuggestions } from '@/app/actions'
import { AIPromptContextFields } from '@/components/AIPromptContextFields'
import { DEFAULT_AI_PROMPT_CONTEXT, type AIPromptContext } from '@/lib/aiPromptContext'

function nodeValue(form: HTMLFormElement, name: string, index: number) {
  const nodes = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)
  return nodes[index]?.value ?? ''
}

function setNodeValue(form: HTMLFormElement, name: string, index: number, value: string) {
  const nodes = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)
  const node = nodes[index]
  if (!node) return
  node.value = value
  node.dispatchEvent(new Event('input', { bubbles: true }))
  node.dispatchEvent(new Event('change', { bubbles: true }))
}

export function BulkCharacterEnrichmentButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [promptContext, setPromptContext] = useState<AIPromptContext>(DEFAULT_AI_PROMPT_CONTEXT)

  async function handleEnrich(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest('form')
    if (!(form instanceof HTMLFormElement)) return

    const names = form.querySelectorAll<HTMLInputElement>('[name="name"]')
    if (names.length === 0) return

    setLoading(true)
    setError(null)

    const rows = Array.from({ length: names.length }, (_, rowIndex) => ({
      rowIndex,
      name: nodeValue(form, 'name', rowIndex),
      firstName: nodeValue(form, 'firstName', rowIndex),
      lastName: nodeValue(form, 'lastName', rowIndex),
      role: nodeValue(form, 'role', rowIndex),
      status: nodeValue(form, 'status', rowIndex),
    }))

    const result = await generateCharacterBulkTextSuggestions({
      rows,
      promptContext,
      additionalPrompt,
    })
    setLoading(false)

    if (!result.ok || !result.suggestions) {
      setError(result.error ?? 'AI bulk enrichment failed')
      return
    }

    for (const suggestion of result.suggestions) {
      setNodeValue(form, 'role', suggestion.rowIndex, suggestion.role)
      setNodeValue(form, 'status', suggestion.rowIndex, suggestion.status)
      setNodeValue(form, 'description', suggestion.rowIndex, suggestion.description)
    }

    if (result.generationId) {
      await captureAIFeedback({
        generationId: result.generationId,
        status: 'ACCEPTED',
        finalValues: { suggestions: result.suggestions, promptContext, additionalPrompt },
      })
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPrompt((value) => !value)}
          className="px-3 py-2 rounded text-[11px] font-semibold uppercase tracking-wider"
          style={{ border: '1px solid #374151', color: '#9ca3af' }}
        >
          {showPrompt ? 'Hide AI Prompt' : 'Configure AI Prompt'}
        </button>
        <button
          type="button"
          onClick={handleEnrich}
          disabled={loading}
          className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
          style={{ border: '1px solid #164e63', color: '#22d3ee' }}
        >
          {loading ? 'Enriching…' : 'AI Enrich Rows'}
        </button>
      </div>
      {showPrompt && (
        <div className="mt-2 rounded-lg p-3 space-y-3" style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>
          <AIPromptContextFields value={promptContext} onChange={setPromptContext} />
          <div>
            <label className="block text-xs mb-1" style={{ color: '#9ca3af' }}>
              Additional bulk guidance
            </label>
            <textarea
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              rows={2}
              placeholder="e.g. Make these six entries feel like rival cult lieutenants instead of investigators."
              className="w-full rounded px-2 py-1.5 text-xs resize-y"
              style={{ backgroundColor: '#111827', border: '1px solid #374151', color: '#e2e8f0' }}
            />
          </div>
        </div>
      )}
      {error && (
        <p className="text-[11px]" style={{ color: '#f87171' }}>
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
