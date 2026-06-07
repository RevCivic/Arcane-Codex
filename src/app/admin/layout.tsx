import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div
        className="flex items-center justify-between mb-6 pb-4"
        style={{ borderBottom: '1px solid #1a1a2e', fontFamily: 'Georgia, serif' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🛠️</span>
          <span className="text-xs uppercase tracking-widest" style={{ color: '#d97706' }}>
            Admin Panel
          </span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-purple-300"
          style={{ color: '#6b7280' }}
        >
          <span aria-hidden="true">←</span>
          <span>Back to Application</span>
        </Link>
      </div>
      {children}
    </div>
  )
}
