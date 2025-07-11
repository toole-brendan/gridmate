import { 
  AutonomyLevel, 
  AutonomyConfig, 
  Change, 
  OperationType, 
  ApprovalRequirement,
  AUTONOMY_PRESETS,
  ChangeImpact
} from '@shared/types/autonomy'
import { logger } from '../utils/logger'
import { EventEmitter } from 'events'

export class AutonomyService extends EventEmitter {
  private currentLevel: AutonomyLevel = AutonomyLevel.MANUAL
  private config: AutonomyConfig = AUTONOMY_PRESETS[AutonomyLevel.MANUAL]
  private pendingChanges: Map<string, Change> = new Map()
  private batchCounter: number = 0 // Track changes in current batch
  
  constructor() {
    super()
    logger.info('AutonomyService initialized', { 
      defaultLevel: AutonomyLevel[this.currentLevel] 
    })
  }
  
  /**
   * Set the autonomy level
   */
  setLevel(level: AutonomyLevel): void {
    this.currentLevel = level
    this.config = AUTONOMY_PRESETS[level]
    
    logger.info('Autonomy level changed', { 
      level: AutonomyLevel[level],
      permissions: this.config.permissions 
    })
    
    this.emit('levelChanged', level)
  }
  
  /**
   * Get current autonomy level
   */
  getLevel(): AutonomyLevel {
    return this.currentLevel
  }
  
  /**
   * Check if a change can be applied automatically
   */
  canAutoApply(change: Change): boolean {
    switch (this.currentLevel) {
      case AutonomyLevel.MANUAL:
        // In manual mode, nothing is auto-applied
        return false
        
      case AutonomyLevel.APPROVAL:
        // In approval mode, each change needs explicit approval
        return false
        
      case AutonomyLevel.BATCH:
        // In batch mode, check if we're within the batch limit
        if (this.batchCounter >= 25) {
          logger.info('Batch limit reached, requiring approval', { 
            batchCounter: this.batchCounter 
          })
          return false
        }
        
        // Check if operation type is allowed
        if (!this.config.rules.allowedOperations.includes(change.type)) {
          logger.debug('Operation type not allowed', { 
            type: change.type 
          })
          return false
        }
        
        // In batch mode, we can auto-apply
        return true
        
      default:
        return false
    }
  }
  
  /**
   * Check constraints for a change
   */
  private checkConstraints(change: Change): { 
    passed: boolean, 
    failures: string[] 
  } {
    const failures: string[] = []
    
    // Check cell change limit
    if (change.impact.affectedCells.length > this.config.rules.maxCellChanges) {
      failures.push(`Exceeds max cell changes (${this.config.rules.maxCellChanges})`)
    }
    
    // Check value change percentage
    if (change.type === OperationType.CELL_VALUE && 
        typeof change.oldValue === 'number' && 
        typeof change.newValue === 'number') {
      const changePercent = Math.abs((change.newValue - change.oldValue) / change.oldValue) * 100
      if (changePercent > this.config.rules.maxValueChangePercent) {
        failures.push(`Value change ${changePercent.toFixed(1)}% exceeds max ${this.config.rules.maxValueChangePercent}%`)
      }
    }
    
    // Check formula complexity
    if (change.type === OperationType.FORMULA && change.formula) {
      const complexity = this.calculateFormulaComplexity(change.formula)
      if (complexity > this.config.rules.maxFormulaComplexity) {
        failures.push(`Formula complexity ${complexity} exceeds max ${this.config.rules.maxFormulaComplexity}`)
      }
    }
    
    // Check permissions
    const permissionCheck = this.checkPermissions(change)
    if (!permissionCheck.allowed) {
      failures.push(`Permission denied: ${permissionCheck.reason}`)
    }
    
    return {
      passed: failures.length === 0,
      failures
    }
  }
  
  /**
   * Check if change requires approval
   */
  private requiresApproval(change: Change): ApprovalRequirement[] {
    const requirements: ApprovalRequirement[] = []
    
    // Always check configured requirements
    for (const requirement of this.config.rules.requireApprovalFor) {
      if (this.matchesRequirement(change, requirement)) {
        requirements.push(requirement)
      }
    }
    
    return requirements
  }
  
  /**
   * Check if change matches an approval requirement
   */
  private matchesRequirement(
    change: Change, 
    requirement: ApprovalRequirement
  ): boolean {
    switch (requirement) {
      case ApprovalRequirement.LARGE_VALUE_CHANGE:
        if (change.type === OperationType.CELL_VALUE && 
            typeof change.oldValue === 'number' && 
            typeof change.newValue === 'number') {
          const changePercent = Math.abs((change.newValue - change.oldValue) / change.oldValue) * 100
          return changePercent > 50 // Large change threshold
        }
        return false
        
      case ApprovalRequirement.FORMULA_MODIFICATION:
        return change.type === OperationType.FORMULA
        
      case ApprovalRequirement.STRUCTURAL_CHANGE:
        return [
          OperationType.ROW_INSERTION,
          OperationType.ROW_DELETION,
          OperationType.SHEET_CREATION
        ].includes(change.type)
        
      case ApprovalRequirement.EXTERNAL_DATA_ACCESS:
        return change.type === OperationType.DATA_IMPORT
        
      case ApprovalRequirement.MULTI_CELL_OPERATION:
        return change.impact.affectedCells.length > 10
        
      default:
        return false
    }
  }
  
