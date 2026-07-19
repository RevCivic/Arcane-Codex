'use client'

import { useId, useMemo, useState } from 'react'

type TagInputProps = {
  allTags: string[]
  initialTags?: string[]
  name?: string
}

function normalizeAndDeduplicateTags(values: string[]) {
  const deduped = new Map<string, string>()

  for (const value of values) {
    const normalized = value.trim().toLowerCase()
    if (!normalized || deduped.has(normalized)) continue
    deduped.set(normalized, normalized)
  }

  return [...deduped.values()]
}

export function TagInput({ allTags, initialTags = [], name = 'tags' }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(() => normalizeAndDeduplicateTags(initialTags))
  const [draft, setDraft] = useState('')
  const datalistId = useId()
  const normalizedAllTags = useMemo(() => normalizeAndDeduplicateTags(allTags), [allTags])

  const addTag = (raw: string) => {
    const normalized = raw.trim().toLowerCase()
    if (!normalized) return
    if (tags.includes(normalized)) return
    setTags((prev) => [...prev, normalized])
  }

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleExistingTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags((prev) => prev.filter((t) => t !== tag))
    } else {
      setTags((prev) => [...prev, tag])
    }
  }

  return (
    <div>
      <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Tags</label>
      <div
        className="rounded-md p-2.5"
        style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}
      >
        {/* Selected tag pills */}
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: '#1e1133', color: '#c4b5fd' }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="leading-none"
                style={{ color: '#d8b4fe', cursor: 'pointer' }}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Existing tags scrollbox */}
        {normalizedAllTags.length > 0 && (
          <div className="mb-2">
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <legend
                className="text-xs uppercase tracking-wider mb-1"
                style={{ color: '#6b7280' }}
              >
                Existing tags
              </legend>
              <div
                className="overflow-y-auto rounded"
                style={{
                  maxHeight: '9rem',
                  backgroundColor: '#0d0d14',
                  border: '1px solid #1f2937',
                  padding: '0.375rem 0.5rem',
                }}
              >
                {normalizedAllTags.map((tag) => {
                  const checked = tags.includes(tag)
                  return (
                    <label
                      key={tag}
                      className="flex items-center gap-2 text-xs py-0.5 cursor-pointer select-none"
                      style={{ color: checked ? '#c4b5fd' : '#9ca3af' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExistingTag(tag)}
                        className="accent-purple-500"
                      />
                      {tag}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* Free-form new tag input */}
        <input
          className="arcane-input"
          list={datalistId}
          value={draft}
          placeholder="Add new tag and press Enter or comma"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ',') return
            e.preventDefault()
            addTag(draft)
            setDraft('')
          }}
          onBlur={() => {
            if (!draft.trim()) return
            addTag(draft)
            setDraft('')
          }}
        />
        <datalist id={datalistId}>
          {normalizedAllTags.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
      <p className="mt-1 text-xs" style={{ color: '#6b7280' }}>
        Select existing tags above or type a new one and press Enter or comma.
      </p>
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
    </div>
  )
}
