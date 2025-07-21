# Cell Merging Implementation Plan v2 (Enhanced)

## Executive Summary

This plan addresses the critical issue where AI-powered edits cannot properly merge cells in Excel. Currently, when the AI attempts to merge cells (e.g., A1:G1), it writes the same value to each individual cell instead of creating a single merged cell. This causes confusion for both the AI and users, as the AI sees duplicate values and believes cells are occupied when they should be merged.

This v2 plan incorporates a minimal, focused approach to solve the immediate problem while maintaining compatibility with future enhancements. The plan has been enhanced based on a comprehensive codebase analysis to ensure robust implementation with proper error handling, validation, and integration with existing systems.

## Problem Analysis

### Current Behavior
When the AI tries to merge cells A1:G1 with "DCF Valuation Model":
- **What happens**: Each cell (A1, B1, C1... G1) gets the value "DCF Valuation Model"
- **What should happen**: Cells A1:G1 become one merged cell containing the value once

### Root Causes
1. **No merge tool exists**: ExcelService.ts only has `write_range`, `apply_formula`, etc. - no merge capability
2. **AI lacks merge awareness**: The backend prompt doesn't include any merge tool definition
3. **GridVisualizer treats cells individually**: Cannot handle merged ranges properly for preview/restore
4. **Context confusion**: AI sees duplicate values and thinks cells are separately populated
5. **No operation simulation**: The diffSimulator.ts lacks merge operation handling for preview
6. **Missing validation**: No checks for invalid merge operations (non-rectangular ranges, partial merges)

## Solution Overview

Implement a robust `apply_layout` tool focused on cell merging with proper validation and error handling:
- **Frontend**: Add `toolApplyLayout` to ExcelService.ts with merge validation
- **Backend**: Enhanced tool definition in prompt_builder.go with detailed usage guidance
- **GridVisualizer**: Update to handle merged cells as units with proper state tracking
- **Context**: Comprehensive merge detection to prevent AI confusion
- **Operation Simulation**: Add merge support to diffSimulator.ts for preview
- **Error Handling**: Validate merge operations and provide clear error messages

## Detailed Implementation Plan

### Phase 1: Core Merge Functionality

#### 1.1 Frontend Implementation (ExcelService.ts)

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Step 1**: Add helper methods for validation:

```typescript
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
```

**Step 2**: Add the enhanced toolApplyLayout method:

```typescript
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
```

**Step 3**: Add to the executeToolRequest switch statement:

```typescript
case 'apply_layout':
  return await this.toolApplyLayout(input)
```

**Step 4**: Add to the batch execution methods:

```typescript
// In executeBatchByType method, add:
case 'apply_layout':
  result = await this.toolApplyLayout(request, context);
  break;
  
// In batchExecute method, add to batchable tools:
case 'apply_layout':
  result = await this.toolApplyLayout(request.input, context);
  break;
```

#### 1.2 Backend Tool Definition (prompt_builder.go)

**File**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

Add to the tool list in `getFinancialModelingSystemPrompt()` function:

```go
// After the existing tools list, add:
- apply_layout: Merge/unmerge cells and apply visual layout changes
```

Then add detailed tool documentation in the appropriate section:

```
Tool: apply_layout
Purpose: Apply visual layout changes to cells, including merging, unmerging, and future layout features
Parameters:
  - range: Target range (e.g., "A1:E1") - must be a rectangular range
  - merge: Merge operation type:
    - "all": Merge entire range into one cell
    - "across": Merge each row individually
    - "unmerge": Split previously merged cells
  - preserve_content: Boolean (default: true) - preserve content in top-left cell when merging

Important Notes:
  - When merging cells with existing content, only the top-left cell's value is preserved
  - Attempting to merge a range with partial merges will result in an error
  - Always write content to the first cell BEFORE merging
  - The tool will warn if non-empty cells will lose content during merge

Example workflows:
  1. Create a merged header:
     {"tool": "write_range", "range": "A1", "values": [["Financial Model Overview"]]}
     {"tool": "apply_layout", "range": "A1:G1", "merge": "all"}
     {"tool": "format_range", "range": "A1:G1", "font": {"bold": true, "size": 14}}
  
  2. Create row-wise merged cells:
     {"tool": "apply_layout", "range": "A1:C3", "merge": "across"}
     // This creates 3 merged rows: A1:C1, A2:C2, A3:C3
  
  3. Unmerge cells:
     {"tool": "apply_layout", "range": "A1:G1", "merge": "unmerge"}
```

