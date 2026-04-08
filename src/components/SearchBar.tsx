'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

export function SearchBar({ placeholder }: { placeholder?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [value, setValue] = useState(searchParams.get('search') ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (newValue) {
          params.set('search', newValue)
        } else {
          params.delete('search')
        }
        router.replace(`${pathname}?${params.toString()}`)
      }, 300)
    },
    [router, searchParams, pathname],
  )

  return (
    <div className="relative" style={{ fontFamily: 'Georgia, serif' }}>
      <span
        style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#6b7280',
          pointerEvents: 'none',
          fontSize: '14px',
        }}
      >
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? 'Search…'}
        style={{
          paddingLeft: '32px',
          paddingRight: '10px',
          paddingTop: '7px',
          paddingBottom: '7px',
          backgroundColor: '#111118',
          border: '1px solid #1f2937',
          borderRadius: '6px',
          color: '#e2e8f0',
          fontSize: '13px',
          outline: 'none',
          width: '220px',
          fontFamily: 'Georgia, serif',
        }}
      />
    </div>
  )
}
