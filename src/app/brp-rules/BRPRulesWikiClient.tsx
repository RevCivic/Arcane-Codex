'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteBRPRule } from '@/app/actions'
import ReactMarkdown from 'react-markdown'

type Rule = {
  id: number
  title: string
  section: string | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  content: string
}

type Props = {
  rules: Rule[]
  isAdmin: boolean
}

export function BRPRulesWikiClient({ rules, isAdmin }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deletePending, startDeleteTransition] = useTransition()

  const handleDelete = (id: number) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      setDeleteId(null)
      return
    }

    startDeleteTransition(async () => {
      try {
        await deleteBRPRule(id)
        // Note: page will revalidate automatically
      } catch (error) {
        console.error('Failed to delete rule:', error)
        setDeleteId(null)
      }
    })
  }

  // Organize by section
  const sections = Array.from(new Set(rules.filter(r => r.section).map(r => r.section!)))
  const unsectionedRules = rules.filter(r => !r.section)

  return (
    <div className="space-y-6">
      {/* Unsectioned Rules */}
      {unsectionedRules.map((rule) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          isAdmin={isAdmin}
          isExpanded={expandedId === rule.id}
          onToggle={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
          onDelete={handleDelete}
          isDeleting={deleteId === rule.id && deletePending}
        />
      ))}

      {/* Sectioned Rules */}
      {sections.map((section) => {
        const sectionRules = rules.filter(r => r.section === section)
        return (
          <div key={section}>
            <div className="flex items-center gap-3 mb-4 pb-2" style={{ borderBottom: '2px solid #2563eb22' }}>
              <h2 className="text-xl font-bold" style={{ color: '#2563eb', fontFamily: 'Georgia, serif' }}>
                {section}
              </h2>
              <span className="text-xs" style={{ color: '#6b7280' }}>
                ({sectionRules.length} rule{sectionRules.length !== 1 ? 's' : ''})
              </span>
            </div>
            <div className="space-y-4">
              {sectionRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  isAdmin={isAdmin}
                  isExpanded={expandedId === rule.id}
                  onToggle={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                  onDelete={handleDelete}
                  isDeleting={deleteId === rule.id && deletePending}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RuleCard({
  rule,
  isAdmin,
  isExpanded,
  onToggle,
  onDelete,
  isDeleting,
}: {
  rule: Rule
  isAdmin: boolean
  isExpanded: boolean
  onToggle: () => void
  onDelete: (id: number) => void
  isDeleting: boolean
}) {
  return (
    <div
      id={`rule-${rule.id}`}
      className="card-arcane rounded-lg overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: isExpanded ? '#1a1a2e' : '#0d0d14',
        borderColor: isExpanded ? '#7c3aed44' : '#1f2937',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:opacity-80 transition-opacity flex items-center justify-between"
        style={{ cursor: 'pointer' }}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold" style={{ color: '#e2e8f0', fontFamily: 'Georgia, serif' }}>
            {rule.title}
          </h3>
          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
            Updated {rule.updatedAt.toLocaleDateString()}
          </p>
        </div>
        <span className="text-2xl" style={{ color: '#7c3aed' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <>
          <div className="border-t" style={{ borderColor: '#1f2937' }} />
          
          <div className="p-4">
            {/* Markdown Content */}
            <div
              className="prose prose-invert max-w-none mb-4"
              style={{
                color: '#d1d5db',
                fontFamily: 'Georgia, serif',
              }}
            >
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
                  h2: ({ ...props }) => <h2 className="text-xl font-bold mt-3 mb-1.5" {...props} />,
                  h3: ({ ...props }) => <h3 className="text-lg font-bold mt-2 mb-1" {...props} />,
                  p: ({ ...props }) => <p className="mb-3" {...props} />,
                  ul: ({ ...props }) => <ul className="list-disc list-inside mb-3" {...props} />,
                  ol: ({ ...props }) => <ol className="list-decimal list-inside mb-3" {...props} />,
                  li: ({ ...props }) => <li className="mb-1" {...props} />,
                  code: ({ ...props }) => (
                    <code
                      className="bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono"
                      style={{ color: '#a1a1aa' }}
                      {...props}
                    />
                  ),
                  blockquote: ({ ...props }) => (
                    <blockquote
                      className="pl-4 py-2 my-3 border-l-4"
                      style={{ borderColor: '#7c3aed', color: '#9ca3af' }}
                      {...props}
                    />
                  ),
                  table: ({ ...props }) => (
                    <table className="w-full text-sm border-collapse my-4" {...props} />
                  ),
                  td: ({ ...props }) => (
                    <td className="px-3 py-1 border" style={{ borderColor: '#374151' }} {...props} />
                  ),
                  th: ({ ...props }) => (
                    <th className="px-3 py-1 border font-bold" style={{ borderColor: '#374151', backgroundColor: '#1f2937' }} {...props} />
                  ),
                }}
              >
                {rule.content}
              </ReactMarkdown>
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid #1f2937' }}>
                <Link
                  href={`/admin/brp-rules/${rule.id}/edit`}
                  className="px-3 py-1.5 rounded text-xs hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#1f2937', color: '#9ca3af' }}
                >
                  ✏️ Edit
                </Link>
                <button
                  onClick={() => onDelete(rule.id)}
                  disabled={isDeleting}
                  className="px-3 py-1.5 rounded text-xs hover:opacity-80 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#450a0a', color: '#f87171' }}
                >
                  {isDeleting ? '⏳' : '🗑️'} Delete
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
