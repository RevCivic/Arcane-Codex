export const dynamic = 'force-dynamic'

import { createInventoryItemsBulk } from '@/app/actions'
import { BulkEntryTable } from '@/components/BulkEntryTable'
import { prisma } from '@/lib/prisma'

export default async function BulkInventoryPage() {
  const characters = await prisma.character.findMany({ orderBy: { name: 'asc' } })

  return (
    <div className="max-w-6xl">
      <BulkEntryTable
        title="+ Bulk Inventory Entry"
        description="Use table rows to add several inventory items at once."
        backHref="/inventory"
        backLabel="Inventory"
        submitLabel="Create Items"
        action={createInventoryItemsBulk}
        columns={[
          { name: 'name', label: 'Name', required: true, placeholder: 'Occult Grimoire' },
          { name: 'category', label: 'Category', placeholder: 'Artifact' },
          { name: 'location', label: 'Location', placeholder: 'Bureau Vault' },
          { name: 'effect', label: 'Effect', placeholder: 'Reads hidden sigils' },
          {
            name: 'carrierId',
            label: 'Carrier',
            type: 'select',
            options: characters.map((character) => ({ value: String(character.id), label: character.name })),
          },
        ]}
      />
    </div>
  )
}
