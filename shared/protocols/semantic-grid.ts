/**
 * Semantic Grid Protocol v1.0
 * 
 * Standardizes spreadsheet representation for LLM processing
 */

export interface SemanticGridProtocol {
  version: string
  metadata: ProtocolMetadata
  spatial: SpatialRepresentation
  semantic: SemanticRepresentation
  structural: StructuralRepresentation
  differential: DifferentialRepresentation
  extensions?: ProtocolExtensions
}

export interface ProtocolMetadata {
  created: Date
  source: string
  range: string
  tokenEstimate: number
  compressionRatio: number
  confidence: number
}

export interface SpatialRepresentation {
  format: 'ascii' | 'markdown' | 'grid'
  content: string
  bounds: GridBounds
  coordinates: CoordinateSystem
}

export interface SemanticRepresentation {
  purpose: string
  summary: string
  regions: SemanticRegion[]
  flows: DataFlow[]
  metrics: KeyMetric[]
  relationships: Relationship[]
}

export interface StructuralRepresentation {
  cells: CellMap
  formulas: FormulaMap
  dependencies: DependencyGraph
  patterns: Pattern[]
  hierarchy: HierarchicalStructure
}

export interface DifferentialRepresentation {
  baseState: string // Reference to base state
  changes: Change[]
  timeline: ChangeTimeline
  conflicts?: Conflict[]
}

// Core types

export interface GridBounds {
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
}

export interface CoordinateSystem {
  type: 'A1' | 'R1C1'
  origin: 'zero' | 'one'
}

export interface SemanticRegion {
  id: string
  type: 'header' | 'data' | 'total' | 'input' | 'calculation' | 'label'
  bounds: GridBounds
  confidence: number
  attributes: Record<string, any>
}

export interface DataFlow {
  id: string
  from: CellReference | RegionReference
  to: CellReference | RegionReference
  type: 'input' | 'calculation' | 'output' | 'reference'
  description?: string
}

export interface KeyMetric {
  id: string
  name: string
  location: CellReference
  value: any
  formula?: string
  importance: 'high' | 'medium' | 'low'
  dependencies: string[]
}

export interface Relationship {
  type: 'depends_on' | 'affects' | 'validates' | 'aggregates'
  source: string
  target: string
  strength: number
}

export type CellMap = Map<string, Cell>

export interface Cell {
  address: string
  value: any
  formula?: string
  format?: CellFormat
  metadata?: CellMetadata
}

export interface CellFormat {
  numberFormat?: string
  font?: FontFormat
  fill?: FillFormat
  borders?: BorderFormat
  alignment?: AlignmentFormat
}

export interface CellMetadata {
  purpose?: string
  confidence?: number
  lastModified?: Date
  modifiedBy?: string
  validation?: ValidationRule
}

export type FormulaMap = Map<string, Formula>

export interface Formula {
  expression: string
  normalized: string // With references normalized
  type: FormulaType
  dependencies: string[]
  precedents: string[]
}

export type FormulaType = 
  | 'financial' 
  | 'statistical' 
  | 'lookup' 
  | 'logical' 
  | 'mathematical'
  | 'text'
  | 'date_time'
  | 'reference'
  | 'array'
  | 'custom'

export interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  cycles?: Cycle[]
}

export interface DependencyNode {
  id: string
  type: 'cell' | 'range' | 'named_range'
  address: string
  level: number // Distance from inputs
}

export interface DependencyEdge {
  from: string
  to: string
  type: 'direct' | 'indirect'
}

export interface Cycle {
  nodes: string[]
  severity: 'error' | 'warning'
}

export interface Pattern {
  id: string
  type: 'formula' | 'value' | 'format' | 'structure'
  description: string
  instances: PatternInstance[]
  confidence: number
}

export interface PatternInstance {
  location: CellReference | RangeReference
  variation?: string
}

export interface HierarchicalStructure {
  root: HierarchyNode
  depth: number
}

export interface HierarchyNode {
  id: string
  type: 'workbook' | 'sheet' | 'region' | 'table' | 'range'
  name: string
  children: HierarchyNode[]
  metadata?: Record<string, any>
}

export interface Change {
  id: string
  timestamp: Date
  type: ChangeType
  target: CellReference | RangeReference
  before: any
  after: any
  metadata?: ChangeMetadata
}

export type ChangeType = 
  | 'value'
  | 'formula'
  | 'format'
  | 'structure'
  | 'insertion'
  | 'deletion'

export interface ChangeMetadata {
  source: string
  reason?: string
  validated?: boolean
  applied?: boolean
}

export interface ChangeTimeline {
  start: Date
  end: Date
  changes: Change[]
  checkpoints: Checkpoint[]
}

export interface Checkpoint {
  id: string
  timestamp: Date
  description: string
  state: string // Reference to full state
}

