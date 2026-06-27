export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAITrainingDashboard, getAIPrimaryPrompt, saveAIPrimaryPrompt } from '@/app/actions'
import { AITrainingPanel } from '@/components/AITrainingPanel'

export default async function AdminAIPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const [aiDashboard, primaryPrompt] = await Promise.all([
    getAITrainingDashboard(),
    getAIPrimaryPrompt(),
  ])

  const labelStyle: React.CSSProperties = { color: '#d97706', fontFamily: 'Georgia, serif' }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/access" className="text-sm transition-colors hover:text-purple-300" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          ← Access Control
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-widest uppercase arcane-glow" style={{ color: '#8b5cf6', fontFamily: 'Georgia, serif' }}>
          🤖 AI / Language Model
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          Configure the primary prompt and manage retraining for the AI service
        </p>
      </div>

      {/* ── Primary Prompt ─────────────────────────────────────────────────── */}
      <div className="card-arcane rounded-lg p-6 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
        <h2 className="text-sm uppercase tracking-widest mb-1" style={labelStyle}>
          📝 Primary Prompt
        </h2>
        <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
          This system-level prompt is prepended to every AI generation request. Use it to define the
          tone, setting, and constraints for the language model.
        </p>
        <form action={saveAIPrimaryPrompt}>
          <textarea
            name="primaryPrompt"
            defaultValue={primaryPrompt}
            rows={8}
            className="arcane-input w-full mb-3 resize-y"
            placeholder="e.g. You are an AI game-master assistant for a dark occult investigation roleplaying game set in the 1920s. Always respond in a gothic, atmospheric style…"
            style={{ fontFamily: 'Georgia, serif', fontSize: '13px' }}
          />
          <button
            type="submit"
            className="px-5 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90"
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            Save Prompt
          </button>
        </form>
      </div>

      {/* ── AI Training Control ─────────────────────────────────────────────── */}
      <AITrainingPanel
        initialModel={
          aiDashboard.activeModel
            ? {
                modelName: aiDashboard.activeModel.modelName,
                version: aiDashboard.activeModel.version,
                mode: aiDashboard.activeModel.mode,
              }
            : null
        }
        initialJobs={aiDashboard.recentJobs.map((job) => ({
          id: job.id,
          status: job.status,
          mode: job.mode,
          baseModel: job.baseModel,
          requestedByEmail: job.requestedBy?.email ?? null,
        }))}
      />
    </div>
  )
}
