'use client'

import { useState } from 'react'
import Link from 'next/link'

type BulkEntryColumn = {
  name: string
  label: string
  required?: boolean
  type?: 'text' | 'number' | 'textarea' | 'select'
  options?: Array<{ value: string; label: string }>
  placeholder?: string
}

export function BulkEntryTable({
  title,
  description,
  backHref,
  backLabel,
  submitLabel,
  columns,
  action,
}: {
  title: string
  description: string
  backHref: string
  backLabel: string
  submitLabel: string
  columns: BulkEntryColumn[]
  action: (formData: FormData) => void | Promise<void>
}) {
  const [rows, setRows] = useState<number[]>([0])

  return (
    <div>
      <div className="mb-6">
        <Link href={backHref} className="text-sm hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← {backLabel}
        </Link>
      </div>

      <h1 className="text-2xl font-bold uppercase tracking-widest mb-2 arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
        {title}
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
        {description}
      </p>

      <form action={action} className="card-arcane rounded-lg p-5 space-y-4" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #1f2937' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #1f2937', backgroundColor: '#0d0d1a' }}>
                {columns.map((column) => (
                  <th
                    key={column.name}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      color: '#6b7280',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {column.label}{column.required ? ' *' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowId) => (
                <tr key={rowId} style={{ borderBottom: '1px solid #1a1a2e' }}>
                  {columns.map((column) => (
                    <td key={`${rowId}-${column.name}`} style={{ padding: '8px 10px', minWidth: '170px' }}>
                      {column.type === 'textarea' ? (
                        <textarea
                          name={column.name}
                          required={column.required}
                          rows={2}
                          placeholder={column.placeholder}
                          className="arcane-input"
                        />
                      ) : column.type === 'select' ? (
                        <select name={column.name} required={column.required} defaultValue="" className="arcane-input">
                          <option value="">{column.required ? 'Select...' : 'None'}</option>
                          {(column.options ?? []).map((option) => (
                            <option key={`${rowId}-${column.name}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={column.name}
                          type={column.type === 'number' ? 'number' : 'text'}
                          required={column.required}
                          placeholder={column.placeholder}
                          className="arcane-input"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, prev.length])}
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider"
            style={{ border: '1px solid #374151', color: '#a78bfa' }}
          >
            + Add Row
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            {submitLabel}
          </button>
          <Link
            href={backHref}
            className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider"
            style={{ border: '1px solid #374151', color: '#9ca3af' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
