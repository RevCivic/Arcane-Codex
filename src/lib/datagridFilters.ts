/**
 * Utilities for filtering data grid rows
 */

export type FilterValue = string | number | boolean | null | undefined

export interface Filter {
  columnId: string
  operator: 'equals' | 'contains' | 'startsWith' | 'gte' | 'lte' | 'range' | 'in'
  value: FilterValue | FilterValue[]
}

/**
 * Apply a single filter to a value
 */
export function applyFilter(value: FilterValue, filter: Filter): boolean {
  switch (filter.operator) {
    case 'equals':
      return value === filter.value

    case 'contains':
      if (!value || !filter.value) return false
      return String(value).toLowerCase().includes(String(filter.value).toLowerCase())

    case 'startsWith':
      if (!value || !filter.value) return false
      return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase())

    case 'gte':
      if (value === null || value === undefined) return false
      return Number(value) >= Number(filter.value)

    case 'lte':
      if (value === null || value === undefined) return false
      return Number(value) <= Number(filter.value)

    case 'range': {
      if (value === null || value === undefined) return false
      const [min, max] = filter.value as [number, number]
      const num = Number(value)
      return num >= min && num <= max
    }

    case 'in':
      return (filter.value as FilterValue[]).includes(value)

    default:
      return true
  }
}

/**
 * Filter rows based on multiple filter criteria
 */
export function filterRows<T extends Record<string, any>>(
  rows: T[],
  filters: Filter[],
  fieldAccessor: (row: T, columnId: string) => FilterValue,
): T[] {
  if (filters.length === 0) return rows

  return rows.filter((row) => {
    return filters.every((filter) => {
      const value = fieldAccessor(row, filter.columnId)
      return applyFilter(value, filter)
    })
  })
}

/**
 * Parse filter from URL query parameter
 * Format: "columnId:operator:value" or "columnId:operator:value1,value2" for multi-value
 */
export function parseFilterFromUrl(filterStr: string): Filter | null {
  const parts = filterStr.split(':')
  if (parts.length < 3) return null

  const [columnId, operator, ...valueParts] = parts
  const valueStr = valueParts.join(':')

  if (!['equals', 'contains', 'startsWith', 'gte', 'lte', 'range', 'in'].includes(operator)) {
    return null
  }

  let value: FilterValue | FilterValue[]

  if (operator === 'range' || operator === 'in') {
    value = valueStr.split(',').map((v) => {
      const num = Number(v)
      return isNaN(num) ? v : num
    })
  } else if (['gte', 'lte'].includes(operator)) {
    const num = Number(valueStr)
    value = isNaN(num) ? valueStr : num
  } else {
    value = valueStr
  }

  return {
    columnId,
    operator: operator as Filter['operator'],
    value,
  }
}

/**
 * Encode filter to URL-friendly string
 */
export function encodeFilterToUrl(filter: Filter): string {
  let valueStr = ''
  if (Array.isArray(filter.value)) {
    valueStr = filter.value.join(',')
  } else {
    valueStr = String(filter.value)
  }
  return `${filter.columnId}:${filter.operator}:${valueStr}`
}
