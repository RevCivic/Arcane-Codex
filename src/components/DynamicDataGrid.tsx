'use client'

import React, { useState, useEffect, useMemo, ReactNode } from 'react'
import { initializeColumnStates, mergeColumnStates, loadDataGridState, saveDataGridState } from '@/lib/datagridState'
import { sortRows, SortOrder, toggleSortOrder } from '@/lib/datagridSort'
import { DynamicDataGridHeader } from './DynamicDataGridHeader'
import { DynamicDataGridColumnToggle } from './DynamicDataGridColumnToggle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ColumnConfig<T = any> {
  id: string
  label: string
  field: keyof T
  sortable?: boolean
  filterable?: boolean
  defaultVisible?: boolean
  defaultWidth?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer?: (value: any, row: T, index: number) => ReactNode
}

export interface DynamicDataGridProps<T> {
  entityType: string
  columns: ColumnConfig<T>[]
  rows: T[]
  rowKey: keyof T | ((row: T, index: number) => string | number)
  onRowClick?: (row: T, index: number) => void
  rowClassName?: (row: T, index: number) => string
  actions?: (row: T, index: number) => ReactNode
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DynamicDataGrid<T extends Record<string, any> = any>({
  entityType,
  columns,
  rows: initialRows,
  rowKey,
  onRowClick,
  rowClassName,
  actions,
}: DynamicDataGridProps<T>) {
  // Single localStorage read initialises all three state slices
  const [gridState, setGridState] = useState(() => {
    const saved = typeof window !== 'undefined' ? (loadDataGridState(entityType) || {}) : {}
    const defaultStates = initializeColumnStates(columns)
    return {
      columnStates: mergeColumnStates(saved.columns, defaultStates),
      sortBy: saved.sortBy || columns[0]?.id || '',
      sortOrder: (saved.sortOrder as SortOrder) || 'asc' as SortOrder,
    }
  })

  const { columnStates, sortBy, sortOrder } = gridState
  const [showColumnToggle, setShowColumnToggle] = useState(false)

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    saveDataGridState(entityType, {
      columns: columnStates,
      sortBy,
      sortOrder,
    })
  }, [columnStates, sortBy, sortOrder, entityType])

  // Get visible columns (optimized with Map for O(n) lookup)
  const visibleColumns = useMemo(() => {
    const stateMap = new Map(columnStates.map((cs) => [cs.id, cs]))
    return columns.filter((col) => stateMap.get(col.id)?.visible !== false)
  }, [columns, columnStates])

  // Apply sorting
  const processedRows = useMemo(() => {
    if (!sortBy) return initialRows
    return sortRows(initialRows, sortBy, sortOrder, (row, columnId) => row[columnId])
  }, [initialRows, sortBy, sortOrder])

  const handleColumnToggle = (columnId: string) => {
    setGridState((prev) => ({
      ...prev,
      columnStates: prev.columnStates.map((col) =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      ),
    }))
  }

  const handleSort = (columnId: string) => {
    const column = columns.find((col) => col.id === columnId)
    if (column?.sortable === false) return

    const newOrder = toggleSortOrder(sortBy, sortOrder, columnId)
    setGridState((prev) => ({ ...prev, sortBy: columnId, sortOrder: newOrder }))
  }

  const handleResetColumns = () => {
    const defaultStates = initializeColumnStates(columns)
    setGridState((prev) => ({ ...prev, columnStates: defaultStates }))
  }

  const getRowKey = (row: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(row, index)
    }
    return row[rowKey]
  }

  return (
    <div className="datagrid-wrapper">
      <div className="datagrid-controls mb-4 flex items-center gap-2">
        <button
          onClick={() => setShowColumnToggle(!showColumnToggle)}
          className="datagrid-toggle-button"
          title="Toggle column visibility"
        >
          ⚙ Columns
        </button>
        <button
          onClick={handleResetColumns}
          className="datagrid-reset-button"
          title="Reset to default columns"
        >
          ↺ Reset
        </button>
      </div>

      {showColumnToggle && (
        <DynamicDataGridColumnToggle
          columns={columns}
          columnStates={columnStates}
          onColumnToggle={handleColumnToggle}
          onClose={() => setShowColumnToggle(false)}
        />
      )}

      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid #1f2937' }}>
        <table
          className="datagrid-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Georgia, serif',
          }}
        >
          <DynamicDataGridHeader
            visibleColumns={visibleColumns}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            hasActions={!!actions}
          />

          <tbody>
            {processedRows.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className={`hover-row-arcane ${rowClassName?.(row, index) || ''}`}
                style={{ borderBottom: '1px solid #1a1a2e' }}
                onClick={() => onRowClick?.(row, index)}
              >
                {visibleColumns.map((column) => {
                  const value = row[column.field]
                  const cellContent = column.renderer ? column.renderer(value, row, index) : value

                  return (
                    <td
                      key={column.id}
                      style={{
                        padding: '10px 12px',
                        color: '#9ca3af',
                        fontSize: '13px',
                        width: column.defaultWidth,
                      }}
                    >
                      {cellContent != null ? cellContent : <span style={{ color: '#374151' }}>—</span>}
                    </td>
                  )
                })}

                {actions && (
                  <td
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                    }}
                  >
                    {actions(row, index)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {processedRows.length === 0 && (
        <div
          className="text-center py-12 rounded-lg"
          style={{ backgroundColor: '#111118', border: '1px solid #1f2937', color: '#6b7280', fontFamily: 'Georgia, serif' }}
        >
          No records found
        </div>
      )}
    </div>
  )
}
