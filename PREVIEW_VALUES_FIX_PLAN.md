# Plan to Fix Preview Values Display in Visual Diff

## Executive Summary

The preview values are not displaying because the diff simulator incorrectly handles 2D array values from `write_range` operations. It assigns entire row arrays to individual cells instead of mapping each value to its corresponding cell. This causes the GridVisualizer to skip these array values as a safety measure.

## Problem Analysis

### Root Cause
In `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/diffSimulator.ts`, the `simulateWriteOperation` function (line 80) incorrectly handles array values:

```typescript
const value = Array.isArray(values) ? values[index] : values;
```

This assumes a flat array structure, but `write_range` operations use 2D arrays `[rows][columns]`.

### Current Flow
1. **Input**: `write_range` with values `[[1,2,3], [4,5,6], [7,8,9]]` for range "A1:C3"
2. **Simulator Bug**: Assigns `[1,2,3]` to cell A1, `[4,5,6]` to cell A2, etc.
3. **Diff Creation**: Creates hunks with array values in individual cells
4. **GridVisualizer**: Detects array values and skips them (line 575-579)
5. **Result**: No preview values displayed

### Why Accept Phase Works
The `executeToolRequest` in `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/ExcelService.ts` correctly handles 2D arrays in `toolWriteRange` (line 858), processing values row by row.

## Solution Design

### Phase 1: Fix the Diff Simulator

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/diffSimulator.ts`

**Changes Needed**:
1. Replace the incorrect array handling logic with proper 2D array traversal
2. Map each value to its corresponding cell based on the range dimensions

**Implementation**:
```typescript
// Replace lines 77-86 with:
if (tool === 'write_range' && Array.isArray(values)) {
  // Handle 2D array structure
  let cellIndex = 0;
  for (let row = 0; row < values.length; row++) {
    for (let col = 0; col < values[row].length; col++) {
      if (cellIndex === index) {
        const value = values[row][col];
        const cellRef = rangeExpandToCells[index];
        const cellKey = parseCellKey(cellRef);
        modifiedSnapshot[cellKey] = { v: value };
        break;
      }
      cellIndex++;
    }
  }
} else {
  // Existing logic for non-array values
  const value = values;
  const cellRef = rangeExpandToCells[index];
  const cellKey = parseCellKey(cellRef);
  modifiedSnapshot[cellKey] = { v: value };
}
```

### Phase 2: Enhance GridVisualizer for Italic Formatting

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`

**Changes Needed**:
1. Add italic formatting to the `applyPreviewValues` method
2. Ensure italic formatting is cleared on accept/reject

**Implementation**:
```typescript
// In applyPreviewValues method, after line 588:
await range.load(['values', 'format/font/italic']);
await context.sync();

// Set the value with italic formatting
range.values = [[value]];
range.format.font.italic = true;

// In clearHighlights method, add after line 701:
if (!preserveValues) {
  range.format.font.italic = false;
}
```

### Phase 3: Update Preview Generation Logic

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Changes Needed**:
1. Ensure the two-phase preview approach works correctly
2. Add better error handling for preview value failures

**Verification Steps**:
- The existing two-phase approach (lines 79-91) should work once the simulator is fixed
- Keep the error handling for individual value application failures

## Implementation Steps

### Step 1: Fix the Simulator (Priority: Critical)
1. Open `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/diffSimulator.ts`
2. Locate the `simulateWriteOperation` function
3. Replace the array handling logic (lines 77-86) with the corrected 2D array traversal
4. Test with various write_range operations

### Step 2: Add Italic Formatting (Priority: High)
1. Open `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`
2. In `applyPreviewValues`, add italic formatting after setting values
3. In `clearHighlights`, ensure italic formatting is removed when not preserving values
4. Test that italic formatting appears during preview and is removed on accept/reject

### Step 3: Verify End-to-End Flow (Priority: High)
1. Test with simple value changes (single cells)
2. Test with complex write_range operations (multiple cells, formulas)
3. Test accept/reject functionality
4. Verify formatting is properly applied and removed

## Testing Plan

### Test Case 1: Single Cell Value Change
- Operation: `write_range` with range "A1" and values `[["New Value"]]`
- Expected: Cell A1 shows "New Value" in italic during preview
- Accept: Italic removed, value remains
- Reject: Both italic and value removed

### Test Case 2: Multi-Cell Range
- Operation: `write_range` with range "A1:C3" and 3x3 array of values
- Expected: All 9 cells show preview values in italic
- Accept: All italics removed, values remain
- Reject: All formatting and values reverted

### Test Case 3: Formula Application
- Operation: `apply_formula` with formula "=SUM(A1:A10)"
- Expected: Formula result shown in italic
- Accept: Italic removed, formula remains
- Reject: Formula and formatting removed

### Test Case 4: Mixed Operations
- Multiple operations in one preview batch
- Verify all preview values display correctly
- Test accept/reject on batch operations

## Risk Mitigation

1. **Backward Compatibility**: The fix maintains the existing API and behavior for the accept phase
2. **Performance**: The 2D array traversal is still O(n) where n is total cells
3. **Error Handling**: Keep existing defensive checks in GridVisualizer as fallback
4. **Data Integrity**: Preview changes remain temporary until explicitly accepted

## Success Criteria

1. ✅ Preview values display in cells during preview phase
2. ✅ Values appear with italic formatting to indicate they're previews
3. ✅ Accept removes formatting but keeps values
4. ✅ Reject removes both formatting and values
5. ✅ All existing functionality continues to work
6. ✅ No performance degradation
7. ✅ Clear visual distinction between preview and permanent values

## Timeline

1. **Fix Simulator Logic**: 30 minutes
2. **Add Italic Formatting**: 20 minutes
3. **Testing & Verification**: 40 minutes
4. **Total Estimated Time**: 1.5 hours

## Files to Modify

1. `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/diffSimulator.ts` - Fix array handling
2. `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts` - Add italic formatting
3. No changes needed to `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts` - Current implementation should work once simulator is fixed

## Post-Implementation Verification

After implementation:
1. Run the development environment
2. Test all scenarios in the Testing Plan
3. Check browser console for any warnings or errors
4. Verify memory usage doesn't increase (no leaks from formatting)
5. Document any edge cases discovered during testing