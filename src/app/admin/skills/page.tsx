export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSkill, deleteSkill } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

const CATEGORY_OPTIONS = ['Combat', 'Investigation', 'Academic', 'Social', 'Physical', 'Technical', 'Other']

export default async function AdminSkillsPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const skills = await prisma.skill.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { characterValues: true } } },
  })

  // Group by category for display
  const skillsByCategory = new Map<string, typeof skills>()
  for (const skill of skills) {
    const cat = skill.category ?? 'Other'
    if (!skillsByCategory.has(cat)) skillsByCategory.set(cat, [])
    skillsByCategory.get(cat)!.push(skill)
  }

  const labelStyle: React.CSSProperties = { color: '#d97706', fontFamily: 'Georgia, serif' }
  const inputClass = 'arcane-input'

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/access" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Access Control
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
            🎯 Skill Management
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            Define and manage the BRP skills available on character sheets
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#1e1133', color: '#a78bfa', fontFamily: 'Georgia, serif' }}>
          {skills.length} skills
        </span>
      </div>

      {/* ── Add Skill Form ─────────────────────────────────────────────────── */}
      <div className="card-arcane rounded-lg p-6 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
        <h2 className="text-sm uppercase tracking-widest mb-4" style={labelStyle}>
          + Add New Skill
        </h2>
        <form action={createSkill} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>
              Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input name="name" required className={inputClass} placeholder="e.g. Locksmith" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Category</label>
            <select name="category" defaultValue="Other" className={inputClass}>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c} style={{ backgroundColor: '#111118' }}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Base Value (%)</label>
            <input name="baseValue" type="number" min={0} max={100} defaultValue={0} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Sort Order</label>
            <input name="sortOrder" type="number" min={0} defaultValue={0} className={inputClass} placeholder="e.g. 50" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Description</label>
            <input name="description" className={inputClass} placeholder="Short description of what this skill covers..." />
          </div>
          <div className="sm:col-span-2 flex gap-3 pt-1">
            <button
              type="submit"
              className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
              style={{ backgroundColor: '#7c3aed', color: '#fff' }}
            >
              Add Skill
            </button>
          </div>
        </form>
      </div>

      {/* ── Skill List ─────────────────────────────────────────────────────── */}
      {skills.length === 0 ? (
        <div className="text-center py-16 rounded-lg" style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          No skills defined yet. Add the first skill above.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(skillsByCategory.entries()).map(([category, catSkills]) => (
            <div key={category}>
              <h3 className="text-xs uppercase tracking-widest mb-3 pb-1 font-semibold" style={{ color: '#6b7280', borderBottom: '1px solid #1f2937', fontFamily: 'Georgia, serif' }}>
                {category}
              </h3>
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #1f2937' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Georgia, serif' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0d0d1a', borderBottom: '2px solid #1f2937' }}>
                      {(['Name', 'Base %', 'Sort', 'Description', 'Used by', 'Actions'] as const).map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catSkills.map((skill) => (
                      <tr key={skill.id} className="hover-row-arcane" style={{ borderBottom: '1px solid #1a1a2e' }}>
                        <td style={{ padding: '10px 12px', color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }}>
                          {skill.name}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#a78bfa', fontSize: '13px', fontFamily: 'monospace' }}>
                          {skill.baseValue}%
                        </td>
                        <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '12px' }}>
                          {skill.sortOrder}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '12px', maxWidth: '280px' }}>
                          <span className="line-clamp-1">{skill.description ?? '—'}</span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                          <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1e1133', color: '#a78bfa', fontSize: '11px' }}>
                            {skill._count.characterValues}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/skills/${skill.id}/edit`}
                              className="text-xs px-3 py-1 rounded transition-colors hover:text-amber-300"
                              style={{ color: '#d97706', border: '1px solid #451a03' }}
                            >
                              Edit
                            </Link>
                            <DeleteButton action={deleteSkill.bind(null, skill.id)} label={skill.name} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
