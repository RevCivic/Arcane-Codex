export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { referenceLinksToText } from '@/lib/referenceLinks'
import { notFound } from 'next/navigation'
import { getAllTags, updateCharacter } from '@/app/actions'
import { CharacterTextSuggestionPanel } from '@/components/CharacterTextSuggestionPanel'
import { TagInput } from '@/components/TagInput'
import Link from 'next/link'
import { entityDestination, getListReturnPath } from '@/lib/listNavigation'

const statusOptions = ['Active', 'Inactive', 'Deceased', 'Unknown', 'Missing']

export default async function EditCharacterPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> }) {
  const { id } = await params
  const { returnTo: rawReturnTo } = await searchParams
  const returnTo = getListReturnPath(rawReturnTo, '/characters')
  const [character, allTags] = await Promise.all([
    prisma.character.findUnique({
      where: { id: parseInt(id) },
      include: { tags: { orderBy: { name: 'asc' } } },
    }),
    getAllTags(),
  ])
  if (!character) notFound()

  const action = updateCharacter.bind(null, character.id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={entityDestination(`/characters/${character.id}`, returnTo)} className="text-sm transition-colors hover:text-purple-300" style={{ color: '#a0a9b8' }}>
          ← {character.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6" style={{ color: '#d97706' }}>
        ✏️ Edit Character
      </h1>

      <form action={action} encType="multipart/form-data" className="card-arcane rounded-lg p-6 space-y-5" style={{  }}>
        <input type="hidden" name="returnTo" value={returnTo} />
        <CharacterTextSuggestionPanel characterId={character.id} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>First Name</label>
            <input name="firstName" defaultValue={character.firstName ?? ''} className="arcane-input" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Last Name</label>
            <input name="lastName" defaultValue={character.lastName ?? ''} className="arcane-input" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
            Full Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input name="name" required defaultValue={character.name} className="arcane-input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Race</label>
            <input name="race" defaultValue={character.race ?? ''} className="arcane-input" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Gender</label>
            <input name="gender" defaultValue={character.gender ?? ''} className="arcane-input" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Age</label>
            <input name="age" type="number" defaultValue={character.age?.toString() ?? ''} className="arcane-input" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Role</label>
          <input name="role" defaultValue={character.role ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Affiliation</label>
          <input name="affiliation" defaultValue={character.affiliation ?? ''} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Case</label>
          <input name="currentCase" defaultValue={character.currentCase ?? ''} className="arcane-input" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Current Location</label>
            <input name="currentLocation" defaultValue={character.currentLocation ?? ''} className="arcane-input" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Home / Origin</label>
            <input name="homeOrigin" defaultValue={character.homeOrigin ?? ''} className="arcane-input" />
          </div>
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
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Image URL or Local Path</label>
          <input name="imageUrl" type="text" defaultValue={character.imageUrl ?? ''} className="arcane-input" placeholder="https://example.com/image.png or /uploads/characters/image.png" />
          <p className="mt-1 text-xs" style={{ color: '#a0a9b8' }}>Enter an http(s) URL or a path under /uploads/.</p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Upload Replacement Image</label>
          <input name="imageFile" type="file" accept="image/*" className="arcane-input" />
          <p className="mt-1 text-xs" style={{ color: '#a0a9b8' }}>A selected file replaces the URL or local path above when you save (maximum 5 MB).</p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Reference Links</label>
          <textarea name="referenceLinks" rows={4} defaultValue={referenceLinksToText(character.referenceLinks)} className="arcane-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Status</label>
          <select name="status" defaultValue={character.status ?? 'Active'} className="arcane-input">
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <TagInput allTags={allTags} initialTags={character.tags.map((tag) => tag.name)} />
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Save Changes
          </button>
          <Link
            href={entityDestination(`/characters/${character.id}`, returnTo)}
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
