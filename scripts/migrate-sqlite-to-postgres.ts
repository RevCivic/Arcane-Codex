import 'dotenv/config'

import Database from 'better-sqlite3'
import path from 'path'
import { PrismaPg } from '@prisma/adapter-pg'

import { AccessRole, PrismaClient } from '../src/generated/prisma'

type TableRow = Record<string, unknown>
type CharacterEventLinkRow = { A: number; B: number }

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') return new Date(value)
  return new Date()
}

function resolveSqlitePath(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(`SQLITE_DATABASE_URL must start with file:, got: ${databaseUrl}`)
  }

  const rawPath = databaseUrl.slice('file:'.length)
  if (!rawPath) throw new Error('SQLITE_DATABASE_URL is missing file path')

  if (rawPath.startsWith('/')) return rawPath
  return path.resolve(process.cwd(), rawPath)
}

function tableExists(sqlite: Database.Database, tableName: string): boolean {
  const row = sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`)
    .get(tableName)
  return !!row
}

async function ensureTargetEmpty(prisma: PrismaClient) {
  const [users, allowedEmails, characters, places, items, events, powers] = await prisma.$transaction([
    prisma.user.count(),
    prisma.allowedEmail.count(),
    prisma.character.count(),
    prisma.place.count(),
    prisma.inventoryItem.count(),
    prisma.event.count(),
    prisma.power.count(),
  ])

  const total = users + allowedEmails + characters + places + items + events + powers
  if (total > 0) {
    throw new Error('Target PostgreSQL database is not empty. Use a fresh database before running conversion.')
  }
}

async function resetSequence(prisma: PrismaClient, table: string) {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${table}"', 'id'),
      COALESCE((SELECT MAX("id") FROM "${table}"), 1),
      (SELECT COUNT(*) > 0 FROM "${table}")
    );
  `)
}

