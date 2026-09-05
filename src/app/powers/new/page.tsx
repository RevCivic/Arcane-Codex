export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import NewPowerPageClient from './client'

export default async function NewPowerPage() {
  const skills = await prisma.skill.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { name: true, category: true },
  })

  return <NewPowerPageClient skills={skills} />
}
