'use client'

import { useRef, useState } from 'react'

type Props = {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Ask the Arcanist…' }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div
      className="flex gap-2 p-3 border-t"
      style={{ borderColor: '#1f2937', backgroundColor: '#07070d' }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className="flex-1 rounded px-3 py-2 text-sm resize-none overflow-hidden disabled:opacity-50"
        style={{
          backgroundColor: '#111118',
          border: '1px solid #374151',
          color: '#e2e8f0',
          fontFamily: 'Georgia, serif',
          lineHeight: '1.5',
          minHeight: '38px',
        }}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        style={{
          backgroundColor: '#7c3aed',
          color: '#fff',
          fontFamily: 'Georgia, serif',
          alignSelf: 'flex-end',
        }}
      >
        Send
      </button>
    </div>
  )
}
