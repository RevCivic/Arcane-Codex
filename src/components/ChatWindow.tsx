'use client'

import { useEffect, useRef } from 'react'

export type ChatMessage = {
  id?: number
  role: 'user' | 'assistant'
  content: string
  createdAt?: Date | string
}

type Props = {
  messages: ChatMessage[]
  isLoading?: boolean
}

export function ChatWindow({ messages, isLoading = false }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" style={{ color: '#6b7380' }}>
        <div className="text-center">
          <p className="text-3xl mb-4">🔮</p>
          <p className="text-sm">Ask the Arcanist anything about your campaign —</p>
          <p className="text-sm">characters, lore, campaign arcs, or story ideas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
      {messages.map((msg, idx) => (
        <div
          key={msg.id ?? idx}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className="max-w-[80%] rounded-lg px-4 py-3 text-sm"
            style={{
              ,
              lineHeight: '1.6',
              ...(msg.role === 'user'
                ? {
                    backgroundColor: '#3b1f7a',
                    color: '#e8eef7',
                    borderBottomRightRadius: '4px',
                  }
                : {
                    backgroundColor: '#111118',
                    color: '#d1d5db',
                    border: '1px solid #2a2a3e',
                    borderBottomLeftRadius: '4px',
                  }),
            }}
          >
            {msg.role === 'assistant' && (
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#7c3aed' }}>
                🔮 Arcanist
              </p>
            )}
            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              backgroundColor: '#111118',
              border: '1px solid #2a2a3e',
              color: '#7c3aed',
              ,
            }}
          >
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#7c3aed' }}>
              🔮 Arcanist
            </p>
            <span className="animate-pulse">Consulting the arcane records…</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
