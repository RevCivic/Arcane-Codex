'use client'

import { useState, useTransition } from 'react'
import { deleteChatSession, renameChatSession } from '@/app/actions'

export type SessionItem = {
  id: number
  title: string
  characterId: number | null
  characterName: string | null
  updatedAt: Date | string
  messageCount: number
}

type Props = {
  sessions: SessionItem[]
  activeSessionId?: number | null
  onSelectSession: (id: number) => void
  onNewSession: () => void
}

export function SessionSidebar({ sessions, activeSessionId, onSelectSession, onNewSession }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  const startRename = (session: SessionItem) => {
    setEditingId(session.id)
    setEditTitle(session.title)
  }

  const commitRename = (id: number) => {
    startTransition(async () => {
      await renameChatSession(id, editTitle)
      setEditingId(null)
    })
  }

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Delete session "${title}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteChatSession(id)
    })
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: '#07070d', borderRight: '1px solid #1a1a2e' }}
    >
      {/* Header */}
      <div className="p-3 border-b" style={{ borderColor: '#1a1a2e' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs uppercase tracking-widest" style={{ color: '#d97706', fontFamily: 'Georgia, serif' }}>
            Sessions
          </span>
          <button
            type="button"
            onClick={onNewSession}
            className="text-xs px-2 py-1 rounded hover:opacity-80"
            style={{ backgroundColor: '#1f2937', color: '#a78bfa', fontFamily: 'Georgia, serif' }}
            title="New chat session"
          >
            + New
          </button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-xs p-3" style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}>
            No sessions yet. Start a new conversation.
          </p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="group relative border-b"
              style={{
                borderColor: '#1a1a2e',
                backgroundColor: s.id === activeSessionId ? '#0d0d1a' : 'transparent',
              }}
            >
              {editingId === s.id ? (
                <div className="p-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(s.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    className="w-full px-2 py-1 rounded text-xs"
                    style={{
                      backgroundColor: '#111118',
                      border: '1px solid #374151',
                      color: '#e2e8f0',
                      fontFamily: 'Georgia, serif',
                    }}
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => commitRename(s.id)}
                      disabled={isPending}
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ backgroundColor: '#7c3aed', color: '#fff' }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-[10px] px-2 py-0.5 rounded"
                      style={{ color: '#6b7280', border: '1px solid #374151' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  className="w-full text-left px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <p
                    className="text-xs font-medium truncate pr-12"
                    style={{
                      color: s.id === activeSessionId ? '#e2e8f0' : '#9ca3af',
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    {s.title}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#4b5563', fontFamily: 'Georgia, serif' }}>
                    {s.characterName ? `📋 ${s.characterName} · ` : ''}
                    {s.messageCount} msg{s.messageCount !== 1 ? 's' : ''}
                  </p>
                </button>
              )}

              {/* Action buttons (visible on hover) */}
              {editingId !== s.id && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => startRename(s)}
                    title="Rename"
                    className="p-1 rounded hover:text-purple-300"
                    style={{ color: '#6b7280' }}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s.id, s.title)}
                    disabled={isPending}
                    title="Delete"
                    className="p-1 rounded hover:text-red-400"
                    style={{ color: '#6b7280' }}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
