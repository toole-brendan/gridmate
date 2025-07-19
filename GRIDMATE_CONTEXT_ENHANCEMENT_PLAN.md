# Gridmate Context Enhancement Plan: Complete Overhaul

This document presents a comprehensive plan to transform Gridmate's Excel context handling system. By implementing these changes, the AI will have complete awareness of spreadsheet state, track all changes intelligently, and operate autonomously without requiring manual range selection.

## Executive Summary

The current context system has critical limitations:
- AI gets "stuck" editing the same cells due to limited context visibility
- Context is disabled by default, leaving AI blind to spreadsheet data
- Heavy reliance on manual cell selection creates unnatural interactions
- Poor tracking of changes (both user and AI initiated)
- Structure mismatch between frontend and backend context data

This plan addresses all these issues through a systematic overhaul of the context pipeline.

---

## Part 1: Immediate Fixes (Critical Bug Resolution)

### 1.1. Enable Context by Default
**Current Issue:** `isContextEnabled` defaults to `false`, meaning no Excel data is sent to the backend.

**Solution:**
- **File:** `excel-addin/src/components/chat/RefactoredChatInterface.tsx`
- **Change:** Set `const [isContextEnabled, setIsContextEnabled] = useState(true)`
- **Impact:** AI immediately gains visibility into spreadsheet data

### 1.2. Fix Context Structure Mismatch
**Current Issue:** Frontend sends `selectedData` and `nearbyData` as nested objects, but backend expects them at root level.

**Solution:**
- **File:** `backend/internal/handlers/signalr_handler.go`
- **Change:** Update `HandleSignalRChat` to properly extract nested Excel context:
  ```go
  // Extract nested selectedData and nearbyData
  if selectedData, ok := excelContext["selectedData"].(map[string]interface{}); ok {
      chatMsg.Context["selectedData"] = selectedData
  }
  if nearbyData, ok := excelContext["nearbyData"].(map[string]interface{}); ok {
      chatMsg.Context["nearbyData"] = nearbyData
  }
  ```

### 1.3. Fix Range Union for AI Edits
**Current Issue:** AI context narrows to only the last edited range, losing sight of previous edits.

**Solution:**
- **File:** `backend/internal/services/excel_bridge.go`
- **Implementation:**
  ```go
  func mergeRanges(ranges []string) string {
      // Parse all ranges to find bounding box
      minRow, minCol := math.MaxInt32, math.MaxInt32
      maxRow, maxCol := 0, 0
      
      for _, r := range ranges {
          // Parse range bounds and update min/max
      }
      
      // Return union range like "A1:Z50"
      return formatRange(minRow, minCol, maxRow, maxCol)
  }
  ```
- Update `ProcessChatMessage` to collect all AI-edited ranges and use union

---

## Part 2: Full Worksheet Context Visibility

### 2.1. Always Load Complete Sheet Data
**Goal:** AI sees all data on the active sheet, not just selected cells.

**Frontend Changes:**
- **File:** `excel-addin/src/services/excel/ExcelService.ts`
- **Update `getSmartContext()`:**
  ```typescript
  async getSmartContext(): Promise<ComprehensiveContext> {
      return Excel.run(async (context: any) => {
          const worksheet = context.workbook.worksheets.getActiveWorksheet()
          
          // Always get the full used range
          const usedRange = worksheet.getUsedRange()
          usedRange.load(['address', 'values', 'formulas', 'rowCount', 'columnCount'])
          
          await context.sync()
          
          // Include full sheet data regardless of selection
          result.fullSheetData = {
              values: usedRange.values,
              formulas: usedRange.formulas,
              address: usedRange.address,
              rowCount: usedRange.rowCount,
              colCount: usedRange.columnCount
          }
          
          // Still track selection for focus hints
          if (selectedRange.address !== 'A1') {
              result.userFocus = selectedRange.address
          }
      })
  }
  ```

### 2.2. Dynamic Backend Context Building
**Goal:** Backend uses actual sheet bounds, not hardcoded ranges.

