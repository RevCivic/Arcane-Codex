'use client'

import React from 'react'
import { ColumnConfig } from './DynamicDataGrid'
import { SortOrder, getSortIndicator } from '@/lib/datagridSort'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DynamicDataGridHeaderProps<T = any> {
  visibleColumns: ColumnConfig<T>[]
  sortBy: string
  sortOrder: SortOrder
  onSort: (columnId: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DynamicDataGridHeader<T extends Record<string, any> = any>({
  visibleColumns,
  sortBy,
  sortOrder,
  onSort,
}: DynamicDataGridHeaderProps<T>) {
  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontFamily: 'Georgia, serif',
    whiteSpace: 'nowrap',
  }

  const sortableHeaderStyle: React.CSSProperties = {
    ...thStyle,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'color 0.2s',
  }

  return (
    <thead>
      <tr style={{ borderBottom: '2px solid #1f2937', backgroundColor: '#0d0d1a' }}>
        {visibleColumns.map((column) => {
          const isSortable = column.sortable !== false
          const isSorted = sortBy === column.id
          const headerColor = isSorted ? '#a78bfa' : '#6b7280'

          return (
            <th
              key={column.id}
              style={isSortable ? sortableHeaderStyle : thStyle}
              onClick={() => isSortable && onSort(column.id)}
              onMouseEnter={(e) => {
                if (isSortable) {
                  (e.currentTarget as HTMLElement).style.color = '#a78bfa'
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = headerColor
              }}
              className={isSortable ? 'datagrid-header-sortable' : ''}
            >
              <span style={{ color: headerColor, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {column.label}
                {isSortable && (
                  <span
                    style={{
                      color: isSorted ? '#a78bfa' : '#374151',
                      fontSize: '12px',
                      marginLeft: '3px',
                    }}
                  >
                    {isSorted ? getSortIndicator(sortOrder) : '↕'}
                  </span>
                )}
              </span>
            </th>
          )
        })}
      </tr>
    </thead>
  )
}
