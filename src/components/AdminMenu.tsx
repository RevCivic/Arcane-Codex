'use client'

import Link from 'next/link'
import { useState } from 'react'

export function AdminMenu() {
  const [open, setOpen] = useState(false)
  const closeOnMenuItemKey = (event: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === ' ') {
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div
      role="navigation"
      aria-label="Admin menu"
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false)
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false)
          ;(e.currentTarget.querySelector('button') as HTMLButtonElement | null)?.focus()
        }
      }}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-all duration-200 hover:text-purple-400"
        style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
      >
        <span>🛠️</span>
        <span className="hidden sm:inline">Admin</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 min-w-36 rounded border shadow-lg z-20"
          style={{ backgroundColor: '#07070d', borderColor: '#1a1a2e' }}
        >
          <Link
            href="/admin/access"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>🛡️</span>
            <span>Access</span>
          </Link>
          <Link
            href="/admin/skills"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>🎯</span>
            <span>Skills</span>
          </Link>
        </div>
      )}
    </div>
  )
}
