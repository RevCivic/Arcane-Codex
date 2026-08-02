/**
 * Shared sort-parameter helpers.
 *
 * Usage:
 *   import { parseSortField, SortOrder } from '@/lib/sortParams'
 *
 *   const VALID_SORT_FIELDS = ['name', 'createdAt', 'status'] as const
 *   type SortField = (typeof VALID_SORT_FIELDS)[number]
 *
 *   const sortBy = parseSortField(VALID_SORT_FIELDS, searchParams.sortBy, 'name')
 *   const sortOrder: SortOrder = searchParams.sortOrder === 'desc' ? 'desc' : 'asc'
 */

export type SortOrder = 'asc' | 'desc'

/**
 * Validates `raw` against `fields` and returns it if valid, otherwise returns
 * `defaultField`.
 */
export function parseSortField<T extends string>(
  fields: readonly T[],
  raw: string | undefined,
  defaultField: T,
): T {
  return (fields as readonly string[]).includes(raw ?? '') ? (raw as T) : defaultField
}
