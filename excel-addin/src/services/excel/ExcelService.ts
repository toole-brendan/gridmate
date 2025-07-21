declare const Excel: any
import { FormatErrorHandler } from '../../utils/formatErrorHandler'
import { ToolExecutionError } from '../../types/errors'
import type { BatchableRequest } from './batchExecutor'

export interface ExcelContext {
  workbook: string
  worksheet: string
  selectedRange: string
}

export interface CellData {
  address: string
  value: any
  formula?: string
  format?: any
}

export interface RangeData {
  values: any[][]
  formulas?: string[][]
  formatting?: any[][]
  address: string
  rowCount: number
  colCount: number
  isBlankSheet?: boolean
  suggestedWorkArea?: boolean
  isFullSheet?: boolean
  isEmpty?: boolean
  totalRows?: number
  totalCols?: number
  note?: string
}

export interface WorkbookData {
  sheets: SheetData[]
  namedRanges: NamedRange[]
  activeSheet: string
  totalCells: number
}

export interface SheetData {
  name: string
  usedRange: string
  data: RangeData
  lastRow: number
  lastColumn: number
}

export interface ComprehensiveContext extends ExcelContext {
  selectedData?: RangeData
  visibleRangeData?: RangeData
  workbookSummary?: WorkbookData
  nearbyData?: RangeData  // Data around selection
  fullSheetData?: RangeData & {  // Complete sheet data for AI visibility
    mergedCells?: Array<{
      range: string
      anchor: string
      size: string
    }>
  }
  recentEdits?: Array<{  // Recent edits with old/new values
    range: string
    timestamp: string
    source: string
    tool: string
    oldValues?: any[][]
    oldFormulas?: any[][]
    newValues?: any[][]
    layoutChange?: {
      merge?: string
      previousMergeState?: any
      preservedContent?: boolean
    }
  }>
  mergeInfo?: {
    totalMergedAreas: number
    totalMergedCells: number
    mergedAreas: Array<{
      area: string
      anchor: string
      rowCount: number
      colCount: number
    }>
    largestMergeArea: {
      area: string
      anchor: string
      rowCount: number
      colCount: number
    }
  }
}

export interface DataAnalysis {
  dataTypes: string[]
  headers?: string[]
  statistics?: Record<string, any>
  patterns?: string[]
  rowCount: number
  colCount: number
}

export interface CellFormat {
  numberFormat?: string
  font?: {
    bold?: boolean
    italic?: boolean
    size?: number
    color?: string
  }
  fillColor?: string
  alignment?: {
    horizontal?: 'left' | 'center' | 'right' | 'fill' | 'justify'
    vertical?: 'top' | 'middle' | 'bottom'
  }
}

export interface ChartConfig {
  dataRange: string
  chartType: 'column' | 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'combo'
  title?: string
  position?: string
  includeLegend?: boolean
}

export interface ValidationResult {
  isValid: boolean
  circularRefs?: string[]
  inconsistentFormulas?: string[]
  errors?: Array<{
    cell: string
    errorType: string
    message: string
  }>
}

export interface NamedRange {
  name: string
  range: string
  scope: string
  comment?: string
}

export interface WorkbookSnapshot {
  [key: string]: {
    v?: string | number | boolean | null  // value
    f?: string  // formula
    s?: string  // style (JSON string)
  }
}

export class ExcelService {
  private static instance: ExcelService
  
  // Cache for worksheet properties
  private worksheetCache = new Map<string, {
    name: string
    usedRange?: { address: string }
    timestamp: number
  }>()
  
  // Add cache for workbook summary
  private workbookSummaryCache: WorkbookData | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_DURATION = 30000 // 30 seconds
  
  // Activity tracking for dynamic context expansion
  private activityLog: Array<{
    timestamp: number
    type: 'edit' | 'select'
    range: string
  }> = []
  
  // Track recent edits with old/new values
  private recentEdits: Array<{
    range: string
    timestamp: string
    source: string
    tool: string
    oldValues?: any[][]
    oldFormulas?: any[][]
    newValues?: any[][]
  }> = []
  
  // Maximum number of activities to track
  private readonly MAX_ACTIVITY_LOG_SIZE = 50
  private readonly MAX_RECENT_EDITS = 10
  
  // Track worksheet change handler for cleanup
  private worksheetChangeHandler: any = null

  static getInstance(): ExcelService {
    if (!ExcelService.instance) {
      console.log('[ExcelService] Creating new instance')
      if (typeof Excel === 'undefined') {
        console.error('[ExcelService] Excel object is undefined! Office.js may not be loaded')
      } else {
        console.log('[ExcelService] Excel object is available')
      }
      ExcelService.instance = new ExcelService()
      // Initialize change tracking after instance creation
      ExcelService.instance.initializeChangeTracking()
    }
    return ExcelService.instance
  }

  // Initialize real-time change tracking
  private async initializeChangeTracking() {
    try {
      await Excel.run(async (context: Excel.RequestContext) => {
        const worksheet = context.workbook.worksheets.getActiveWorksheet()
        
        // Remove any existing handler
        if (this.worksheetChangeHandler) {
          worksheet.onChanged.remove(this.worksheetChangeHandler)
        }
        
        // Add new change handler
        this.worksheetChangeHandler = worksheet.onChanged.add(async (event: Excel.WorksheetChangedEventArgs) => {
          console.log('[ExcelService] Worksheet changed:', {
            address: event.address,
            changeType: event.changeType,
            source: event.source,
            details: event.details
          })
          
          // Track user edits (not from API)
          if (event.source === Excel.EventSource.local) {
            await this.trackUserEdit({
              range: event.address,
              changeType: event.changeType,
              details: event.details,
              timestamp: new Date(),
              worksheetId: event.worksheetId
            })
          }
        })
        
        await context.sync()
        console.log('[ExcelService] Change tracking initialized successfully')
      })
    } catch (error) {
      console.error('[ExcelService] Failed to initialize change tracking:', error)
    }
  }
  
  // Track user edits
  private async trackUserEdit(editInfo: {
    range: string
    changeType: string
    details: any
    timestamp: Date
    worksheetId?: string
  }) {
    console.log('[ExcelService] Tracking user edit:', editInfo)
    
    // Add to activity log
    this.trackActivity('edit', editInfo.range)
    
    // Try to capture old and new values if possible
    try {
      // For certain change types, we might have value info in details
      const editRecord = {
        range: editInfo.range,
        changeType: editInfo.changeType,
        timestamp: editInfo.timestamp.toISOString(),
        source: 'user',
        worksheetId: editInfo.worksheetId
      }
      
      // Send to backend if we have a way to communicate
      // This would be implemented based on your communication method
      this.sendUserEditToBackend(editRecord)
      
      console.log('[ExcelService] User edit tracked successfully:', editRecord)
    } catch (error) {
      console.error('[ExcelService] Failed to track user edit:', error)
    }
  }
  
  // Send user edit to backend (placeholder - implement based on your communication method)
  private sendUserEditToBackend(editRecord: any) {
    // This would send the edit info to your backend
    // Implementation depends on your SignalR or other communication setup
    console.log('[ExcelService] Would send user edit to backend:', editRecord)
    
    // Example: If you have a SignalR client available
    // if (window.signalRClient) {
    //   window.signalRClient.send({
    //     type: 'user_edit',
    //     data: editRecord
    //   })
    // }
  }

  // Clean up change tracking
  async cleanupChangeTracking() {
    if (this.worksheetChangeHandler) {
      try {
        await Excel.run(async (context: Excel.RequestContext) => {
          const worksheet = context.workbook.worksheets.getActiveWorksheet()
          worksheet.onChanged.remove(this.worksheetChangeHandler)
          await context.sync()
        })
        this.worksheetChangeHandler = null
        console.log('[ExcelService] Change tracking cleaned up')
      } catch (error) {
        console.error('[ExcelService] Failed to cleanup change tracking:', error)
      }
    }
  }

  // Track user or AI activity
  private trackActivity(type: 'edit' | 'select', range: string): void {
    this.activityLog.push({
      timestamp: Date.now(),
      type,
      range
    })
    
    // Keep only the last MAX_ACTIVITY_LOG_SIZE entries
    if (this.activityLog.length > this.MAX_ACTIVITY_LOG_SIZE) {
      this.activityLog = this.activityLog.slice(-this.MAX_ACTIVITY_LOG_SIZE)
    }
    
    console.log(`[ExcelService] Tracked activity: ${type} on range ${range}`)
  }
  
  // Public method to track activity (for use by other components)
  public trackUserSelection(range: string): void {
    this.trackActivity('select', range)
  }
  
  // Public method to track AI edits
  public trackAIEdit(range: string): void {
    this.trackActivity('edit', range)
  }
  
