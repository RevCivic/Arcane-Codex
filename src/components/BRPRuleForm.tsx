type BRPRuleFormValues = {
  title?: string
  section?: string | null
  content?: string
  sortOrder?: number
}

type Props = {
  action: (formData: FormData) => Promise<void>
  defaultValues?: BRPRuleFormValues
  submitLabel?: string
  cancelHref?: string
}

export function BRPRuleForm({ action, defaultValues = {}, submitLabel = 'Save Rule', cancelHref = '/admin/brp-rules' }: Props) {
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
          placeholder="e.g. Combat Resolution"
          style={inputStyle}
        />
      </div>

      {/* Section */}
      <div>
        <label className="block mb-1" style={labelStyle}>Section</label>
        <input
          name="section"
          defaultValue={defaultValues.section ?? ''}
          className="arcane-input w-full"
          placeholder="e.g. Combat, Skills, Characteristics"
          style={inputStyle}
        />
        <p className="text-[11px] mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Optional category for organizing rules
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
          placeholder="Write the full rule here. Markdown is supported."
          style={inputStyle}
        />
        <p className="text-[11px] mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Markdown is supported. Use # for headings, **bold**, *italic*, etc.
        </p>
      </div>

      {/* Sort Order */}
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
          Lower numbers appear first in the wiki
        </p>
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
