# Gridmate Context Enhancement Implementation Plan

## Overview
This plan implements dynamic context gathering for Gridmate to mirror Cursor/Cline behavior with always-on context, Claude tool-use support for autonomous range reading, and backend integration. The plan has been updated based on code review to ensure robustness, performance, and proper error handling.

## Implementation Steps

### 1. Enable Always-On Context with UI Transparency

In **`excel-addin/src/components/chat/RefactoredChatInterface.tsx`**, context is already defaulted to `true` (line 74). Instead of removing the toggle completely, we'll disable it to show users that context is always on:

In **`excel-addin/src/components/chat/EnhancedChatInterface.tsx`** at the Context Pills container (around lines 587–593), modify the toggle to be disabled:

```tsx
<ContextPillsContainer 
    items={activeContext}
    onRemove={onContextRemove}
    onContextToggle={onContextToggle}  // Keep the handler
    isContextEnabled={true}  // Always enabled
    isToggleDisabled={true}  // ADD: New prop to disable the toggle
    … 
/>
```

In **`excel-addin/src/components/chat/mentions/ContextPill.tsx`**, update the component to accept and use the `isToggleDisabled` prop to gray out the toggle button while keeping it visible.

### 2. Use `getComprehensiveContext` with Fallback Error Handling

In **`RefactoredChatInterface.tsx`** inside `handleSendMessage` (around line 294), replace the call with error handling:

```ts
// OLD:
const excelContext = isContextEnabled ? await ExcelService.getInstance().getSmartContext() : null;

// NEW:
let excelContext = null;
if (isContextEnabled) {
    try {
        // Try comprehensive context first
        excelContext = await ExcelService.getInstance().getComprehensiveContext({ 
            includeAllSheets: true,
            maxCellsPerSheet: 10000 
        });
        
        // Use full sheet as selected context if no specific selection
        if (excelContext?.visibleRangeData && 
            (!excelContext.selectedData || excelContext.selectedRange === 'A1')) {
            excelContext.selectedData = excelContext.visibleRangeData;
            excelContext.selectedRange = excelContext.visibleRangeData.address;
        }
    } catch (error) {
        console.warn('Failed to get comprehensive context, falling back to smart context:', error);
        addDebugLog('Comprehensive context failed, using smart context fallback', 'warning');
        // Fallback to smart context
        excelContext = await ExcelService.getInstance().getSmartContext();
    }
}
```

### 3. Update Message Payload Structure

Modify the `excelContext` object construction (around lines 328–339) to include all context fields:

```js
data: {
  messageId,
  content,
  excelContext: {
    workbook: excelContext?.workbook,
    worksheet: excelContext?.worksheet,
    selectedRange: excelContext?.selectedRange,
    selectedData: excelContext?.selectedData,
    visibleRangeData: excelContext?.visibleRangeData,     // ADD: full active sheet data
    workbookSummary: excelContext?.workbookSummary,       // ADD: workbook summary
    nearbyData: excelContext?.nearbyData,
    fullSheetData: excelContext?.fullSheetData,           // KEEP: existing field
    recentEdits: excelContext?.recentEdits,               // KEEP: recent edits tracking
    activeContext: activeContext.map(c => ({ type: c.type, value: c.value }))
  },
  autonomyMode,
}
```

### 4. Backend Context Structure Updates

In **`backend/internal/services/excel_bridge.go`** (`ExcelBridge.buildFinancialContext`), add support for the new context fields after the nearbyData processing (around line 900):

```go
// Extract visible range data (full active sheet)
var visibleRangeData map[string]interface{}
if excelCtx, ok := additionalContext["excelContext"].(map[string]interface{}); ok {
    if vrd, ok := excelCtx["visibleRangeData"].(map[string]interface{}); ok {
        visibleRangeData = vrd
        eb.logger.Debug("Found visibleRangeData in excelContext")
    }
}

if visibleRangeData != nil {
    if values, ok := visibleRangeData["values"].([]interface{}); ok {
        if address, ok := visibleRangeData["address"].(string); ok {
            // Only process if not too large
            if len(values) > 0 && len(values) <= 100 { // Limit rows for context
                eb.processCellData(context, values, address)
                if hasNonEmptyValues(values) {
                    hasData = true
                    eb.logger.WithField("address", address).Debug("Processed visible range data")
                }
            } else {
                // Add summary to document context
                rows := len(values)
                cols := 0
                if rows > 0 {
                    if firstRow, ok := values[0].([]interface{}); ok {
                        cols = len(firstRow)
                    }
                }
                context.DocumentContext = append(context.DocumentContext, 
                    fmt.Sprintf("Active sheet has %d×%d cells (truncated for context)", rows, cols))
            }
        }
    }
}

// Handle workbook summary
if wbSummary, ok := additionalContext["workbookSummary"].(map[string]interface{}); ok {
    if wbData, ok := wbSummary["sheets"].([]interface{}); ok {
        summaryLines := []string{"Workbook structure:"}
        totalSheets := len(wbData)
        
        for i, sheet := range wbData {
            if i >= 5 { // Limit to first 5 sheets
                summaryLines = append(summaryLines, fmt.Sprintf("  ... and %d more sheets", totalSheets-5))
                break
            }
            
            if sheetMap, ok := sheet.(map[string]interface{}); ok {
                name := ""
                if n, ok := sheetMap["name"].(string); ok {
                    name = n
                }
                
                rows := 0
                if r, ok := sheetMap["lastRow"].(float64); ok {
                    rows = int(r)
                }
                
                cols := 0
                if c, ok := sheetMap["lastColumn"].(float64); ok {
                    cols = int(c)
                }
                
                // Check if data is truncated
                truncated := false
                if data, ok := sheetMap["data"].(map[string]interface{}); ok {
                    if values, ok := data["values"].([]interface{}); ok {
                        if len(values) == 1 {
                            if row, ok := values[0].([]interface{}); ok && len(row) == 1 {
                                if msg, ok := row[0].(string); ok && strings.Contains(msg, "too large") {
                                    truncated = true
                                }
                            }
                        }
                    }
                }
                
                status := ""
                if truncated {
                    status = " (summary only)"
                } else if rows*cols > 1000 {
                    status = " (partial)"
                }
                
                summaryLines = append(summaryLines, 
                    fmt.Sprintf("  - %s: %d×%d cells%s", name, rows, cols, status))
            }
        }
        
        if len(summaryLines) > 1 { // Only add if we have actual sheet info
            context.DocumentContext = append(context.DocumentContext, summaryLines...)
        }
    }
}
```

