'use client'

import { useSyncExternalStore, useCallback, useEffect } from 'react'

interface CollapsibleSectionProps {
  storageKey: string
  title: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

function usePersistentBoolean(storageKey: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const fullKey = `arcane-section:${storageKey}`

  const subscribe = useCallback(
    (callback: () => void) => {
      window.addEventListener('storage', callback)
      return () => window.removeEventListener('storage', callback)
    },
    [],
  )

  const getSnapshot = useCallback(
    () => {
      const stored = localStorage.getItem(fullKey)
      return stored === null ? defaultValue : stored === 'true'
    },
    [fullKey, defaultValue],
  )

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue])

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = useCallback(
    (newValue: boolean) => {
      localStorage.setItem(fullKey, String(newValue))
      window.dispatchEvent(new StorageEvent('storage', { key: fullKey }))
    },
    [fullKey],
  )

  return [value, setValue]
}

export function CollapsibleSection({
  storageKey,
  title,
  defaultOpen = true,
  children,
  className,
  style,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = usePersistentBoolean(storageKey, defaultOpen)

  // Listen for global expand/collapse-all events
  const handleExpand = useCallback(() => setIsOpen(true), [setIsOpen])
  const handleCollapse = useCallback(() => setIsOpen(false), [setIsOpen])

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
        onClick={() => setIsOpen(!isOpen)}
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