  // Helper to expand a range by padding rows/columns
  private expandRange(rangeAddress: string, rowPadding: number, colPadding: number): string {
    // Parse the range address (e.g., "A1:C3" or "Sheet1!A1:C3")
    const match = rangeAddress.match(/^(?:(.+)!)?([A-Z]+)(\d+):([A-Z]+)(\d+)$/i)
    if (!match) return rangeAddress // Return original if can't parse
    
    const [, sheet, startCol, startRowStr, endCol, endRowStr] = match
    const startRow = parseInt(startRowStr)
    const endRow = parseInt(endRowStr)
    
    // Convert column letters to numbers
    const colToNum = (col: string) => {
      let num = 0
      for (let i = 0; i < col.length; i++) {
        num = num * 26 + (col.charCodeAt(i) - 65 + 1)
      }
      return num
    }
    
    // Convert numbers back to column letters
    const numToCol = (num: number) => {
      let col = ''
      while (num > 0) {
        num--
        col = String.fromCharCode(65 + (num % 26)) + col
        num = Math.floor(num / 26)
      }
      return col
    }
    
    const startColNum = colToNum(startCol)
    const endColNum = colToNum(endCol)
    
    // Apply padding (but don't go below 1)
    const newStartRow = Math.max(1, startRow - rowPadding)
    const newEndRow = endRow + rowPadding
    const newStartCol = Math.max(1, startColNum - colPadding)
    const newEndCol = endColNum + colPadding
    
    const expandedRange = `${numToCol(newStartCol)}${newStartRow}:${numToCol(newEndCol)}${newEndRow}`
    return sheet ? `${sheet}!${expandedRange}` : expandedRange
  }

  // Clear cache when needed
  clearCache(): void {
    this.worksheetCache.clear()
  }
  
  // Programmatically select a range in Excel
  async selectRange(rangeAddress: string): Promise<void> {
    console.log(`[ExcelService] Selecting range: ${rangeAddress}`)
    return Excel.run(async (context: any) => {
      try {
        const worksheet = context.workbook.worksheets.getActiveWorksheet()
        const range = worksheet.getRange(rangeAddress)
        range.select()
        await context.sync()
        console.log(`[ExcelService] Successfully selected range: ${rangeAddress}`)
      } catch (error) {
        console.error(`[ExcelService] Error selecting range ${rangeAddress}:`, error)
        throw error
      }
    })
  }

  // Filter empty rows and columns to reduce payload size
  private filterEmptyRowsAndColumns(data: {
    values: any[][],
    formulas?: any[][],
    address: string,
    rowCount: number,
    colCount: number
  }): any {
    console.log(`[ExcelService] filterEmptyRowsAndColumns called for range ${data.address}`);
    console.log(`[ExcelService] Original data size: ${data.rowCount}x${data.colCount} = ${data.rowCount * data.colCount} cells`);
    
    if (!data.values || data.values.length === 0) {
      console.log(`[ExcelService] No values to filter, returning original data`);
      return data;
    }

    // Find last non-empty row
    let lastNonEmptyRow = -1;
    for (let i = data.values.length - 1; i >= 0; i--) {
      const row = data.values[i];
      if (row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        lastNonEmptyRow = i;
        break;
      }
    }
    console.log(`[ExcelService] Last non-empty row: ${lastNonEmptyRow}`);

    // Find last non-empty column
    let lastNonEmptyCol = -1;
    if (lastNonEmptyRow >= 0) {
      for (let j = data.colCount - 1; j >= 0; j--) {
        let hasContent = false;
        for (let i = 0; i <= lastNonEmptyRow; i++) {
          const cell = data.values[i]?.[j];
          if (cell !== null && cell !== undefined && cell !== '') {
            hasContent = true;
            break;
          }
        }
        if (hasContent) {
          lastNonEmptyCol = j;
          break;
        }
      }
    }
    console.log(`[ExcelService] Last non-empty column: ${lastNonEmptyCol}`);

    // If no data, return minimal response
    if (lastNonEmptyRow === -1 || lastNonEmptyCol === -1) {
      console.log(`[ExcelService] No non-empty cells found, returning empty response`);
      return {
        ...data,
        values: [],
        formulas: [],
        rowCount: 0,
        colCount: 0
      };
    }

    // Filter the data
    const filteredValues = data.values
      .slice(0, lastNonEmptyRow + 1)
      .map(row => row.slice(0, lastNonEmptyCol + 1));

    const filteredFormulas = data.formulas
      ? data.formulas
          .slice(0, lastNonEmptyRow + 1)
          .map(row => row.slice(0, lastNonEmptyCol + 1))
      : undefined;

    const newRowCount = lastNonEmptyRow + 1;
    const newColCount = lastNonEmptyCol + 1;
    const originalCellCount = data.rowCount * data.colCount;
    const newCellCount = newRowCount * newColCount;
    const reduction = ((originalCellCount - newCellCount) / originalCellCount * 100).toFixed(1);

    // Log the filtering impact
    console.log(`[ExcelService] ✅ Filtered data from ${data.rowCount}x${data.colCount} (${originalCellCount} cells) to ${newRowCount}x${newColCount} (${newCellCount} cells)`);
    console.log(`[ExcelService] 📉 Payload reduction: ${reduction}%`);

    return {
      ...data,
      values: filteredValues,
      formulas: filteredFormulas,
      rowCount: newRowCount,
      colCount: newColCount
    };
  }



