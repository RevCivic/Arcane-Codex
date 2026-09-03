import { LoreDocumentType } from '@/generated/prisma'

const LORE_TYPE_OPTIONS: { value: LoreDocumentType; label: string }[] = [
  { value: LoreDocumentType.CHARACTER_BACKSTORY, label: 'Character Backstory' },
  { value: LoreDocumentType.CAMPAIGN_ARC, label: 'Campaign Arc' },
  { value: LoreDocumentType.SPECIES_DETAIL, label: 'Species Detail' },
  { value: LoreDocumentType.FACTION_DETAIL, label: 'Faction Detail' },
  { value: LoreDocumentType.WORLD_LORE, label: 'World Lore' },
  { value: LoreDocumentType.CUSTOM, label: 'Custom' },
]

type LoreFormValues = {
  title?: string
  type?: LoreDocumentType
  summary?: string | null
  content?: string
  isActive?: boolean
  sortOrder?: number
  tags?: string | null
}

type Props = {
  action: (formData: FormData) => Promise<void>
  defaultValues?: LoreFormValues
  submitLabel?: string
  cancelHref?: string
}

export function LoreDocumentForm({ action, defaultValues = {}, submitLabel = 'Save Document', cancelHref = '/admin/lore' }: Props) {
  const labelStyle: React.CSSProperties = { color: '#d97706', fontFamily: 'Georgia, serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }
  const inputStyle: React.CSSProperties = { fontFamily: 'Georgia, serif', fontSize: '13px' }

  return (
    <form action={action} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block mb-1" style={labelStyle}>Title *</label>
        <input
          name="title"
          required
          defaultValue={defaultValues.title ?? ''}
          className="arcane-input w-full"
          placeholder="e.g. The Bureau of Supernatural Investigation"
          style={inputStyle}
        />
      </div>

      {/* Type */}
      <div>
        <label className="block mb-1" style={labelStyle}>Type</label>
        <select
          name="type"
          defaultValue={defaultValues.type ?? LoreDocumentType.CUSTOM}
          className="arcane-input w-full"
          style={inputStyle}
        >
          {LORE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ backgroundColor: '#07070d' }}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div>
        <label className="block mb-1" style={labelStyle}>Summary (injected into AI prompts)</label>
        <textarea
          name="summary"
          defaultValue={defaultValues.summary ?? ''}
          rows={3}
          className="arcane-input w-full resize-y"
          placeholder="1–3 sentences that capture the key facts for the AI to reference…"
          style={inputStyle}
        />
        <p className="text-[11px] mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Keep this concise — it is directly embedded in every AI request context.
        </p>
      </div>

      {/* Content */}
      <div>
        <label className="block mb-1" style={labelStyle}>Full Content *</label>
        <textarea
          name="content"
          required
          defaultValue={defaultValues.content ?? ''}
          rows={14}
          className="arcane-input w-full resize-y"
          placeholder="Write the full lore document here. Markdown is supported."
          style={inputStyle}
        />
        <p className="text-[11px] mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Markdown is supported. The full content is available to the chat assistant.
        </p>
      </div>

      {/* Tags */}
      <div>
        <label className="block mb-1" style={labelStyle}>Tags (comma-separated)</label>
        <input
          name="tags"
          defaultValue={defaultValues.tags ?? ''}
          className="arcane-input w-full"
          placeholder="e.g. bureau, 1920s, faction"
          style={inputStyle}
        />
      </div>

      {/* Sort Order + Active */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1" style={labelStyle}>Sort Order</label>
          <input
            name="sortOrder"
            type="number"
            defaultValue={defaultValues.sortOrder ?? 0}
            className="arcane-input w-full"
            style={inputStyle}
          />
          <p className="text-[11px] mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            Lower = appears first in AI context
          </p>
        </div>
        <div>
          <label className="block mb-1" style={labelStyle}>Active</label>
          <select
            name="isActive"
            defaultValue={defaultValues.isActive !== false ? 'true' : 'false'}
            className="arcane-input w-full"
            style={inputStyle}
          >
            <option value="true" style={{ backgroundColor: '#07070d' }}>Yes — include in AI context</option>
            <option value="false" style={{ backgroundColor: '#07070d' }}>No — exclude from AI context</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="px-5 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90"
          style={{ backgroundColor: '#7c3aed', color: '#fff' }}
        >
          {submitLabel}
        </button>
        <a
          href={cancelHref}
          className="px-4 py-2 rounded text-xs hover:opacity-80"
          style={{ color: '#9ca3af', border: '1px solid #374151', fontFamily: 'Georgia, serif' }}
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
