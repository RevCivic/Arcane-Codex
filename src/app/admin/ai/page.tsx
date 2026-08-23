export const dynamic = 'force-dynamic'

import { getAIPrimaryPrompt, saveAIPrimaryPrompt } from '@/app/actions'
import { auth } from '@/auth'
import { AccessRole } from '@/generated/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminAIPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')
  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')
  const primaryPrompt = await getAIPrimaryPrompt()

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/admin/access" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>← Access Control</Link>
        <Link href="/chat" className="ml-auto text-sm transition-colors hover:text-purple-300" style={{ color: '#a78bfa', fontFamily: 'Georgia, serif' }}>🔮 Open Arcanist Chat →</Link>
        <Link href="/admin/lore" className="text-sm transition-colors hover:text-amber-300" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>📚 Lore Library →</Link>
      </div>

      <div className="mb-8">
        <h1 className="arcane-glow text-2xl font-bold tracking-widest uppercase" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>🤖 AI Gateway</h1>
        <p className="mt-1 text-sm" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>Configure the campaign context sent to the shared LiteLLM gateway.</p>
      </div>

      <div className="card-arcane mb-8 rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
        <h2 className="mb-1 text-sm tracking-widest uppercase" style={{ color: '#d97706' }}>📝 Primary Prompt</h2>
        <p className="mb-4 text-xs" style={{ color: '#6b7280' }}>This prompt and active lore are sent as system context with every generation request. Gateway credentials and model routing are managed through deployment environment variables.</p>
        <form action={saveAIPrimaryPrompt}>
          <textarea name="primaryPrompt" defaultValue={primaryPrompt} rows={8} className="arcane-input mb-3 w-full resize-y" placeholder="Define the campaign tone, setting, and constraints…" style={{ fontFamily: 'Georgia, serif', fontSize: '13px' }} />
          <button type="submit" className="rounded px-5 py-2 text-xs font-semibold tracking-wider uppercase hover:opacity-90" style={{ backgroundColor: '#7c3aed', color: '#fff' }}>Save Prompt</button>
        </form>
      </div>

      <div className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
        <h2 className="mb-2 text-sm tracking-widest uppercase" style={{ color: '#22d3ee' }}>☁ Gateway-managed inference</h2>
        <p className="text-xs leading-5" style={{ color: '#9ca3af' }}>Arcane Codex no longer hosts a model runtime or training service. Provider selection, routing, evaluation, and model lifecycle are handled centrally by the AI gateway. Accepted and edited suggestions remain recorded locally for campaign auditing.</p>
      </div>
    </div>
  )
}
