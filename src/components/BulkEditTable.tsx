'use client'

import Link from 'next/link'
import type { Power } from '@/generated/prisma'
import type { ReactNode } from 'react'

export function BulkEditTable({
  title,
  description,
  backHref,
  backLabel,
  submitLabel,
  powers,
  action,
  skills,
  extraActions,
}: {
  title: string
  description: string
  backHref: string
  backLabel: string
  submitLabel: string
  powers: Power[]
  action: (formData: FormData) => void | Promise<void>
  skills?: Array<{ name: string; category: string }>
  extraActions?: ReactNode
}) {
  const skillNames = (skills ?? []).map((s) => s.name).sort()

  return (
    <div>
      <div className="mb-6">
        <Link href={backHref} className="text-sm hover:text-purple-300" style={{ color: '#a0a9b8' }}>
          ← {backLabel}
        </Link>
      </div>

      <h1 className="text-2xl font-bold uppercase tracking-widest mb-2 arcane-glow" style={{ color: '#8b5cf6' }}>
        {title}
      </h1>
      <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
        {description}
      </p>

      <form action={action} className="card-arcane rounded-lg p-5 space-y-4" style={{  }}>
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #2a2a3e' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #2a2a3e', backgroundColor: '#0d0d1a' }}>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    color: '#a0a9b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Name *
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    color: '#a0a9b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    color: '#a0a9b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Effect
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    color: '#a0a9b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Base Ability
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    color: '#a0a9b8',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Base %
                </th>
              </tr>
            </thead>
            <tbody>
              {powers.map((power) => (
                <tr key={power.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                  <input type="hidden" name="id" value={power.id} />
                  <td style={{ padding: '8px 10px', minWidth: '170px' }}>
                    <input
                      name="name"
                      defaultValue={power.name}
                      required
                      className="arcane-input"
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', minWidth: '200px' }}>
                    <textarea
                      name="description"
                      defaultValue={power.description ?? ''}
                      rows={1}
                      className="arcane-input"
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', minWidth: '200px' }}>
                    <textarea
                      name="effect"
                      defaultValue={power.effect ?? ''}
                      rows={1}
                      className="arcane-input"
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', minWidth: '150px' }}>
                    <select
                      name="baseAbility"
                      defaultValue={power.baseAbility ?? ''}
                      className="arcane-input"
                      style={{ width: '100%' }}
                    >
                      <option value="">None</option>
                      {skillNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 10px', minWidth: '80px' }}>
                    <input
                      name="basePercentage"
                      type="number"
                      min={0}
                      max={999}
                      defaultValue={power.basePercentage ?? ''}
                      className="arcane-input"
                      style={{ width: '100%' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {extraActions}
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
