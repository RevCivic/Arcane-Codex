'use client'

import React from 'react'
import { ColumnConfig } from './DynamicDataGrid'
import { ColumnState } from '@/lib/datagridState'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DynamicDataGridColumnToggleProps<T = any> {
  columns: ColumnConfig<T>[]
  columnStates: ColumnState[]
  onColumnToggle: (columnId: string) => void
  onClose: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DynamicDataGridColumnToggle<T extends Record<string, any> = any>({
  columns,
  columnStates,
  onColumnToggle,
  onClose,
}: DynamicDataGridColumnToggleProps<T>) {
  const stateMap = new Map(columnStates.map((cs) => [cs.id, cs]))

  return (
    <div
      className="datagrid-column-toggle"
      style={{
        marginBottom: '12px',
        padding: '12px',
        backgroundColor: '#111118',
        border: '1px solid #1f2937',
        borderRadius: '6px',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <h3
          style={{
            color: '#a78bfa',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}
        >
          Column Visibility
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '16px',
            padding: 0,
          }}
          title="Close"
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px',
        }}
      >
        {columns.map((column) => {
          const state = stateMap.get(column.id)
          const isVisible = state?.visible !== false

          return (
            <label
              key={column.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(124, 58, 237, 0.1)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              <input
                type="checkbox"
                checked={isVisible}
                onChange={() => onColumnToggle(column.id)}
                style={{
                  cursor: 'pointer',
                  accentColor: '#7c3aed',
                }}
              />
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                {column.label}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
