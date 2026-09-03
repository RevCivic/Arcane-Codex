'use client'

import { useState, useTransition } from 'react'
import { scrapeBRPRulesFromWeb, createBRPRuleImport } from '@/app/actions'

type ScrapedRule = {
  title: string
  section: string | null
  content: string
  sourceUrl: string
}

type Props = {
  existingRulesByTitle: Record<string, number>
}

export function BRPImportClient({ existingRulesByTitle }: Props) {
  const [url, setUrl] = useState('https://brp.chaosium.com/basic-roleplaying/')
  const [scrapedRules, setScrapedRules] = useState<ScrapedRule[]>([])
  const [selectedRules, setSelectedRules] = useState<Set<number>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleScrape = () => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        const rules = await scrapeBRPRulesFromWeb(url)
        setScrapedRules(rules)
        setSelectedRules(new Set(rules.map((_, i) => i)))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to scrape rules')
      }
    })
  }

  const handleSelectRule = (index: number) => {
    setSelectedRules((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleImportSelected = () => {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        let imported = 0
        for (const index of selectedRules) {
          const rule = scrapedRules[index]
          const existingId = existingRulesByTitle[rule.title.toLowerCase()]
          await createBRPRuleImport(rule.title, rule.section, rule.content, rule.sourceUrl, existingId)
          imported++
        }
        setSuccess(`✓ ${imported} rule${imported !== 1 ? 's' : ''} queued for review`)
        setScrapedRules([])
        setSelectedRules(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to queue rules')
      }
    })
  }

  const buttonBase = 'rounded px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-50'

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="card-arcane rounded-lg p-6">
        <label className="block mb-2" style={{ color: '#d97706', fontFamily: 'Georgia, serif', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Source URL
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isPending}
            className="arcane-input flex-1"
            placeholder="https://brp.chaosium.com/basic-roleplaying/"
            style={{ fontFamily: 'Georgia, serif', fontSize: '13px' }}
          />
          <button
            onClick={handleScrape}
            disabled={isPending || !url}
            className={buttonBase}
            style={{ backgroundColor: '#7c3aed', color: '#fff' }}
          >
            {isPending ? '⏳ Scraping…' : '🔍 Scrape'}
          </button>
        </div>
        <p className="text-[11px] mt-2" style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
          The scraper will parse the page and extract all rule sections and content.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg p-4" style={{ backgroundColor: '#450a0a', borderLeft: '4px solid #f87171', color: '#f87171' }}>
          <p className="text-sm" style={{ fontFamily: 'Georgia, serif' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg p-4" style={{ backgroundColor: '#065f46', borderLeft: '4px solid #6ee7b7', color: '#6ee7b7' }}>
          <p className="text-sm" style={{ fontFamily: 'Georgia, serif' }}>{success}</p>
        </div>
      )}

      {/* Preview */}
      {scrapedRules.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
              Scraped Rules ({selectedRules.size}/{scrapedRules.length})
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedRules(new Set(scrapedRules.map((_, i) => i)))}
                disabled={selectedRules.size === scrapedRules.length}
                className={buttonBase}
                style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedRules(new Set())}
                disabled={selectedRules.size === 0}
                className={buttonBase}
                style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {scrapedRules.map((rule, index) => {
              const isUpdate = existingRulesByTitle[rule.title.toLowerCase()]
              const isSelected = selectedRules.has(index)

              return (
                <div
                  key={index}
                  className="card-arcane rounded-lg p-4"
                  style={{ opacity: isSelected ? 1 : 0.5 }}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectRule(index)}
                      disabled={isPending}
                      className="mt-1.5 cursor-pointer w-4 h-4"
                      style={{ accentColor: '#8b5cf6' }}
                      aria-label={`Select ${rule.title}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
                          {rule.title}
                        </h3>
                        {isUpdate && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{ backgroundColor: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b55' }}
                          >
                            UPDATE
                          </span>
                        )}
                      </div>
                      {rule.section && (
                        <p className="text-xs mb-2" style={{ color: '#9ca3af', fontFamily: 'Georgia, serif' }}>
                          📁 Section: {rule.section}
                        </p>
                      )}
                      <div
                        className="text-xs p-3 rounded bg-black/30 max-h-32 overflow-y-auto mb-2"
                        style={{ color: '#d1d5db', fontFamily: 'monospace', fontSize: '11px' }}
                      >
                        {rule.content.substring(0, 300)}
                        {rule.content.length > 300 && '…'}
                      </div>
                      <p className="text-[11px]" style={{ color: '#6b7280' }}>
                        Content length: {rule.content.length} chars
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={handleImportSelected}
            disabled={isPending || selectedRules.size === 0}
            className={buttonBase}
            style={{ backgroundColor: '#065f46', color: '#6ee7b7', fontFamily: 'Georgia, serif', width: '100%', padding: '12px' }}
          >
            ✓ Queue {selectedRules.size} Rule{selectedRules.size !== 1 ? 's' : ''} for Review
          </button>
        </div>
      )}

      {!scrapedRules.length && !isPending && !error && (
        <div
          className="rounded-lg p-8 text-center"
          style={{ backgroundColor: '#111118', border: '1px solid #1f2937' }}
        >
          <p style={{ color: '#6b7280', fontFamily: 'Georgia, serif' }}>
            Enter a URL and click &quot;Scrape&quot; to preview rules before importing.
          </p>
        </div>
      )}
    </div>
  )
}
