export const dynamic = 'force-dynamic'

import { createCharactersBulk } from '@/app/actions'
import { BulkEntryTable } from '@/components/BulkEntryTable'

export default function BulkCharactersPage() {
  return (
    <div className="max-w-6xl">
      <BulkEntryTable
        title="+ Bulk Character Entry"
        description="Enter multiple characters in a table-style batch and submit them together."
        backHref="/characters"
        backLabel="Characters"
        submitLabel="Create Characters"
        action={createCharactersBulk}
        columns={[
          { name: 'name', label: 'Full Name', required: true, placeholder: 'Vanessa Miller' },
          { name: 'firstName', label: 'First Name', placeholder: 'Vanessa' },
          { name: 'lastName', label: 'Last Name', placeholder: 'Miller' },
          { name: 'role', label: 'Role', placeholder: 'Lead Investigator' },
          { name: 'status', label: 'Status', placeholder: 'Active' },
        ]}
      />
    </div>
  )
}
