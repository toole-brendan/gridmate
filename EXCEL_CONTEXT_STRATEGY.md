# Excel Context Strategy - Comprehensive Implementation Guide

## Overview

This document describes the comprehensive Excel context strategy implemented in Gridmate to ensure the AI/LLM has full visibility into spreadsheet data. The system is designed to transmit all relevant cell data, formulas, and metadata with every chat request while optimizing for performance and token limits.

## Architecture Overview

### Data Flow
```
Excel Add-in (TypeScript/React)
    ↓
ExcelService.getSmartContext()
    ↓
SignalR Client (WebSocket)
    ↓
SignalR Hub (.NET/C#)
    ↓
Go Backend API
    ↓
ExcelBridge Service
    ↓
AI Service (Anthropic Claude)
```

## Implementation Details

### 1. Frontend: Excel Add-in Context Collection

#### ExcelService Methods

**Location**: `/excel-addin/src/services/excel/ExcelService.ts`

##### getSmartContext()
Optimized method that retrieves:
- Selected cell/range data with values and formulas
- Nearby context (20 rows above/below, 10 columns left/right)
- Efficient for most use cases

```typescript
async getSmartContext(): Promise<ComprehensiveContext> {
  // Gets:
  // - Current selection values and formulas
  // - Nearby cells for context
  // - Workbook and worksheet names
}
```

##### getComprehensiveContext()
Full workbook scanning with configurable options:
- Can read all sheets or just active sheet
- Configurable cell limits per sheet
- Optional formula and formatting data

```typescript
async getComprehensiveContext(options: {
  includeAllSheets?: boolean      // Default: false
  maxCellsPerSheet?: number        // Default: 10,000
  includeFormulas?: boolean        // Default: true
  includeFormatting?: boolean      // Default: false
}): Promise<ComprehensiveContext>
```

#### Data Structures

```typescript
interface ComprehensiveContext extends ExcelContext {
  workbook: string
  worksheet: string
  selectedRange: string
  selectedData?: RangeData       // Values/formulas for selection
  nearbyData?: RangeData         // Context around selection
  visibleRangeData?: RangeData   // What's visible on screen
  workbookSummary?: WorkbookData // All sheets summary
}

interface RangeData {
  values: any[][]
  formulas?: string[][]
  address: string
  rowCount: number
  colCount: number
}

interface WorkbookData {
  sheets: SheetData[]
  namedRanges: NamedRange[]
  activeSheet: string
  totalCells: number
}
```

### 2. Context Transmission

#### SignalR Client Integration

**Location**: `/excel-addin/src/components/chat/ChatInterfaceWithSignalR.tsx`

```typescript
const handleSendMessage = async (content?: string) => {
  // Collect comprehensive context
  const comprehensiveContext = await ExcelService.getInstance().getSmartContext()
  
  const excelContext = {
    worksheet: comprehensiveContext.worksheet || 'Sheet1',
    selection: comprehensiveContext.selectedRange || '',
    workbook: comprehensiveContext.workbook || 'Workbook',
    selectedData: comprehensiveContext.selectedData,
    nearbyData: comprehensiveContext.nearbyData
  }
  
  // Send via SignalR
  await signalRClient.current.send({
    type: 'chat_message',
    data: {
      content: messageContent,
      sessionID: sessionIdRef.current,
      excelContext: excelContext
    }
  })
}
```

#### Real-time Selection Updates
```typescript
// Automatic selection change tracking
Office.context.document.addHandlerAsync(
  Office.EventType.DocumentSelectionChanged,
  handleSelectionChange
)
```

### 3. Backend: Context Processing

#### ExcelBridge Service

**Location**: `/backend/internal/services/excel_bridge.go`

##### buildFinancialContext Method
Transforms frontend context into AI-ready format:

```go
func (eb *ExcelBridge) buildFinancialContext(session *ExcelSession, additionalContext map[string]interface{}) *ai.FinancialContext {
    context := &ai.FinancialContext{
        CellValues:      make(map[string]interface{}),
        Formulas:        make(map[string]string),
        WorkbookName:    workbook,
        WorksheetName:   worksheet,
        SelectedRange:   selection,
    }
    
    // Process selected data
    if selectedData, ok := additionalContext["selectedData"].(map[string]interface{}); ok {
        if values, ok := selectedData["values"].([]interface{}); ok {
            eb.processCellData(context, values, address)
        }
        if formulas, ok := selectedData["formulas"].([]interface{}); ok {
            eb.processFormulaData(context, formulas, address)
        }
    }
    
    // Process nearby data for additional context
    if nearbyData, ok := additionalContext["nearbyData"].(map[string]interface{}); ok {
        eb.processCellData(context, nearbyData["values"], nearbyData["address"])
    }
    
    return context
}
```

##### Helper Methods
```go
// processCellData - Converts 2D array to cell address map
func (eb *ExcelBridge) processCellData(context *ai.FinancialContext, values []interface{}, baseAddress string)

// processFormulaData - Maps formulas to cell addresses
func (eb *ExcelBridge) processFormulaData(context *ai.FinancialContext, formulas []interface{}, baseAddress string)

// parseCell - Parses "A1" format to row/col indices
func (eb *ExcelBridge) parseCell(cell string) (col int, row int)

// getCellAddress - Converts indices back to "A1" format
func (eb *ExcelBridge) getCellAddress(col, row int) string
```

