export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { normalizeEmail } from '@/lib/normalizeEmail'
import { AccessRole } from '@/generated/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAIEvaluationSnapshot, getAITrainingDashboard, getAIPrimaryPrompt, saveAIPrimaryPrompt } from '@/app/actions'
import { AITrainingPanel } from '@/components/AITrainingPanel'

export default async function AdminAIPage() {
  const session = await auth()
  const email = normalizeEmail(session?.user?.email)
  if (!email) redirect('/login')

  const allowed = await prisma.allowedEmail.findUnique({ where: { email } })
  if (!allowed || allowed.role !== AccessRole.ADMIN) redirect('/')

  const [aiDashboard, primaryPrompt, evaluation] = await Promise.all([
    getAITrainingDashboard(),
    getAIPrimaryPrompt(),
    getAIEvaluationSnapshot(),
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

      <div className="card-arcane rounded-lg p-6" style={{ fontFamily: 'Georgia, serif' }}>
        <h2 className="text-sm uppercase tracking-widest mb-1" style={labelStyle}>
          🧪 Evaluation Snapshot
        </h2>
        <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
          Review the current model against representative investigator, ally, enemy, deity, mundane, and occult prompts.
        </p>

        {'error' in evaluation && evaluation.error ? (
          <p className="text-xs" style={{ color: '#f87171' }}>⚠ {evaluation.error}</p>
        ) : (
          <>
            <div className="mb-4 text-xs" style={{ color: '#9ca3af' }}>
              <p>
                Evaluated model:{' '}
                <strong style={{ color: '#e2e8f0' }}>
                  {evaluation.modelName} {evaluation.modelVersion ? `(${evaluation.modelVersion})` : ''}
                </strong>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              {evaluation.criteria.map((criterion) => (
                <div key={criterion.key} className="rounded p-3" style={{ border: '1px solid #1f2937', backgroundColor: '#0d0d1a' }}>
                  <p className="text-xs uppercase tracking-wider" style={{ color: '#a78bfa' }}>{criterion.label}</p>
                  <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{criterion.description}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {evaluation.cases.map((item) => (
                <div key={item.id} className="rounded p-4" style={{ border: '1px solid #1f2937', backgroundColor: '#0d0d15' }}>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: '#d97706' }}>{item.label}</p>
                      <p className="text-[11px]" style={{ color: '#6b7280' }}>{item.promptSummary}</p>
                    </div>
                    <p className="text-[11px]" style={{ color: '#a78bfa' }}>{item.entityType}</p>
                  </div>
                  <p className="text-xs mb-2" style={{ color: '#e2e8f0' }}>{item.suggestion.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]" style={{ color: '#cbd5e1' }}>
                    {Object.entries(item.scores).map(([key, value]) => (
                      <div key={key} className="rounded px-2 py-1" style={{ border: '1px solid #1f2937' }}>
                        <strong style={{ color: '#a78bfa' }}>{key}:</strong> {value}/5
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
