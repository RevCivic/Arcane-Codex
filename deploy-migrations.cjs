#!/usr/bin/env node

const { createHash, randomUUID } = require('node:crypto')
const { readdir, readFile } = require('node:fs/promises')
const path = require('node:path')
const { Client } = require('pg')

const MIGRATIONS_DIRECTORY = path.join(__dirname, 'prisma', 'migrations')
const PRISMA_ADVISORY_LOCK_ID = 72707369

async function loadMigrations() {
  const entries = await readdir(MIGRATIONS_DIRECTORY, { withFileTypes: true })
  const migrations = []

  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const sql = await readFile(path.join(MIGRATIONS_DIRECTORY, entry.name, 'migration.sql'), 'utf8')
    migrations.push({
      name: entry.name,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
    })
  }

  return migrations
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `)
}

async function deploy() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to run database migrations.')

  const migrations = await loadMigrations()
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  try {
    await client.query('SELECT pg_advisory_lock($1)', [PRISMA_ADVISORY_LOCK_ID])
    await ensureMigrationsTable(client)

    const { rows } = await client.query(`
      SELECT "migration_name", "finished_at", "rolled_back_at"
      FROM "_prisma_migrations"
      ORDER BY "started_at"
    `)
    const failed = rows.filter((row) => row.finished_at === null && row.rolled_back_at === null)
    if (failed.length > 0) {
      throw new Error(`Previously failed migration(s) must be resolved before deployment: ${failed.map((row) => row.migration_name).join(', ')}`)
    }

    const applied = new Set(rows.filter((row) => row.finished_at !== null && row.rolled_back_at === null).map((row) => row.migration_name))
    const pending = migrations.filter((migration) => !applied.has(migration.name))

    if (pending.length === 0) {
      console.log(`Database is up to date (${migrations.length} migrations).`)
      return
    }

    for (const migration of pending) {
      const id = randomUUID()
      console.log(`Applying migration ${migration.name}...`)
      await client.query(
        'INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name") VALUES ($1, $2, $3)',
        [id, migration.checksum, migration.name],
      )

      try {
        await client.query('BEGIN')
        await client.query(migration.sql)
        await client.query(
          'UPDATE "_prisma_migrations" SET "finished_at" = now(), "applied_steps_count" = 1 WHERE "id" = $1',
          [id],
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        const logs = error instanceof Error ? error.stack ?? error.message : String(error)
        await client.query('UPDATE "_prisma_migrations" SET "logs" = $2 WHERE "id" = $1', [id, logs])
        throw error
      }
    }

    console.log(`Applied ${pending.length} migration(s) successfully.`)
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [PRISMA_ADVISORY_LOCK_ID]).catch(() => {})
    await client.end()
  }
}

deploy().catch((error) => {
  console.error('Database migration failed:', error)
  process.exitCode = 1
})
