'use client'

import Link from 'next/link'
import { useState } from 'react'

type AdminMenuProps = {
  pendingImportCount?: number
}

export function AdminMenu({ pendingImportCount = 0 }: AdminMenuProps) {
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
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
        style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
      >
        <span>🛠️</span>
        <span className="hidden sm:inline">Admin</span>
        <span aria-hidden="true" className={`text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
        {pendingImportCount > 0 && (
          <span
            className="rounded-full px-1.5 py-0.5 text-xs font-bold leading-none"
            style={{ backgroundColor: '#d97706', color: '#07070d' }}
            aria-label={`${pendingImportCount} pending import changes`}
          >
            {pendingImportCount}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 min-w-48 rounded border shadow-lg z-20 overflow-hidden"
          style={{ backgroundColor: '#07070d', borderColor: '#1a1a2e' }}
        >
          <Link
            href="/admin/access"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Access</span>
            </span>
          </Link>
          <Link
            href="/admin/tags"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>🏷️</span>
              <span>Tags</span>
            </span>
          </Link>
          <Link
            href="/admin/skills"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>🎯</span>
              <span>Skills</span>
            </span>
          </Link>
          <Link
            href="/admin/roll-history"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>🎲</span>
              <span>Roll History</span>
            </span>
          </Link>
          <Link
            href="/admin/ai"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>🤖</span>
              <span>AI / LM</span>
            </span>
          </Link>
          <Link
            href="/admin/lore"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>📚</span>
              <span>Lore</span>
            </span>
          </Link>
          <Link
            href="/admin/brp-rules"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>📖</span>
              <span>BRP Rules</span>
            </span>
          </Link>
          <Link
            href="/admin/import-queue"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <span>📥</span>
                <span>Import Queue</span>
              </span>
              {pendingImportCount > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-xs font-bold leading-none flex-shrink-0"
                  style={{ backgroundColor: '#d97706', color: '#07070d' }}
                >
                  {pendingImportCount}
                </span>
              )}
            </span>
          </Link>
          <Link
            href="/admin/images"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>🖼️</span>
              <span>Images</span>
            </span>
          </Link>
          <Link
            href="/chat"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="block px-3 py-2 text-sm transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span className="flex items-center gap-1.5">
              <span>🔮</span>
              <span>Chat</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}
