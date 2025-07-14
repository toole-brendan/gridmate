// Safety checks for potentially destructive operations

export interface SafetyCheckResult {
  isDestructive: boolean
  riskLevel: 'low' | 'medium' | 'high'
  reason?: string
  requiresConfirmation: boolean
}

export function checkToolSafety(toolName: string, parameters: any): SafetyCheckResult {
  // Default safe result
  const safeResult: SafetyCheckResult = {
    isDestructive: false,
    riskLevel: 'low',
    requiresConfirmation: false
  }

  switch (toolName) {
    case 'write_range':
      // Check if writing to a large range
      const range = parameters.range
      if (range && isLargeRange(range)) {
        return {
          isDestructive: true,
          riskLevel: 'high',
          reason: 'Writing to a large range of cells',
          requiresConfirmation: true
        }
      }
      // Check if overwriting formulas
      if (parameters.overwrite_formulas) {
        return {
          isDestructive: true,
          riskLevel: 'medium',
          reason: 'May overwrite existing formulas',
          requiresConfirmation: true
        }
      }
      break

    case 'apply_formula':
      // Check if applying to a large range
      if (parameters.range && isLargeRange(parameters.range)) {
        return {
          isDestructive: true,
          riskLevel: 'medium',
          reason: 'Applying formula to many cells',
          requiresConfirmation: true
        }
      }
      break

    case 'clear_range':
    case 'delete_range':
      // These are always potentially destructive
      return {
        isDestructive: true,
        riskLevel: 'high',
        reason: 'Deleting cell contents',
        requiresConfirmation: true
      }

    case 'format_cells':
    case 'smart_format_cells':
      // Formatting is generally safe unless it's a very large range
      if (parameters.range && isVeryLargeRange(parameters.range)) {
        return {
          isDestructive: false,
          riskLevel: 'medium',
          reason: 'Formatting a very large range',
          requiresConfirmation: true
        }
      }
      break
  }

  return safeResult
}

function isLargeRange(range: string): boolean {
  // Parse range like "A1:Z100" to determine size
  const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
  if (!match) return false

  const startCol = columnToNumber(match[1])
  const startRow = parseInt(match[2])
  const endCol = columnToNumber(match[3])
  const endRow = parseInt(match[4])

  const totalCells = (endCol - startCol + 1) * (endRow - startRow + 1)
  return totalCells > 100 // More than 100 cells is considered large
}

function isVeryLargeRange(range: string): boolean {
  // Parse range like "A1:Z100" to determine size
  const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
  if (!match) return false

  const startCol = columnToNumber(match[1])
  const startRow = parseInt(match[2])
  const endCol = columnToNumber(match[3])
  const endRow = parseInt(match[4])

  const totalCells = (endCol - startCol + 1) * (endRow - startRow + 1)
  return totalCells > 1000 // More than 1000 cells is considered very large
}

function columnToNumber(column: string): number {
  let result = 0
  for (let i = 0; i < column.length; i++) {
    result = result * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
  }
  return result
}

// Audit logging for tool executions
export interface ToolExecutionLog {
  timestamp: Date
  toolName: string
  parameters: any
  autonomyMode: string
  result: 'success' | 'failure' | 'rejected'
  error?: string
  userId?: string
  sessionId: string
}

export class AuditLogger {
  private static readonly STORAGE_KEY = 'gridmate-tool-execution-log'
  private static readonly MAX_LOGS = 1000

  static logToolExecution(log: ToolExecutionLog): void {
    try {
      const logs = this.getLogs()
      logs.push(log)
      
      // Keep only the most recent logs
      if (logs.length > this.MAX_LOGS) {
        logs.splice(0, logs.length - this.MAX_LOGS)
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs))
    } catch (error) {
      console.error('Failed to log tool execution:', error)
    }
  }

  static getLogs(): ToolExecutionLog[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to retrieve logs:', error)
      return []
    }
  }

  static clearLogs(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  static getRecentLogs(count: number = 50): ToolExecutionLog[] {
    const logs = this.getLogs()
    return logs.slice(-count)
  }

  static exportLogs(): string {
    const logs = this.getLogs()
    return JSON.stringify(logs, null, 2)
  }
}