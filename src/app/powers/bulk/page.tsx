export const dynamic = 'force-dynamic'

import { createPowersBulk } from '@/app/actions'
import { BulkEntryTable } from '@/components/BulkEntryTable'
import { prisma } from '@/lib/prisma'

export default async function BulkPowersPage() {
  const characters = await prisma.character.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="max-w-6xl">
      <BulkEntryTable
        title="+ Bulk Power Entry"
        description="Batch-enter powers in a table and add rows as needed."
        backHref="/powers"
        backLabel="Powers"
        submitLabel="Create Powers"
        action={createPowersBulk}
        columns={[
          { name: 'name', label: 'Name', required: true, placeholder: 'Arcane Sight' },
          {
            name: 'personId',
            label: 'Character',
            required: true,
            type: 'select',
            options: characters.map((character) => ({ value: String(character.id), label: character.name })),
          },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'How the power manifests...' },
          { name: 'effect', label: 'Effect', placeholder: 'See hidden energy traces' },
          { name: 'ability', label: 'Ability', placeholder: 'e.g. Telepathy' },
          { name: 'skillPercentage', label: 'Skill %', placeholder: '0–100 or blank' },
        ]}
      />
    </div>
  )
}
