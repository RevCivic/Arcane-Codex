'use client'

import { useState, useEffect, useCallback } from 'react'

interface CollapsibleSectionProps {
  storageKey: string
  title: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function CollapsibleSection({
  storageKey,
  title,
  defaultOpen = true,
  children,
  className,
  style,
}: CollapsibleSectionProps) {
  // Initialise from localStorage if available, otherwise use defaultOpen
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen
    const stored = localStorage.getItem(`arcane-section:${storageKey}`)
    if (stored === null) return defaultOpen
    return stored === 'true'
  })

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(`arcane-section:${storageKey}`, String(isOpen))
  }, [isOpen, storageKey])

  // Listen for global expand/collapse-all events
  const handleExpand = useCallback(() => setIsOpen(true), [])
  const handleCollapse = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    window.addEventListener('arcane:expandAll', handleExpand)
    window.addEventListener('arcane:collapseAll', handleCollapse)
    return () => {
      window.removeEventListener('arcane:expandAll', handleExpand)
      window.removeEventListener('arcane:collapseAll', handleCollapse)
    }
  }, [handleExpand, handleCollapse])

  return (
    <section className={className} style={style}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 mb-5 group"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
      >
        {title}
        <span
          style={{
            color: '#6b7280',
            fontSize: '14px',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <div style={{ display: isOpen ? undefined : 'none' }}>
        {children}
      </div>
    </section>
  )
}