**Backend Changes:**
- **File:** `backend/internal/services/excel/context_builder.go`
- Remove hardcoded `"A1:Z100"` default
- Add method to request sheet bounds from frontend:
  ```go
  func (cb *ContextBuilder) getSheetBounds(ctx context.Context, sessionID string) (string, error) {
      // Request actual used range from Excel via bridge
      response := cb.bridge.RequestSheetInfo(sessionID, "usedRange")
      return response.UsedRange, nil
  }
  ```

---

## Part 3: Comprehensive Change Tracking

### 3.1. Rich AI Edit Tracking
**Goal:** Track not just which cells changed, but their before/after values.

**Implementation:**
- **File:** `backend/internal/services/excel_bridge.go`
- Before any `write_range` tool:
  ```go
  // Capture old values before write
  oldValues := eb.toolExecutor.Execute("read_range", map[string]interface{}{
      "range": targetRange,
  })
  
  // After write, store rich edit info
  editInfo := map[string]interface{}{
      "range": targetRange,
      "oldValues": oldValues,
      "newValues": newValues,
      "timestamp": time.Now(),
      "source": "ai",
      "tool": toolName,
  }
  session.Context["recentEdits"] = append(recentEdits, editInfo)
  ```

### 3.2. Real-time User Edit Tracking
**Goal:** Capture user edits as they happen, not just through diffs.

**Frontend Implementation:**
- **File:** `excel-addin/src/services/excel/ExcelService.ts`
- Add worksheet change listener:
  ```typescript
  private initializeChangeTracking() {
      Excel.run(async (context) => {
          const worksheet = context.workbook.worksheets.getActiveWorksheet()
          
          worksheet.onChanged.add((event) => {
              this.trackUserEdit({
                  range: event.address,
                  changeType: event.changeType,
                  details: event.details,
                  timestamp: new Date(),
              })
              
              // Send to backend
              this.sendUserEditToBackend(event)
          })
      })
  }
  ```

### 3.3. Unified Change History
**Goal:** Present a clear, chronological history of all changes to the AI.

**Prompt Enhancement:**
```xml
<recent_changes>
  <change>
    <cell>B2</cell>
    <timestamp>12:34:56</timestamp>
    <old_value>10</old_value>
    <new_value>15</new_value>
    <source>ai</source>
    <tool>write_range</tool>
  </change>
  <change>
    <cell>C2</cell>
    <timestamp>12:35:10</timestamp>
    <old_value></old_value>
    <new_value>20</new_value>
    <source>user</source>
  </change>
</recent_changes>
```

---

## Part 4: Eliminating Selection Dependencies

### 4.1. Remove Selection-Based Context Gating
**Goal:** Context flows regardless of user selection state.

**Frontend Changes:**
- **File:** `excel-addin/src/components/chat/RefactoredChatInterface.tsx`
- Remove all `NO RANGE SELECTED` logic
- Always call `getSmartContext()` regardless of selection
- Update context pill to show sheet-level context:
  ```typescript
  const contextDisplay = worksheet 
    ? `Context: ${worksheet} (full sheet)`
    : 'Loading context...'
  ```

### 4.2. Backend Graceful Handling
**Goal:** Backend processes context even without explicit selection.

**Backend Changes:**
- **File:** `backend/internal/handlers/chat.go`
- Remove requirement for `ExcelContext.Worksheet`
- Default to using full sheet data when no selection provided:
  ```go
  if req.ExcelContext.Selection.SelectedRange == "" {
      // Use full sheet as context
      req.ExcelContext.Selection.SelectedRange = "(full sheet)"
  }
  ```

---

## Part 5: Intelligent Structure Detection

### 5.1. Automatic Header Recognition
**Goal:** AI understands table structure without user guidance.

**Implementation:**
- **File:** `backend/internal/services/excel/context_builder.go`
- Always run header detection on sheet load:
  ```go
  func (cb *ContextBuilder) detectHeaders(data [][]interface{}) []string {
      if len(data) == 0 {
          return nil
      }
      
      firstRow := data[0]
      headers := []string{}
      
      for _, cell := range firstRow {
          if str, ok := cell.(string); ok && str != "" {
              headers = append(headers, str)
          }
      }
      
      // Add to context if headers found
      if len(headers) > 0 {
          context.DocumentContext = append(
              context.DocumentContext,
              fmt.Sprintf("Detected column headers: %s", strings.Join(headers, ", "))
          )
      }
  }
  ```

