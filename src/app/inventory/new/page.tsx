export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import NewInventoryPageClient from './client'

export default async function NewInventoryPage() {
  const characters = await prisma.character.findMany({ orderBy: { name: 'asc' } })

  return <NewInventoryPageClient characters={characters} />
}