### Phase 2: GridVisualizer Updates

#### 2.1 Merge-Aware State Management

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`

**Step 1**: Add enhanced merge detection to state storage:

```typescript
// Add to CellState interface:
interface CellState {
  // ... existing properties ...
  isMerged?: boolean;
  mergeArea?: string; // e.g., "A1:E1"
  mergeAnchor?: string; // Top-left cell of merge area (e.g., "A1")
  originalMergeState?: 'merged' | 'unmerged' | 'partial';
}
```

**Step 2**: Update the applyHighlights method to detect merged cells:

```typescript
// In applyHighlights, before storing original state:
// Enhanced merge detection
const mergedAreas = range.getMergedAreasOrNullObject();
mergedAreas.load(['areaCount', 'areas']);
await context.sync();

let isMerged = false;
let mergeArea = null;
let mergeAnchor = null;
let originalMergeState: 'merged' | 'unmerged' | 'partial' = 'unmerged';

if (!mergedAreas.isNullObject && mergedAreas.areaCount > 0) {
  // Load all merge areas
  for (let i = 0; i < mergedAreas.areas.items.length; i++) {
    const area = mergedAreas.areas.items[i];
    area.load(['address', 'rowIndex', 'columnIndex']);
  }
  await context.sync();
  
  // Check if this specific cell is in a merge area
  for (let i = 0; i < mergedAreas.areas.items.length; i++) {
    const area = mergedAreas.areas.items[i];
    const areaAddress = area.address;
    
    // Parse addresses to check if current cell is within this merge area
    const [areaStart, areaEnd] = areaAddress.split(':');
    if (cellIsWithinRange(cellKey, areaStart, areaEnd)) {
      isMerged = true;
      mergeArea = areaAddress;
      mergeAnchor = areaStart;
      originalMergeState = 'merged';
      break;
    }
  }
  
  // Check if this is a partial merge situation
  if (mergedAreas.areaCount > 1 || (mergedAreas.areaCount === 1 && !isMerged)) {
    originalMergeState = 'partial';
  }
}

// Helper function to check if a cell is within a range
function cellIsWithinRange(cellKey: string, rangeStart: string, rangeEnd: string): boolean {
  // Implementation would parse cell addresses and compare row/column indices
  // This is a simplified version - full implementation would handle sheet names too
  return true; // Placeholder
}
```

**Step 3**: Update clearHighlights to handle merged cells properly:

```typescript
// In clearHighlights, add enhanced merge handling:
if (originalState.originalMergeState && !preserveValues) {
  // Handle different merge restoration scenarios
  if (originalState.originalMergeState === 'merged') {
    // Cell was originally part of a merged range
    if (!originalState.isMerged) {
      // Cell is no longer merged - need to restore merge
      try {
        const mergeRange = worksheet.getRange(originalState.mergeArea);
        mergeRange.merge(false); // Merge without across option
        await context.sync();
        console.log(`[Visualizer] Restored merge for area ${originalState.mergeArea}`);
      } catch (e) {
        console.warn(`[Visualizer] Could not restore merge for ${originalState.mergeArea}:`, e);
      }
    }
  } else if (originalState.originalMergeState === 'unmerged') {
    // Cell was originally not merged
    if (originalState.isMerged) {
      // Cell is now merged - need to unmerge
      try {
        range.unmerge();
        await context.sync();
        console.log(`[Visualizer] Unmerged cell ${cellKey} to restore original state`);
      } catch (e) {
        console.warn(`[Visualizer] Could not unmerge cell ${cellKey}:`, e);
      }
    }
  }
}

// Enhanced value restoration for merged cells
if (!preserveValues) {
  if (originalState.mergeArea) {
    // For merged cells, only restore value to the anchor cell
    if (cellKey === originalState.mergeAnchor || cellKey === originalState.mergeArea.split(':')[0]) {
      if (originalState.formula) {
        range.formulas = [[originalState.formula]];
      } else if (originalState.value !== null && originalState.value !== undefined) {
        range.values = [[originalState.value]];
      }
    }
    // Other cells in the merge area should be cleared
    else if (cellIsWithinRange(cellKey, originalState.mergeArea)) {
      range.clear(Excel.ClearApplyTo.contents);
    }
  } else {
    // Normal value restoration for non-merged cells
    if (originalState.formula) {
      range.formulas = [[originalState.formula]];
    } else if (originalState.value !== null && originalState.value !== undefined) {
      range.values = [[originalState.value]];
    }
  }
}
```

### Phase 3: Context Enhancement

#### 3.1 Merge Detection in Context

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

Update `getSmartContext` method with comprehensive merge detection:

```typescript
// Add comprehensive merge detection method:
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
```

Then enhance the context data with detailed merge information:

```typescript
// In getSmartContext, after loading sheet data:
const mergeInfo = await this.detectMergedCells(worksheet, fullSheetRange.address);

