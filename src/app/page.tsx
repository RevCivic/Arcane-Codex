export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const sections = [
  {
    href: '/characters',
    label: 'Characters',
    newLabel: 'Character',
    bulkLabel: 'Characters',
    icon: '👤',
    desc: 'Agents, suspects, and persons of interest',
    color: '#8b5cf6',
  },
  {
    href: '/places',
    label: 'Places',
    newLabel: 'Place',
    bulkLabel: 'Places',
    icon: '🗺️',
    desc: 'Locations under investigation',
    color: '#6366f1',
  },
  {
    href: '/inventory',
    label: 'Inventory',
    newLabel: 'Item',
    bulkLabel: 'Items',
    icon: '🎒',
    desc: 'Artifacts, equipment, and evidence',
    color: '#d97706',
  },
  {
    href: '/events',
    label: 'Events',
    newLabel: 'Event',
    bulkLabel: 'Events',
    icon: '📜',
    desc: 'Incidents and case milestones',
    color: '#7c3aed',
  },
  {
    href: '/powers',
    label: 'Powers',
    newLabel: 'Power',
    bulkLabel: 'Powers',
    icon: '⚡',
    desc: 'Supernatural abilities and phenomena',
    color: '#f59e0b',
  },
]

export default async function Home() {
  const [characters, places, inventory, events, powers] = await Promise.all([
    prisma.character.count(),
    prisma.place.count(),
    prisma.inventoryItem.count(),
    prisma.event.count(),
    prisma.power.count(),
  ])

  const counts = [characters, places, inventory, events, powers]

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🔮</div>
        <h1
          className="text-4xl font-bold tracking-widest uppercase mb-2 arcane-glow"
          style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
        >
          Arcane Codex
        </h1>
        <p
          className="text-lg tracking-widest uppercase mb-6 gold-glow"
          style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
        >
          Bureau of Supernatural Investigation
        </p>
        <div
          className="h-px max-w-lg mx-auto"
          style={{ background: 'linear-gradient(to right, transparent, #7c3aed, transparent)' }}
        />
        <p className="mt-6 max-w-2xl mx-auto text-base leading-7" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
          Welcome to the Bureau&apos;s operational codex. This encrypted archive contains classified
          dossiers on all personnel, locations, artifacts, and incidents related to ongoing
          supernatural investigations. Access is restricted to authorized agents only.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        {sections.map((section, i) => (
          <Link key={section.href} href={section.href}>
            <div
              className="card-arcane rounded-lg p-5 text-center cursor-pointer"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              <div className="text-3xl mb-2">{section.icon}</div>
              <div className="text-3xl font-bold mb-1" style={{ color: section.color }}>
                {counts[i]}
              </div>
              <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#e2e8f0' }}>
                {section.label}
              </div>
              <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                {section.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick access */}
      <div
        className="rounded-lg p-6 mb-8"
        style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}
      >
        <h2
          className="text-lg font-semibold uppercase tracking-widest mb-4"
          style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}
        >
          ✦ Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {sections.map((section) => (
            <div key={section.href} className="space-y-2">
              <Link
                href={`${section.href}/new`}
                className="flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all duration-200 hover:border-purple-500 hover:text-purple-300"
                style={{
                  borderColor: section.href === '/inventory' ? '#7f1d1d' : '#374151',
                  color: section.href === '/inventory' ? '#f87171' : '#9ca3af',
                  fontFamily: 'Georgia, serif',
                }}
              >
                <span>+</span>
                <span>New {section.newLabel}</span>
              </Link>
              <Link
                href={`${section.href}/bulk`}
                className="flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all duration-200 hover:border-purple-500 hover:text-purple-300"
                style={{
                  borderColor: '#3b1f6e',
                  color: '#a78bfa',
                  fontFamily: 'Georgia, serif',
                }}
              >
                <span>≡</span>
                <span>Bulk {section.bulkLabel}</span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Lore block */}
      <div
        className="rounded-lg p-6 text-sm leading-7"
        style={{
          backgroundColor: '#0d0d15',
          border: '1px solid #3b1f6e',
          color: '#9ca3af',
          fontFamily: 'Georgia, serif',
        }}
      >
        <p className="mb-2" style={{ color: '#8b5cf6' }}>
          ⚠ CLASSIFIED — BUREAU EYES ONLY
        </p>
        <p>
          The Bureau of Supernatural Investigation operates in the shadows of the mundane world,
          cataloguing and containing phenomena that defy rational explanation. Agents employ the
          Basic Roleplaying System for operational assessment, with skills measured in percentile
          notation. All records in this codex are to be treated with the utmost discretion.
        </p>
      </div>
    </div>
  )
}