  async getContext(): Promise<ExcelContext> {
    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      const worksheet = workbook.worksheets.getActiveWorksheet()
      const range = workbook.getSelectedRange()

      workbook.load('name')
      worksheet.load('name')
      range.load('address')

      await context.sync()

      return {
        workbook: workbook.name,
        worksheet: worksheet.name,
        selectedRange: range.address
      }
    })
  }

  // Get comprehensive context with configurable depth
  async getComprehensiveContext(options: {
    includeAllSheets?: boolean
    maxCellsPerSheet?: number
    includeFormulas?: boolean
    includeFormatting?: boolean
  } = {}): Promise<ComprehensiveContext> {
    const {
      includeAllSheets = false,
      maxCellsPerSheet = 10000,
      includeFormulas = true,
      // includeFormatting = false
    } = options

    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      const activeWorksheet = workbook.worksheets.getActiveWorksheet()
      const selectedRange = workbook.getSelectedRange()

      // Load basic info
      workbook.load('name')
      activeWorksheet.load('name')
      selectedRange.load(['address', 'rowCount', 'columnCount'])

      await context.sync()

      const result: ComprehensiveContext = {
        workbook: workbook.name,
        worksheet: activeWorksheet.name,
        selectedRange: selectedRange.address
      }

      // Get selected range data
      if (selectedRange.rowCount * selectedRange.columnCount < 1000) {
        selectedRange.load(['values', 'formulas'])
        await context.sync()
        
        result.selectedData = {
          values: selectedRange.values,
          formulas: selectedRange.formulas,
          address: selectedRange.address,
          rowCount: selectedRange.rowCount,
          colCount: selectedRange.columnCount
        }
      }

      // Get visible range data (what user sees on screen)
      try {
        const visibleRange = activeWorksheet.getUsedRange()
        if (visibleRange) {
          visibleRange.load(['address', 'rowCount', 'columnCount'])
          await context.sync()

          if (visibleRange.rowCount * visibleRange.columnCount < maxCellsPerSheet) {
            visibleRange.load(['values', 'formulas'])
            await context.sync()

            result.visibleRangeData = {
              values: visibleRange.values,
              formulas: includeFormulas ? visibleRange.formulas : undefined,
              address: visibleRange.address,
              rowCount: visibleRange.rowCount,
              colCount: visibleRange.columnCount
            }
          }
        }
      } catch (e) {
        console.log('No used range in active sheet')
      }

      // Get all sheets data if requested
      if (includeAllSheets) {
        // Check cache for workbook summary
        const now = Date.now()
        if (this.workbookSummaryCache && 
            (now - this.cacheTimestamp) < this.CACHE_DURATION) {
          result.workbookSummary = this.workbookSummaryCache
          console.log('Using cached workbook summary')
          return result
        }
        
        const sheets = workbook.worksheets
        sheets.load('items')
        await context.sync()

        const workbookData: WorkbookData = {
          sheets: [],
          namedRanges: [],
          activeSheet: activeWorksheet.name,
          totalCells: 0
        }

        for (const sheet of sheets.items) {
          sheet.load('name')
          const usedRange = sheet.getUsedRange()
          
          if (usedRange) {
            usedRange.load(['address', 'rowCount', 'columnCount'])
            await context.sync()

            const cellCount = usedRange.rowCount * usedRange.columnCount
            workbookData.totalCells += cellCount

            // Only load data if under threshold
            if (cellCount < maxCellsPerSheet) {
              usedRange.load(['values', 'formulas'])
              await context.sync()

              workbookData.sheets.push({
                name: sheet.name,
                usedRange: usedRange.address,
                data: {
                  values: usedRange.values,
                  formulas: includeFormulas ? usedRange.formulas : undefined,
                  address: usedRange.address,
                  rowCount: usedRange.rowCount,
                  colCount: usedRange.columnCount
                },
                lastRow: usedRange.rowCount,
                lastColumn: usedRange.columnCount
              })
            } else {
              // For large sheets, just send summary
              workbookData.sheets.push({
                name: sheet.name,
                usedRange: usedRange.address,
                data: {
                  values: [['Sheet too large to load fully']],
                  address: usedRange.address,
                  rowCount: usedRange.rowCount,
                  colCount: usedRange.columnCount
                },
                lastRow: usedRange.rowCount,
                lastColumn: usedRange.columnCount
              })
            }
          }
        }

        // Cache the result
        this.workbookSummaryCache = workbookData
        this.cacheTimestamp = Date.now()
        
        result.workbookSummary = workbookData
      }

      return result
    })
  }
  
  // Add cache invalidation method
  invalidateWorkbookCache() {
    this.workbookSummaryCache = null
    this.cacheTimestamp = 0
  }

  // Add comprehensive merge detection method
  private async detectMergedCells(worksheet: any, rangeAddress: string): Promise<{
    mergedCellsMap: Map<string, { area: string; anchor: string; cellCount: number }>;
    mergedAreas: Array<{ area: string; anchor: string; rowCount: number; colCount: number }>;
  }> {
    const mergedCellsMap = new Map<string, { area: string; anchor: string; cellCount: number }>();
    const mergedAreas: Array<{ area: string; anchor: string; rowCount: number; colCount: number }> = [];
    
    try {
      // Get all merged areas in the worksheet
      const allMergedAreas = worksheet.getMergedAreas();
      allMergedAreas.load(['areaCount']);
      await worksheet.context.sync();
      
      if (allMergedAreas.areaCount > 0) {
        allMergedAreas.load('areas');
        await worksheet.context.sync();
        
        // Load details for each merged area
        for (let i = 0; i < allMergedAreas.areas.items.length; i++) {
          const area = allMergedAreas.areas.items[i];
          area.load(['address', 'rowCount', 'columnCount', 'rowIndex', 'columnIndex']);
        }
        await worksheet.context.sync();
        
        // Process each merged area
        for (let i = 0; i < allMergedAreas.areas.items.length; i++) {
          const area = allMergedAreas.areas.items[i];
          const areaAddress = area.address;
          const [anchorCell] = areaAddress.split(':');
          const cellCount = area.rowCount * area.columnCount;
          
          // Add to areas list
          mergedAreas.push({
            area: areaAddress,
            anchor: anchorCell,
            rowCount: area.rowCount,
            colCount: area.columnCount
          });
          
          // Map all cells in this merged area
          for (let row = 0; row < area.rowCount; row++) {
            for (let col = 0; col < area.columnCount; col++) {
              const cellAddress = this.getCellAddressRelative(
                area.rowIndex + row,
                area.columnIndex + col
              );
              mergedCellsMap.set(cellAddress, {
                area: areaAddress,
                anchor: anchorCell,
                cellCount: cellCount
              });
            }
          }
        }
      }
    } catch (e) {
      console.log('[Context] Could not detect merged cells:', e);
    }
    
    return { mergedCellsMap, mergedAreas };
  }

  // Helper to get cell address from indices
  private getCellAddressRelative(row: number, col: number): string {
    const colLetter = this.columnToLetter(col);
    return `${colLetter}${row + 1}`;
  }

  // Optimized method to get context around selection
  async getSmartContext(): Promise<ComprehensiveContext> {
    console.log('[ExcelService] getSmartContext called')
    
    // Check activity log for recent edits vs selections
    const lastSelect = this.activityLog
      .filter(a => a.type === 'select')
      .slice(-1)[0]
    const lastEdit = this.activityLog
      .filter(a => a.type === 'edit')
      .slice(-1)[0]
    
    // Determine if we should expand context based on recent AI edits
    const shouldUseEditContext = lastEdit && (!lastSelect || lastEdit.timestamp > lastSelect.timestamp)
    
    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      const worksheet = workbook.worksheets.getActiveWorksheet()
      const selectedRange = workbook.getSelectedRange()

      workbook.load('name')
      worksheet.load('name')
      selectedRange.load(['address', 'rowIndex', 'columnIndex', 'rowCount', 'columnCount'])

      await context.sync()
      
      console.log('[ExcelService] Basic context loaded:', {
        workbook: workbook.name,
        worksheet: worksheet.name,
        selectedRange: selectedRange.address,
        shouldUseEditContext,
        lastEditRange: lastEdit?.range
      })

      // Check if this is a blank sheet or default selection
      const isDefaultSelection = selectedRange.address === 'A1' || 
                               selectedRange.address === 'Sheet1!A1' ||
                               (selectedRange.rowCount === 1 && selectedRange.columnCount === 1)
      
      const result: ComprehensiveContext = {
        workbook: workbook.name,
        worksheet: worksheet.name,
        selectedRange: selectedRange.address,
        recentEdits: this.recentEdits // Include recent edits with old/new values
      }

      // ALWAYS load the full sheet data to give AI complete visibility
      try {
        const fullSheetRange = worksheet.getUsedRange()
        if (fullSheetRange) {
          fullSheetRange.load(['values', 'formulas', 'address', 'rowCount', 'columnCount'])
          await context.sync()
          
          // Check if the sheet size is reasonable (under 10,000 cells for performance)
          const totalCells = fullSheetRange.rowCount * fullSheetRange.columnCount
          if (totalCells <= 10000) {
            result.fullSheetData = {
              values: fullSheetRange.values,
              formulas: fullSheetRange.formulas,
              address: fullSheetRange.address,
              rowCount: fullSheetRange.rowCount,
              colCount: fullSheetRange.columnCount,
              isFullSheet: true
            }
            console.log('[ExcelService] Loaded full sheet data:', {
              address: fullSheetRange.address,
              cells: totalCells
            })
            
            // Add comprehensive merge detection
            const mergeInfo = await this.detectMergedCells(worksheet, fullSheetRange.address);
            
            if (mergeInfo.mergedAreas.length > 0) {
              result.mergeInfo = {
                totalMergedAreas: mergeInfo.mergedAreas.length,
                totalMergedCells: mergeInfo.mergedCellsMap.size,
                mergedAreas: mergeInfo.mergedAreas,
                largestMergeArea: mergeInfo.mergedAreas.reduce((largest, current) => 
                  (current.rowCount * current.colCount > largest.rowCount * largest.colCount) ? current : largest
                )
              };
              
              // Add merge state to individual cell data
              if (result.fullSheetData) {
                result.fullSheetData.mergedCells = mergeInfo.mergedAreas.map(area => ({
                  range: area.area,
                  anchor: area.anchor,
                  size: `${area.rowCount}x${area.colCount}`
                }));
              }
              
              console.log('[ExcelService] Detected merged cells:', {
                totalAreas: mergeInfo.mergedAreas.length,
                totalCells: mergeInfo.mergedCellsMap.size
              });
            }
          } else {
            // For large sheets, load a reasonable subset
            console.log('[ExcelService] Sheet too large, loading subset:', {
              totalCells,
              address: fullSheetRange.address
            })
            // Load first 100 rows as a sample
            const sampleRange = worksheet.getRangeByIndexes(0, 0, Math.min(100, fullSheetRange.rowCount), fullSheetRange.columnCount)
            sampleRange.load(['values', 'formulas', 'address'])
            await context.sync()
            
            result.fullSheetData = {
              values: sampleRange.values,
              formulas: sampleRange.formulas,
              address: sampleRange.address,
              rowCount: sampleRange.rowCount,
              colCount: sampleRange.columnCount,
              isFullSheet: false,
              totalRows: fullSheetRange.rowCount,
              totalCols: fullSheetRange.columnCount,
              note: `Sheet has ${totalCells} cells. Showing first 100 rows.`
            }
          }
        }
      } catch (e) {
        console.log('[ExcelService] No used range found, sheet might be empty')
        // Sheet is completely empty
        result.fullSheetData = {
          values: [[""]],
          formulas: [[""]],
          address: "A1",
          rowCount: 1,
          colCount: 1,
          isFullSheet: true,
          isEmpty: true
        }
      }

      // If we should use edit context and no new user selection, focus on AI-edited area
      if (shouldUseEditContext && isDefaultSelection && lastEdit) {
        console.log('[ExcelService] Using AI edit context instead of default selection')
        
        try {
          // Parse and use the AI-edited range
          const editedRange = worksheet.getRange(lastEdit.range)
          editedRange.load(['address', 'rowIndex', 'columnIndex', 'rowCount', 'columnCount', 'values', 'formulas'])
          await context.sync()
          
          // Update the result to focus on edited area
          result.selectedRange = editedRange.address
          result.selectedData = {
            values: editedRange.values,
            formulas: editedRange.formulas,
            address: editedRange.address,
            rowCount: editedRange.rowCount,
            colCount: editedRange.columnCount
          }
          
          // Get expanded context around the edit
          const expandedRange = this.expandRange(lastEdit.range, 5, 5)
          const nearbyRange = worksheet.getRange(expandedRange)
          nearbyRange.load(['values', 'formulas', 'address', 'rowCount', 'columnCount'])
          await context.sync()
          
          result.nearbyData = {
            values: nearbyRange.values,
            formulas: nearbyRange.formulas,
            address: nearbyRange.address,
            rowCount: nearbyRange.rowCount,
            colCount: nearbyRange.columnCount
          }
          
          console.log('[ExcelService] Dynamic context expanded around AI edit:', expandedRange)
          return result
        } catch (e) {
          console.warn('[ExcelService] Could not use AI edit context, falling back to normal flow:', e)
          // Fall through to normal processing
        }
      }

      // For blank sheet or default selection, provide intelligent context
      if (isDefaultSelection) {
        // Quick scan to check if sheet is empty
        const scanRange = worksheet.getRange("A1:K30")
        scanRange.load(['values'])
        await context.sync()
        
        let hasData = false
        for (let row of scanRange.values) {
          if (row.some((cell: any) => cell !== null && cell !== "")) {
            hasData = true
            break
          }
        }
        
        if (!hasData) {
          // Sheet is empty - provide starter context
          console.log('[ExcelService] Detected blank sheet, providing starter context')
          result.selectedData = {
            values: [[""]],
            formulas: [[""]],
            address: "A1",
            rowCount: 1,
            colCount: 1,
            isBlankSheet: true
          }
          
          // Provide a reasonable working area for new content
          const starterRange = worksheet.getRange("A1:K20")
          starterRange.load(['values', 'formulas', 'address'])
          await context.sync()
          
          result.nearbyData = {
            values: starterRange.values,
            formulas: starterRange.formulas,
            address: starterRange.address,
            rowCount: 20,
            colCount: 11,
            suggestedWorkArea: true
          }
          
          console.log('[ExcelService] Blank sheet context prepared')
          return result
        }
      }
      
      // Get selected range data for non-blank sheets
      selectedRange.load(['values', 'formulas'])
      await context.sync()
      
      result.selectedData = {
        values: selectedRange.values,
        formulas: selectedRange.formulas,
        address: selectedRange.address,
        rowCount: selectedRange.rowCount,
        colCount: selectedRange.columnCount
      }

      // For sheets with data, get context around selection or data
      let contextStartRow, contextStartCol, contextRowCount, contextColCount
      
      if (isDefaultSelection && !result.selectedData.isBlankSheet) {
        // Find where data actually exists
        const usedRange = worksheet.getUsedRange()
        usedRange.load(['rowIndex', 'columnIndex', 'rowCount', 'columnCount'])
        await context.sync()
        
        // Build context around actual data, not just selection
        contextStartRow = Math.max(0, usedRange.rowIndex - 5)
        contextStartCol = Math.max(0, usedRange.columnIndex - 5)
        contextRowCount = usedRange.rowCount + 20 // Extra space below for additions
        contextColCount = usedRange.columnCount + 10
      } else {
        // Normal selection - get nearby context
        contextStartRow = Math.max(0, selectedRange.rowIndex - 20)
        contextStartCol = Math.max(0, selectedRange.columnIndex - 10)
        contextRowCount = selectedRange.rowCount + 40
        contextColCount = selectedRange.columnCount + 20
      }

      try {
        const nearbyRange = worksheet.getRangeByIndexes(
          contextStartRow, contextStartCol, 
          contextRowCount, contextColCount
        )
        nearbyRange.load(['values', 'formulas', 'address', 'rowCount', 'columnCount'])
        await context.sync()

        result.nearbyData = {
          values: nearbyRange.values,
          formulas: nearbyRange.formulas,
          address: nearbyRange.address,
          rowCount: nearbyRange.rowCount,
          colCount: nearbyRange.columnCount
        }
      } catch (e) {
        console.log('[ExcelService] Could not get nearby range:', e)
      }

      // Debug log the complete context before returning
      console.log('🎯 [ExcelService] Final Smart Context Result:', {
        workbook: result.workbook,
        worksheet: result.worksheet,
        selectedRange: result.selectedRange,
        selectedDataSummary: result.selectedData ? {
          address: result.selectedData.address,
          rowCount: result.selectedData.rowCount,
          colCount: result.selectedData.colCount,
          hasValues: !!result.selectedData.values,
          firstValue: result.selectedData.values?.[0]?.[0],
          isBlankSheet: result.selectedData.isBlankSheet
        } : 'No selected data',
        nearbyDataSummary: result.nearbyData ? {
          address: result.nearbyData.address,
          rowCount: result.nearbyData.rowCount,
          colCount: result.nearbyData.colCount,
          hasValues: !!result.nearbyData.values,
          firstFewValues: result.nearbyData.values?.slice(0, 3).map(row => row.slice(0, 3))
        } : 'No nearby data'
      });
      
      console.log('[ExcelService] getSmartContext completed successfully')
      return result
    }).catch((error: any) => {
      console.error('[ExcelService] getSmartContext error:', error)
      throw error
    })
  }

  async readRange(address: string): Promise<CellData[][]> {
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const range = worksheet.getRange(address)
      
      range.load(['values', 'formulas', 'address'])
      await context.sync()
      
      const result: CellData[][] = []
      for (let i = 0; i < range.values.length; i++) {
        const row: CellData[] = []
        for (let j = 0; j < range.values[i].length; j++) {
          row.push({
            address: this.getCellAddress(range.address, i, j),
            value: range.values[i][j],
            formula: range.formulas[i][j]
          })
        }
        result.push(row)
      }
      
      return result
    })
  }

  // Helper to calculate cell address
  private getCellAddress(rangeAddress: string, row: number, col: number): string {
    // Simple implementation - would need enhancement for complex ranges
    const match = rangeAddress.match(/([A-Z]+)(\d+)/)
    if (match) {
      const startCol = match[1]
      const startRow = parseInt(match[2])
      return this.columnToLetter(this.letterToColumn(startCol) + col) + (startRow + row)
    }
    return rangeAddress
  }

  private letterToColumn(letter: string): number {
    let column = 0
    for (let i = 0; i < letter.length; i++) {
      column = column * 26 + (letter.charCodeAt(i) - 65 + 1)
    }
    return column - 1
  }

  private columnToLetter(column: number): string {
    let letter = ''
    column++
    while (column > 0) {
      const remainder = (column - 1) % 26
      letter = String.fromCharCode(65 + remainder) + letter
      column = Math.floor((column - 1) / 26)
    }
    return letter
  }

  private validateAndNormalizeFormat(format: string, formatMap: { [key: string]: string }): string {
    if (!format || typeof format !== 'string') {
      console.warn(`⚠️ Invalid format provided: ${format}, using General`)
      return 'General'
    }

    // First try exact match in format map
    const lowerFormat = format.toLowerCase().trim()
    if (formatMap[lowerFormat]) {
      return formatMap[lowerFormat]
    }

    // Check if it's already a valid Excel format code
    if (this.isValidExcelFormat(format)) {
      return format
    }

    // Try to infer format from common patterns
    const inferredFormat = this.inferFormatFromPattern(format)
    if (inferredFormat) {
      return inferredFormat
    }

    // Fallback to General if nothing matches
    console.warn(`⚠️ Unknown format "${format}", using General`)
    return 'General'
  }

  private isValidExcelFormat(format: string): boolean {
    // Basic validation for Excel format codes
    // Check for common Excel format patterns
    const validPatterns = [
      /^[0#]*\.?[0#]*%?$/, // Basic number patterns like 0.00, #,##0, 0%
      /^[0#,]*\.?[0#]*$/, // Number with commas
      /^\$[#,0]*\.?[0#]*$/, // Currency patterns
      /^[mdhysq\/\-\s:]*$/i, // Date/time patterns
      /^@$/, // Text format
      /^General$/i, // General format
      /^0\.00E\+00$/i, // Scientific notation
      /^[#0\s]*\?+\/[#0\s]*$/ // Fraction patterns
    ]

    return validPatterns.some(pattern => pattern.test(format))
  }

  private inferFormatFromPattern(format: string): string | null {
    const lower = format.toLowerCase()
    
    // Try to match partial patterns
    if (lower.includes('$') || lower.includes('dollar') || lower.includes('currency')) {
      return '$#,##0.00'
    }
    if (lower.includes('%') || lower.includes('percent')) {
      return '0.00%'
    }
    if (lower.includes('date')) {
      return 'm/d/yyyy'
    }
    if (lower.includes('time')) {
      return 'h:mm:ss AM/PM'
    }
    if (lower.includes('comma') || lower.includes('thousand')) {
      return '#,##0.00'
    }
    if (lower.includes('decimal') || lower.includes('number')) {
      return '0.00'
    }
    
    return null
  }

  // Tool executor for AI requests
  async executeToolRequest(tool: string, input: any): Promise<any> {
    console.log(`[✅ Diff Apply Success] ExcelService received tool request to execute.`, { tool, input });
    
    try {
      switch (tool) {
        case 'read_range':
          return await this.toolReadRange(input)
        case 'write_range':
          return await this.toolWriteRange(input)
        case 'apply_formula':
          return await this.toolApplyFormula(input)
        case 'analyze_data':
          return await this.toolAnalyzeData(input)
        case 'format_range':
          return await this.toolFormatRange(input)
        case 'create_chart':
          return await this.toolCreateChart(input)
        case 'validate_model':
          return await this.toolValidateModel(input)
        case 'get_named_ranges':
          return await this.toolGetNamedRanges(input)
        case 'create_named_range':
          return await this.toolCreateNamedRange(input)
        case 'clear_range':
          return await this.toolClearRange(input)
        case 'insert_rows_columns':
          return await this.toolInsertRowsColumns(input)
        case 'apply_layout':
          return await this.toolApplyLayout(input)
        default:
          console.error(`[❌ Diff Error] Unknown tool requested in ExcelService: ${tool}`);
          throw new Error(`Unknown tool: ${tool}`)
      }
    } catch (error) {
      console.error(`[❌ Diff Error] Error during tool execution in ExcelService.`, { tool, error });
      
      // Throw custom error with detailed information
      throw new ToolExecutionError(tool, input, error);
    }
  }

  // Enhanced batch execute with proper grouping and ordering
  public async batchExecuteToolRequests(requests: any[]): Promise<any[]> {
    // Group requests by type for optimal execution
    const grouped = this.groupRequestsByType(requests);
    
    return Excel.run(async (context: any) => {
      const results: any[] = new Array(requests.length);
      
      // Execute each group efficiently
      for (const [tool, groupRequests] of grouped) {
        const groupResults = await this.executeBatchByType(tool, groupRequests, context);
        
        // Map results back to original order
        groupResults.forEach((result, index) => {
          const originalIndex = groupRequests[index].originalIndex;
          results[originalIndex] = result;
        });
      }
      
      // Single sync for all operations
      await context.sync();
      return results;
    });
  }

  private groupRequestsByType(requests: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    requests.forEach((request, index) => {
      const tool = request.tool;
      if (!groups.has(tool)) {
        groups.set(tool, []);
      }
      groups.get(tool)!.push({ ...request, originalIndex: index });
    });
    
    return groups;
  }

  private async executeBatchByType(tool: string, requests: any[], context: any): Promise<any[]> {
    const results = [];
    
    for (const request of requests) {
      try {
        let result;
        switch (tool) {
          case 'write_range':
            result = await this.toolWriteRange(request, context);
            break;
          case 'apply_formula':
            result = await this.toolApplyFormula(request, context);
            break;
          case 'format_range':
            result = await this.toolFormatRange(request, context);
            break;
          case 'clear_range':
            // toolClearRange doesn't accept context parameter
            result = await this.toolClearRange(request);
            break;
          case 'apply_layout':
            result = await this.toolApplyLayout(request, context);
            break;
          default:
            result = { error: `Tool ${tool} is not batchable` };
        }
        results.push(result);
      } catch (error) {
        results.push({ error: (error as Error).message });
      }
    }
    
    return results;
  }

  // Batch execute multiple tool requests in a single Excel.run call
  public async batchExecute(requests: BatchableRequest[]): Promise<any[]> {
    return Excel.run(async (context: any) => {
      const results = [];
      for (const request of requests) {
        try {
          let result;
          switch (request.tool) {
            case 'write_range':
              result = await this.toolWriteRange(request.input, context);
              break;
            case 'apply_formula':
              result = await this.toolApplyFormula(request.input, context);
              break;
            case 'format_range':
              result = await this.toolFormatRange(request.input, context);
              break;
            case 'apply_layout':
              result = await this.toolApplyLayout(request.input, context);
              break;
            // Add other batchable tools here
            default:
              result = { error: `Tool ${request.tool} is not batchable` };
          }
          results.push(result);
        } catch (error) {
          results.push({ error: (error as Error).message });
        }
      }
      await context.sync();
      return results;
    });
  }

  // Batch read multiple ranges in a single Excel.run call for performance
  async batchReadRange(requests: { requestId: string; range: string }[]): Promise<Map<string, RangeData | null>> {
    console.log(`[ExcelService] Batch reading ${requests.length} ranges`);
    
    return Excel.run(async (context: any) => {
      const results = new Map<string, RangeData | null>();
      const rangePromises = [];
      
      // Load all ranges in parallel
      for (const request of requests) {
        try {
          const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, request.range);
          const range = worksheet.getRange(rangeAddress);
          
          // Load all required properties
          range.load(['values', 'formulas', 'address', 'rowCount', 'columnCount']);
          rangePromises.push({ requestId: request.requestId, range });
        } catch (error) {
          console.error(`[ExcelService] Failed to load range ${request.range}:`, error);
          results.set(request.requestId, null);
        }
      }
      
      // Single sync call for all ranges
      await context.sync();
      
      // Process results
      for (const { requestId, range } of rangePromises) {
        try {
          console.log(`[ExcelService] Processing range ${range.address} for request ${requestId}`);
          
          const data: RangeData = {
            values: range.values,
            formulas: range.formulas,
            address: range.address,
            rowCount: range.rowCount,
            colCount: range.columnCount
          };
          
          console.log(`[ExcelService] Original range data: ${data.rowCount}x${data.colCount} = ${data.rowCount * data.colCount} cells`);
          
          // Apply filtering to reduce payload size
          const filteredData = this.filterEmptyRowsAndColumns(data);
          
          console.log(`[ExcelService] Filtered range data: ${filteredData.rowCount}x${filteredData.colCount} = ${filteredData.rowCount * filteredData.colCount} cells`);
          
          results.set(requestId, filteredData);
        } catch (error) {
          console.error(`[ExcelService] Failed to process range result:`, error);
          results.set(requestId, null);
        }
      }
      
      return results;
    });
  }

  private async getWorksheetFromRange(context: any, rangeStr: string): Promise<{worksheet: any, rangeAddress: string}> {
      let sheetName: string | null = null;
      let rangeAddress = rangeStr;

      if (rangeStr.includes('!')) {
          const parts = rangeStr.split('!');
          sheetName = parts[0].replace(/'/g, ''); // Remove single quotes
          rangeAddress = parts[1];
      }

      const worksheet = sheetName 
          ? context.workbook.worksheets.getItem(sheetName)
          : context.workbook.worksheets.getActiveWorksheet();
      
      // Load worksheet properties to avoid errors
      worksheet.load(['name', 'id', 'position']);
      await context.sync();
      
      return { worksheet, rangeAddress };
  }

  // Helper method to check if a range is rectangular
  private isRectangularRange(range: any): boolean {
    try {
      // A range is rectangular if it has consistent row and column counts
      return range.rowCount > 0 && range.columnCount > 0;
    } catch {
      return false;
    }
  }

  // Helper method to detect existing merge state
  private async detectMergeState(range: any, context: any): Promise<{
    hasMergedCells: boolean;
    isFullyMerged: boolean;
    mergeAreas: string[];
  }> {
    const mergedAreas = range.getMergedAreasOrNullObject();
    mergedAreas.load(['areaCount', 'areas']);
    await context.sync();
    
    if (mergedAreas.isNullObject) {
      return { hasMergedCells: false, isFullyMerged: false, mergeAreas: [] };
    }
    
    const areas: string[] = [];
    for (let i = 0; i < mergedAreas.areas.items.length; i++) {
      const area = mergedAreas.areas.items[i];
      area.load('address');
    }
    await context.sync();
    
    for (let i = 0; i < mergedAreas.areas.items.length; i++) {
      areas.push(mergedAreas.areas.items[i].address);
    }
    
    // Check if the entire range is already merged
    const isFullyMerged = areas.length === 1 && areas[0] === range.address;
    
    return {
      hasMergedCells: areas.length > 0,
      isFullyMerged,
      mergeAreas: areas
    };
  }

  private async toolApplyLayout(input: any, excelContext?: any): Promise<any> {
    const { range, merge, preserve_content = true } = input;
    
    console.log(`[📐 Layout] Executing toolApplyLayout`, { range, merge, preserve_content });
    
    const run = async (context: any) => {
      try {
        const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
        const excelRange = worksheet.getRange(rangeAddress);
        
        // Load range properties for validation
        excelRange.load(['rowCount', 'columnCount', 'values', 'formulas', 'address']);
        await context.sync();
        
        // Validate rectangular range
        if (!this.isRectangularRange(excelRange)) {
          throw new Error(`Range "${range}" is not rectangular and cannot be merged`);
        }
        
        // Store original state for edit tracking
        const oldValues = excelRange.values;
        const oldFormulas = excelRange.formulas;
        
        // Detect current merge state
        const mergeState = await this.detectMergeState(excelRange, context);
        
        // Apply merge if requested
        if (merge) {
          // Handle different merge scenarios
          if (merge === 'unmerge') {
            if (!mergeState.hasMergedCells) {
              console.log(`[📐 Layout] Range ${range} is not merged, skipping unmerge`);
            } else {
              excelRange.unmerge();
              console.log(`[📐 Layout] Unmerged range ${range}`);
            }
          } else {
            // Check for partial merges that would cause issues
            if (mergeState.hasMergedCells && !mergeState.isFullyMerged) {
              throw new Error(`Range "${range}" contains partially merged cells. Please unmerge first.`);
            }
            
            // Warn if content will be lost
            if (!preserve_content && oldValues.length > 0) {
              const nonEmptyCells = [];
              for (let i = 0; i < oldValues.length; i++) {
                for (let j = 0; j < oldValues[i].length; j++) {
                  if (oldValues[i][j] !== null && oldValues[i][j] !== '') {
                    if (!(i === 0 && j === 0)) { // Not the top-left cell
                      nonEmptyCells.push(`${this.columnToLetter(j)}${i + 1}`);
                    }
                  }
                }
              }
              if (nonEmptyCells.length > 0) {
                console.warn(`[⚠️ Layout] Merging will lose content in cells: ${nonEmptyCells.join(', ')}`);
              }
            }
            
            // Perform merge
            const mergeAcross = merge === 'across';
            excelRange.merge(mergeAcross);
            console.log(`[📐 Layout] Merged range ${range} (across: ${mergeAcross})`);
          }
        }
        
        await context.sync();
        
        // Track the layout change with enhanced metadata
        const editEntry = {
          range: range,
          timestamp: new Date().toISOString(),
          source: 'ai',
          tool: 'apply_layout',
          oldValues: oldValues,
          oldFormulas: oldFormulas,
          layoutChange: { 
            merge: merge,
            previousMergeState: mergeState,
            preservedContent: preserve_content
          }
        };
        
        this.recentEdits.unshift(editEntry);
        if (this.recentEdits.length > this.MAX_RECENT_EDITS) {
          this.recentEdits.pop();
        }
        
        console.log(`[📐 Layout] Layout applied successfully to ${range}`);
        return { 
          message: `Layout applied successfully to ${range}`, 
          status: 'success',
          details: { 
            merge: merge,
            cellsAffected: excelRange.rowCount * excelRange.columnCount,
            previouslyMerged: mergeState.hasMergedCells
          }
        };
        
      } catch (error) {
        console.error(`[❌ Layout Error] Failed to apply layout to ${range}:`, error);
        if (error instanceof Error && (error as any).code === 'ItemNotFound') {
          throw new Error(`Sheet or range not found for "${range}". Please ensure the sheet exists.`);
        }
        throw new Error(`Failed to apply layout to range "${range}": ${(error as Error).message}`);
      }
    };
    
    return excelContext ? run(excelContext) : Excel.run(run);
  }

  private async toolReadRange(input: any): Promise<RangeData> {
    const { range, include_formulas = true, include_formatting = false } = input
    
    console.log(`📊 toolReadRange called with range: ${range}`)
    
    return Excel.run(async (context: any) => {
      console.log('📊 Inside Excel.run')
      
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      console.log('📊 Got active worksheet')
      
      const excelRange = worksheet.getRange(range)
      console.log('📊 Got range object')
      
      const loadProperties = ['values', 'address', 'rowCount', 'columnCount']
      if (include_formulas) {
        loadProperties.push('formulas')
      }
      if (include_formatting) {
        loadProperties.push('format')
      }
      
      // Check size before loading
      excelRange.load(['rowCount', 'columnCount'])
      await context.sync()
      
      const totalCells = excelRange.rowCount * excelRange.columnCount
      const MAX_CELLS = 5000
      
      if (totalCells > MAX_CELLS) {
        // Return summary for large ranges
        console.log(`📊 Range too large (${totalCells} cells), returning summary`)
        return {
          values: [[`[Range contains ${excelRange.rowCount}×${excelRange.columnCount} cells - too large to display]`]],
          address: excelRange.address,
          rowCount: excelRange.rowCount,
          colCount: excelRange.columnCount,
          truncated: true
        }
      }
      
      console.log('📊 Loading properties:', loadProperties)
      excelRange.load(loadProperties)
      
      console.log('📊 Calling context.sync()...')
      await context.sync()
      console.log('📊 context.sync() completed')
      
      const result: RangeData = {
        values: excelRange.values,
        address: excelRange.address,
        rowCount: excelRange.rowCount,
        colCount: excelRange.columnCount
      }
      
      console.log(`📊 Original data size: ${result.rowCount}x${result.colCount} = ${result.rowCount * result.colCount} cells`)
      console.log(`📊 First few values:`, result.values.slice(0, 3).map(row => row.slice(0, 5)))
      
      if (include_formulas) {
        result.formulas = excelRange.formulas
      }
      
      if (include_formatting) {
        // Extract formatting - simplified for now
        result.formatting = []
      }
      
      // Apply filtering to reduce payload size
      const filteredResult = this.filterEmptyRowsAndColumns(result);
      
      console.log(`📊 Filtered data size: ${filteredResult.rowCount}x${filteredResult.colCount} = ${filteredResult.rowCount * filteredResult.colCount} cells`)
      console.log('📊 toolReadRange result:', filteredResult)
      return filteredResult
    })
  }

  private async toolWriteRange(input: any, excelContext?: any): Promise<any> {
    const { range, values, edit_tracking_info } = input
    console.log(`[✅ Diff Apply Success] Executing toolWriteRange.`, { range, values });
    
    const run = async (context: any) => {
      try {
        const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
        const excelRange = worksheet.getRange(rangeAddress);
        
        console.log(`[✅ Diff Apply Success] Target determined: Sheet='${worksheet.name}', Range='${rangeAddress}'`);
        
        // If we have edit tracking info, we already have old values from backend
        let oldValues: any[][] | undefined;
        let oldFormulas: any[][] | undefined;
        
        if (edit_tracking_info?.old_values) {
          oldValues = edit_tracking_info.old_values;
          oldFormulas = edit_tracking_info.old_formulas;
        } else {
          // Capture current values and formulas before write
          excelRange.load(['values', 'formulas']);
          await context.sync();
          oldValues = excelRange.values;
          oldFormulas = excelRange.formulas;
        }
        
        const cleanedValues = values.map((row: any[]) =>
          row.map((cell: any) => (cell === undefined || cell === null) ? '' : cell)
        );
        
        // Validate and clean values before writing
        const finalValues = cleanedValues.map((row: any[]) =>
          row.map((cell: any) => {
            // Convert undefined/null to empty string
            if (cell === undefined || cell === null) {
              return ''
            }
            // Ensure numbers are properly typed
            if (typeof cell === 'string' && !isNaN(Number(cell)) && cell !== '') {
            return Number(cell)
          }
          return cell
        })
      )
      
      excelRange.values = finalValues;
      await context.sync();
      
      // Store the edit with old/new values in local recent edits
      const editEntry = {
        range: rangeAddress,
        timestamp: new Date().toISOString(),
        source: 'ai',
        tool: 'write_range',
        oldValues: oldValues,
        oldFormulas: oldFormulas,
        newValues: finalValues
      };
      
      // Add to recent edits array
      this.recentEdits.push(editEntry);
      
      // Keep only last MAX_RECENT_EDITS entries
      if (this.recentEdits.length > this.MAX_RECENT_EDITS) {
        this.recentEdits = this.recentEdits.slice(-this.MAX_RECENT_EDITS);
      }
      
      console.log(`[✅ Diff Apply Success] Stored rich edit tracking info`, editEntry);
      
      console.log(`[✅ Diff Apply Success] toolWriteRange completed successfully.`);
      return { message: 'Range written successfully', status: 'success' };

      } catch (error) {
        console.error(`[❌ Diff Error] Failed inside toolWriteRange.`, { range, error });
        if (error instanceof Error && (error as any).code === 'ItemNotFound') {
             throw new Error(`Sheet or range not found for "${range}". Please ensure the sheet exists.`);
        }
        throw new Error(`Failed to write to range "${range}": ${(error as Error).message}`);
      }
    };

    if (excelContext) {
      return run(excelContext);
    }
    return Excel.run(run);
  }

  private async toolApplyFormula(input: any, excelContext?: any): Promise<any> {
    const { range, formula } = input
    console.log(`[✅ Diff Apply Success] Executing toolApplyFormula.`, { range, formula });
    
    const run = async (context: any) => {
      try {
        const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
        const excelRange = worksheet.getRange(rangeAddress);
        
        console.log(`[✅ Diff Apply Success] Target determined: Sheet='${worksheet.name}', Range='${rangeAddress}'`);
      
        // Load range properties to determine size and capture old values
        excelRange.load(['rowCount', 'columnCount', 'address', 'values', 'formulas'])
        await context.sync()
        
        // Capture old values and formulas before applying new formula
        const oldValues = excelRange.values;
        const oldFormulas = excelRange.formulas;
        
        excelRange.formulas = [[formula]]; // Apply to the top-left cell of the range
        await context.sync();
        
        // Track this edit with old/new values
        const editEntry = {
          range: rangeAddress,
          timestamp: new Date().toISOString(),
          source: 'ai',
          tool: 'apply_formula',
          oldValues: oldValues,
          oldFormulas: oldFormulas,
          newValues: [[formula]] // Formula will be evaluated to a value by Excel
        };
        
        // Add to recent edits array
        this.recentEdits.push(editEntry);
        
        // Keep only last MAX_RECENT_EDITS entries
        if (this.recentEdits.length > this.MAX_RECENT_EDITS) {
          this.recentEdits = this.recentEdits.slice(-this.MAX_RECENT_EDITS);
        }
        
        console.log(`[✅ Diff Apply Success] Stored formula edit tracking info`, editEntry);
        console.log(`[✅ Diff Apply Success] toolApplyFormula completed successfully.`);
        return { message: 'Formula applied successfully', status: 'success' };

      } catch (error) {
        console.error(`[❌ Diff Error] Failed inside toolApplyFormula.`, { range, formula, error });
        if (error instanceof Error && (error as any).code === 'ItemNotFound') {
             throw new Error(`Sheet or range not found for "${range}". Please ensure the sheet exists.`);
        }
        throw new Error(`Failed to apply formula to range "${range}": ${(error as Error).message}`);
      }
    };

    if (excelContext) {
      return run(excelContext);
    }
    return Excel.run(run);
  }

  private async toolAnalyzeData(input: any): Promise<DataAnalysis> {
    const { range, detect_headers = true /*, include_statistics = true*/ } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      excelRange.load(['values', 'rowCount', 'columnCount'])
      await context.sync()
      
      const analysis: DataAnalysis = {
        dataTypes: [],
        rowCount: excelRange.rowCount,
        colCount: excelRange.columnCount
      }
      
      // Detect data types and headers
      if (excelRange.values.length > 0) {
        if (detect_headers) {
          analysis.headers = excelRange.values[0].map(String)
        }
        
        // Analyze data types
        for (let col = 0; col < excelRange.columnCount; col++) {
          let columnType = 'mixed'
          const values = excelRange.values.slice(detect_headers ? 1 : 0).map((row: any) => row[col])
          
          if (values.every((v: any) => typeof v === 'number')) {
            columnType = 'number'
          } else if (values.every((v: any) => typeof v === 'string')) {
            columnType = 'string'
          }
          
          analysis.dataTypes.push(columnType)
        }
      }
      
      return analysis
    })
  }

  // Commented out as it's no longer used after batching implementation
  // private async retryOperation<T>(
  //   operation: () => Promise<T>,
  //   maxRetries: number = 3,
  //   delay: number = 1000
  // ): Promise<T> {
  //   let lastError: Error | null = null
    
  //   for (let i = 0; i < maxRetries; i++) {
  //     try {
  //       return await operation()
  //     } catch (error) {
  //       lastError = error as Error
  //       console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error)
        
  //       if (i < maxRetries - 1) {
  //         await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
  //       }
  //     }
  //   }
    
  //   throw lastError
  // }

  private async toolFormatRange(input: any, excelContext?: any): Promise<any> {
    const { range, number_format, font, fill_color, alignment } = input
    
    console.log(`🎨 toolFormatRange called with:`, {
      range,
      number_format,
      font,
      fill_color,
      alignment
    })
    
    const run = async (context: any) => {
      try {
        const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
        const excelRange = worksheet.getRange(rangeAddress)
        
        // Load the range and its format properties
        excelRange.load(['address', 'format'])
        
        // If we need font properties, load them
        if (font) {
          excelRange.format.load('font')
          excelRange.format.font.load(['bold', 'italic', 'size', 'color', 'name'])
        }
        
        // If we need fill properties, load them
        if (fill_color) {
          excelRange.format.load('fill')
          excelRange.format.fill.load('color')
        }
        
        await context.sync()
        console.log(`📍 Formatting range: ${excelRange.address}`)
      
      if (number_format) {
        // Comprehensive format mapping to prevent #VALUE! errors
        const formatMap: { [key: string]: string } = {
          // Basic formats
          'general': 'General',
          'number': '0.00',
          'integer': '0',
          'whole': '0',
          
          // Currency formats - most problematic area
          'currency': '$#,##0.00',
          'dollar': '$#,##0.00',
          'dollars': '$#,##0.00',
          'money': '$#,##0.00',
          'usd': '$#,##0.00',
          'cash': '$#,##0.00',
          'financial': '$#,##0.00',
          'currency_red': '$#,##0.00_);[Red]($#,##0.00)',
          'currency_positive': '$#,##0.00_);($#,##0.00)',
          
          // Accounting formats
          'accounting': '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
          'account': '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
          
          // Percentage formats - second most problematic
          'percentage': '0.00%',
          'percent': '0.00%',
          'pct': '0.00%',
          '%': '0.00%',
          'percentage_whole': '0%',
          'percent_whole': '0%',
          'percentage_1dp': '0.0%',
          'percent_1dp': '0.0%',
          
          // Financial-specific formats
          'basis_points': '0"bps"',
          'bps': '0"bps"',
          'multiple': '0.0"x"',
          'times': '0.0"x"',
          'ratio': '0.00',
          'factor': '0.00',
          'index': '0.00',
          'growth': '0.0%',
          'growth_rate': '0.0%',
          'margin': '0.0%',
          'return': '0.0%',
          'irr': '0.0%',
          'yield': '0.0%',
          'discount': '0.0%',
          'premium': '0.0%',
          
          // Number formats with commas
          'thousands': '#,##0',
          'comma': '#,##0.00',
          'comma_no_decimal': '#,##0',
          'millions': '#,##0,,"M"',
          'billions': '#,##0,,,"B"',
          'thousands_k': '#,##0,"K"',
          
          // Date formats
          'date': 'm/d/yyyy',
          'short_date': 'm/d/yy',
          'long_date': 'mmmm d, yyyy',
          'date_us': 'm/d/yyyy',
          'date_iso': 'yyyy-mm-dd',
          'month_year': 'mmm yyyy',
          'quarter': '"Q"q yyyy',
          'year': 'yyyy',
          
          // Time formats
          'time': 'h:mm:ss AM/PM',
          'time_24': 'h:mm:ss',
          'hours': 'h:mm',
          
          // Text formats
          'text': '@',
          'string': '@',
          
          // Scientific notation
          'scientific': '0.00E+00',
          'exponential': '0.00E+00',
          
          // Fractions
          'fraction': '# ?/?',
          'fraction_halves': '# ?/2',
          'fraction_quarters': '# ?/4',
          'fraction_eighths': '# ?/8',
          'fraction_sixteenths': '# ?/16',
          
          // Special formats for financial modeling
          'input': '0.00',  // Blue font for inputs
          'assumption': '0.00',
          'calculated': '0.00',  // Black font for calculations
          'output': '0.00',  // Bold for outputs
          'total': '0.00',
          'subtotal': '0.00',
          
          // Common Excel format variations that AI might use
          'decimal': '0.00',
          'fixed': '0.00',
          'float': '0.00',
          'numeric': '0.00'
        }
        
        // Validate and normalize format
        const actualFormat = this.validateAndNormalizeFormat(number_format, formatMap)
        
        console.log(`🎨 Format mapping: "${number_format}" -> "${actualFormat}"`)
        
        try {
          excelRange.numberFormat = actualFormat
        } catch (error) {
          console.error(`❌ Failed to apply number format "${actualFormat}":`, error)
          // Try fallback to General format
          try {
            excelRange.numberFormat = 'General'
            console.log(`⚠️ Applied fallback 'General' format instead of "${actualFormat}"`)
          } catch (fallbackError) {
            throw new Error(`Invalid number format and fallback failed: ${number_format}`)
          }
        }
      }
      
      if (font) {
        console.log(`🎨 Applying font formatting:`, font)
        
        try {
          // Get the font object but don't load properties yet
          const rangeFont = excelRange.format.font
          
          // Apply font properties directly without loading first
          // Excel API should handle the loading internally
          if (font.bold !== undefined && font.bold !== null) {
            console.log(`   Setting bold: ${font.bold}`)
            rangeFont.bold = font.bold
          }
          if (font.italic !== undefined && font.italic !== null) {
            console.log(`   Setting italic: ${font.italic}`)
            rangeFont.italic = font.italic
          }
          if (font.size !== undefined && font.size !== null && font.size > 0) {
            console.log(`   Setting size: ${font.size}`)
            rangeFont.size = font.size
          }
          if (font.color !== undefined && font.color !== null && font.color !== '') {
            console.log(`   Setting color: ${font.color}`)
            // Ensure color is in the right format (Excel expects hex without #)
            let colorValue = font.color
            if (colorValue.startsWith('#')) {
              colorValue = colorValue.substring(1)
            }
            rangeFont.color = colorValue
          }
          
          console.log(`✅ Font formatting properties set`)
        } catch (error) {
          console.error(`❌ Failed to apply font formatting:`, error)
          // Log more details about the error
          if (error instanceof Error) {
            console.error(`   Error name: ${error.name}`)
            console.error(`   Error message: ${error.message}`)
            console.error(`   Error stack: ${error.stack}`)
          }
          throw new Error(`Font formatting failed: ${(error as Error).message}`)
        }
      }
      
      if (fill_color) {
        console.log(`🎨 Applying fill color: ${fill_color}`)
        try {
          // Ensure color is in the right format (Excel expects hex without #)
          let colorValue = fill_color
          if (colorValue.startsWith('#')) {
            colorValue = colorValue.substring(1)
          }
          excelRange.format.fill.color = colorValue
          console.log(`✅ Fill color set to: ${colorValue}`)
        } catch (error) {
          console.error(`❌ Failed to apply fill color:`, error)
          if (error instanceof Error) {
            console.error(`   Error details: ${error.name} - ${error.message}`)
          }
          throw new Error(`Fill color formatting failed: ${(error as Error).message}`)
        }
      }
      
      if (alignment) {
        console.log(`🎨 Applying alignment:`, alignment)
        try {
          if (alignment.horizontal) {
            console.log(`   Setting horizontal alignment: ${alignment.horizontal}`)
            excelRange.format.horizontalAlignment = alignment.horizontal
          }
          if (alignment.vertical) {
            console.log(`   Setting vertical alignment: ${alignment.vertical}`)
            excelRange.format.verticalAlignment = alignment.vertical
          }
          console.log(`✅ Alignment set`)
        } catch (error) {
          console.error(`❌ Failed to apply alignment:`, error)
          if (error instanceof Error) {
            console.error(`   Error details: ${error.name} - ${error.message}`)
          }
          throw new Error(`Alignment formatting failed: ${(error as Error).message}`)
        }
      }
      
      await context.sync()
      
      // Log successful format attempt
      FormatErrorHandler.logFormatAttempt(input, true)
      
      return {
        message: 'Formatting applied successfully',
        status: 'success'
      }
      } catch (error) {
        console.error(`❌ toolFormatRange general error:`, error)
        
        // Log failed format attempt
        FormatErrorHandler.logFormatAttempt(input, false, error as Error)
        
        if (error instanceof Error) {
          console.error(`   Full error details:`, {
            name: error.name,
            message: error.message,
            stack: error.stack
          })
          
          // Use enhanced error handling
          const enhancedError = new Error(FormatErrorHandler.handleFormatError(error, input))
          enhancedError.name = error.name
          enhancedError.stack = error.stack
          throw enhancedError
        }
        throw error
      }
    }

    if (excelContext) {
      return run(excelContext);
    }
    return Excel.run(run);
  }

  private async toolCreateChart(input: any): Promise<any> {
    const { data_range, chart_type, title, position, include_legend = true } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const dataRange = worksheet.getRange(data_range)
      
      const chart = worksheet.charts.add(chart_type, dataRange, 'Auto')
      
      if (title) {
        chart.title.text = title
      }
      
      chart.legend.visible = include_legend
      
      if (position) {
        const positionRange = worksheet.getRange(position)
        chart.setPosition(positionRange, positionRange)
      }
      
      await context.sync()
      
      return {
        message: 'Chart created successfully',
        status: 'success'
      }
    })
  }

  private async toolValidateModel(input: any): Promise<ValidationResult> {
    const { range, /*check_circular_refs = true,*/ check_errors = true /*, check_formula_consistency = true*/ } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const targetRange = range ? worksheet.getRange(range) : worksheet.getUsedRange()
      
      targetRange.load(['formulas', 'values'])
      await context.sync()
      
      const result: ValidationResult = {
        isValid: true,
        errors: []
      }
      
      // Check for errors in cells
      if (check_errors) {
        for (let i = 0; i < targetRange.values.length; i++) {
          for (let j = 0; j < targetRange.values[i].length; j++) {
            const value = targetRange.values[i][j]
            if (typeof value === 'string' && value.startsWith('#')) {
              result.isValid = false
              result.errors?.push({
                cell: `${String.fromCharCode(65 + j)}${i + 1}`,
                errorType: value,
                message: `Cell contains error: ${value}`
              })
            }
          }
        }
      }
      
      return result
    })
  }

  private async toolGetNamedRanges(input: any): Promise<NamedRange[]> {
    const { scope = 'workbook' } = input
    
    return Excel.run(async (context: any) => {
      const namedItems = scope === 'workbook' 
        ? context.workbook.names
        : context.workbook.worksheets.getActiveWorksheet().names
      
      namedItems.load(['items'])
      await context.sync()
      
      const result: NamedRange[] = []
      
      for (const item of namedItems.items) {
        item.load(['name', 'formula', 'comment'])
        await context.sync()
        
        result.push({
          name: item.name,
          range: item.formula,
          scope: scope,
          comment: item.comment
        })
      }
      
      return result
    })
  }

  private async toolCreateNamedRange(input: any): Promise<any> {
    const { name, range } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      context.workbook.names.add(name, worksheet.getRange(range))
      
      await context.sync()
      
      return {
        message: `Named range '${name}' created successfully`,
        status: 'success'
      }
    })
  }

  private async toolClearRange(input: any): Promise<any> {
    const { range, clear_contents = true, clear_formats = false } = input;
    
    return Excel.run(async (context: any) => {
      try {
        const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
        const excelRange = worksheet.getRange(rangeAddress);
        
        console.log(`🧹 Clearing range ${range} on sheet ${worksheet.name}`);
        
        if (clear_contents && clear_formats) {
          excelRange.clear();
        } else if (clear_contents) {
          excelRange.clear(Excel.ClearApplyTo.contents);
        } else if (clear_formats) {
          excelRange.clear(Excel.ClearApplyTo.formats);
        }
        
        await context.sync();
        
        return { message: 'Range cleared successfully', status: 'success' };

      } catch (error) {
        console.error(`❌ Failed to clear range ${range}:`, error);
        if (error instanceof Error && (error as any).code === 'ItemNotFound') {
          throw new Error(`Sheet or range not found for "${range}". Please ensure the sheet exists.`);
        }
        throw new Error(`Failed to clear range "${range}": ${(error as Error).message}`);
      }
    });
  }

  private async toolInsertRowsColumns(input: any): Promise<any> {
    const { position, type, count = 1 } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      
      if (type === 'rows') {
        const range = worksheet.getRange(`${position}:${position}`)
        range.insert('Down')
      } else {
        const range = worksheet.getRange(`${position}:${position}`)
        range.insert('Right')
      }
      
      await context.sync()
      
      return {
        message: `Inserted ${count} ${type} at position ${position}`,
        status: 'success'
      }
    })
  }

  async writeRange(range: string, values: any[][]): Promise<any> {
    return this.toolWriteRange({ range, values })
  }

  async applyFormula(range: string, formula: string): Promise<any> {
    return this.toolApplyFormula({ range, formula })
  }

  // Create a snapshot of the workbook for diff comparison
  async createWorkbookSnapshot(options: {
    rangeAddress?: string
    includeFormulas?: boolean
    includeStyles?: boolean
    maxCells?: number
  } = {}): Promise<WorkbookSnapshot> {
    const {
      rangeAddress = 'UsedRange', // More efficient default
      includeFormulas = true,
      includeStyles = true,
      maxCells = 10000
    } = options

    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      worksheet.load('name')
      
      // Get the used range or specified range
      let range: any
      if (rangeAddress === 'UsedRange') {
        range = worksheet.getUsedRange(true) // Use true to only consider cells with values
        // For a blank sheet, getUsedRange() returns a proxy object.
        // The error occurs when you try to load a property from it.
        range.load('address')
        try {
          await context.sync()
        } catch (error: any) {
          // This is the expected behavior for a blank sheet.
          if (error.code === 'ItemNotFound') {
            console.log('Snapshot creation: Worksheet is empty. Returning empty snapshot.')
            return {}
          }
          // For any other error, we should re-throw it.
          console.error('Error getting used range:', error)
          throw error
        }
      } else {
        range = worksheet.getRange(rangeAddress)
      }
      
      // Load required properties efficiently
      const propertiesToLoad = ['address', 'values', 'rowCount', 'columnCount']
      if (includeFormulas) {
        propertiesToLoad.push('formulas')
      }
      range.load(propertiesToLoad)
      
      await context.sync()
      
      // Check if we're within the cell limit
      const totalCells = range.rowCount * range.columnCount
      if (totalCells > maxCells) {
        console.warn(`Range contains ${totalCells} cells, exceeding limit of ${maxCells}`)
        // You might want to handle this by sampling or limiting the range
      }
      
      const snapshot: WorkbookSnapshot = {}
      const sheetName = worksheet.name
      
      // Process each cell in the range
      for (let row = 0; row < range.rowCount; row++) {
        for (let col = 0; col < range.columnCount; col++) {
          const value = range.values[row][col]
          const formula = includeFormulas ? range.formulas[row][col] : null
          
          // Skip empty cells to save space (Corrected logic)
          if ((value === null || value === '') && (formula === null || formula === '')) {
            continue
          }
          
          // Calculate the cell address
          const cellAddress = this.getCellAddressFromRange(range.address, row, col)
          const key = `${sheetName}!${cellAddress}`
          
          const cellSnapshot: any = {}
          
          // Add value if present
          if (value !== null && value !== '') {
            cellSnapshot.v = value
          }
          
          // Add formula if present and different from value
          if (formula && formula !== value) {
            cellSnapshot.f = formula
          }
          
          // Add style if requested (for now, we'll skip this for performance)
          if (includeStyles && false) { // Disabled for initial implementation
            // Style loading is expensive, implement later if needed
            cellSnapshot.s = JSON.stringify({})
          }
          
          // Only add to snapshot if cell has content
          if (Object.keys(cellSnapshot).length > 0) {
            snapshot[key] = cellSnapshot
          }
        }
      }
      
      return snapshot
    })
  }
  
  // Helper method to calculate cell address from range and indices
  private getCellAddressFromRange(rangeAddress: string, rowIndex: number, colIndex: number): string {
    // Extract the starting cell from range address (e.g., "A1" from "A1:B10")
    const match = rangeAddress.match(/([A-Z]+)(\d+)/)
    if (!match) return 'A1'
    
    const startCol = match[1]
    const startRow = parseInt(match[2])
    
    // Convert column letters to number
    const startColNum = this.columnLetterToNumber(startCol)
    
    // Calculate new position
    const newColNum = startColNum + colIndex
    const newRow = startRow + rowIndex
    
    // Convert back to letter
    const newCol = this.numberToColumnLetter(newColNum)
    
    return `${newCol}${newRow}`
  }
  
  private columnLetterToNumber(col: string): number {
    let num = 0
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
    }
    return num
  }
  
  private numberToColumnLetter(num: number): string {
    let letter = ''
    while (num > 0) {
      const remainder = (num - 1) % 26
      letter = String.fromCharCode(remainder + 'A'.charCodeAt(0)) + letter
      num = Math.floor((num - 1) / 26)
    }
    return letter
  }
}