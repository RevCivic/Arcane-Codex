/**
 * Utilities for managing dynamic data grid state persistence
 */

export interface ColumnState {
  id: string
  visible: boolean
  width?: string
}

export interface DataGridState {
  columns: ColumnState[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

const STORAGE_KEY_PREFIX = 'arcane-codex:datagrid'

/**
 * Get the localStorage key for a specific data grid entity type
 */
export function getStorageKey(entityType: string, suffix: string = 'state'): string {
  return `${STORAGE_KEY_PREFIX}:${entityType}:${suffix}`
}

/**
 * Load data grid state from localStorage
 */
export function loadDataGridState(entityType: string): Partial<DataGridState> | null {
  if (typeof window === 'undefined') return null

  try {
    const key = getStorageKey(entityType)
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch (error) {
    console.error(`Failed to load data grid state for ${entityType}:`, error)
    return null
  }
}

/**
 * Save data grid state to localStorage
 */
export function saveDataGridState(entityType: string, state: Partial<DataGridState>): void {
  if (typeof window === 'undefined') return

  try {
    const key = getStorageKey(entityType)
    window.localStorage.setItem(key, JSON.stringify(state))
  } catch (error) {
    console.error(`Failed to save data grid state for ${entityType}:`, error)
  }
}

/**
 * Clear data grid state from localStorage
 */
export function clearDataGridState(entityType: string): void {
  if (typeof window === 'undefined') return

  try {
    const key = getStorageKey(entityType)
    window.localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to clear data grid state for ${entityType}:`, error)
  }
}

/**
 * Initialize column states from defaults
 */
export function initializeColumnStates(columns: Array<{ id: string; defaultVisible?: boolean; defaultWidth?: string }>): ColumnState[] {
  return columns.map((col) => ({
    id: col.id,
    visible: col.defaultVisible !== false,
    width: col.defaultWidth,
  }))
}

/**
 * Merge persisted state with defaults, respecting new columns added to config
 */
export function mergeColumnStates(savedColumns: ColumnState[] | undefined, defaultColumns: ColumnState[]): ColumnState[] {
  if (!savedColumns || savedColumns.length === 0) return defaultColumns

  const savedMap = new Map(savedColumns.map((col) => [col.id, col]))
  return defaultColumns.map((defaultCol) => {
    const saved = savedMap.get(defaultCol.id)
    return saved ? { ...defaultCol, ...saved } : defaultCol
  })
}
