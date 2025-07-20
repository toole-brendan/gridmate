export class ExcelChangeTracker {
  private static instance: ExcelChangeTracker
  private changeHandlers: Excel.BindingDataChangedEventHandler[] = []
  private recentChanges: RecentEdit[] = []
  private readonly MAX_CHANGES = 50
  private onChangeCallback?: (changes: RecentEdit[]) => void
  
  static getInstance(): ExcelChangeTracker {
    if (!ExcelChangeTracker.instance) {
      ExcelChangeTracker.instance = new ExcelChangeTracker()
    }
    return ExcelChangeTracker.instance
  }
  
  async initialize(onChangeCallback?: (changes: RecentEdit[]) => void) {
    this.onChangeCallback = onChangeCallback
    
    await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      
      // Track data changes
      worksheet.onChanged.add(this.handleWorksheetChange.bind(this))
      
      // Track selection changes
      worksheet.onSelectionChanged.add(this.handleSelectionChange.bind(this))
      
      await context.sync()
      console.log('[ExcelChangeTracker] Initialized change tracking')
    })
  }
  
  private async handleWorksheetChange(event: Excel.WorksheetChangedEventArgs) {
    if (event.source === Excel.EventSource.local) {
      // User-initiated change
      await this.captureChange(event.address, 'user', 'manual_edit')
    }
  }
  
  private async handleSelectionChange(event: Excel.WorksheetSelectionChangedEventArgs) {
    // Update last selection time for context expansion logic
    const timestamp = new Date().toISOString()
    sessionStorage.setItem('lastUserSelectionTime', timestamp)
  }
  
  private async captureChange(address: string, source: string, tool: string) {
    await Excel.run(async (context) => {
      const range = context.workbook.worksheets.getActiveWorksheet().getRange(address)
      range.load(['values', 'formulas'])
      
      await context.sync()
      
      const change: RecentEdit = {
        range: address,
        timestamp: new Date().toISOString(),
        source,
        tool,
        newValues: range.values,
        newFormulas: range.formulas
      }
      
      // Try to get old values from recent context if available
      const recentContext = this.getRecentContextForRange(address)
      if (recentContext) {
        change.oldValues = recentContext.oldValues
        change.oldFormulas = recentContext.oldFormulas
      }
      
      this.addChange(change)
    })
  }
  
  private addChange(change: RecentEdit) {
    this.recentChanges.unshift(change)
    
    // Keep only recent changes
    if (this.recentChanges.length > this.MAX_CHANGES) {
      this.recentChanges = this.recentChanges.slice(0, this.MAX_CHANGES)
    }
    
    // Notify callback
    if (this.onChangeCallback) {
      this.onChangeCallback(this.getRecentChanges())
    }
  }
  
  getRecentChanges(limit: number = 10): RecentEdit[] {
    return this.recentChanges.slice(0, limit)
  }
  
  private getRecentContextForRange(address: string): any {
    // This would integrate with the context caching system
    // For now, return null to indicate no old values available
    return null
  }
  
  clearChanges() {
    this.recentChanges = []
  }
}

interface RecentEdit {
  range: string
  timestamp: string
  source: string
  tool: string
  oldValues?: any[][]
  oldFormulas?: any[][]
  newValues?: any[][]
  newFormulas?: any[][]
}