// Add comprehensive merge information to context
if (mergeInfo.mergedAreas.length > 0) {
  result.mergeInfo = {
    totalMergedAreas: mergeInfo.mergedAreas.length,
    totalMergedCells: mergeInfo.mergedCellsMap.size,
    mergedAreas: mergeInfo.mergedAreas,
    largestMergeArea: mergeInfo.mergedAreas.reduce((largest, current) => 
      (current.rowCount * current.colCount > largest.rowCount * largest.colCount) ? current : largest
    )
  };
  
  // Add merge state to individual cell data if needed
  if (result.fullSheetData) {
    result.fullSheetData.mergedCells = mergeInfo.mergedAreas.map(area => ({
      range: area.area,
      anchor: area.anchor,
      size: `${area.rowCount}x${area.colCount}`
    }));
  }
}
```

### Phase 4: Operation Simulation Support

#### 4.1 Add Merge Support to diffSimulator.ts

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/diffSimulator.ts`

Add the following to the switch statement in `simulateOperation`:

```typescript
case 'apply_layout':
  log('info', `[Simulator] Applying layout operation to range: ${operation.input?.range}`);
  await simulateLayoutOperation(newSnapshot, operation, log);
  break;
```

Then add the simulation function:

```typescript
async function simulateLayoutOperation(
  snapshot: WorkbookSnapshot,
  operation: AISuggestedOperation,
  log: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void
): Promise<void> {
  const { range, merge, preserve_content = true } = operation.input || {};
  if (!range) {
    log('warning', '[Simulator] Layout operation missing range', { input: operation.input });
    return;
  }
  
  const affectedCells = expandRangeToCells(range);
  
  if (merge === 'all' || merge === 'across') {
    // For merge operations, we need to simulate the merge behavior
    // In a merge, only the top-left cell retains its value
    const anchorCell = affectedCells[0]; // First cell is the anchor
    const anchorKey = `${getActiveSheet()}!${anchorCell}`;
    const anchorSnapshot = snapshot[anchorKey];
    
    // Clear all cells except the anchor
    for (let i = 1; i < affectedCells.length; i++) {
      const cellKey = `${getActiveSheet()}!${affectedCells[i]}`;
      if (snapshot[cellKey]) {
        // Mark cell as part of merged area (for diff visualization)
        snapshot[cellKey] = {
          ...snapshot[cellKey],
          isMerged: true,
          mergeAnchor: anchorCell
        };
        
        // Clear value if not preserving content
        if (!preserve_content) {
          delete snapshot[cellKey].v;
          delete snapshot[cellKey].f;
        }
      }
    }
    
    // Mark anchor cell as merged
    if (anchorSnapshot) {
      snapshot[anchorKey] = {
        ...anchorSnapshot,
        isMerged: true,
        mergeArea: range
      };
    }
    
    log('info', `[Simulator] Simulated merge for range ${range} (${affectedCells.length} cells)`);
  } else if (merge === 'unmerge') {
    // For unmerge, restore individual cell states
    for (const cell of affectedCells) {
      const cellKey = `${getActiveSheet()}!${cell}`;
      if (snapshot[cellKey] && snapshot[cellKey].isMerged) {
        // Remove merge metadata
        delete snapshot[cellKey].isMerged;
        delete snapshot[cellKey].mergeAnchor;
        delete snapshot[cellKey].mergeArea;
      }
    }
    
    log('info', `[Simulator] Simulated unmerge for range ${range}`);
  }
}
```

### Phase 5: AI Workflow Integration

#### 5.1 Enhanced Tool Usage Guidelines

Add to the AI's system prompt to guide proper usage:

