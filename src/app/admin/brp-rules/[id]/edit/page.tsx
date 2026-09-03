import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getBRPRuleById, updateBRPRule } from '@/app/actions'
import { BRPRuleForm } from '@/components/BRPRuleForm'

export default async function EditBRPRulePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) notFound()

  const rule = await getBRPRuleById(id)
  if (!rule) notFound()

  const action = updateBRPRule.bind(null, id)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/brp-rules" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← BRP Rules Wiki
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
          ✏️ Edit Rule
        </h1>
        <p className="text-sm mt-1 truncate" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          {rule.title}
        </p>
      </div>

      <div className="card-arcane rounded-lg p-6">
        <BRPRuleForm
          action={action}
          defaultValues={{
            title: rule.title,
            section: rule.section,
            content: rule.content,
            sortOrder: rule.sortOrder,
          }}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  )
}
