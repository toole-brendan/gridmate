import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'

export interface AuditEntry {
  id?: string
  type: string
  target?: string
  oldValue?: any
  newValue?: any
  message?: string
  response?: string
  timestamp: Date
  metadata?: Record<string, any>
}

export class AuditService {
  private db: Database.Database | null = null
  private inMemoryLog: AuditEntry[] = []
  private useInMemory: boolean = false

  constructor() {
    try {
      const dbPath = join(app.getPath('userData'), 'gridmate-audit.db')
      this.db = new Database(dbPath)
      this.initializeDatabase()
    } catch (error) {
      logger.warn('Failed to initialize SQLite database, using in-memory fallback:', error)
      this.useInMemory = true
    }
  }

  private initializeDatabase(): void {
    if (!this.db) return
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        target TEXT,
        old_value TEXT,
        new_value TEXT,
        message TEXT,
        response TEXT,
        timestamp INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log(type);
    `)
  }

  addEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry
    }

    if (this.useInMemory) {
      this.inMemoryLog.push(auditEntry)
      // Keep only last 1000 entries in memory
      if (this.inMemoryLog.length > 1000) {
        this.inMemoryLog = this.inMemoryLog.slice(-1000)
      }
      return
    }

    if (!this.db) return

    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, type, target, old_value, new_value, message, response, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      auditEntry.id,
      auditEntry.type,
      auditEntry.target || null,
      JSON.stringify(auditEntry.oldValue) || null,
      JSON.stringify(auditEntry.newValue) || null,
      auditEntry.message || null,
      auditEntry.response || null,
      auditEntry.timestamp.getTime(),
      JSON.stringify(auditEntry.metadata) || null
    )
  }

  getEntries(filter?: {
    type?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }): AuditEntry[] {
    if (this.useInMemory) {
      let entries = [...this.inMemoryLog]
      
      if (filter?.type) {
        entries = entries.filter(e => e.type === filter.type)
      }
      if (filter?.startDate) {
        entries = entries.filter(e => e.timestamp >= filter.startDate!)
      }
      if (filter?.endDate) {
        entries = entries.filter(e => e.timestamp <= filter.endDate!)
      }
      if (filter?.limit) {
        entries = entries.slice(-filter.limit)
      }
      
      return entries
    }

    if (!this.db) return []

    let query = 'SELECT * FROM audit_log WHERE 1=1'
    const params: any[] = []

    if (filter?.type) {
      query += ' AND type = ?'
      params.push(filter.type)
    }

    if (filter?.startDate) {
      query += ' AND timestamp >= ?'
      params.push(filter.startDate.getTime())
    }

    if (filter?.endDate) {
      query += ' AND timestamp <= ?'
      params.push(filter.endDate.getTime())
    }

    query += ' ORDER BY timestamp DESC'

    if (filter?.limit) {
      query += ' LIMIT ?'
      params.push(filter.limit)
    }

    const rows = this.db.prepare(query).all(...params)

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      target: row.target,
      oldValue: row.old_value ? JSON.parse(row.old_value) : undefined,
      newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
      message: row.message,
      response: row.response,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }))
  }

  clearEntries(beforeDate?: Date): void {
    if (this.useInMemory) {
      if (beforeDate) {
        this.inMemoryLog = this.inMemoryLog.filter(e => e.timestamp >= beforeDate)
      } else {
        this.inMemoryLog = []
      }
      return
    }

    if (!this.db) return

    if (beforeDate) {
      const stmt = this.db.prepare('DELETE FROM audit_log WHERE timestamp < ?')
      stmt.run(beforeDate.getTime())
    } else {
      this.db.exec('DELETE FROM audit_log')
    }
  }

  close(): void {
    if (this.db) {
      this.db.close()
    }
  }
}