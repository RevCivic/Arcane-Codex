'use client'

import { useState, useCallback } from 'react'
import { ChatWindow, type ChatMessage } from '@/components/ChatWindow'
import { ChatInput } from '@/components/ChatInput'
import { SessionSidebar, type SessionItem } from '@/components/SessionSidebar'

type Props = {
  initialSessions: SessionItem[]
  initialSessionId?: number | null
  initialMessages?: ChatMessage[]
  characterId?: number | null
  characterName?: string | null
}

export function ChatPanel({
  initialSessions,
  initialSessionId = null,
  initialMessages = [],
  characterId = null,
  characterName = null,
}: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<number | null>(initialSessionId)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const loadSession = useCallback(async (id: number) => {
    setActiveSessionId(id)
    setSidebarOpen(false)
    try {
      const res = await fetch(`/api/chat/session/${id}`)
      if (res.ok) {
        const data = (await res.json()) as { messages: ChatMessage[] }
        setMessages(data.messages ?? [])
      }
    } catch {
      setMessages([])
    }
  }, [])

  const startNewSession = () => {
    setActiveSessionId(null)
    setMessages([])
    setSidebarOpen(false)
  }

  const sendMessage = async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: text,
          characterId,
        }),
      })

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`)
      }

      const data = (await res.json()) as {
        sessionId: number
        messageId: number
        response: string
      }

      const newSessionId = data.sessionId
      const assistantMsg: ChatMessage = {
        id: data.messageId,
        role: 'assistant',
        content: data.response,
      }

      setMessages((prev) => [...prev, assistantMsg])

      // If this was a new session, update session list
      if (!activeSessionId && newSessionId) {
        setActiveSessionId(newSessionId)
        const newSession: SessionItem = {
          id: newSessionId,
          title: text.length > 60 ? text.slice(0, 57) + '…' : text,
          characterId: characterId ?? null,
          characterName: characterName ?? null,
          updatedAt: new Date(),
          messageCount: 2,
        }
        setSessions((prev) => [newSession, ...prev])
      } else {
        // Update session message count
        setSessions((prev) =>
          prev.map((s) =>
            s.id === newSessionId
              ? { ...s, messageCount: s.messageCount + 2, updatedAt: new Date() }
              : s,
          ),
        )
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong. The arcane connection was disrupted — please try again.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const currentSession = sessions.find((s) => s.id === activeSessionId)

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[500px] rounded-lg overflow-hidden" style={{ border: '1px solid #1f2937' }}>
      {/* Sidebar — desktop always visible, mobile overlay */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-64 shrink-0`}>
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={loadSession}
          onNewSession={startNewSession}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: '#0a0a0f' }}>
        {/* Chat header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
          style={{ borderColor: '#1f2937', backgroundColor: '#07070d' }}
        >
          <button
            type="button"
            className="md:hidden p-1 rounded hover:text-purple-300"
            style={{ color: '#6b7280' }}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle session list"
          >
            ☰
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
              {currentSession ? currentSession.title : '🔮 New Session'}
            </p>
            {(currentSession?.characterName ?? characterName) && (
              <p className="text-[11px]" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
                📋 {currentSession?.characterName ?? characterName}
              </p>
            )}
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden absolute inset-0 z-40 flex">
            <div className="w-64">
              <SessionSidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={loadSession}
                onNewSession={startNewSession}
              />
            </div>
            <button
              type="button"
              className="flex-1 bg-black/60"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close session list"
            />
          </div>
        )}

        <ChatWindow messages={messages} isLoading={isLoading} />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  )
}