  /**
   * Check permissions for a change
   */
  private checkPermissions(change: Change): { 
    allowed: boolean, 
    reason?: string 
  } {
    const perms = this.config.permissions
    
    switch (change.type) {
      case OperationType.CELL_VALUE:
        if (!perms.canModifyValues) {
          return { allowed: false, reason: 'Cannot modify values' }
        }
        break
        
      case OperationType.FORMULA:
        if (!perms.canModifyFormulas) {
          return { allowed: false, reason: 'Cannot modify formulas' }
        }
        break
        
      case OperationType.FORMATTING:
        if (!perms.canModifyFormatting) {
          return { allowed: false, reason: 'Cannot modify formatting' }
        }
        break
        
      case OperationType.ROW_INSERTION:
        if (!perms.canAddRows) {
          return { allowed: false, reason: 'Cannot add rows' }
        }
        break
        
      case OperationType.ROW_DELETION:
        if (!perms.canDeleteRows) {
          return { allowed: false, reason: 'Cannot delete rows' }
        }
        break
        
      case OperationType.DATA_IMPORT:
        if (!perms.canAccessExternalData) {
          return { allowed: false, reason: 'Cannot access external data' }
        }
        break
    }
    
    return { allowed: true }
  }
  
  /**
   * Calculate formula complexity (simple heuristic)
   */
  private calculateFormulaComplexity(formula: string): number {
    let complexity = 0
    
    // Count function calls
    const functionMatches = formula.match(/[A-Z]+\(/g) || []
    complexity += functionMatches.length
    
    // Count nested parentheses
    let maxNesting = 0
    let currentNesting = 0
    for (const char of formula) {
      if (char === '(') {
        currentNesting++
        maxNesting = Math.max(maxNesting, currentNesting)
      } else if (char === ')') {
        currentNesting--
      }
    }
    complexity += maxNesting
    
    // Count operators
    const operators = formula.match(/[\+\-\*\/\^&]/g) || []
    complexity += operators.length * 0.5
    
    return Math.ceil(complexity)
  }
  
  /**
   * Queue a change for approval
   */
  async queueChange(change: Change): Promise<void> {
    this.pendingChanges.set(change.id, change)
    
    logger.info('Change queued for approval', { 
      changeId: change.id,
      type: change.type,
      impact: change.impact.estimatedRisk 
    })
    
    this.emit('changeQueued', change)
  }
  
  /**
   * Approve a pending change
   */
  async approveChange(changeId: string): Promise<boolean> {
    const change = this.pendingChanges.get(changeId)
    if (!change) {
      logger.warn('Attempted to approve non-existent change', { changeId })
      return false
    }
    
    this.pendingChanges.delete(changeId)
    logger.info('Change approved', { changeId, type: change.type })
    
    // In batch mode, increment the counter
    if (this.currentLevel === AutonomyLevel.BATCH) {
      this.batchCounter++
      logger.debug('Batch counter incremented', { 
        batchCounter: this.batchCounter,
        remaining: 25 - this.batchCounter 
      })
    }
    
    this.emit('changeApproved', change)
    return true
  }
  
  /**
   * Reject a pending change
   */
  async rejectChange(changeId: string): Promise<boolean> {
    const change = this.pendingChanges.get(changeId)
    if (!change) {
      logger.warn('Attempted to reject non-existent change', { changeId })
      return false
    }
    
    this.pendingChanges.delete(changeId)
    logger.info('Change rejected', { changeId, type: change.type })
    
    this.emit('changeRejected', change)
    return true
  }
  
  /**
   * Get all pending changes
   */
  getPendingChanges(): Change[] {
    return Array.from(this.pendingChanges.values())
  }
  
  /**
   * Estimate risk for a change
   */
  estimateRisk(change: Change): ChangeImpact['estimatedRisk'] {
    // High risk scenarios
    if (change.type === OperationType.ROW_DELETION ||
        change.type === OperationType.DATA_IMPORT ||
        change.impact.dependentCells.length > 50) {
      return 'high'
    }
    
    // Medium risk scenarios
    if (change.type === OperationType.FORMULA ||
        change.impact.affectedCells.length > 10 ||
        (change.type === OperationType.CELL_VALUE && 
         typeof change.newValue === 'number' && 
         Math.abs(change.newValue) > 1000000)) {
      return 'medium'
    }
    
    // Default to low risk
    return 'low'
  }
  
  /**
   * Get configuration for current level
   */
  getConfig(): AutonomyConfig {
    return this.config
  }
  
  /**
   * Reset batch counter (call when starting new batch)
   */
  resetBatchCounter(): void {
    this.batchCounter = 0
    logger.info('Batch counter reset')
    this.emit('batchReset')
  }
  
  /**
   * Get remaining changes in batch
   */
  getRemainingBatchChanges(): number {
    return Math.max(0, 25 - this.batchCounter)
  }
  
  /**
   * Check if we need approval based on current mode
   */
  needsApproval(change: Change): boolean {
    switch (this.currentLevel) {
      case AutonomyLevel.MANUAL:
        // Manual mode: user types everything, no AI changes
        return false // AI doesn't propose changes in manual mode
        
      case AutonomyLevel.APPROVAL:
        // Approval mode: every change needs approval
        return true
        
      case AutonomyLevel.BATCH:
        // Batch mode: need approval after 25 changes
        return this.batchCounter >= 25
        
      default:
        return true
    }
  }
}