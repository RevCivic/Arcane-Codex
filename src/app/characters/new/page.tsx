'use client'

import { createCharacter } from '@/app/actions'
import Link from 'next/link'

const statusOptions = ['Active', 'Inactive', 'Deceased', 'Unknown', 'Missing']

export default function NewCharacterPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/characters" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Characters
        </Link>
      </div>

      <h1 className="text-2xl font-bold uppercase tracking-widest mb-6 arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
        + New Character
      </h1>

      <form action={createCharacter} className="card-arcane rounded-lg p-6 space-y-5" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>First Name</label>
            <input name="firstName" className="arcane-input" placeholder="e.g. Vanessa" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Last Name</label>
            <input name="lastName" className="arcane-input" placeholder="e.g. Miller" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>
            Full Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input name="name" required className="arcane-input" placeholder="e.g. Vanessa Miller" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Race</label>
            <input name="race" className="arcane-input" placeholder="e.g. Human" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Gender</label>
            <input name="gender" className="arcane-input" placeholder="e.g. Female" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Age</label>
            <input name="age" type="number" className="arcane-input" placeholder="e.g. 33" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Role</label>
          <input name="role" className="arcane-input" placeholder="e.g. Lead Investigator" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Affiliation</label>
          <input name="affiliation" className="arcane-input" placeholder="e.g. Bureau of Supernatural Investigation" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Case</label>
          <input name="currentCase" className="arcane-input" placeholder="e.g. Vanessa's Incursion" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Current Location</label>
            <input name="currentLocation" className="arcane-input" placeholder="e.g. Waukesha, WI" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Home / Origin</label>
            <input name="homeOrigin" className="arcane-input" placeholder="e.g. Waukesha, WI" />
          </div>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Description</label>
          <textarea name="description" rows={3} className="arcane-input" placeholder="Background and notes..." />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Stats (BRP)</label>
          <textarea name="stats" rows={3} className="arcane-input" placeholder="STR 12, CON 11, SIZ 10, DEX 14, INT 16, POW 15, CHA 13 | HP: 11 | Sanity: 75" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: '#d97706' }}>Status</label>
          <select name="status" className="arcane-input">
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
            Create Character
          </button>
          <Link
            href="/characters"
            className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:border-gray-500"
            style={{ border: '1px solid #374151', color: '#9ca3af' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
