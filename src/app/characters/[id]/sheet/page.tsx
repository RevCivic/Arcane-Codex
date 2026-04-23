export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { importFoundryCharacterSheet, updateCharacterSheet } from '@/app/actions'
import { DiceConsole } from '@/components/DiceConsole'
import type { StatEntry, SkillEntry } from '@/components/DiceConsole'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatBox({ label, name, value }: { label: string; name: string; value: number | null | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wider text-center" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
        {label}
      </label>
      <input
        name={name}
        type="number"
        defaultValue={value ?? ''}
        min={0}
        max={999}
        className="arcane-input text-center text-lg font-bold"
        style={{ color: '#a78bfa' }}
      />
    </div>
  )
}

function DerivedBox({
  label, currentName, maxName,
  current, max,
  accent,
}: {
  label: string
  currentName: string
  maxName: string
  current: number | null | undefined
  max: number | null | undefined
  accent: string
}) {
  return (
    <div className="rounded-lg p-3" style={{ backgroundColor: '#0d0d15', border: `1px solid ${accent}33` }}>
      <div className="text-xs uppercase tracking-wider mb-2 text-center" style={{ color: accent, fontFamily: 'Georgia, serif' }}>
        {label}
      </div>
      <div className="flex items-center gap-2 justify-center">
        <input
          name={currentName}
          type="number"
          defaultValue={current ?? ''}
          min={0}
          max={999}
          className="arcane-input text-center w-16 text-base font-bold"
          style={{ color: '#e2e8f0' }}
          placeholder="—"
        />
        <span style={{ color: '#6b7280' }}>/</span>
        <input
          name={maxName}
          type="number"
          defaultValue={max ?? ''}
          min={0}
          max={999}
          className="arcane-input text-center w-16 text-base font-bold"
          style={{ color: '#6b7280' }}
          placeholder="—"
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}>current</span>
        <span className="text-xs" style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}>max</span>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const characterId = parseInt(id)

  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const [character, allowed, allSkills, rollHistory] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      include: {
        sheet: { include: { skillValues: { include: { skill: true } } } },
        powers: true,
        inventoryItems: true,
      },
    }),
    prisma.allowedEmail.findUnique({ where: { email } }),
    prisma.skill.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.rollHistory.findMany({
      where: { characterId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  if (!character) notFound()
  if (!allowed) redirect('/login')

  const isAdmin = allowed.role === AccessRole.ADMIN
  const isOwner = character.claimedByEmail === email

  if (!isAdmin && !isOwner) redirect(`/characters/${characterId}`)

  const sheet = character.sheet
  const action = updateCharacterSheet.bind(null, characterId)
  const importAction = importFoundryCharacterSheet.bind(null, characterId)

  // Build a fast lookup: skillId → character's custom value
  const skillValueMap = new Map<number, number>(
    sheet?.skillValues.map((sv) => [sv.skillId, sv.value]) ?? []
  )

  // Group skills by category, preserving sortOrder within each group
  const skillsByCategory = new Map<string, typeof allSkills>()
  for (const skill of allSkills) {
    const cat = skill.category ?? 'Other'
    if (!skillsByCategory.has(cat)) skillsByCategory.set(cat, [])
    skillsByCategory.get(cat)!.push(skill)
  }

  // ── Dice Console data ────────────────────────────────────────────────────────

  const consoleStats: StatEntry[] = [
    { key: 'str',          label: 'STR', value: sheet?.str          ?? null },
    { key: 'con',          label: 'CON', value: sheet?.con          ?? null },
    { key: 'siz',          label: 'SIZ', value: sheet?.siz          ?? null },
    { key: 'dex',          label: 'DEX', value: sheet?.dex          ?? null },
    { key: 'intelligence', label: 'INT', value: sheet?.intelligence ?? null },
    { key: 'pow',          label: 'POW', value: sheet?.pow          ?? null },
    { key: 'cha',          label: 'CHA', value: sheet?.cha          ?? null },
    { key: 'app',          label: 'APP', value: sheet?.app          ?? null },
    { key: 'edu',          label: 'EDU', value: sheet?.edu          ?? null },
  ]

  const consoleSkills: SkillEntry[] = allSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    effectiveValue: skillValueMap.get(skill.id) ?? skill.baseValue,
  }))

  // Serialise DB roll history for client component (Date → ISO string).
  // This mapping must stay in sync with the HistoryEntry interface in DiceConsole.tsx.
  const initialHistory = rollHistory.map((r) => ({
    id:         r.id,
    rollType:   r.rollType,
    label:      r.label,
    roll:       r.roll,
    target:     r.target,
    difficulty: r.difficulty,
    resultType: r.resultType,
    dice:       r.dice,
    modifier:   r.modifier,
    luckSpent:  r.luckSpent,
    createdAt:  r.createdAt.toISOString(),
  }))

  const labelStyle: React.CSSProperties = { color: '#d97706', fontFamily: 'Georgia, serif' }
  const sectionHead: React.CSSProperties = { color: '#d97706', fontFamily: 'Georgia, serif', letterSpacing: '0.1em' }

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ fontFamily: 'Georgia, serif' }}>
        <Link href="/characters" className="transition-colors hover:text-purple-300" style={{ color: '#6b7280' }}>
          Characters
        </Link>
        <span style={{ color: '#374151' }}>›</span>
        <Link href={`/characters/${characterId}`} className="transition-colors hover:text-purple-300" style={{ color: '#6b7280' }}>
          {character.name}
        </Link>
        <span style={{ color: '#374151' }}>›</span>
        <span style={{ color: '#a78bfa' }}>Character Sheet</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
            {character.name}
          </h1>
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
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#0c1a2e', color: '#60a5fa' }}>
              📋 Character Sheet
            </span>
          </div>
        </div>
      </div>

      <section className="card-arcane rounded-lg p-6 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
        <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={sectionHead}>
          ✦ Import FoundryVTT JSON
        </h2>
        <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
          Paste a FoundryVTT actor export JSON to import stats and skills. Missing skills are created automatically.
        </p>
        <form action={importAction} className="space-y-3">
          <textarea
            name="foundryJson"
            rows={7}
            required
            className="arcane-input"
            placeholder="Paste your FoundryVTT actor export JSON here"
          />
          <button
            type="submit"
            className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}
          >
            ⬇ Import JSON
          </button>
        </form>
      </section>

      <form action={action} className="space-y-8">

        {/* ── BRP Primary Characteristics ─────────────────────────────────── */}
        <section className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-5" style={sectionHead}>
            ✦ Primary Characteristics
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            <StatBox label="STR" name="str"          value={sheet?.str} />
            <StatBox label="CON" name="con"          value={sheet?.con} />
            <StatBox label="SIZ" name="siz"          value={sheet?.siz} />
            <StatBox label="DEX" name="dex"          value={sheet?.dex} />
            <StatBox label="INT" name="intelligence" value={sheet?.intelligence} />
            <StatBox label="POW" name="pow"          value={sheet?.pow} />
            <StatBox label="CHA" name="cha"          value={sheet?.cha} />
            <StatBox label="APP" name="app"          value={sheet?.app} />
            <StatBox label="EDU" name="edu"          value={sheet?.edu} />
          </div>
        </section>

        {/* ── Derived / Current Values ─────────────────────────────────────── */}
        <section className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-5" style={sectionHead}>
            ✦ Derived Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <DerivedBox label="Hit Points" currentName="currentHp" maxName="maxHp"
              current={sheet?.currentHp} max={sheet?.maxHp} accent="#4ade80" />
            <DerivedBox label="Sanity"     currentName="currentSanity" maxName="maxSanity"
              current={sheet?.currentSanity} max={sheet?.maxSanity} accent="#a78bfa" />
            <DerivedBox label="Magic Pts"  currentName="currentMp" maxName="maxMp"
              current={sheet?.currentMp} max={sheet?.maxMp} accent="#60a5fa" />
            <div className="rounded-lg p-3" style={{ backgroundColor: '#0d0d15', border: '1px solid #92400e33' }}>
              <div className="text-xs uppercase tracking-wider mb-2 text-center" style={{ color: '#f59e0b', fontFamily: 'Georgia, serif' }}>Luck</div>
              <input name="luck" type="number" defaultValue={sheet?.luck ?? ''} min={0} max={99}
                className="arcane-input text-center w-full text-base font-bold" style={{ color: '#e2e8f0' }} placeholder="—" />
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: '#0d0d15', border: '1px solid #374151' }}>
              <div className="text-xs uppercase tracking-wider mb-2 text-center" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>Build</div>
              <input name="build" type="number" defaultValue={sheet?.build ?? ''} min={-2} max={4}
                className="arcane-input text-center w-full text-base font-bold" style={{ color: '#e2e8f0' }} placeholder="—" />
            </div>
          </div>
        </section>

        {/* ── Skills ───────────────────────────────────────────────────────── */}
        {allSkills.length > 0 && (
          <section className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-5" style={sectionHead}>
              ✦ Skills
            </h2>
            <p className="text-xs mb-5" style={{ color: '#6b7280' }}>
              Leave blank to use the skill&apos;s default base value. Enter a value to override.
            </p>
            <div className="space-y-6">
              {Array.from(skillsByCategory.entries()).map(([category, skills]) => (
                <div key={category}>
                  <h3 className="text-xs uppercase tracking-widest mb-3 pb-1" style={{ color: '#6b7280', borderBottom: '1px solid #1f2937' }}>
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {skills.map((skill) => {
                      const customValue = skillValueMap.get(skill.id)
                      return (
                        <div key={skill.id} className="flex items-center gap-2 rounded px-3 py-2" style={{ backgroundColor: '#0d0d15', border: '1px solid #1f2937' }}>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate" style={{ color: '#e2e8f0' }} title={skill.name}>
                              {skill.name}
                            </div>
                            <div className="text-xs" style={{ color: '#4b5563' }}>base {skill.baseValue}%</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              name={`skill_${skill.id}`}
                              type="number"
                              defaultValue={customValue ?? ''}
                              min={0}
                              max={100}
                              placeholder={String(skill.baseValue)}
                              className="arcane-input text-center font-bold"
                              style={{ width: '60px', color: customValue !== undefined ? '#a78bfa' : '#6b7280' }}
                            />
                            <span className="text-xs" style={{ color: '#4b5563' }}>%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Wounds & Notes ────────────────────────────────────────────────── */}
        <section className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-5" style={sectionHead}>
            ✦ Wounds & Notes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Wounds / Injuries</label>
              <textarea name="wounds" rows={3} defaultValue={sheet?.wounds ?? ''} className="arcane-input"
                placeholder="Describe current injuries or conditions..." />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-1.5" style={labelStyle}>Session Notes</label>
              <textarea name="notes" rows={3} defaultValue={sheet?.notes ?? ''} className="arcane-input"
                placeholder="Clues, reminders, or session notes..." />
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="px-8 py-2 rounded text-sm font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff', fontFamily: 'Georgia, serif' }}
          >
            💾 Save Sheet
          </button>
          <Link
            href={`/characters/${characterId}`}
            className="px-6 py-2 rounded text-sm font-semibold uppercase tracking-wider"
            style={{ border: '1px solid #374151', color: '#9ca3af', fontFamily: 'Georgia, serif' }}
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* ── Dice Console ─────────────────────────────────────────────────── */}
      <div className="mt-10">
        <DiceConsole
          characterId={characterId}
          stats={consoleStats}
          skills={consoleSkills}
          initialLuck={sheet?.luck ?? null}
          initialHistory={initialHistory}
        />
      </div>

      {/* ── Read-only: Inventory ──────────────────────────────────────────── */}
      {character.inventoryItems.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-widest mb-4" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            🎒 Carried Items
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {character.inventoryItems.map((item) => (
              <div key={item.id} className="card-arcane rounded-lg p-4" style={{ fontFamily: 'Georgia, serif' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm" style={{ color: '#e2e8f0' }}>{item.name}</span>
                  {item.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1c1407', color: '#f59e0b' }}>{item.category}</span>
                  )}
                </div>
                {item.description && <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>{item.description}</p>}
                {item.effect && <p className="text-xs italic" style={{ color: '#a78bfa' }}>⚡ {item.effect}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Read-only: Powers ─────────────────────────────────────────────── */}
      {character.powers.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold uppercase tracking-widest mb-4" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            ⚡ Powers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {character.powers.map((power) => (
              <div key={power.id} className="card-arcane rounded-lg p-4" style={{ fontFamily: 'Georgia, serif' }}>
                <h3 className="font-semibold text-sm mb-1" style={{ color: '#e2e8f0' }}>{power.name}</h3>
                {power.description && <p className="text-xs mb-1" style={{ color: '#9ca3af' }}>{power.description}</p>}
                {power.effect && <p className="text-xs italic" style={{ color: '#a78bfa' }}>⚡ {power.effect}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
