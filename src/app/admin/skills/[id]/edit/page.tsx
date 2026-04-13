export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { updateSkill, deleteSkill } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

const CATEGORY_OPTIONS = ['Combat', 'Investigation', 'Academic', 'Social', 'Physical', 'Technical', 'Other']

export default async function EditSkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const skill = await prisma.skill.findUnique({
    where: { id: parseInt(id) },
    include: { _count: { select: { characterValues: true } } },
  })
  if (!skill) notFound()

  const action = updateSkill.bind(null, skill.id)
  const labelStyle: React.CSSProperties = { color: '#d97706', fontFamily: 'Georgia, serif' }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/skills" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Skill Management
        </Link>
      </div>

      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6 arcane-glow" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
        ✏️ Edit Skill
      </h1>

      {skill._count.characterValues > 0 && (
        <div className="rounded-lg p-4 mb-6 text-sm" style={{ backgroundColor: '#0c1a0c', border: '1px solid #14532d', color: '#4ade80', fontFamily: 'Georgia, serif' }}>
          ℹ️ This skill is used on <strong>{skill._count.characterValues}</strong> character sheet{skill._count.characterValues !== 1 ? 's' : ''}.
          Renaming it will be reflected everywhere. Deleting it will remove those values.
        </div>
      )}

      <form action={action} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>
            Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input name="name" required defaultValue={skill.name} className="arcane-input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Category</label>
            <select name="category" defaultValue={skill.category ?? 'Other'} className="arcane-input">
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c} style={{ backgroundColor: '#111118' }}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Base Value (%)</label>
            <input name="baseValue" type="number" min={0} max={100} defaultValue={skill.baseValue} className="arcane-input" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Sort Order</label>
          <input name="sortOrder" type="number" min={0} defaultValue={skill.sortOrder} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Description</label>
          <input name="description" defaultValue={skill.description ?? ''} className="arcane-input" placeholder="Short description..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Save Changes
          </button>
          <Link href="/admin/skills" className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider" style={{ border: '1px solid #374151', color: '#9ca3af' }}>
            Cancel
          </Link>
          <div className="ml-auto">
            <DeleteButton action={deleteSkill.bind(null, skill.id)} label={skill.name} />
          </div>
        </div>
      </form>
    </div>
  )
}