```
CELL MERGING BEST PRACTICES:

1. **Creating Headers**: Always write content BEFORE merging
   Correct workflow:
   [
     {"tool": "write_range", "range": "A1", "values": [["Financial Model Overview"]]},
     {"tool": "apply_layout", "range": "A1:G1", "merge": "all"},
     {"tool": "format_range", "range": "A1:G1", "font": {"bold": true, "size": 14}, "alignment": {"horizontal": "center"}}
   ]

2. **Creating Section Headers**: Use row-wise merge for multi-row headers
   [
     {"tool": "write_range", "range": "A1:C3", "values": [["Revenue"], ["Costs"], ["EBITDA"]]},
     {"tool": "apply_layout", "range": "A1:C3", "merge": "across"},
     {"tool": "format_range", "range": "A1:C3", "font": {"bold": true}, "fill_color": "#E7E6E6"}
   ]

3. **Handling Existing Merges**: Check context for merged cells before writing
   - If cells are already merged, write only to the anchor cell
   - To modify merged cells, unmerge first if needed

4. **Error Prevention**:
   - Never merge non-rectangular ranges
   - Always check for partial merges in the target range
   - Use preserve_content: true (default) to avoid data loss

5. **Common Patterns**:
   - Model title: Merge A1:G1 or full width
   - Section headers: Merge across relevant columns
   - Category labels: Merge 2-3 columns for readability
```

### Phase 6: Comprehensive Testing Plan

#### 6.1 Basic Merge Tests
1. **Single row merge**: `{"tool": "apply_layout", "range": "A1:E1", "merge": "all"}`
2. **Single column merge**: `{"tool": "apply_layout", "range": "A1:A5", "merge": "all"}`
3. **Block merge**: `{"tool": "apply_layout", "range": "A1:C3", "merge": "all"}`
4. **Merge across rows**: `{"tool": "apply_layout", "range": "A1:C3", "merge": "across"}`
5. **Unmerge**: `{"tool": "apply_layout", "range": "A1:E1", "merge": "unmerge"}`

#### 6.2 Error Handling Tests
1. **Non-rectangular range**: Should fail with clear error
2. **Partial merge conflict**: Range containing some merged cells should error
3. **Invalid merge type**: Using unsupported merge parameter
4. **Protected sheet**: Attempting merge on protected worksheet
5. **Out of bounds**: Range exceeding worksheet limits

#### 6.3 Preview/Restore Tests
1. **Preview merge → Accept**: Verify cells remain merged
2. **Preview merge → Reject**: Verify merge is undone, original state restored
3. **Preview with existing merged cells**: Ensure proper detection
4. **Multiple merges in single preview**: Test batch operations
5. **Mixed operations**: Merge + write + format in same preview

#### 6.4 Context and AI Understanding Tests
1. **AI reads merged cells correctly**: Only sees one value for merged area
2. **AI understands merge structure**: Recognizes merge boundaries
3. **AI can write to merged cells**: Writes to anchor cell only
4. **AI detects merge conflicts**: Warns about partial merges
5. **AI suggests appropriate merges**: For headers and titles

#### 6.5 Edge Cases
1. **Merge with formulas**: Ensure formulas in non-anchor cells are preserved/warned
2. **Merge with different formats**: Test format consolidation
3. **Large merge areas**: Performance test with 100+ cells
4. **Nested merge attempts**: Try to merge already merged cells
5. **Cross-sheet references**: Formulas referencing merged cells

## Enhanced Implementation Checklist

### Phase 1: Core Implementation
- [ ] **Frontend (ExcelService.ts)**
  - [ ] Add helper methods (isRectangularRange, detectMergeState)
  - [ ] Add enhanced toolApplyLayout with validation
  - [ ] Add to executeToolRequest switch
  - [ ] Add to both batch execution methods
  - [ ] Add error handling for all edge cases
  - [ ] Test basic merge/unmerge functionality

- [ ] **Backend (prompt_builder.go)**
  - [ ] Add apply_layout to tool list with description
  - [ ] Add comprehensive tool documentation with examples
  - [ ] Add merge best practices to system prompt
  - [ ] Test AI recognizes and uses new tool correctly

### Phase 2: State Management
- [ ] **GridVisualizer.ts**
  - [ ] Update CellState interface with merge properties
  - [ ] Enhance applyHighlights with merge detection
  - [ ] Implement proper merge restoration in clearHighlights
  - [ ] Add cellIsWithinRange helper function
  - [ ] Test preview/restore with various merge scenarios

- [ ] **Operation Simulation (diffSimulator.ts)**
  - [ ] Add apply_layout case to switch statement
  - [ ] Implement simulateLayoutOperation function
  - [ ] Handle merge metadata in snapshots
  - [ ] Test preview generation with merges

