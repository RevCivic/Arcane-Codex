export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { updatePowersBulk } from '@/app/actions'
import { BulkEditTable } from '@/components/BulkEditTable'

export default async function BulkEditPowersPage() {
  const [powers, skills] = await Promise.all([
    prisma.power.findMany({
      orderBy: [{ name: 'asc' }],
    }),
    prisma.skill.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { name: true, category: true },
    }),
  ])

  return (
    <div className="max-w-6xl">
      <BulkEditTable
        title="⚡ Bulk Edit Powers"
        description="Edit multiple powers at once. Click Save to update all changes."
        backHref="/powers"
        backLabel="Powers"
        submitLabel="Save Changes"
        action={updatePowersBulk}
        powers={powers}
        skills={skills}
      />
    </div>
  )
}
