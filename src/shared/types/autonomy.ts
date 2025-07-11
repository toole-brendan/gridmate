export enum AutonomyLevel {
  MANUAL = 0,      // AI only suggests, user types/applies changes themselves
  APPROVAL = 1,    // AI proposes changes, user must approve each one
  BATCH = 2        // AI can make up to 25 changes automatically
}

export interface AutonomyConfig {
  level: AutonomyLevel
  rules: AutonomyRules
  permissions: AutonomyPermissions
}

export interface AutonomyRules {
  // What types of changes are allowed
  allowedOperations: OperationType[]
  
  // Maximum values for automatic changes
  maxCellChanges: number
  maxValueChangePercent: number
  maxFormulaComplexity: number
  
  // Require approval for
  requireApprovalFor: ApprovalRequirement[]
}

export interface AutonomyPermissions {
  canModifyFormulas: boolean
  canModifyValues: boolean
  canAddRows: boolean
  canDeleteRows: boolean
  canModifyFormatting: boolean
  canAccessExternalData: boolean
}

export enum OperationType {
  CELL_VALUE = 'cell_value',
  FORMULA = 'formula',
  FORMATTING = 'formatting',
  ROW_INSERTION = 'row_insertion',
  ROW_DELETION = 'row_deletion',
  SHEET_CREATION = 'sheet_creation',
  DATA_IMPORT = 'data_import'
}

export enum ApprovalRequirement {
  LARGE_VALUE_CHANGE = 'large_value_change',
  FORMULA_MODIFICATION = 'formula_modification',
  STRUCTURAL_CHANGE = 'structural_change',
  EXTERNAL_DATA_ACCESS = 'external_data_access',
  MULTI_CELL_OPERATION = 'multi_cell_operation'
}

export interface Change {
  id: string
  type: OperationType
  target: string // cell, range, or sheet
  oldValue: any
  newValue: any
  formula?: string
  impact: ChangeImpact
  timestamp: Date
}

export interface ChangeImpact {
  affectedCells: string[]
  dependentCells: string[]
  estimatedRisk: 'low' | 'medium' | 'high'
  reversible: boolean
}

// Preset configurations for each autonomy level
export const AUTONOMY_PRESETS: Record<AutonomyLevel, AutonomyConfig> = {
  [AutonomyLevel.MANUAL]: {
    level: AutonomyLevel.MANUAL,
    rules: {
      allowedOperations: [], // No automatic operations - user types everything
      maxCellChanges: 0,
      maxValueChangePercent: 0,
      maxFormulaComplexity: 0,
      requireApprovalFor: [
        ApprovalRequirement.LARGE_VALUE_CHANGE,
        ApprovalRequirement.FORMULA_MODIFICATION,
        ApprovalRequirement.STRUCTURAL_CHANGE,
        ApprovalRequirement.EXTERNAL_DATA_ACCESS,
        ApprovalRequirement.MULTI_CELL_OPERATION
      ]
    },
    permissions: {
      canModifyFormulas: false,
      canModifyValues: false,
      canAddRows: false,
      canDeleteRows: false,
      canModifyFormatting: false,
      canAccessExternalData: false
    }
  },
  
  [AutonomyLevel.APPROVAL]: {
    level: AutonomyLevel.APPROVAL,
    rules: {
      allowedOperations: Object.values(OperationType), // All operations allowed with approval
      maxCellChanges: 1, // One change at a time for approval
      maxValueChangePercent: 100, // Any change allowed with approval
      maxFormulaComplexity: 5, // Any complexity with approval
      requireApprovalFor: [
        ApprovalRequirement.LARGE_VALUE_CHANGE,
        ApprovalRequirement.FORMULA_MODIFICATION,
        ApprovalRequirement.STRUCTURAL_CHANGE,
        ApprovalRequirement.EXTERNAL_DATA_ACCESS,
        ApprovalRequirement.MULTI_CELL_OPERATION
      ]
    },
    permissions: {
      canModifyFormulas: true,
      canModifyValues: true,
      canAddRows: true,
      canDeleteRows: true,
      canModifyFormatting: true,
      canAccessExternalData: true
    }
  },
  
  [AutonomyLevel.BATCH]: {
    level: AutonomyLevel.BATCH,
    rules: {
      allowedOperations: Object.values(OperationType),
      maxCellChanges: 25, // Can make up to 25 changes in a batch
      maxValueChangePercent: 100,
      maxFormulaComplexity: 5,
      requireApprovalFor: [] // No approval required within batch limit
    },
    permissions: {
      canModifyFormulas: true,
      canModifyValues: true,
      canAddRows: true,
      canDeleteRows: true,
      canModifyFormatting: true,
      canAccessExternalData: true
    }
  }
}