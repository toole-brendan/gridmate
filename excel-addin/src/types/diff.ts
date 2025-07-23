export interface CellKey {
  sheet: string
  row: number
  col: number
}

export interface CellSnapshot {
  v?: string | number | boolean | null  // value
  f?: string  // formula
  s?: string  // style (JSON string)
  isMerged?: boolean  // whether cell is part of a merged range
  mergeAnchor?: string  // top-left cell of merge area
  mergeArea?: string  // full merge range (e.g., "A1:E1")
}

export interface WorkbookSnapshot {
  [key: string]: CellSnapshot
}

export enum DiffKind {
  Added = 'Added',
  Deleted = 'Deleted',
  ValueChanged = 'ValueChanged',
  FormulaChanged = 'FormulaChanged',
  StyleChanged = 'StyleChanged'
}

export interface DiffHunk {
  key: CellKey
  kind: DiffKind
  before?: CellSnapshot
  after?: CellSnapshot
}

export interface DiffPayload {
  workbookId: string
  before: WorkbookSnapshot
  after: WorkbookSnapshot
}

export interface DiffMessage {
  workbookId: string
  revision: number
  hunks: DiffHunk[]
}

export interface AISuggestedOperation {
  tool: string
  input: Record<string, any>
  description?: string
}

export interface ValidationError {
  message: string
  severity: 'error' | 'warning'
}