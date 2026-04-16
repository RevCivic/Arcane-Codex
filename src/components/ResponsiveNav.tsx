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
}

const navItemClass =
  'flex items-center gap-1.5 rounded px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400'
const mobileNavItemClass =
  'flex min-h-11 items-center gap-2 rounded px-3 py-2 text-base leading-tight transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400'
const navItemStyle = { color: '#9ca3af', fontFamily: 'Georgia, serif' }

export function ResponsiveNav({ navLinks, isSignedIn, isAdmin }: ResponsiveNavProps) {
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
        {isAdmin && <AdminMenu />}
        {isSignedIn && !isAdmin && (
          <Link href="/my-character" className={navItemClass} style={navItemStyle}>
            <span>📋</span>
            <span>My Character</span>
          </Link>
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
                  </>
                )}

                {isSignedIn && !isAdmin && (
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
