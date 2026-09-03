'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export type EntityFilterField = {
  name: string
  label: string
  type?: 'select' | 'number'
  options?: string[]
  placeholder?: string
}

type EntityFilterPanelProps = {
  fields: EntityFilterField[]
  storageKey: string
  managedParams: string[]
}

/** Reusable GET-based filters with a browser-local default per entity list. */
export function EntityFilterPanel({ fields, storageKey, managedParams }: EntityFilterPanelProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey)

    // Apply a saved default only on an unfiltered visit. Explicit URLs always win.
    const hasManagedValue = managedParams.some((name) => searchParams.has(name))
    if (saved && !hasManagedValue && searchParams.get('default') !== 'off') {
      const defaults = new URLSearchParams(saved)
      if (defaults.size > 0) router.replace(`${pathname}?${defaults.toString()}`)
    }
  }, [managedParams, pathname, router, searchParams, storageKey])

  const saveDefault = () => {
    const defaults = new URLSearchParams()
    for (const name of managedParams) {
      const value = searchParams.get(name)
      if (value) defaults.set(name, value)
    }
    window.localStorage.setItem(storageKey, defaults.toString())
    setMessage('Default filter saved on this device.')
  }

  const clearDefault = () => {
    window.localStorage.removeItem(storageKey)
    setMessage('Default filter removed.')
  }

  return (
    <details className="mb-4 rounded-lg p-4" style={{ backgroundColor: '#111118', border: '1px solid #2a2a3e' }}>
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wider" style={{ color: '#a78bfa' }}>
        Filters
      </summary>
      <form action={pathname} method="get" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from(searchParams.entries())
          .filter(([name]) => !managedParams.includes(name))
          .map(([name, value]) => <input key={`${name}-${value}`} type="hidden" name={name} value={value} />)}
        {fields.map((field) => (
          <label key={field.name} className="text-xs uppercase tracking-wider" style={{ color: '#a0a9b8' }}>
            {field.label}
            {field.type === 'number' ? (
              <input name={field.name} type="number" min="0" defaultValue={searchParams.get(field.name) ?? ''} placeholder={field.placeholder} className="arcane-input mt-1" />
            ) : (
              <select name={field.name} defaultValue={searchParams.get(field.name) ?? ''} className="arcane-input mt-1">
                <option value="">Any</option>
                {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            )}
          </label>
        ))}
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="submit" className="rounded px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>Apply</button>
          <LinkButton href={`${pathname}?default=off`}>Clear filters</LinkButton>
          <button type="button" onClick={saveDefault} className="rounded px-3 py-2 text-xs" style={{ border: '1px solid #3b1f6e', color: '#a78bfa' }}>Set as default</button>
          <button type="button" onClick={clearDefault} className="rounded px-3 py-2 text-xs" style={{ border: '1px solid #374151', color: '#9ca3af' }}>Remove default</button>
        </div>
      </form>
      {message && <p className="mt-2 text-xs" role="status" style={{ color: '#a0a9b8' }}>{message}</p>}
    </details>
  )
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="rounded px-3 py-2 text-xs" style={{ border: '1px solid #374151', color: '#9ca3af' }}>{children}</a>
}
