'use client'

interface DeleteButtonProps {
  action: () => Promise<void>
  label: string
}

export function DeleteButton({ action, label }: DeleteButtonProps) {
  return (
    <form action={action} onSubmit={(e) => {
      if (!confirm(`Delete "${label}"? This cannot be undone.`)) e.preventDefault()
    }}>
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded transition-colors hover:text-red-300"
        style={{ color: '#ef4444', border: '1px solid #3f1212', fontFamily: 'Georgia, serif' }}
      >
        Delete
      </button>
    </form>
  )
}
