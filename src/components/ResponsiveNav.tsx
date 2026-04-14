'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
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

export function ResponsiveNav({ navLinks, isSignedIn, isAdmin }: ResponsiveNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [mobileOpen])

  return (
    <>
      <nav className="hidden md:flex items-center gap-1" aria-label="Primary navigation">
        {navLinks.map((link) => (
          <Link key={link.href} href={link.href} className={navItemClass} style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
            <span>{link.icon}</span>
            <span>{link.label}</span>
          </Link>
        ))}
        {isAdmin && <AdminMenu />}
        {isSignedIn && !isAdmin && (
          <Link href="/my-character" className={navItemClass} style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
            <span>📋</span>
            <span>My Character</span>
          </Link>
        )}
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={navItemClass}
            style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        ) : (
          <Link href="/login" className={navItemClass} style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
            <span>🔐</span>
            <span>Sign In</span>
          </Link>
        )}
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-panel"
          onClick={() => setMobileOpen((current) => !current)}
          className="flex items-center gap-1.5 rounded px-3 py-2 text-sm transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
          style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
        >
          <span aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close mobile menu"
              onClick={() => setMobileOpen(false)}
            />

            <div
              id="mobile-nav-panel"
              className="absolute right-0 top-0 h-full w-[85vw] max-w-sm border-l p-4 shadow-2xl overflow-y-auto"
              style={{ backgroundColor: '#07070d', borderColor: '#1a1a2e' }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm tracking-widest uppercase" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
                  Navigation
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
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
                    className="flex min-h-11 items-center gap-2 rounded px-3 py-2 text-base leading-tight transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                    style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                  >
                    <span>{link.icon}</span>
                    <span className="whitespace-normal break-words">{link.label}</span>
                  </Link>
                ))}

                {isAdmin && (
                  <>
                    <Link
                      href="/admin/access"
                      className="flex min-h-11 items-center gap-2 rounded px-3 py-2 text-base leading-tight transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                      style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                    >
                      <span>🛡️</span>
                      <span className="whitespace-normal break-words">Admin Access</span>
                    </Link>
                    <Link
                      href="/admin/skills"
                      className="flex min-h-11 items-center gap-2 rounded px-3 py-2 text-base leading-tight transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                      style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                    >
                      <span>🎯</span>
                      <span className="whitespace-normal break-words">Admin Skills</span>
                    </Link>
                  </>
                )}

                {isSignedIn && !isAdmin && (
                  <Link
                    href="/my-character"
                    className="flex min-h-11 items-center gap-2 rounded px-3 py-2 text-base leading-tight transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                    style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                  >
                    <span>📋</span>
                    <span className="whitespace-normal break-words">My Character</span>
                  </Link>
                )}

                {isSignedIn ? (
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="flex min-h-11 items-center gap-2 rounded px-3 py-2 text-left text-base leading-tight transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                    style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                  >
                    <span>🚪</span>
                    <span className="whitespace-normal break-words">Sign Out</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="flex min-h-11 items-center gap-2 rounded px-3 py-2 text-base leading-tight transition-all duration-200 hover:text-purple-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
                    style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
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