### Phase 3: Context Enhancement
- [ ] **Context Detection (ExcelService.ts)**
  - [ ] Add comprehensive detectMergedCells method
  - [ ] Add getCellAddressRelative helper
  - [ ] Integrate merge detection into getSmartContext
  - [ ] Include detailed merge info in context data
  - [ ] Test AI receives accurate merge information

### Phase 4: Testing & Validation
- [ ] **Unit Tests**
  - [ ] Test each merge type (all, across, unmerge)
  - [ ] Test validation logic
  - [ ] Test error scenarios
  - [ ] Test batch operations

- [ ] **Integration Tests**
  - [ ] Test complete AI workflow with merges
  - [ ] Test preview/accept/reject cycle
  - [ ] Test context accuracy with merged cells
  - [ ] Test performance with large merges

- [ ] **Edge Case Tests**
  - [ ] Non-rectangular ranges
  - [ ] Partial merge conflicts
  - [ ] Formula preservation
  - [ ] Cross-sheet references

## Future Enhancements

This minimal implementation focuses only on merging. Future versions can expand `apply_layout` to include:
- Row height and column width adjustment
- Cell borders and styles
- Auto-fit functionality
- Freeze panes
- Conditional formatting

These additions would follow the full specification in `AI_TOOLSET_EXPANSION_PLAN.md`.

## Success Criteria

1. AI can successfully merge cells using the apply_layout tool
2. Merged cells display as single cells in Excel
3. Preview/restore works correctly with merged cells
4. AI understands merged cell context and doesn't see duplicates
5. No regression in existing functionality

## Risk Mitigation

### Technical Risks
1. **Backward Compatibility**: 
   - New tool is purely additive, no changes to existing tools
   - Existing spreadsheets without merges are unaffected
   - Migration path: No migration needed

2. **Error Handling**:
   - Comprehensive validation before operations
   - Clear, actionable error messages
   - Graceful fallbacks for edge cases
   - Detailed logging for debugging

3. **Performance**:
   - Merge operations are atomic and fast
   - Batch operations supported for efficiency
   - Minimal memory overhead
   - Tested with large ranges (100+ cells)

4. **Data Integrity**:
   - Original values preserved in edit history
   - Full undo capability through edit tracking
   - Preview shows exact changes before commit
   - Warnings for potential data loss

### Implementation Risks
1. **Excel API Limitations**:
   - Some merge behaviors may vary between Excel versions
   - Mitigation: Test on multiple Excel versions
   - Fallback: Provide clear version requirements

2. **AI Understanding**:
   - AI might misuse merge tool initially
   - Mitigation: Comprehensive examples in prompt
   - Monitoring: Track tool usage patterns

3. **User Experience**:
   - Users might expect more layout features
   - Mitigation: Clear documentation of current capabilities
   - Future: Expand tool based on user feedback

## Implementation Timeline

### Week 1: Core Development
- Days 1-2: Implement frontend toolApplyLayout
- Days 3-4: Backend integration and prompt updates
- Day 5: Basic testing and debugging

### Week 2: Enhancement & Testing
- Days 1-2: GridVisualizer and context updates
- Days 3-4: Operation simulation implementation
- Day 5: Comprehensive testing

### Week 3: Polish & Deploy
- Days 1-2: Edge case handling and performance optimization
- Days 3-4: Documentation and AI training
- Day 5: Deployment and monitoring

## Success Metrics

### Immediate (Week 1)
- AI can successfully merge cells without duplication
- Basic merge/unmerge operations work correctly
- No regression in existing functionality

### Short-term (Month 1)
- 90% reduction in merge-related user complaints
- AI correctly uses merge tool in 95% of cases
- Preview/restore works flawlessly with merges

### Long-term (Quarter 1)
- Merge tool used in 50%+ of financial models
- User satisfaction with formatting improves by 40%
- Foundation ready for additional layout features

## Conclusion

This enhanced implementation plan addresses the critical cell merging issue with a robust, well-tested solution. By incorporating comprehensive error handling, validation, and state management, we ensure a high-quality feature that integrates seamlessly with Gridmate's existing architecture.

The phased approach allows for immediate problem resolution while building a foundation for future layout enhancements. With proper testing and careful implementation, this feature will significantly improve the AI's ability to create professional financial models that match user expectations.