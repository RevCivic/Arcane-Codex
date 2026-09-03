'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type TagFilterProps = {
  tags: string[]
}

export function TagFilter({ tags }: TagFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const selected = (searchParams.get('tags') ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const isSelected = (tag: string) => selected.includes(tag)

  const toggleTag = (tag: string) => {
    const next = isSelected(tag)
      ? selected.filter((selectedTag) => selectedTag !== tag)
      : [...selected, tag]

    const params = new URLSearchParams(searchParams.toString())
    if (next.length > 0) {
      params.set('tags', next.join(','))
    } else {
      params.delete('tags')
    }
    router.replace(`${pathname}?${params.toString()}`)
  }

  if (tags.length === 0) return null

  return (
    <div className="mt-3">
      <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
        Filter by tags
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tags.map((tag) => {
          const selectedState = isSelected(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="whitespace-nowrap text-xs px-2 py-1 rounded-full transition-colors"
              style={{
                border: '1px solid #3b1f6e',
                backgroundColor: selectedState ? '#3b1f6e' : '#111118',
                color: selectedState ? '#e9d5ff' : '#a78bfa',
                fontFamily: 'Georgia, serif',
              }}
            >
              #{tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
