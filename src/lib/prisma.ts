import { PrismaClient } from '@/generated/prisma'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

// In Docker the DATABASE_URL env var points to the volume-mounted database.
// Locally it falls back to the prisma/dev.db used during development.
const localDbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const dbUrl = process.env.DATABASE_URL ?? `file:${localDbPath}`

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({ url: dbUrl })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