### 5.2. Blank Sheet Intelligence
**Goal:** AI provides intelligent assistance even on empty sheets.

**Prompt Enhancement for Empty Sheets:**
```xml
<spreadsheet_status>
  <state>empty</state>
  <suggestions>
    - Sheet is blank and ready for new content
    - Common starting structures: budget table, project timeline, data import
    - AI can create appropriate structure based on your request
  </suggestions>
</spreadsheet_status>
```

### 5.3. Sparse Data Pattern Recognition
**Goal:** Identify partial structures (single column/row of data).

**Context Builder Addition:**
```go
func (cb *ContextBuilder) detectSparsePatterns(context *ai.FinancialContext) {
    // Check for single column of labels
    if hasOnlyFirstColumn(context.CellValues) {
        context.DocumentContext = append(
            context.DocumentContext,
            "Detected row labels in column A - possible start of table structure"
        )
    }
    
    // Check for headers without data
    if hasHeadersButNoData(context.CellValues) {
        context.DocumentContext = append(
            context.DocumentContext,
            "Table headers present but no data rows - ready for data entry"
        )
    }
}
```

---

## Part 6: Seamless Context Updates After AI Actions

### 6.1. Immediate Context Refresh
**Goal:** Context updates immediately after AI edits, not on next message.

**Frontend Implementation:**
- **File:** `excel-addin/src/components/chat/RefactoredChatInterface.tsx`
- After successful tool execution:
  ```typescript
  const handleToolExecutionComplete = async (result) => {
      // Apply the change
      await applyToolResult(result)
      
      // Immediately refresh context
      const newContext = await ExcelService.getInstance().getSmartContext()
      updateContextState(newContext)
      
      // Update UI to reflect new state
      setContextPill(`Updated: ${result.range}`)
  }
  ```

### 6.2. Smart Range Expansion
**Goal:** Context expands to include AI additions beyond previous bounds.

**Implementation:**
- **File:** `excel-addin/src/services/excel/ExcelService.ts`
- After AI edit:
  ```typescript
  expandContextAfterEdit(editedRange: string) {
      // Get current used range
      const currentUsed = this.worksheet.getUsedRange()
      
      // If edit extended beyond, expand context window
      if (isOutsideBounds(editedRange, currentUsed)) {
          const expandedRange = union(currentUsed, editedRange)
          this.contextBounds = padRange(expandedRange, 10) // Add padding
      }
  }
  ```

---

## Part 7: Implementation Priority & Timeline

### Phase 1: Critical Fixes (Week 1)
1. Enable context by default (1.1)
2. Fix structure mismatch (1.2)
3. Implement range union (1.3)
4. Always load sheet data (2.1)

### Phase 2: Enhanced Tracking (Week 2)
1. Rich AI edit tracking (3.1)
2. User edit tracking (3.2)
3. Unified change history (3.3)

### Phase 3: Autonomous Operation (Week 3)
1. Remove selection dependencies (4.1, 4.2)
2. Automatic header detection (5.1)
3. Blank sheet intelligence (5.2)

### Phase 4: Polish & Optimization (Week 4)
1. Immediate context refresh (6.1)
2. Smart range expansion (6.2)
3. Performance optimization for large sheets
4. Comprehensive testing

---

## Success Metrics

1. **Context Completeness:** AI receives 100% of sheet data in every request
2. **Change Awareness:** All edits (user and AI) tracked with before/after values
3. **Autonomous Operation:** 0% of queries require manual cell selection
4. **Structure Recognition:** 90%+ accuracy in detecting headers and table structures
5. **Performance:** Context building < 100ms for sheets up to 10,000 cells

---

## Testing Strategy

1. **Unit Tests:** Each context builder component
2. **Integration Tests:** Full context pipeline from Excel to AI
3. **Scenario Tests:**
   - Blank sheet → Full financial model
   - Partial data → Complete analysis
   - Multiple rapid edits → Coherent context
4. **Performance Tests:** Large worksheet handling

By implementing this comprehensive plan, Gridmate will transform from a selection-dependent tool to an intelligent, context-aware AI assistant that understands the full spreadsheet state at all times. 