### 4. AI Service Integration

#### Financial Context Structure

**Location**: `/backend/internal/services/ai/types.go`

```go
type FinancialContext struct {
    WorkbookName    string
    WorksheetName   string
    SelectedRange   string
    CellValues      map[string]interface{}  // Cell address -> value
    Formulas        map[string]string       // Cell address -> formula
    ModelType       string                  // DCF, LBO, etc.
    RecentChanges   []CellChange
    DocumentContext []string
}
```

#### Context Usage in AI Prompts

**Location**: `/backend/internal/services/ai/prompt_builder.go`

The AI receives context in structured format:
```
Current Context:
Workbook: Q4_Analysis.xlsx
Worksheet: Financial Model
Selected Range: B5:D10

Cell Values:
  B5: 100
  C5: 200
  D5: 300
  ...

Formulas:
  C5: =B5*1.5
  D5: =C5*1.5
  ...
```

### 5. Performance Optimizations

#### Smart Loading Strategy
1. **Default**: Use `getSmartContext()` for selected cells + nearby context
2. **Large Models**: Implement cell limits (default 10,000 per sheet)
3. **Token Management**: Summarize large datasets instead of full transmission

#### Caching
- Frontend: No caching to ensure fresh data
- Backend: Cell cache in ExcelBridge for frequently accessed data
- Session-based caching for chat history

### 6. Security Considerations

1. **Data Transmission**: All data sent over encrypted SignalR/WebSocket connections
2. **Local Processing**: AI requests processed on-premise when using local models
3. **No Data Persistence**: Excel data not stored permanently on backend
4. **Session Isolation**: Each user session has isolated context

## Usage Patterns

### Basic Chat with Context
```typescript
// User types: "What's the formula in C5?"
// System automatically includes:
// - Selected range data
// - Nearby cells
// - Formulas
// AI can directly answer: "The formula in C5 is =B5*1.5, which multiplies the value in B5 (100) by 1.5 to get 150."
```

### Full Workbook Analysis
```typescript
// For complex requests requiring full visibility
const context = await ExcelService.getInstance().getComprehensiveContext({
  includeAllSheets: true,
  maxCellsPerSheet: 50000
})
```

### Real-time Updates
```typescript
// Selection changes automatically update backend
// AI always has current context for next message
```

## Configuration Options

### Frontend Configuration
```typescript
// In ExcelService configuration
const CONTEXT_OPTIONS = {
  DEFAULT_MAX_CELLS: 10000,
  NEARBY_ROWS_OFFSET: 20,
  NEARBY_COLS_OFFSET: 10,
  INCLUDE_FORMULAS: true,
  INCLUDE_FORMATTING: false
}
```

### Backend Configuration
```go
// In excel_bridge.go
const (
    MaxCellsPerRequest = 50000
    CacheDuration = 5 * time.Minute
    SessionTimeout = 30 * time.Minute
)
```

## Troubleshooting

### Common Issues

1. **Large Spreadsheets**
   - Solution: Use smart context instead of comprehensive
   - Implement pagination for very large datasets

2. **Token Limits**
   - Solution: Summarize data before sending to AI
   - Focus on relevant ranges only

3. **Performance**
   - Solution: Use nearby context for most queries
   - Cache frequently accessed data

### Debug Logging

Frontend:
```typescript
console.log('📊 Collected comprehensive Excel context:', {
  worksheet: excelContext.worksheet,
  selection: excelContext.selection,
  selectedCells: excelContext.selectedData?.rowCount * excelContext.selectedData?.colCount || 0,
  nearbyCells: excelContext.nearbyData?.rowCount * excelContext.nearbyData?.colCount || 0
})
```

Backend:
```go
eb.logger.WithFields(logrus.Fields{
    "session_id": sessionID,
    "selection": selection,
    "cell_count": len(context.CellValues),
    "formula_count": len(context.Formulas),
}).Debug("Built financial context")
```

## Future Enhancements

1. **Incremental Updates**: Send only changed cells instead of full context
2. **Smart Caching**: Predictive caching based on user patterns
3. **Compression**: Implement data compression for large workbooks
4. **Streaming**: Stream large datasets in chunks
5. **Context Summarization**: AI-powered summarization of large ranges

## API Reference

### Frontend API

```typescript
// Get current context
const context = await ExcelService.getInstance().getContext()

// Get smart context (recommended)
const smartContext = await ExcelService.getInstance().getSmartContext()

// Get comprehensive context
const fullContext = await ExcelService.getInstance().getComprehensiveContext({
  includeAllSheets: true
})
```

### Backend API

```go
// Process chat with context
response, err := excelBridge.ProcessChatMessage(clientID, message)

// Build financial context
context := excelBridge.buildFinancialContext(session, additionalContext)
```

## Conclusion

This comprehensive context strategy ensures that Gridmate's AI assistant has full visibility into Excel spreadsheet data while maintaining performance and security. The system adapts to different use cases, from simple cell queries to complex financial model analysis, providing the AI with the context it needs to deliver accurate and helpful responses.