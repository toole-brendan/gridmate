# Fix Plan: Excel Context Not Being Sent to AI

## Problem
The AI is re-writing cells that already have values because:
1. Excel context is disabled by default (`isContextEnabled = false`)
2. When context is disabled, no spreadsheet data is sent to the backend
3. The AI can't see what's already in the cells, so it writes the same values again

## Current Behavior
```typescript
// RefactoredChatInterface.tsx line 74
const [isContextEnabled, setIsContextEnabled] = useState(false);

// Line 215 - Context only sent if enabled
const excelContext = isContextEnabled ? await ExcelService.getInstance().getSmartContext() : null;
```

## Solution Options

### Option 1: Enable Context by Default (Recommended)
Change the default state to true so Excel context is always sent:
```typescript
const [isContextEnabled, setIsContextEnabled] = useState(true);
```

### Option 2: Always Send Basic Context
Modify the logic to always send at least the worksheet info:
```typescript
const excelContext = isContextEnabled 
  ? await ExcelService.getInstance().getSmartContext() 
  : await ExcelService.getInstance().getBasicContext(); // worksheet name, selected range
```

### Option 3: Auto-Enable on Activity
Automatically enable context when the user interacts with Excel:
```typescript
// Enable context when a selection is made or cells are edited
useEffect(() => {
  if (hasExcelActivity) {
    setIsContextEnabled(true);
  }
}, [hasExcelActivity]);
```

## Recommendation
Go with Option 1 - Enable context by default. This ensures:
- AI always knows the current spreadsheet state
- No duplicate writes to cells
- Better user experience
- User can still manually disable if needed

## Files to Change
1. `/excel-addin/src/components/chat/RefactoredChatInterface.tsx` - Change default state