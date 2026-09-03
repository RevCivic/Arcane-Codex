export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAllRollHistory } from '@/app/actions'

export default async function AdminRollHistoryPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const rolls = await getAllRollHistory(500)

  // Format result type color
  function getResultColor(resultType: string | null): string {
    switch (resultType) {
      case 'CRITICAL':
        return '#10b981' // green
      case 'SUCCESS':
        return '#60a5fa' // blue
      case 'FAILURE':
        return '#f87171' // red
      case 'FUMBLE':
        return '#ef4444' // darker red
      default:
        return '#9ca3af' // gray
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <Link href="/admin/access" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Access Control
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            🎲 Roll History
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            Chronological record of all character rolls in the campaign
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#1e1133', color: '#a78bfa', fontFamily: 'Georgia, serif' }}>
          {rolls.length} rolls
        </span>
      </div>

      {rolls.length === 0 ? (
        <div className="card-arcane rounded-lg p-8 text-center" style={{ fontFamily: 'Georgia, serif' }}>
          <p style={{ color: '#6b7280' }}>No rolls recorded yet.</p>
        </div>
      ) : (
        <div className="card-arcane rounded-lg overflow-hidden" style={{ fontFamily: 'Georgia, serif' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#111118', borderBottom: '1px solid #1f2937' }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                    Character
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                    Label
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                    Roll
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                    Target
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                    Difficulty
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: '#d97706' }}>
                    Result
                  </th>
                </tr>
              </thead>
              <tbody>
                {rolls.map((roll, index) => (
                  <tr key={roll.id} style={{ backgroundColor: index % 2 === 0 ? 'transparent' : '#07070d', borderBottom: '1px solid #1f2937' }}>
                    <td className="px-4 py-2 text-xs" style={{ color: '#9ca3af' }}>
                      {new Date(roll.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/characters/${roll.character.id}`}
                        className="text-xs transition-colors hover:text-purple-300"
                        style={{ color: '#a78bfa' }}
                      >
                        {roll.character.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-xs" style={{ color: '#9ca3af' }}>
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-semibold uppercase"
                        style={{
                          backgroundColor: '#1e1133',
                          color: '#a78bfa',
                        }}
                      >
                        {roll.rollType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs" style={{ color: '#9ca3af' }}>
                      {roll.label}
                    </td>
                    <td className="px-4 py-2 text-center text-xs font-bold" style={{ color: '#60a5fa' }}>
                      {roll.roll}
                    </td>
                    <td className="px-4 py-2 text-center text-xs" style={{ color: '#9ca3af' }}>
                      {roll.target ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-center text-xs" style={{ color: '#9ca3af' }}>
                      {roll.difficulty ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-center text-xs font-bold">
                      <span style={{ color: getResultColor(roll.resultType) }}>
                        {roll.resultType ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 text-xs" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
        <p>Showing the most recent {rolls.length} rolls. Sorted newest first.</p>
      </div>
    </div>
  )
}
