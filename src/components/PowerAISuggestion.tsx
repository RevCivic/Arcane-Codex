'use client'

import { generatePowerSuggestion, captureAIFeedback } from '@/app/actions'
import { AI_TONE_OPTIONS, AI_MECHANICAL_FOCUS_OPTIONS, AI_POWER_COST_OPTIONS, AI_POWER_RARITY_OPTIONS } from '@/lib/aiPromptContext'
import { useState } from 'react'

export interface PowerAISuggestionProps {
  initialName?: string
  initialDescription?: string
  onSuggestion?: (suggestion: any) => void
}

export function PowerAISuggestion({ initialName = '', initialDescription = '', onSuggestion }: PowerAISuggestionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestion, setSuggestion] = useState<any>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: initialName,
    description: initialDescription,
    cost: '',
    rarity: '',
    tone: '',
    mechanicalFocus: '',
    narrativeRole: '',
    additionalPrompt: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const result = await generatePowerSuggestion({
        name: formData.name,
        description: formData.description,
        promptContext: {
          cost: formData.cost,
          rarity: formData.rarity,
          tone: formData.tone,
          mechanicalFocus: formData.mechanicalFocus,
          narrativeRole: formData.narrativeRole,
        },
        additionalPrompt: formData.additionalPrompt,
      })

      if (result.ok && result.suggestion && result.generationId) {
        setSuggestion(result.suggestion)
        setGenerationId(result.generationId)
      } else {
        alert(`Error: ${result.error}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!generationId) return
    try {
      await captureAIFeedback({
        generationId,
        status: 'ACCEPTED',
        finalValues: suggestion,
      })
      if (onSuggestion) {
        onSuggestion(suggestion)
      }
      setSuggestion(null)
      setGenerationId(null)
      setIsOpen(false)
    } catch (error) {
      alert('Failed to accept suggestion')
    }
  }

  const handleReject = async () => {
    if (!generationId) return
    try {
      await captureAIFeedback({
        generationId,
        status: 'REJECTED',
      })
      setSuggestion(null)
      setGenerationId(null)
    } catch (error) {
      alert('Failed to reject suggestion')
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:text-purple-300 whitespace-nowrap"
        style={{ border: '1px solid #3b1f6e', color: '#a78bfa', fontFamily: 'Georgia, serif' }}
      >
        ✨ AI Suggest
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={() => !suggestion && setIsOpen(false)}
    >
      <div
        className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: '#111118', fontFamily: 'Georgia, serif' }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: '#8b5cf6' }}>
          ✨ AI Power Suggestion
        </h2>

        {!suggestion ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
                Power Name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="arcane-input w-full"
                placeholder="e.g. Arcane Sight"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
                  Cost
                </label>
                <select name="cost" value={formData.cost} onChange={handleInputChange} className="arcane-input w-full">
                  <option value="">Infer from context</option>
                  {AI_POWER_COST_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
                  Rarity
                </label>
                <select name="rarity" value={formData.rarity} onChange={handleInputChange} className="arcane-input w-full">
                  <option value="">Infer from context</option>
                  {AI_POWER_RARITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
                  Tone
                </label>
                <select name="tone" value={formData.tone} onChange={handleInputChange} className="arcane-input w-full">
                  <option value="">Infer from context</option>
                  {AI_TONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
                  Mechanical Focus
                </label>
                <select name="mechanicalFocus" value={formData.mechanicalFocus} onChange={handleInputChange} className="arcane-input w-full">
                  <option value="">Infer from context</option>
                  {AI_MECHANICAL_FOCUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="arcane-input w-full"
                placeholder="How the power manifests and works..."
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
                Additional Guidance
              </label>
              <textarea
                name="additionalPrompt"
                value={formData.additionalPrompt}
                onChange={handleInputChange}
                rows={2}
                className="arcane-input w-full"
                placeholder="Any specific mechanical or narrative requirements..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
                style={{ backgroundColor: '#7c3aed', color: '#fff' }}
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setSuggestion(null)
                  setGenerationId(null)
                }}
                className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider"
                style={{ border: '1px solid #374151', color: '#9ca3af' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm uppercase tracking-wider mb-2" style={{ color: '#d97706' }}>
                Suggested Power
              </h3>
              <div className="bg-black/30 p-4 rounded space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                    Name
                  </label>
                  <p style={{ color: '#e5e7eb' }}>{suggestion.name}</p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                    Description
                  </label>
                  <p style={{ color: '#e5e7eb' }} className="text-sm leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                    Effect
                  </label>
                  <p style={{ color: '#e5e7eb' }} className="text-sm leading-relaxed">
                    {suggestion.effect}
                  </p>
                </div>
                {suggestion.baseAbility && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                        Base Ability
                      </label>
                      <p style={{ color: '#e5e7eb' }}>{suggestion.baseAbility}</p>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-wider" style={{ color: '#a78bfa' }}>
                        Base %
                      </label>
                      <p style={{ color: '#e5e7eb' }}>{suggestion.basePercentage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAccept}
                className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
                style={{ backgroundColor: '#10b981', color: '#fff' }}
              >
                Use This
              </button>
              <button
                onClick={handleReject}
                className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
                style={{ backgroundColor: '#ef4444', color: '#fff' }}
              >
                Reject
              </button>
              <button
                onClick={() => setSuggestion(null)}
                className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider"
                style={{ border: '1px solid #374151', color: '#9ca3af' }}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
