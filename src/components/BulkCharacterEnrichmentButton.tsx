'use client'

import { useState } from 'react'
import { captureAIFeedback, generateCharacterBulkTextSuggestions } from '@/app/actions'

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

    const result = await generateCharacterBulkTextSuggestions({ rows })
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
        finalValues: { suggestions: result.suggestions },
      })
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleEnrich}
        disabled={loading}
        className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
        style={{ border: '1px solid #164e63', color: '#22d3ee' }}
      >
        {loading ? 'Enriching…' : 'AI Enrich Rows'}
      </button>
      {error && (
        <p className="text-[11px]" style={{ color: '#f87171' }}>
          ⚠ {error}
        </p>
      )}
    </div>
  )
}