export interface Conflict {
  type: 'merge' | 'dependency' | 'validation'
  changes: string[] // Change IDs
  resolution?: ConflictResolution
}

export interface ConflictResolution {
  strategy: 'accept_source' | 'accept_target' | 'merge' | 'manual'
  result?: any
}

// References

export type CellReference = string // e.g., "A1", "$B$2"
export type RangeReference = string // e.g., "A1:B10"
export type RegionReference = string // Region ID

// Protocol Extensions

export interface ProtocolExtensions {
  custom?: Record<string, any>
  vendor?: VendorExtensions
}

export interface VendorExtensions {
  excel?: ExcelExtensions
  sheets?: SheetsExtensions
}

export interface ExcelExtensions {
  tables?: Table[]
  pivotTables?: PivotTable[]
  charts?: Chart[]
  namedRanges?: NamedRange[]
}

export interface Table {
  name: string
  range: RangeReference
  headers: boolean
  totals: boolean
  style?: string
}

export interface PivotTable {
  name: string
  sourceRange: RangeReference
  location: CellReference
  fields: PivotField[]
}

export interface PivotField {
  name: string
  area: 'row' | 'column' | 'data' | 'filter'
  aggregation?: 'sum' | 'count' | 'average' | 'max' | 'min'
}

export interface Chart {
  name: string
  type: string
  dataRange: RangeReference
  location: CellReference
}

export interface NamedRange {
  name: string
  range: RangeReference
  scope: 'workbook' | 'sheet'
  comment?: string
}

export interface SheetsExtensions {
  // Google Sheets specific extensions
  protectedRanges?: ProtectedRange[]
  conditionalFormats?: ConditionalFormat[]
}

export interface ProtectedRange {
  range: RangeReference
  editors: string[]
}

export interface ConditionalFormat {
  range: RangeReference
  rules: FormatRule[]
}

export interface FormatRule {
  condition: string
  format: CellFormat
}

// Validation

export interface ValidationRule {
  type: 'list' | 'number' | 'date' | 'text' | 'custom'
  criteria: ValidationCriteria
  showError: boolean
  errorMessage?: string
}

export interface ValidationCriteria {
  operator: 'between' | 'not_between' | 'equal' | 'not_equal' | 'greater' | 'less' | 'contains'
  values: any[]
  formula?: string
}

// Helper types for better type safety

export interface FontFormat {
  name?: string
  size?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: string
}

export interface FillFormat {
  type: 'solid' | 'gradient' | 'pattern'
  color?: string
  colors?: string[] // For gradients
  pattern?: string
}

export interface BorderFormat {
  top?: BorderStyle
  right?: BorderStyle
  bottom?: BorderStyle
  left?: BorderStyle
}

export interface BorderStyle {
  style: 'thin' | 'medium' | 'thick' | 'double' | 'dotted' | 'dashed'
  color?: string
}

export interface AlignmentFormat {
  horizontal?: 'left' | 'center' | 'right' | 'justify'
  vertical?: 'top' | 'middle' | 'bottom'
  wrapText?: boolean
  textRotation?: number
}

// Protocol version management

export const PROTOCOL_VERSION = '1.0.0'

export function createSemanticGridProtocol(
  spatial: SpatialRepresentation,
  semantic: SemanticRepresentation,
  structural: StructuralRepresentation,
  differential: DifferentialRepresentation,
  metadata?: Partial<ProtocolMetadata>
): SemanticGridProtocol {
  return {
    version: PROTOCOL_VERSION,
    metadata: {
      created: new Date(),
      source: 'gridmate',
      range: '',
      tokenEstimate: 0,
      compressionRatio: 1.0,
      confidence: 1.0,
      ...metadata
    },
    spatial,
    semantic,
    structural,
    differential
  }
}

// Serialization helpers

export function serializeProtocol(protocol: SemanticGridProtocol): string {
  // Convert Maps to objects for JSON serialization
  const serializable = {
    ...protocol,
    structural: {
      ...protocol.structural,
      cells: protocol.structural.cells instanceof Map 
        ? Object.fromEntries(protocol.structural.cells)
        : protocol.structural.cells,
      formulas: protocol.structural.formulas instanceof Map
        ? Object.fromEntries(protocol.structural.formulas)
        : protocol.structural.formulas
    }
  }
  
  return JSON.stringify(serializable, null, 2)
}

export function deserializeProtocol(json: string): SemanticGridProtocol {
  const parsed = JSON.parse(json)
  
  // Convert objects back to Maps
  if (parsed.structural.cells && !(parsed.structural.cells instanceof Map)) {
    parsed.structural.cells = new Map(Object.entries(parsed.structural.cells))
  }
  
  if (parsed.structural.formulas && !(parsed.structural.formulas instanceof Map)) {
    parsed.structural.formulas = new Map(Object.entries(parsed.structural.formulas))
  }
  
  return parsed as SemanticGridProtocol
}