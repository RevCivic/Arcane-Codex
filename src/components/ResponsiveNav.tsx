'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { AdminMenu } from '@/components/AdminMenu'

type NavLinkItem = {
  href: string
  label: string
  icon: string
}

type ResponsiveNavProps = {
  navLinks: NavLinkItem[]
  isSignedIn: boolean
  isAdmin: boolean
  playerCharacters?: Array<{ id: number; name: string }>
  adminCharacters?: Array<{ id: number; name: string }>
  pendingImportCount?: number
}

const navItemClass =
  'flex items-center gap-1.5 rounded px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400'
const mobileNavItemClass =
  'flex min-h-11 items-center gap-2 rounded px-3 py-2 text-base leading-tight transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400'
const navItemStyle = { color: '#9ca3af', fontFamily: 'Georgia, serif' }

export function ResponsiveNav({ navLinks, isSignedIn, isAdmin, playerCharacters = [], adminCharacters = [], pendingImportCount = 0 }: ResponsiveNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mobileOpen) return

    const menuButton = menuButtonRef.current
    const panel = panelRef.current
    if (!panel) return

    const focusable = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        return
      }
      if (event.key !== 'Tab' || !first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      menuButton?.focus()
    }
  }, [mobileOpen])

  return (
    <>
      <nav className="hidden md:flex flex-wrap items-center gap-1" aria-label="Primary navigation">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className={navItemClass} style={navItemStyle}>
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
        {isAdmin && adminCharacters.length === 1 && (
          <Link href={`/characters/${adminCharacters[0].id}/sheet`} className={navItemClass} style={navItemStyle}>
            <span>📋</span>
            <span>My Character</span>
          </Link>
        )}
        {isAdmin && adminCharacters.length > 1 && (
          <details className="group relative">
            <summary className={`${navItemClass} cursor-pointer list-none`} style={navItemStyle}>
              <span>📋</span>
              <span>My Characters</span>
              <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div
              className="absolute right-0 z-50 mt-1 min-w-56 overflow-hidden rounded border py-1 shadow-2xl"
              style={{ backgroundColor: '#07070d', borderColor: '#2d1b69' }}
            >
              {adminCharacters.map((character) => (
                <Link
                  key={character.id}
                  href={`/characters/${character.id}/sheet`}
                  className="block px-4 py-2 text-sm whitespace-nowrap transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
                  style={navItemStyle}
                >
                  {character.name}
                </Link>
              ))}
            </div>
          </details>
        )}
        {isAdmin && <AdminMenu pendingImportCount={pendingImportCount} />}
        {isSignedIn && !isAdmin && playerCharacters.length <= 1 && (
          <Link href="/my-character" className={navItemClass} style={navItemStyle}>
            <span>📋</span>
            <span>My Character</span>
          </Link>
        )}
        {isSignedIn && !isAdmin && playerCharacters.length > 1 && (
          <details className="group relative">
            <summary className={`${navItemClass} cursor-pointer list-none`} style={navItemStyle}>
              <span>📋</span>
              <span>My Characters</span>
              <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-180">▾</span>
            </summary>
            <div
              className="absolute right-0 z-50 mt-1 min-w-56 overflow-hidden rounded border py-1 shadow-2xl"
              style={{ backgroundColor: '#07070d', borderColor: '#2d1b69' }}
            >
              {playerCharacters.map((character) => (
                <Link
                  key={character.id}
                  href={`/characters/${character.id}/sheet`}
                  className="block px-4 py-2 text-sm whitespace-nowrap transition-colors hover:bg-purple-950 hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-purple-400"
                  style={navItemStyle}
                >
                  {character.name}
                </Link>
              ))}
            </div>
          </details>
        )}
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={navItemClass}
            style={navItemStyle}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        ) : (
          <Link href="/login" className={navItemClass} style={navItemStyle}>
            <span>🔐</span>
            <span>Sign In</span>
          </Link>
        )}
      </nav>

      <div className="md:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-panel"
          onClick={() => setMobileOpen((current) => !current)}
          className="flex items-center gap-1.5 rounded px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          style={navItemStyle}
        >
          <span aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="mobile-nav-title">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close mobile menu"
              onClick={() => setMobileOpen(false)}
            />

            <div
              id="mobile-nav-panel"
              ref={panelRef}
              className="absolute right-0 top-0 h-full w-[85vw] max-w-sm border-l p-4 shadow-2xl overflow-y-auto"
              style={{ backgroundColor: '#07070d', borderColor: '#1a1a2e' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div
                  id="mobile-nav-title"
                  className="text-sm tracking-widest uppercase"
                  style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                >
                  Navigation
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="rounded px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                  style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                >
                  Close
                </button>
              </div>

              <nav className="flex flex-col gap-1" aria-label="Mobile primary navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={mobileNavItemClass}
                    style={navItemStyle}
                  >
                    <span>{link.icon}</span>
                    <span className="whitespace-normal break-words">{link.label}</span>
                  </Link>
                ))}

                {isAdmin && (
                  <>
                    {adminCharacters.length === 1 && (
                      <Link
                        href={`/characters/${adminCharacters[0].id}/sheet`}
                        onClick={() => setMobileOpen(false)}
                        className={mobileNavItemClass}
                        style={navItemStyle}
                      >
                        <span>📋</span>
                        <span className="whitespace-normal break-words">My Character</span>
                      </Link>
                    )}
                    {adminCharacters.length > 1 && (
                      <div className="border-y py-1" style={{ borderColor: '#1a1a2e' }}>
                        <div className={mobileNavItemClass} style={{ ...navItemStyle, color: '#a78bfa' }}>
                          <span>📋</span>
                          <span>My Characters</span>
                        </div>
                        {adminCharacters.map((character) => (
                          <Link
                            key={character.id}
                            href={`/characters/${character.id}/sheet`}
                            onClick={() => setMobileOpen(false)}
                            className={`${mobileNavItemClass} pl-10`}
                            style={navItemStyle}
                          >
                            <span className="whitespace-normal break-words">{character.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    <Link
                      href="/admin/access"
                      onClick={() => setMobileOpen(false)}
                      className={mobileNavItemClass}
                      style={navItemStyle}
                    >
                      <span>🛡️</span>
                      <span className="whitespace-normal break-words">Admin Access</span>
                    </Link>
                    <Link
                      href="/admin/skills"
                      onClick={() => setMobileOpen(false)}
                      className={mobileNavItemClass}
                      style={navItemStyle}
                    >
                      <span>🎯</span>
                      <span className="whitespace-normal break-words">Admin Skills</span>
                    </Link>
                    <Link
                      href="/admin/lore"
                      onClick={() => setMobileOpen(false)}
                      className={mobileNavItemClass}
                      style={navItemStyle}
                    >
                      <span>📚</span>
                      <span className="whitespace-normal break-words">Admin Lore</span>
                    </Link>
                    <Link
                      href="/admin/import-queue"
                      onClick={() => setMobileOpen(false)}
                      className={mobileNavItemClass}
                      style={navItemStyle}
                    >
                      <span>📥</span>
                      <span className="whitespace-normal break-words">
                        Import Queue
                        {pendingImportCount > 0 && (
                          <span
                            className="ml-2 rounded-full px-1.5 py-0.5 text-xs font-bold leading-none"
                            style={{ backgroundColor: '#d97706', color: '#07070d' }}
                          >
                            {pendingImportCount}
                          </span>
                        )}
                      </span>
                    </Link>
                    <Link
                      href="/admin/images"
                      onClick={() => setMobileOpen(false)}
                      className={mobileNavItemClass}
                      style={navItemStyle}
                    >
                      <span>🖼️</span>
                      <span className="whitespace-normal break-words">Admin Images</span>
                    </Link>
                    <Link
                      href="/chat"
                      onClick={() => setMobileOpen(false)}
                      className={mobileNavItemClass}
                      style={navItemStyle}
                    >
                      <span>🔮</span>
                      <span className="whitespace-normal break-words">Admin Chat</span>
                    </Link>
                  </>
                )}

                {isSignedIn && !isAdmin && playerCharacters.length <= 1 && (
                  <Link
                    href="/my-character"
                    onClick={() => setMobileOpen(false)}
                    className={mobileNavItemClass}
                    style={navItemStyle}
                  >
                    <span>📋</span>
                    <span className="whitespace-normal break-words">My Character</span>
                  </Link>
                )}
                {isSignedIn && !isAdmin && playerCharacters.length > 1 && (
                  <div className="border-y py-1" style={{ borderColor: '#1a1a2e' }}>
                    <div className={mobileNavItemClass} style={{ ...navItemStyle, color: '#a78bfa' }}>
                      <span>📋</span>
                      <span>My Characters</span>
                    </div>
                    {playerCharacters.map((character) => (
                      <Link
                        key={character.id}
                        href={`/characters/${character.id}/sheet`}
                        onClick={() => setMobileOpen(false)}
                        className={`${mobileNavItemClass} pl-10`}
                        style={navItemStyle}
                      >
                        <span className="whitespace-normal break-words">{character.name}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {isSignedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false)
                      signOut({ callbackUrl: '/login' })
                    }}
                    className={`${mobileNavItemClass} text-left`}
                    style={navItemStyle}
                  >
                    <span>🚪</span>
                    <span className="whitespace-normal break-words">Sign Out</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className={mobileNavItemClass}
                    style={navItemStyle}
                  >
                    <span>🔐</span>
                    <span className="whitespace-normal break-words">Sign In</span>
                  </Link>
                )}
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
