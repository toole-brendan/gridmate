import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { v4 as uuidv4 } from 'uuid'

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
  private db: Database.Database

  constructor() {
    const dbPath = join(app.getPath('userData'), 'wendigo-audit.db')
    this.db = new Database(dbPath)
    this.initializeDatabase()
  }

  private initializeDatabase(): void {
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
      )
    `)

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_log(type);
    `)
  }

  async recordChange(entry: AuditEntry): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, type, target, old_value, new_value, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      uuidv4(),
      entry.type,
      entry.target || null,
      JSON.stringify(entry.oldValue),
      JSON.stringify(entry.newValue),
      entry.timestamp.getTime(),
      JSON.stringify(entry.metadata || {})
    )
  }

  async recordInteraction(entry: AuditEntry): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO audit_log (id, type, message, response, timestamp, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      uuidv4(),
      entry.type,
      entry.message || null,
      entry.response || null,
      entry.timestamp.getTime(),
      JSON.stringify(entry.metadata || {})
    )
  }

  async getHistory(filter?: {
    type?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<AuditEntry[]> {
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

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params)

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

  async clearHistory(beforeDate?: Date): Promise<number> {
    if (beforeDate) {
      const stmt = this.db.prepare('DELETE FROM audit_log WHERE timestamp < ?')
      const result = stmt.run(beforeDate.getTime())
      return result.changes
    } else {
      const stmt = this.db.prepare('DELETE FROM audit_log')
      const result = stmt.run()
      return result.changes
    }
  }

  close(): void {
    this.db.close()
  }
}