import { PrismaClient } from '../src/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/arcane_codex?schema=public'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🔮 Seeding Arcane Codex database...')

  await prisma.allowedEmail.upsert({
    where: { email: 'mjshank225@gmail.com' },
    update: { role: 'ADMIN' },
    create: { email: 'mjshank225@gmail.com', role: 'ADMIN' },
  })
  await prisma.allowedEmail.upsert({
    where: { email: 'peightonashlee@gmail.com' },
    update: { role: 'USER' },
    create: { email: 'peightonashlee@gmail.com', role: 'USER' },
  })

  // Clean up existing data
  await prisma.power.deleteMany()
  await prisma.character.deleteMany()
  await prisma.place.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.event.deleteMany()

  // ─── Characters ───────────────────────────────────────────────────────────────
  const sarah = await prisma.character.create({
    data: {
      name: 'Special Agent Sarah Chen',
      role: 'Lead Investigator',
      description:
        'A seasoned field operative with an uncanny ability to sense supernatural disturbances. Chen has led the Bureau\'s most classified investigations for over a decade, surviving encounters that would shatter a lesser mind.',
      stats:
        'STR 12, CON 13, SIZ 10, DEX 15, INT 17, POW 16, CHA 14 | HP: 12 | Sanity: 78 | Skills: Spot Hidden 85%, Occult 60%, Firearms 75%, Persuade 70%',
      affiliation: 'Bureau of Supernatural Investigation — Field Division',
      status: 'Active',
    },
  })

  const marcus = await prisma.character.create({
    data: {
      name: 'Dr. Marcus Webb',
      role: 'Bureau Occultist',
      description:
        'A former professor of comparative mythology turned Bureau consultant. Webb\'s encyclopedic knowledge of arcane traditions has saved countless lives, though his own sanity bears the cost of too many dark revelations.',
      stats:
        'STR 9, CON 10, SIZ 11, DEX 10, INT 18, POW 17, CHA 12 | HP: 11 | Sanity: 62 | Skills: Occult 95%, Library Use 90%, Cthulhu Mythos 25%, Latin 80%',
      affiliation: 'Bureau of Supernatural Investigation — Research Division',
      status: 'Active',
    },
  })

  await prisma.character.create({
    data: {
      name: 'Detective James Holt',
      role: 'Police Liaison',
      description:
        'A grizzled homicide detective who stumbled onto a Bureau investigation five years ago and never quite made it back to regular police work. Holt serves as the Bureau\'s bridge to mundane law enforcement.',
      stats:
        'STR 14, CON 13, SIZ 13, DEX 13, INT 14, POW 12, CHA 11 | HP: 13 | Sanity: 70 | Skills: Law 70%, Firearms 80%, Intimidate 65%, Track 55%',
      affiliation: 'Metropolitan Police Department (seconded to BSI)',
      status: 'Active',
    },
  })

  const archivist = await prisma.character.create({
    data: {
      name: 'The Archivist',
      role: 'Mysterious Informant',
      description:
        'Known only as The Archivist, this enigmatic figure contacts Bureau agents with information that should be impossible to obtain. Their true identity and motives remain classified even from Bureau leadership.',
      stats:
        'STR ?, CON ?, SIZ ?, DEX ?, INT 20+, POW 18, CHA 16 | HP: Unknown | Sanity: Possibly N/A | Skills: Unknown',
      affiliation: 'Unknown',
      status: 'Unknown',
    },
  })

  const victor = await prisma.character.create({
    data: {
      name: 'Victor Saros',
      role: 'Cult Leader',
      description:
        'Founder and high priest of the Saros Covenant, a secretive cult seeking to tear open the veil between worlds. Saros is highly intelligent, magnetically charismatic, and utterly ruthless in pursuit of his apocalyptic agenda.',
      stats:
        'STR 11, CON 14, SIZ 12, DEX 13, INT 16, POW 19, CHA 18 | HP: 13 | Sanity: 12 | Skills: Occult 90%, Persuade 85%, Cthulhu Mythos 40%, Dodge 70%',
      affiliation: 'The Saros Covenant',
      status: 'Active',
    },
  })

  console.log('✅ Characters created')

  // ─── Places ───────────────────────────────────────────────────────────────────
  await prisma.place.createMany({
    data: [
      {
        name: 'Bureau Headquarters',
        type: 'Government Facility',
        description:
          'A nondescript federal building in downtown Washington D.C. that officially houses a minor regulatory agency. The Bureau\'s true operations occupy three basement levels of restricted access, cataloguing the strange and dangerous.',
        region: 'Washington D.C.',
        notes: 'Security Level: ULTRA. Biometric access required below Sub-Level 1.',
      },
      {
        name: 'The Restricted Archives',
        type: 'Secure Vault',
        description:
          'Deep in Bureau HQ, the Restricted Archives hold documentation of every supernatural incident in Bureau history. Certain sections — Vault 7 through Vault 12 — are accessible only to agents with Clearance OBSIDIAN.',
        region: 'Washington D.C.',
        notes: 'Vault 7 contains artifacts of particular danger. Do not handle without containment protocols.',
      },
      {
        name: 'Saros Manor',
        type: 'Cult Stronghold',
        description:
          'A sprawling Victorian estate in rural Connecticut, inherited by Victor Saros and converted into the ceremonial heart of his Covenant. The basement contains ritual chambers of considerable supernatural charge.',
        region: 'Connecticut',
        notes: 'Multiple wards and protective sigils detected. Approach requires counter-ritual preparation.',
      },
      {
        name: 'The Nexus Point',
        type: 'Supernatural Hotspot',
        description:
          'A convergence of ley lines in an abandoned industrial district, where the barrier between this world and whatever lies beyond grows dangerously thin. Manifestations occur without warning, and electronics frequently malfunction.',
        region: 'Industrial District, Ohio',
        notes: 'EMF readings off the charts. Sanity checks required for extended exposure. Evacuation radius: 200 meters.',
      },
      {
        name: 'Blackwood Cemetery',
        type: 'Investigation Site',
        description:
          'An old cemetery on the outskirts of Millbrook where the Bureau\'s first major contact with the Saros Covenant occurred. Several graves show signs of ritual disturbance, and witnesses report seeing figures among the headstones at night.',
        region: 'Millbrook, Vermont',
        notes: 'Night surveillance active. Do not enter alone.',
      },
    ],
  })

  console.log('✅ Places created')

  // ─── Inventory Items ──────────────────────────────────────────────────────────
  await prisma.inventoryItem.createMany({
    data: [
      {
        name: 'Bureau Badge',
        description: 'Official Bureau of Supernatural Investigation credentials. Laminated ID with holographic seal.',
        effect: 'Grants access to restricted federal areas. Provides legal authority to commandeer resources in field operations.',
        location: "Sarah Chen's wallet",
        category: 'Equipment',
      },
      {
        name: 'Occult Grimoire',
        description: 'An ancient leather-bound tome filled with hand-written rituals, sigils, and observations spanning four centuries. The authorship is unknown.',
        effect: 'Reference for identifying supernatural phenomena. Contains descriptions of 47 known supernatural entities. +20% to Occult rolls when consulted.',
        location: 'The Restricted Archives',
        category: 'Tome',
      },
      {
        name: 'EMF Detector (Modified)',
        description: 'A standard electromagnetic field detector modified by Bureau technicians to detect supernatural energy signatures, not just standard EM fields.',
        effect: 'Detects supernatural energy signatures up to 50 meters. Distinguishes between mundane EM sources and paranormal phenomena with 80% reliability.',
        location: 'Field Kit',
        category: 'Equipment',
      },
      {
        name: 'Silver Rounds',
        description: '9mm ammunition with silver-tipped hollow point bullets. Manufactured in-house by Bureau armory staff.',
        effect: '+3 damage to supernatural entities vulnerable to silver. Standard damage against mundane targets.',
        location: 'Bureau Armory',
        category: 'Weapon',
      },
      {
        name: 'Amulet of Warding',
        description: 'A tarnished silver medallion engraved with protective sigils in an unknown script. Pre-dates recorded history according to Bureau analysts.',
        effect: 'Provides resistance to psychic attacks. -30% to incoming POW attacks. Wearer is aware of hostile supernatural observation.',
        location: 'Dr. Marcus Webb (worn)',
        category: 'Artifact',
      },
      {
        name: 'The Codex Arcanum',
        description: 'A fragment — roughly 40 pages — of what appears to be a much larger magical codex. The pages are written in a cipher that Bureau cryptographers have only partially decoded.',
        effect: 'Contains knowledge of binding rituals capable of containing entities of significant power. Deciphering requires INT roll at -20%. Reading it in full costs 1d6 Sanity.',
        location: 'Restricted Archives — Vault 7',
        category: 'Tome',
      },
    ],
  })

  console.log('✅ Inventory items created')

  // ─── Events ───────────────────────────────────────────────────────────────────
  await prisma.event.createMany({
    data: [
      {
        name: 'The Millbrook Incident',
        date: 'March 3',
        description:
          'A series of unexplained disappearances and livestock deaths in the small town of Millbrook, Vermont. Bureau field agents discovered evidence of ritual activity at Blackwood Cemetery, establishing the first confirmed contact with the Saros Covenant.',
        significance: 'First contact with the Saros Covenant. Established the cult as a credible threat requiring full Bureau resources.',
        outcome: 'Two civilians recovered. Three cult members detained. Victor Saros escaped. Investigation ongoing.',
      },
      {
        name: 'Archive Break-In',
        date: 'April 17',
        description:
          'An unknown entity bypassed all Bureau security protocols and accessed restricted records in The Archives. The entity left no physical trace, but surveillance footage shows a shadow moving against the light sources — independent of any physical form.',
        significance: 'Suggests the Saros Covenant — or another party — has intelligence on Bureau operations. Security protocols upgraded.',
        outcome: 'Records accessed: Project WHISPER files (classified), Entity Catalogue Vol. 9, and the Codex Arcanum index. Investigation ongoing.',
      },
      {
        name: 'Awakening at the Nexus Point',
        date: 'May 8',
        description:
          'A massive surge of supernatural energy erupted from the Nexus Point in Ohio, detectable by Bureau instruments across three states. The surge lasted 47 seconds and left a crystalline residue that defies chemical analysis.',
        significance: 'Suggests a deliberate activation of the Nexus Point, not a natural fluctuation. The energy signature matches patterns in the Codex Arcanum fragment.',
        outcome: 'Area quarantined. Dr. Webb dispatched for analysis. Twelve civilians experienced shared hallucinations and required memory suppression.',
      },
      {
        name: "Dr. Webb's Revelation",
        date: 'June 2',
        description:
          'After weeks of research, Dr. Webb revealed the Saros Covenant\'s true objective: they intend to use the Nexus Point as a focal lens to permanently widen the dimensional rift, allowing entities of vast power to enter our world.',
        significance: 'Reframes the entire investigation. All previous Covenant activity was preparation for this single catastrophic event. Threat level upgraded to OMEGA.',
        outcome: 'Emergency briefing with Bureau Director. Operation LAST WARD authorized. All agents recalled.',
      },
      {
        name: 'Saros Manor Raid',
        date: 'June 15',
        description:
          'Bureau agents led by Sarah Chen conducted a tactical assault on Saros Manor with police support from Detective Holt. The raid disrupted a major ritual but Victor Saros activated a prepared escape route through a shadow portal.',
        significance: 'Significant blow to Covenant operations. Ritual components confiscated. However, Saros remains at large and the Nexus Point activation window is still approaching.',
        outcome: 'Fourteen Covenant members apprehended. Ritual site destroyed. Victor Saros escaped via shadow manipulation. Two agents injured. Investigation continues.',
      },
    ],
  })

  console.log('✅ Events created')

  // ─── Powers ───────────────────────────────────────────────────────────────────
  await prisma.power.createMany({
    data: [
      {
        name: 'Intuition Surge',
        description: 'Sarah\'s most reliable ability — a sudden overwhelming certainty about the supernatural nature of a person, object, or location. It manifests as a visceral gut feeling that has never been wrong.',
        effect: 'Once per session, may declare supernatural truth about a target without a roll. GM confirms if accurate. Also provides +20% to Spot Hidden when supernatural entities are nearby.',
        personId: sarah.id,
      },
      {
        name: 'Arcane Sight',
        description: 'Webb can perceive magical energies, auras, and the residue of past supernatural events as visible light in the ultraviolet spectrum. Extended use causes severe migraines.',
        effect: 'Can see magical auras, wards, and active rituals. Identifies supernatural entities by their energy signature. Costs 1 Magic Point per minute of sustained use.',
        personId: marcus.id,
      },
      {
        name: 'Binding Ritual',
        description: 'A complex ritual that Webb developed by combining elements from three different magical traditions. It creates a temporary containment field that suppresses a supernatural entity\'s ability to act.',
        effect: 'Temporarily neutralizes a supernatural entity for 1d6 hours. Requires 10 minutes of preparation and a POW vs POW roll. Costs 5 Magic Points and 1 Sanity.',
        personId: marcus.id,
      },
      {
        name: 'Temporal Memory',
        description: 'By touching a location or object, The Archivist can access the memories embedded in the physical world — witnessing events that occurred there as clearly as if present.',
        effect: 'May view any past event that occurred at a touched location. Limited to significant events. No time limit but costs 2 Magic Points per vision. Cannot interact with the past.',
        personId: archivist.id,
      },
      {
        name: 'Shadow Step',
        description: 'Victor Saros can dissolve his physical form into shadow and re-emerge from any other shadow within range. He uses this ability both for surveillance and escape.',
        effect: 'Teleport between shadows within 100 meters as a free action. May carry one willing or restrained person. Does not work in total darkness or total light.',
        personId: victor.id,
      },
      {
        name: 'Mind Fracture',
        description: 'A psychic assault that Saros delivers with surgical precision, targeting the rational mind\'s attempt to process supernatural truth. Victims experience temporary psychotic breaks.',
        effect: 'POW vs POW attack. On success: target loses 1d10 Sanity and is incapacitated for 1d4 rounds. On extreme success: target gains a permanent phobia related to their deepest fear.',
        personId: victor.id,
      },
    ],
  })

  console.log('✅ Powers created')
  console.log('🔮 Seed complete. The Arcane Codex is ready.')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
