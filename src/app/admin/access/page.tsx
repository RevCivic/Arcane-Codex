import { auth } from '@/auth'
import { addAllowedEmail } from '@/app/actions'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function AccessAdminPage() {
  const session = await auth()
  const sessionEmail = normalizeEmail(session?.user?.email)

  if (!sessionEmail) {
    redirect('/login')
  }

  const currentUser = await prisma.allowedEmail.findUnique({ where: { email: sessionEmail } })
  if (!currentUser || currentUser.role !== AccessRole.ADMIN) {
    redirect('/')
  }

  const allowedEmails = await prisma.allowedEmail.findMany({
    orderBy: [{ role: 'desc' }, { email: 'asc' }],
  })

  return (
    <div className="max-w-3xl mx-auto">
      <h1
        className="text-2xl font-bold tracking-widest uppercase mb-6 arcane-glow"
        style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}
      >
        Access Control
      </h1>

      <div className="rounded-lg p-5 mb-8" style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}>
        <h2 className="text-sm uppercase tracking-widest mb-4" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
          Add or Update Allowed Email
        </h2>
        <form action={addAllowedEmail} className="grid sm:grid-cols-3 gap-3">
          <input
            type="email"
            name="email"
            required
            placeholder="agent@example.com"
            className="sm:col-span-2 px-3 py-2 rounded border bg-transparent"
            style={{ borderColor: '#374151', color: '#e2e8f0' }}
          />
          <select
            name="role"
            defaultValue={AccessRole.USER}
            className="px-3 py-2 rounded border bg-transparent"
            style={{ borderColor: '#374151', color: '#e2e8f0' }}
          >
            <option value={AccessRole.USER} style={{ backgroundColor: '#111118' }}>
              User
            </option>
            <option value={AccessRole.ADMIN} style={{ backgroundColor: '#111118' }}>
              Admin
            </option>
          </select>
          <button
            type="submit"
            className="sm:col-span-3 px-4 py-2 rounded border text-sm uppercase tracking-wider"
            style={{ borderColor: '#7c3aed', color: '#e2e8f0', fontFamily: 'Georgia, serif' }}
          >
            Save Access
          </button>
        </form>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1f2937' }}>
        <table className="w-full text-sm" style={{ fontFamily: 'Georgia, serif' }}>
          <thead style={{ backgroundColor: '#111118', color: '#d97706' }}>
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {allowedEmails.map((entry) => (
              <tr key={entry.id} style={{ borderTop: '1px solid #1f2937' }}>
                <td className="px-4 py-3" style={{ color: '#e2e8f0' }}>
                  {entry.email}
                </td>
                <td className="px-4 py-3" style={{ color: entry.role === AccessRole.ADMIN ? '#8b5cf6' : '#9ca3af' }}>
                  {entry.role}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
