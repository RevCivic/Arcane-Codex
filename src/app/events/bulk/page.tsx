export const dynamic = 'force-dynamic'

import { createEventsBulk } from '@/app/actions'
import { BulkEntryTable } from '@/components/BulkEntryTable'

export default function BulkEventsPage() {
  return (
    <div className="max-w-6xl">
      <BulkEntryTable
        title="+ Bulk Event Entry"
        description="Add multiple incidents at once in a table-style batch."
        backHref="/events"
        backLabel="Events"
        submitLabel="Create Events"
        action={createEventsBulk}
        columns={[
          { name: 'name', label: 'Name', required: true, placeholder: 'The Millbrook Incident' },
          { name: 'date', label: 'Date', placeholder: 'October 12, 1987' },
          { name: 'significance', label: 'Significance', placeholder: 'Opened portal activity' },
          { name: 'outcome', label: 'Outcome', placeholder: 'Site quarantined' },
        ]}
      />
    </div>
  )
}
