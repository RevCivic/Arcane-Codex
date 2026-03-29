import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { updateCharacter } from '@/app/actions'
import Link from 'next/link'

const statusOptions = ['Active', 'Inactive', 'Deceased', 'Unknown', 'Missing']

export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const character = await prisma.character.findUnique({ where: { id: parseInt(id) } })
  if (!character) notFound()

  const action = updateCharacter.bind(null, character.id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={`/characters/${character.id}`} className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← {character.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
        ✏️ Edit Character
      </h1>

      <form action={action} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
            Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input name="name" required defaultValue={character.name} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Role</label>
          <input name="role" defaultValue={character.role ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} defaultValue={character.description ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Stats (BRP)</label>
          <textarea name="stats" rows={3} defaultValue={character.stats ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Affiliation</label>
          <input name="affiliation" defaultValue={character.affiliation ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Status</label>
          <select name="status" defaultValue={character.status ?? 'Active'} className="arcane-input">
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Save Changes
          </button>
          <Link
            href={`/characters/${character.id}`}
            className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider"
            style={{ border: '1px solid #374151', color: '#9ca3af' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
