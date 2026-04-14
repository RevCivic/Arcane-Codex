import type { Metadata } from 'next'
import { auth, signOut } from '@/auth'
import { AdminMenu } from '@/components/AdminMenu'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import './globals.css'

export const metadata: Metadata = {
  title: 'Arcane Codex — Bureau of Supernatural Investigation',
  description: 'Campaign codex for the Bureau of Supernatural Investigation',
}

const navLinks = [
  { href: '/characters', label: 'Characters', icon: '👤' },
  { href: '/places', label: 'Places', icon: '🗺️' },
  { href: '/inventory', label: 'Inventory', icon: '🎒' },
  { href: '/events', label: 'Events', icon: '📜' },
  { href: '/powers', label: 'Powers', icon: '⚡' },
]

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  const access = email ? await prisma.allowedEmail.findUnique({ where: { email } }) : null

  if (session?.user && !access) {
    redirect('/login?error=AccessDenied')
  }

  const isSignedIn = !!session?.user
  const isAdmin = access?.role === AccessRole.ADMIN

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col" style={{ backgroundColor: '#0a0a0f', color: '#e2e8f0' }}>
        {/* Top Nav */}
        <header style={{ backgroundColor: '#07070d', borderBottom: '1px solid #1a1a2e' }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="text-2xl">🔮</span>
              <div>
                <div
                  className="text-xl font-bold tracking-widest uppercase arcane-glow"
                  style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
                >
                  Arcane Codex
                </div>
                <div
                  className="text-xs tracking-widest uppercase"
                  style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                >
                  Bureau of Supernatural Investigation
                </div>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-all duration-200 hover:text-purple-400"
                  style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                >
                  <span>{link.icon}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              ))}
              {isAdmin && <AdminMenu />}
              {isSignedIn && !isAdmin && (
                <Link
                  href="/my-character"
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-all duration-200 hover:text-purple-400"
                  style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                >
                  <span>📋</span>
                  <span className="hidden sm:inline">My Character</span>
                </Link>
              )}

              {isSignedIn ? (
                <form
                  action={async () => {
                    'use server'
                    await signOut({ redirectTo: '/login' })
                  }}
                >
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-all duration-200 hover:text-purple-400"
                    style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                  >
                    <span>🚪</span>
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-all duration-200 hover:text-purple-400"
                  style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}
                >
                  <span>🔐</span>
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}
            </nav>
          </div>
        </header>

        {/* Decorative separator */}
        <div
          className="h-px"
          style={{
            background:
              'linear-gradient(to right, transparent, #7c3aed, #d97706, #7c3aed, transparent)',
          }}
        />

        {/* Main content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">{children}</main>

        {/* Footer */}
        <footer
          style={{ borderTop: '1px solid #1a1a2e', backgroundColor: '#07070d' }}
          className="text-center py-4 text-xs"
        >
          <span style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}>
            ✦ Arcane Codex · Bureau of Supernatural Investigation · BRP System ✦
          </span>
        </footer>
      </body>
    </html>
  )
}
