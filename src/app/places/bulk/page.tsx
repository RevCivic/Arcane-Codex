export const dynamic = 'force-dynamic'

import { createPlacesBulk } from '@/app/actions'
import { BulkEntryTable } from '@/components/BulkEntryTable'

export default function BulkPlacesPage() {
  return (
    <div className="max-w-6xl">
      <BulkEntryTable
        title="+ Bulk Place Entry"
        description="Add multiple places in one pass using a table-style bulk entry tool."
        backHref="/places"
        backLabel="Places"
        submitLabel="Create Places"
        action={createPlacesBulk}
        columns={[
          { name: 'name', label: 'Name', required: true, placeholder: 'Bureau Headquarters' },
          { name: 'type', label: 'Type', placeholder: 'Government Building' },
          { name: 'region', label: 'Region', placeholder: 'Washington D.C.' },
          { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the location...' },
        ]}
      />
    </div>
  )
}
