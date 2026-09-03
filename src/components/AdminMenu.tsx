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
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-all duration-200 hover:text-purple-400"
        style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
      >
        <span>🛠️</span>
        <span className="hidden sm:inline">Admin</span>
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
            href="/admin/tags"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>🏷️</span>
            <span>Tags</span>
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
          <Link
            href="/admin/roll-history"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>🎲</span>
            <span>Roll History</span>
          </Link>
          <Link
            href="/admin/ai"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>🤖</span>
            <span>AI / LM</span>
          </Link>
          <Link
            href="/admin/lore"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>📚</span>
            <span>Lore</span>
          </Link>
          <Link
            href="/admin/import-queue"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>📥</span>
            <span>Import Queue</span>
            {pendingImportCount > 0 && (
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-xs font-bold leading-none"
                style={{ backgroundColor: '#d97706', color: '#07070d' }}
              >
                {pendingImportCount}
              </span>
            )}
          </Link>
          <Link
            href="/admin/images"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>🖼️</span>
            <span>Images</span>
          </Link>
          <Link
            href="/chat"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            onKeyDown={closeOnMenuItemKey}
            className="flex items-center gap-1.5 px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400"
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>🔮</span>
            <span>Chat</span>
          </Link>
        </div>
      )}
    </div>
  )
}
