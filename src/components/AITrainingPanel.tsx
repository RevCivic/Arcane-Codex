'use client'

import { useState } from 'react'
import { requestAIModelRetrain } from '@/app/actions'

type ModelInfo = {
  modelName: string
  version: string
  mode: string
} | null

type JobInfo = {
  id: number
  status: string
  mode: string
  baseModel: string
  requestedByEmail: string | null
}

export function AITrainingPanel({ initialModel, initialJobs }: { initialModel: ModelInfo; initialJobs: JobInfo[] }) {
  const [mode, setMode] = useState<'cpu' | 'gpu'>('cpu')
  const [baseModel, setBaseModel] = useState('')
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleRetrain() {
    setRunning(true)
    setMessage(null)
    const result = await requestAIModelRetrain({ mode, baseModel })
    setRunning(false)

    if (!result.ok) {
      setMessage(`⚠ ${result.error ?? 'Retraining failed'}`)
      return
    }

    setMessage(`✓ Retrain job #${result.jobId} completed. New model version: ${result.modelVersion}`)
  }

  return (
    <div className="card-arcane rounded-lg p-6 mb-8" style={{ fontFamily: 'Georgia, serif' }}>
      <h2 className="text-sm uppercase tracking-widest mb-3" style={{ color: '#22d3ee' }}>
        🤖 AI Training Control
      </h2>
      <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
        Manual retraining applies accepted/edited feedback as supervised adapter data.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value === 'gpu' ? 'gpu' : 'cpu')} className="arcane-input">
            <option value="cpu">CPU (default)</option>
            <option value="gpu">GPU</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: '#6b7280' }}>Base Model (optional)</label>
          <input value={baseModel} onChange={(e) => setBaseModel(e.target.value)} className="arcane-input" placeholder="Leave blank to use env-configured model" />
        </div>
      </div>

      <button
        type="button"
        onClick={handleRetrain}
        disabled={running}
        className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
        style={{ backgroundColor: '#0e7490', color: '#cffafe' }}
      >
        {running ? 'Retraining…' : 'Run Retrain Now'}
      </button>

      {message && (
        <p className="text-xs mt-3" style={{ color: message.startsWith('⚠') ? '#f87171' : '#4ade80' }}>
          {message}
        </p>
      )}

      <div className="mt-5 text-xs" style={{ color: '#9ca3af' }}>
        <p>
          Active model:{' '}
          <strong style={{ color: '#e2e8f0' }}>
            {initialModel ? `${initialModel.modelName} (${initialModel.version}, ${initialModel.mode})` : 'Not trained yet'}
          </strong>
        </p>
      </div>

      {initialJobs.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded" style={{ border: '1px solid #1f2937' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0d0d1a' }}>
                {['Job', 'Status', 'Mode', 'Model', 'Requested By'].map((head) => (
                  <th key={head} style={{ padding: '8px', textAlign: 'left', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialJobs.map((job) => (
                <tr key={job.id} style={{ borderTop: '1px solid #1f2937' }}>
                  <td style={{ padding: '8px', color: '#9ca3af' }}>#{job.id}</td>
                  <td style={{ padding: '8px', color: '#e2e8f0' }}>{job.status}</td>
                  <td style={{ padding: '8px', color: '#9ca3af' }}>{job.mode}</td>
                  <td style={{ padding: '8px', color: '#9ca3af' }}>{job.baseModel}</td>
                  <td style={{ padding: '8px', color: '#9ca3af' }}>{job.requestedByEmail ?? 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
