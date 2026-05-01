export const dynamic = 'force-dynamic'

import { createPowersBulk } from '@/app/actions'
import { BulkEntryTable } from '@/components/BulkEntryTable'

export default async function BulkPowersPage() {
  return (
    <div className="max-w-6xl">
      <BulkEntryTable
        title="+ Bulk Power Entry"
        description="Batch-enter power definitions in a table and add rows as needed. Powers are global templates; assign them to characters from the character detail page."
        backHref="/powers"
        backLabel="Powers"
        submitLabel="Create Powers"
        action={createPowersBulk}
        columns={[
          { name: 'name', label: 'Name', required: true, placeholder: 'Arcane Sight' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'How the power manifests...' },
          { name: 'effect', label: 'Effect', placeholder: 'See hidden energy traces' },
          { name: 'baseAbility', label: 'Base Ability', placeholder: 'e.g. Telepathy' },
          { name: 'basePercentage', label: 'Base %', placeholder: '0–100 or blank' },
        ]}
      />
    </div>
  )
}
