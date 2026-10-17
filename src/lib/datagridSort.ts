/**
 * Utilities for sorting data grid rows
 */

export type SortOrder = 'asc' | 'desc'

/**
 * Compare two values for sorting
 */
export function compareValues(a: any, b: any, order: SortOrder = 'asc'): number {
  // Handle null/undefined
  if (a == null && b == null) return 0
  if (a == null) return order === 'asc' ? 1 : -1
  if (b == null) return order === 'asc' ? -1 : 1

  // Handle numbers
  if (typeof a === 'number' && typeof b === 'number') {
    const result = a - b
    return order === 'asc' ? result : -result
  }

  // Handle strings
  if (typeof a === 'string' && typeof b === 'string') {
    const result = a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    return order === 'asc' ? result : -result
  }

  // Handle booleans
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    const result = a === b ? 0 : a ? 1 : -1
    return order === 'asc' ? result : -result
  }

  // Default: convert to strings
  const aStr = String(a)
  const bStr = String(b)
  const result = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' })
  return order === 'asc' ? result : -result
}

/**
 * Sort rows by a single column
 */
export function sortRows<T extends Record<string, any>>(
  rows: T[],
  sortBy: string,
  sortOrder: SortOrder = 'asc',
  fieldAccessor?: (row: T, columnId: string) => any,
): T[] {
  const accessor = fieldAccessor || ((row: T, columnId: string) => row[columnId])
  const sorted = [...rows]
  sorted.sort((a, b) => {
    const aVal = accessor(a, sortBy)
    const bVal = accessor(b, sortBy)
    return compareValues(aVal, bVal, sortOrder)
  })
  return sorted
}

/**
 * Toggle sort order (asc -> desc -> asc)
 */
export function toggleSortOrder(currentSortBy: string, currentOrder: SortOrder, newSortBy: string): SortOrder {
  if (currentSortBy !== newSortBy) {
    return 'asc'
  }
  return currentOrder === 'asc' ? 'desc' : 'asc'
}

/**
 * Get sort direction indicator
 */
export function getSortIndicator(sortOrder: SortOrder): string {
  return sortOrder === 'asc' ? '↑' : '↓'
}
