'use client'

import { createContext, useContext, useState } from 'react'
import { useFormStatus } from 'react-dom'

const QuickEditContext = createContext(false)

export function CharacterQuickEditProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  return (
    <QuickEditContext.Provider value={enabled}>
      <div className="contents">
        <div className="mb-4 flex items-center justify-end gap-3 text-sm" style={{ color: '#a78bfa', fontFamily: 'Georgia, serif' }}>
          <span>Quick Edit</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((value) => !value)}
            className="relative h-6 w-11 rounded-full transition-colors"
            style={{ backgroundColor: enabled ? '#7c3aed' : '#374151' }}
          >
            <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className="w-7 text-xs" style={{ color: '#6b7280' }}>{enabled ? 'On' : 'Off'}</span>
        </div>
        {children}
      </div>
    </QuickEditContext.Provider>
  )
}

type QuickCharacter = {
  name: string
  role: string | null
  status: string | null
  affiliation: string | null
  currentCase: string | null
  currentLocation: string | null
  race: string | null
  gender: string | null
  age: string | null
}

function SaveButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending} className="rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider disabled:opacity-50" style={{ backgroundColor: '#7c3aed', color: 'white' }}>{pending ? 'Saving…' : 'Save'}</button>
}

export function CharacterQuickEdit({ character, action }: { character: QuickCharacter; action: (formData: FormData) => Promise<void> }) {
  const enabled = useContext(QuickEditContext)
  if (!enabled) return null

  const fields: Array<[keyof QuickCharacter, string, string]> = [
    ['name', 'Name', 'text'], ['role', 'Role', 'text'], ['status', 'Status', 'text'],
    ['affiliation', 'Affiliation', 'text'], ['currentCase', 'Current case', 'text'],
    ['currentLocation', 'Location', 'text'], ['race', 'Race', 'text'],
    ['gender', 'Gender', 'text'], ['age', 'Age', 'number'],
  ]

  return (
    <form action={action} className="mt-3 grid grid-cols-1 gap-2 rounded-md p-3 sm:grid-cols-2 lg:grid-cols-3" style={{ backgroundColor: '#0d0d1a', border: '1px solid #3b1f6e' }}>
      {fields.map(([name, label, type]) => (
        <label key={name} className="text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>
          {label}
          <input name={name} type={type} min={type === 'number' ? 0 : undefined} defaultValue={character[name] ?? ''} className="arcane-input mt-1 w-full text-sm normal-case tracking-normal" />
        </label>
      ))}
      <div className="flex items-end"><SaveButton /></div>
    </form>
  )
}