async function main() {
  const sqliteUrl = process.env.SQLITE_DATABASE_URL ?? 'file:./prisma/dev.db'
  const sqlitePath = resolveSqlitePath(sqliteUrl)

  const postgresUrl =
    process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/arcane_codex?schema=public'
  if (!postgresUrl.startsWith('postgresql://')) {
    throw new Error('Set DATABASE_URL to a PostgreSQL connection string before running this migration.')
  }

  const sqlite = new Database(sqlitePath, { readonly: true })
  const postgresAdapter = new PrismaPg({ connectionString: postgresUrl })
  const prisma = new PrismaClient({ adapter: postgresAdapter })

  try {
    console.log(`Reading from SQLite: ${sqlitePath}`)
    await ensureTargetEmpty(prisma)

    const users = tableExists(sqlite, 'User') ? (sqlite.prepare('SELECT * FROM "User"').all() as TableRow[]) : []
    const accounts = tableExists(sqlite, 'Account')
      ? (sqlite.prepare('SELECT * FROM "Account"').all() as TableRow[])
      : []
    const sessions = tableExists(sqlite, 'Session')
      ? (sqlite.prepare('SELECT * FROM "Session"').all() as TableRow[])
      : []
    const verificationTokens = tableExists(sqlite, 'VerificationToken')
      ? (sqlite.prepare('SELECT * FROM "VerificationToken"').all() as TableRow[])
      : []
    const allowedEmails = tableExists(sqlite, 'AllowedEmail')
      ? (sqlite.prepare('SELECT * FROM "AllowedEmail"').all() as TableRow[])
      : []
    const characters = tableExists(sqlite, 'Character')
      ? (sqlite.prepare('SELECT * FROM "Character"').all() as TableRow[])
      : []
    const places = tableExists(sqlite, 'Place') ? (sqlite.prepare('SELECT * FROM "Place"').all() as TableRow[]) : []
    const inventoryItems = tableExists(sqlite, 'InventoryItem')
      ? (sqlite.prepare('SELECT * FROM "InventoryItem"').all() as TableRow[])
      : []
    const events = tableExists(sqlite, 'Event') ? (sqlite.prepare('SELECT * FROM "Event"').all() as TableRow[]) : []
    const powers = tableExists(sqlite, 'Power') ? (sqlite.prepare('SELECT * FROM "Power"').all() as TableRow[]) : []
    const characterEvents = tableExists(sqlite, '_CharacterToEvent')
      ? (sqlite.prepare('SELECT * FROM "_CharacterToEvent"').all() as CharacterEventLinkRow[])
      : []
    const eventPersonLinks: CharacterEventLinkRow[] = events
      .filter((event) => event.personId != null)
      .map((event) => ({ A: Number(event.personId), B: Number(event.id) }))
    // Prisma's implicit many-to-many join table uses "A" => Character.id and "B" => Event.id.
    const allCharacterEventLinks = [...characterEvents, ...eventPersonLinks]

    await prisma.$transaction(async (tx) => {
      if (users.length > 0) {
        await tx.user.createMany({
          data: users.map((row) => ({
            id: String(row.id),
            name: row.name == null ? null : String(row.name),
            email: String(row.email),
            emailVerified: row.emailVerified == null ? null : toDate(row.emailVerified),
            image: row.image == null ? null : String(row.image),
          })),
          skipDuplicates: true,
        })
      }

      if (accounts.length > 0) {
        await tx.account.createMany({
          data: accounts.map((row) => ({
            userId: String(row.userId),
            type: String(row.type),
            provider: String(row.provider),
            providerAccountId: String(row.providerAccountId),
            refresh_token: row.refresh_token == null ? null : String(row.refresh_token),
            access_token: row.access_token == null ? null : String(row.access_token),
            expires_at: row.expires_at == null ? null : Number(row.expires_at),
            token_type: row.token_type == null ? null : String(row.token_type),
            scope: row.scope == null ? null : String(row.scope),
            id_token: row.id_token == null ? null : String(row.id_token),
            session_state: row.session_state == null ? null : String(row.session_state),
          })),
          skipDuplicates: true,
        })
      }

      if (sessions.length > 0) {
        await tx.session.createMany({
          data: sessions.map((row) => ({
            sessionToken: String(row.sessionToken),
            userId: String(row.userId),
            expires: toDate(row.expires),
          })),
          skipDuplicates: true,
        })
      }

      if (verificationTokens.length > 0) {
        await tx.verificationToken.createMany({
          data: verificationTokens.map((row) => ({
            identifier: String(row.identifier),
            token: String(row.token),
            expires: toDate(row.expires),
          })),
          skipDuplicates: true,
        })
      }

      if (allowedEmails.length > 0) {
        await tx.allowedEmail.createMany({
          data: allowedEmails.map((row) => ({
            id: Number(row.id),
            email: String(row.email),
            role: row.role === 'ADMIN' ? AccessRole.ADMIN : AccessRole.USER,
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          })),
          skipDuplicates: true,
        })
      }

      if (characters.length > 0) {
        await tx.character.createMany({
          data: characters.map((row) => ({
            id: Number(row.id),
            name: String(row.name),
            firstName: row.firstName == null ? null : String(row.firstName),
            lastName: row.lastName == null ? null : String(row.lastName),
            race: row.race == null ? null : String(row.race),
            gender: row.gender == null ? null : String(row.gender),
            age: row.age == null ? null : Number(row.age),
            role: row.role == null ? null : String(row.role),
            description: row.description == null ? null : String(row.description),
            stats: row.stats == null ? null : String(row.stats),
            affiliation: row.affiliation == null ? null : String(row.affiliation),
            currentCase: row.currentCase == null ? null : String(row.currentCase),
            currentLocation: row.currentLocation == null ? null : String(row.currentLocation),
            homeOrigin: row.homeOrigin == null ? null : String(row.homeOrigin),
            status: row.status == null ? null : String(row.status),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          })),
          skipDuplicates: true,
        })
      }

      if (places.length > 0) {
        await tx.place.createMany({
          data: places.map((row) => ({
            id: Number(row.id),
            name: String(row.name),
            type: row.type == null ? null : String(row.type),
            description: row.description == null ? null : String(row.description),
            region: row.region == null ? null : String(row.region),
            notes: row.notes == null ? null : String(row.notes),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          })),
          skipDuplicates: true,
        })
      }

      if (events.length > 0) {
        await tx.event.createMany({
          data: events.map((row) => ({
            id: Number(row.id),
            name: String(row.name),
            description: row.description == null ? null : String(row.description),
            date: row.date == null ? null : String(row.date),
            significance: row.significance == null ? null : String(row.significance),
            outcome: row.outcome == null ? null : String(row.outcome),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          })),
          skipDuplicates: true,
        })
      }

      if (inventoryItems.length > 0) {
        await tx.inventoryItem.createMany({
          data: inventoryItems.map((row) => ({
            id: Number(row.id),
            name: String(row.name),
            description: row.description == null ? null : String(row.description),
            effect: row.effect == null ? null : String(row.effect),
            location: row.location == null ? null : String(row.location),
            category: row.category == null ? null : String(row.category),
            carrierId: row.carrierId == null ? null : Number(row.carrierId),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          })),
          skipDuplicates: true,
        })
      }

      if (powers.length > 0) {
        await tx.power.createMany({
          data: powers.map((row) => ({
            id: Number(row.id),
            name: String(row.name),
            description: row.description == null ? null : String(row.description),
            effect: row.effect == null ? null : String(row.effect),
            personId: Number(row.personId),
            createdAt: toDate(row.createdAt),
            updatedAt: toDate(row.updatedAt),
          })),
          skipDuplicates: true,
        })
      }

      for (const row of allCharacterEventLinks) {
        await tx.$executeRaw`
          INSERT INTO "_CharacterToEvent" ("A", "B")
          VALUES (${Number(row.A)}, ${Number(row.B)})
          ON CONFLICT DO NOTHING
        `
      }
    })

    await resetSequence(prisma, 'AllowedEmail')
    await resetSequence(prisma, 'Character')
    await resetSequence(prisma, 'Place')
    await resetSequence(prisma, 'InventoryItem')
    await resetSequence(prisma, 'Event')
    await resetSequence(prisma, 'Power')

    console.log('SQLite to PostgreSQL migration completed successfully.')
  } finally {
    sqlite.close()
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('SQLite to PostgreSQL migration failed:')
  console.error(error)
  process.exit(1)
})