### 5. Enhanced Tool Request Handling with Size Limits

In **`excel-addin/src/services/excel/ExcelService.ts`**, update the `toolReadRange` method to handle large ranges (around line 1280):

```ts
private async toolReadRange(input: any): Promise<RangeData> {
    const { range, include_formulas = true, include_formatting = false } = input
    
    console.log(`📊 toolReadRange called with range: ${range}`)
    
    return Excel.run(async (context: any) => {
        // ... existing code to get range ...
        
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
        
        // ... rest of existing code ...
    })
}
```

### 6. Implement SignalR Tool Response Handler

The SignalR client already receives tool requests. We need to ensure the message handler processes them correctly. In **`excel-addin/src/hooks/useMessageHandlers.ts`**, the `handleToolRequest` function already handles `read_range` at line 328. The implementation correctly batches read requests for performance.

No changes needed here - the existing implementation is already optimal.

### 7. Add Context Caching for Performance

In **`excel-addin/src/services/excel/ExcelService.ts`**, add workbook summary caching:

```ts
export class ExcelService {
  private static instance: ExcelService
  
  // Add cache properties
  private workbookSummaryCache: WorkbookData | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_DURATION = 30000 // 30 seconds
  
  // ... existing code ...
  
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
    } = options

    return Excel.run(async (context: any) => {
      // ... existing code for basic context ...
      
      // Check cache for workbook summary
      const now = Date.now()
      if (includeAllSheets && this.workbookSummaryCache && 
          (now - this.cacheTimestamp) < this.CACHE_DURATION) {
        result.workbookSummary = this.workbookSummaryCache
        console.log('Using cached workbook summary')
      } else if (includeAllSheets) {
        // ... existing code to load workbook data ...
        
        // Cache the result
        this.workbookSummaryCache = workbookData
        this.cacheTimestamp = now
        
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
}
```

### 8. Add Visual Context Indicators

In **`excel-addin/src/components/chat/RefactoredChatInterface.tsx`**, add a context summary display:

```tsx
// Add state for context summary
const [contextSummary, setContextSummary] = useState<string>('')

// Update context summary after getting excel context
useEffect(() => {
  if (excelContext?.workbookSummary) {
    const sheets = excelContext.workbookSummary.sheets.length
    const totalCells = excelContext.workbookSummary.totalCells
    const activeSheet = excelContext.worksheet
    const selectedCells = excelContext.selectedData ? 
      excelContext.selectedData.rowCount * excelContext.selectedData.colCount : 0
    
    setContextSummary(
      `Context: ${activeSheet} (${selectedCells} cells selected) + ${sheets - 1} other sheets (${totalCells} total cells)`
    )
  }
}, [excelContext])

// Display the summary in the UI (add this where appropriate in the render)
{contextSummary && (
  <div className="text-xs text-gray-500 px-2 py-1">
    {contextSummary}
  </div>
)}
```

### 9. Configure SignalR Message Size Limits

Ensure the SignalR connection can handle larger messages. In **`excel-addin/src/services/signalr/SignalRClient.ts`**, update the connection builder:

```ts
this.connection = new signalR.HubConnectionBuilder()
  .withUrl(this.hubUrl)
  .withAutomaticReconnect({
    nextRetryDelayInMilliseconds: retryContext => {
      return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000)
    }
  })
  .configureLogging(signalR.LogLevel.Information)
  .build()

// Configure message size limit (if supported by SignalR version)
// This may require backend configuration as well
```

### 10. Progressive Loading Strategy

Instead of loading all data upfront, implement a progressive strategy:

1. Initial message includes:
   - Selected range data (if small)
   - Active sheet summary (row/col count)
   - Workbook structure (sheet names and sizes only)

2. Claude can then use `read_range` to fetch specific data as needed

3. This reduces initial payload size while maintaining full access to data

## Summary of Changes

1. **UI**: Keep context toggle visible but disabled for transparency
2. **Context Gathering**: Use comprehensive context with smart context fallback
3. **Payload**: Include all context fields (visible range, workbook summary, etc.)
4. **Backend**: Parse new fields and create meaningful summaries
5. **Size Limits**: Implement 5000-cell limit for tool responses
6. **Caching**: Cache workbook summaries for 30 seconds
7. **Visual Feedback**: Show context summary in UI
8. **Error Handling**: Graceful fallbacks at each step
9. **Performance**: Progressive loading strategy

These changes ensure the AI assistant is context-aware like Cursor/Cline while maintaining performance and reliability.