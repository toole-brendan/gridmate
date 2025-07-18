# Debug Guide: Testing Excel Context Flow

## How to Test and Debug Context Issues

### 1. Open Browser DevTools Console
- Press F12 or right-click → Inspect → Console tab
- Clear the console for a fresh start

### 2. Test Sequence

#### First Message (Should Work):
1. Open a blank Excel sheet
2. Type: "Create a simple DCF model"
3. Watch the console for these key logs:

```
🔍 [CONTEXT DEBUG] Context Enabled: true
🔍 [CONTEXT DEBUG] Raw Excel Context from getSmartContext(): {...}
🎯 [ExcelService] Final Smart Context Result: {...}
📤 [CONTEXT DEBUG] Full Message Payload to SignalR: {...}
🚀 [SignalR] Sending to Backend - SendChatMessage params: {...}
```

#### Second Message (Where Issue Occurs):
1. After the first operation completes
2. Type: "Continue building the model"
3. Check if these logs show actual data:

### 3. What to Look For

✅ **Good Context** (what you should see):
```javascript
selectedDataDetails: {
  rowCount: 20,
  colCount: 5,
  hasValues: true
}
nearbyRangeDetails: {
  rowCount: 40,
  colCount: 10,
  hasValues: true
}
```

❌ **Bad Context** (indicates the bug):
```javascript
selectedDataDetails: "No selected data"
nearbyRangeDetails: "No nearby range"
// OR
hasSelectedData: false
hasNearbyRange: false
```

### 4. Key Debug Points

1. **In ExcelService** - Look for:
   - `🎯 [ExcelService] Final Smart Context Result:`
   - Check if `selectedDataSummary` and `nearbyDataSummary` have values

2. **In RefactoredChatInterface** - Look for:
   - `📊 [CONTEXT DEBUG] Selected Cell Values:`
   - `📊 [CONTEXT DEBUG] Nearby Cell Values (first 5x5):`
   - These should show actual cell data, not undefined

3. **In SignalR** - Look for:
   - `🚀 [SignalR] Full Excel Context being sent:`
   - This is the final payload going to the backend

### 5. Common Issues to Check

1. **Property Name Mismatch**: 
   - ExcelService returns `nearbyData`
   - But RefactoredChatInterface might be looking for `nearbyRange`

2. **Context Not Refreshing**:
   - The context might be cached from the first message
   - Check timestamps to ensure fresh data

3. **Selection Change Not Triggering Update**:
   - After first operation, try clicking a different cell
   - Wait 300ms (debounce delay)
   - Then send second message

### 6. Quick Fix to Test

If you see the issue, check line 254 in RefactoredChatInterface.tsx:
```javascript
nearbyRange: excelContext?.nearbyData,  // Should match property name from ExcelService
```

### 7. Export Debug Logs

After reproducing the issue:
1. Click the debug panel at bottom of chat
2. Click "📋 Copy All Debug Info"
3. Save to a file for analysis

This will help identify exactly where the context is getting lost in the chain.