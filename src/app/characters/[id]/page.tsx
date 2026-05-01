export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { normalizeReferenceLinks } from '@/lib/referenceLinks'
import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { deleteCharacter, claimCharacter, unclaimCharacter, adminAssignCharacter, assignPower, updateCharacterPower, removeCharacterPower } from '@/app/actions'
import { DeleteButton } from '@/components/DeleteButton'

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const characterId = parseInt(id)

  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const [character, allowed, allSkills, allPowers] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      include: {
        characterPowers: {
          include: { power: { select: { id: true, name: true, baseAbility: true, basePercentage: true } } },
          orderBy: { power: { name: 'asc' } },
        },
        sheet: { include: { skillValues: true } },
      },
    }),
    prisma.allowedEmail.findUnique({ where: { email } }),
    prisma.skill.findMany({ select: { id: true, name: true, baseValue: true } }),
    prisma.power.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  if (!character) notFound()
  if (!allowed) redirect('/login')

  const isAdmin = allowed.role === AccessRole.ADMIN
  const isOwner = character.claimedByEmail === email

  // For admin assign form: fetch all allowlisted emails
  const allowedEmails = isAdmin
    ? await prisma.allowedEmail.findMany({ orderBy: { email: 'asc' } })
    : []

  // Does the current USER already own a different character?
  const userAlreadyClaims = !isAdmin && !isOwner
    ? await prisma.character.findFirst({ where: { claimedByEmail: email } })
    : null

  const claimAction   = claimCharacter.bind(null, characterId)
  const unclaimAction = unclaimCharacter.bind(null, characterId)
  const assignAction  = adminAssignCharacter.bind(null, characterId)
  const referenceLinks = normalizeReferenceLinks(character.referenceLinks)

  // Build a fast lookup: skill name → effective value (custom or base), used for power ability derivation
  const skillValueById = new Map<number, number>(
    character.sheet?.skillValues.map((sv) => [sv.skillId, sv.value]) ?? []
  )
  const skillNameMap = new Map<string, number>()
  for (const skill of allSkills) {
    skillNameMap.set(skill.name, skillValueById.get(skill.id) ?? skill.baseValue)
  }

  // Powers not yet assigned to this character (for the assign dropdown)
  const assignedPowerIds = new Set(character.characterPowers.map((cp) => cp.powerId))
  const unassignedPowers = allPowers.filter((p) => !assignedPowerIds.has(p.id))

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/characters" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Characters
        </Link>
      </div>

      <div className="card-arcane rounded-lg p-6 mb-6" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#e2e8f0' }}>{character.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {character.role && (
                <span className="text-xs px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ backgroundColor: '#1e1133', color: '#a78bfa' }}>
                  {character.role}
                </span>
              )}
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: character.status === 'Active' ? '#052e16' : '#1f1210',
                  color: character.status === 'Active' ? '#4ade80' : '#f87171',
                }}
              >
                {character.status ?? 'Unknown'}
              </span>
              {/* Claim badge */}
              {character.claimedByEmail ? (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#0c1a2e', color: '#60a5fa' }}>
                  🔗 {isAdmin ? character.claimedByEmail : isOwner ? 'Claimed by you' : 'Claimed'}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#111118', color: '#4b5563' }}>
                  Unclaimed
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Sheet link — owner or admin */}
            {(isOwner || isAdmin) && (
              <Link
                href={`/characters/${characterId}/sheet`}
                className="text-xs px-3 py-1.5 rounded transition-colors hover:text-blue-300"
                style={{ color: '#60a5fa', border: '1px solid #1e3a5f' }}
              >
                📋 Sheet
              </Link>
            )}
            {isAdmin && (
              <>
                <Link
                  href={`/characters/${character.id}/edit`}
                  className="text-xs px-3 py-1.5 rounded transition-colors hover:text-amber-300"
                  style={{ color: '#d97706', border: '1px solid #451a03' }}
                >
                  Edit
                </Link>
                <DeleteButton action={deleteCharacter.bind(null, character.id)} label={character.name} />
              </>
            )}
          </div>
        </div>

        <hr style={{ borderColor: '#1f2937', margin: '1rem 0' }} />

        {/* ── Claim / Unclaim controls (non-admin users) ─────────────────────── */}
        {!isAdmin && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>
            {isOwner ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs" style={{ color: '#4ade80' }}>
                  ✓ This is your character. Visit your sheet to update stats and skills.
                </p>
                <form action={unclaimAction}>
                  <button
                    type="submit"
                    className="text-xs px-3 py-1.5 rounded transition-colors hover:text-red-300"
                    style={{ color: '#f87171', border: '1px solid #3f1212' }}
                  >
                    Unclaim
                  </button>
                </form>
              </div>
            ) : character.claimedByEmail ? (
              <p className="text-xs" style={{ color: '#6b7280' }}>
                This character has already been claimed by another player.
              </p>
            ) : userAlreadyClaims ? (
              <p className="text-xs" style={{ color: '#6b7280' }}>
                You already claim <strong style={{ color: '#e2e8f0' }}>{userAlreadyClaims.name}</strong>. Unclaim that character first if you want to claim this one.
              </p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  This character is available. Claim it to access your personal character sheet.
                </p>
                <form action={claimAction}>
                  <button
                    type="submit"
                    className="text-xs px-3 py-1.5 rounded transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#7c3aed', color: '#fff' }}
                  >
                    Claim
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── Admin: assign form ─────────────────────────────────────────────── */}
        {isAdmin && (
          <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#0d0d15', border: '1px solid #2d1b69' }}>
            <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: '#a78bfa' }}>
              🛡️ Admin: Assign Character
            </h3>
            <form action={assignAction} className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>
                  Assign to Email (leave blank to clear)
                </label>
                <select name="email" defaultValue={character.claimedByEmail ?? ''} className="arcane-input">
                  <option value="" style={{ backgroundColor: '#111118' }}>— None (unclaim) —</option>
                  {allowedEmails.map((ae) => (
                    <option key={ae.id} value={ae.email} style={{ backgroundColor: '#111118' }}>
                      {ae.email} ({ae.role})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="text-xs px-4 py-2 rounded transition-colors hover:opacity-90 shrink-0"
                style={{ backgroundColor: '#5b21b6', color: '#e9d5ff' }}
              >
                Assign
              </button>
            </form>
          </div>
        )}

        {/* Character details */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {character.imageUrl && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-2" style={{ color: '#d97706' }}>Image</dt>
              <dd>
                <Image src={character.imageUrl} alt={character.name} width={960} height={540} unoptimized className="w-full max-w-xl rounded border" style={{ borderColor: '#1f2937' }} />
              </dd>
            </div>
          )}
          {character.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Description</dt>
              <dd className="text-sm leading-6" style={{ color: '#e2e8f0' }}>{character.description}</dd>
            </div>
          )}
          {character.race && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Race</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{character.race}</dd>
            </div>
          )}
          {character.gender && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Gender</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{character.gender}</dd>
            </div>
          )}
          {character.age !== null && character.age !== undefined && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Age</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{character.age}</dd>
            </div>
          )}
          {character.affiliation && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Affiliation</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{character.affiliation}</dd>
            </div>
          )}
          {character.currentCase && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Case</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{character.currentCase}</dd>
            </div>
          )}
          {character.currentLocation && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Current Location</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{character.currentLocation}</dd>
            </div>
          )}
          {character.homeOrigin && (
            <div>
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Home / Origin</dt>
              <dd className="text-sm" style={{ color: '#e2e8f0' }}>{character.homeOrigin}</dd>
            </div>
          )}
          {character.stats && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Stats (BRP)</dt>
              <dd className="text-sm font-mono p-2 rounded" style={{ backgroundColor: '#0d0d15', color: '#a78bfa', border: '1px solid #1f2937' }}>
                {character.stats}
              </dd>
            </div>
          )}
          {referenceLinks.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: '#d97706' }}>Reference Links</dt>
              <dd className="space-y-2">
                {referenceLinks.map((link) => (
                  <p key={`${link.url}-${link.note}`} className="text-sm" style={{ color: '#e2e8f0' }}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-purple-300 break-all" style={{ color: '#a78bfa' }}>
                      {link.url}
                    </a>
                    {' — '}
                    <span>{link.note}</span>
                  </p>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Powers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold uppercase tracking-widest" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            ⚡ Powers
          </h2>
        </div>

        {/* Admin: Assign power form */}
        {isAdmin && unassignedPowers.length > 0 && (
          <form action={assignPower} className="mb-4 p-4 rounded-lg space-y-3" style={{ backgroundColor: '#0d0d15', border: '1px solid #2d1b69', fontFamily: 'Georgia, serif' }}>
            <h3 className="text-xs uppercase tracking-widest" style={{ color: '#a78bfa' }}>⚡ Assign Power</h3>
            <input type="hidden" name="characterId" value={characterId} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Power</label>
                <select name="powerId" required className="arcane-input">
                  <option value="">Select a power…</option>
                  {unassignedPowers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Modifier (%)</label>
                <input name="modifier" type="number" defaultValue={0} className="arcane-input" placeholder="e.g. −20 or +10" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Notes</label>
                <input name="notes" type="text" className="arcane-input" placeholder="Reason for modifier…" />
              </div>
            </div>
            <button type="submit" className="text-xs px-4 py-1.5 rounded hover:opacity-90" style={{ backgroundColor: '#5b21b6', color: '#e9d5ff' }}>
              Assign Power
            </button>
          </form>
        )}

        {character.characterPowers.length === 0 ? (
          <p className="text-sm" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>No powers assigned to this character.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {character.characterPowers.map((cp) => {
              const effective = cp.power.basePercentage != null
                ? cp.power.basePercentage + cp.modifier
                : (cp.power.baseAbility ? skillNameMap.get(cp.power.baseAbility) : undefined)

              return (
                <div key={cp.id} className="card-arcane rounded-lg p-4" style={{ fontFamily: 'Georgia, serif' }}>
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/powers/${cp.power.id}`} className="font-semibold hover:text-purple-300" style={{ color: '#e2e8f0' }}>
                      {cp.power.name}
                    </Link>
                    {isAdmin && (
                      <form action={removeCharacterPower.bind(null, cp.id)} className="inline">
                        <button type="submit" className="text-xs px-2 py-0.5 rounded hover:text-red-300" style={{ color: '#f87171', border: '1px solid #3f1212' }}>
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                  {cp.power.baseAbility && (
                    <p className="text-xs mb-1" style={{ color: '#8b5cf6' }}>
                      🎲 {cp.power.baseAbility}
                      {effective != null && (
                        <span className="ml-1 font-mono px-1 rounded" style={{ backgroundColor: '#1e1133', color: '#a78bfa' }}>{effective}%</span>
                      )}
                      {cp.modifier !== 0 && (
                        <span className="ml-1 font-mono" style={{ color: cp.modifier > 0 ? '#4ade80' : '#f87171' }}>
                          ({cp.modifier > 0 ? '+' : ''}{cp.modifier})
                        </span>
                      )}
                    </p>
                  )}
                  {cp.notes && <p className="text-xs italic" style={{ color: '#6b7280' }}>{cp.notes}</p>}

                  {/* Admin: edit assignment modifier */}
                  {isAdmin && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer" style={{ color: '#4b5563' }}>Edit modifier…</summary>
                      <form action={updateCharacterPower.bind(null, cp.id)} className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Modifier (%)</label>
                          <input name="modifier" type="number" defaultValue={cp.modifier} className="arcane-input" />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: '#6b7280' }}>Notes</label>
                          <input name="notes" type="text" defaultValue={cp.notes ?? ''} className="arcane-input" />
                        </div>
                        <div className="col-span-2">
                          <button type="submit" className="text-xs px-3 py-1 rounded hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>
                            Save
                          </button>
                        </div>
                      </form>
                    </details>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
