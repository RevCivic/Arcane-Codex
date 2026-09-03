import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createBRPRule } from '@/app/actions'
import { BRPRuleForm } from '@/components/BRPRuleForm'

export default async function NewBRPRulePage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/brp-rules" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← BRP Rules Wiki
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
          📖 New Rule
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Add a new rule to the BRP wiki
        </p>
      </div>

      <div className="card-arcane rounded-lg p-6">
        <BRPRuleForm action={createBRPRule} submitLabel="Create Rule" />
      </div>
    </div>
  )
}
