import type { Metadata } from 'next'
import { auth } from '@/auth'
import { ResponsiveNav } from '@/components/ResponsiveNav'
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
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-2 group shrink-0 min-w-0">
              <span className="text-2xl">🔮</span>
              <div className="min-w-0">
                <div
                  className="text-lg sm:text-xl font-bold tracking-widest uppercase arcane-glow truncate"
                  style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
                >
                  Arcane Codex
                </div>
                <div
                  className="text-xs tracking-wide sm:tracking-widest uppercase truncate"
                  style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
                >
                  Bureau of Supernatural Investigation
                </div>
              </div>
            </Link>
            <ResponsiveNav navLinks={navLinks} isSignedIn={isSignedIn} isAdmin={isAdmin} />
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
