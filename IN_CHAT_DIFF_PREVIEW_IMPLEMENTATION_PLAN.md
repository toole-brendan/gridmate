# Enhanced In-Chat Diff Preview Implementation Plan

## Overview
This document outlines the implementation plan to transform the current global DiffPreviewBar into message-specific inline previews that appear within each AI chat message. This enables a workflow where AI suggestions automatically appear as visual previews in Excel, with the ability for AI to continue building on previous unaccepted changes.

## Core Requirements
1. **Auto-preview**: AI suggestions immediately show as visual previews in Excel cells
2. **Inline UI**: Preview controls appear within each chat message, not as a floating bar
3. **Simplified state**: Only one active preview at a time, older previews auto-accept
4. **Explicit preview control**: AI tools include preview parameter for clear intent
5. **No cascading failures**: Dependencies are handled automatically

## File Changes Required

### 1. State Management Refactor (Simplified)

**File to modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`

**Changes:**
```typescript
// Simplified: Only one active preview at a time
interface DiffData {
  status: 'previewing' | 'applying' | 'rejected';
  operations: AISuggestedOperation[];
  hunks: DiffHunk[];
  timestamp: number;
  messageId: string;
}

interface DiffSessionState {
  // Current active preview (only one at a time)
  activePreview: DiffData | null;
  
  // Original snapshot before preview
  originalSnapshot: WorkbookSnapshot | null;
  
  // Actions
  setActivePreview: (messageId: string, operations: AISuggestedOperation[], hunks: DiffHunk[]) => void;
  acceptActivePreview: () => Promise<void>;
  rejectActivePreview: () => void;
  clearPreview: () => void;
}
```

### 2. New Component: ChatMessageDiffPreview

**File to create:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/ChatMessageDiffPreview.tsx`

**Implementation:**
```typescript
interface ChatMessageDiffPreviewProps {
  messageId: string;
  hunks: DiffHunk[];
  onAccept: () => void;
  onReject: () => void;
  status: 'previewing' | 'applying' | 'rejected';
}

// Component will display:
// - Summary: "+5 cells, -2 cells, ~3 changes"
// - Accept/Reject buttons
// - Compact inline design
// - Loading state during application
```

### 3. Core Hook Updates

**File to modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Changes:**
```typescript
interface UseDiffPreviewReturn {
  // Simplified actions
  generatePreview: (messageId: string, operations: AISuggestedOperation[]) => Promise<void>;
  acceptCurrentPreview: () => Promise<void>;
  rejectCurrentPreview: () => Promise<void>;
  
  // State
  activePreviewMessageId: string | null;
  isCalculating: boolean;
  validationErrors: ValidationError[];
}

// generatePreview implementation will:
// 1. Auto-accept any existing preview
// 2. Capture current workbook state as originalSnapshot
// 3. Simulate new operations
// 4. Calculate diff
// 5. Apply visual highlights
// 6. Set as active preview
```

**File to modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

**Changes:**
```typescript
// In handleToolRequest function:
case 'excel_write':
case 'excel_formula':
case 'excel_format':
  // Check if tool request includes preview parameter
  const shouldPreview = toolRequest.preview !== false; // Default to true
  
  if (shouldPreview) {
    await diffPreview.generatePreview(message.id, [operation]);
  } else {
    // Direct execution without preview
    await ExcelService.getInstance().executeToolRequest(toolRequest.tool, toolRequest);
  }
  break;
```

### 3.5. Backend Tool Updates (Optional Enhancement)

**File to modify:** `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/tools.go`

**Enhancement:**
Add `preview` parameter to write tools:
```go
// In each write tool's InputSchema properties:
"preview": map[string]interface{}{
    "type":        "boolean",
    "description": "Whether to preview changes before applying (default: true)",
    "default":     true,
}
```

### 4. UI Integration Updates

**File to modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

**Changes:**
- Remove the global `<DiffPreviewBar />` component
- Import and use `activePreview` from `useDiffSessionStore`
- Pass `activePreview` data to `EnhancedChatInterface`

**File to modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterface.tsx`

**Changes:**
- Accept `activePreview` as a prop
- Pass preview data only to the message that matches `activePreview.messageId`

**File to modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/ToolSuggestionCard.tsx`

**Changes:**
```typescript
// Add to props
interface ToolSuggestionCardProps {
  // ... existing props
  diffData?: DiffData;
  onAcceptDiff?: () => void;
  onRejectDiff?: () => void;
}

// In render, after tool details:
{diffData && diffData.status === 'previewing' && (
  <ChatMessageDiffPreview
    messageId={message.id}
    hunks={diffData.hunks}
    onAccept={onAcceptDiff}
    onReject={onRejectDiff}
    status={diffData.status}
  />
)}
```

### 5. Visual Highlighting Updates

**Files to verify (no changes needed):**
- `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/GridVisualizer.ts`
- `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diffSimulator.ts`
- `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/clientDiff.ts`

These files already handle the visual highlighting correctly and don't need modification.

### 6. Cleanup

**File to remove:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/DiffPreviewBar.tsx`

## Implementation Sequence

1. **Phase 1: Simplified State Management**
   - Refactor `useDiffSessionStore.ts` to single active preview model
   - Remove complex pending diff chains
   - Implement auto-accept on new preview generation
   - Test state transitions

2. **Phase 2: Component Creation**
   - Create `ChatMessageDiffPreview.tsx` with inline UI
   - Style for compact display within messages
   - Add loading and error states
   - Clear accept/reject buttons

3. **Phase 3: Hook Integration**
   - Update `useDiffPreview.ts` with simplified logic
   - Add preview parameter checking in `useMessageHandlers.ts`
   - Implement auto-acceptance in `generatePreview`
   - Ensure visual highlights work correctly

4. **Phase 4: UI Wiring**
   - Remove global DiffPreviewBar from RefactoredChatInterface
   - Wire up activePreview data flow
   - Show preview only on active message
   - Test preview appears inline

5. **Phase 5: Optional Tool Enhancement**
   - Add preview parameter to backend tools
   - Update AI prompt to understand preview control
   - Test explicit preview control

6. **Phase 6: Testing & Polish**
   - Test single preview workflow
   - Verify auto-acceptance behavior
   - Ensure visual highlights update correctly
   - Handle edge cases (rejected diffs, errors)

## Expected User Experience

### Single Suggestion Flow
```
User: "Sum A1:A10 in B1"
AI: I'll calculate the sum for you.
    [Tool: excel_formula]
    ┌─────────────────────────────┐
    │ 📊 Preview: 1 formula change │
    │ Cell B1: =SUM(A1:A10)       │
    │ [Accept] [Reject]           │
    └─────────────────────────────┘
Excel: Cell B1 highlighted blue
```

### Multiple Suggestion Flow
```
User: "Sum A1:A10 in B1"
AI: [First suggestion with preview as above]

User: "Now multiply by 2 in C1"
AI: I'll multiply the result by 2.
    [Tool: excel_formula]
    ┌─────────────────────────────┐
    │ 📊 Preview: 1 formula change │
    │ Cell C1: =B1*2              │
    │ [Accept] [Reject]           │
    └─────────────────────────────┘
Excel: B1 auto-accepted (no longer highlighted)
       C1 now highlighted blue
```

## Technical Considerations

### Simplified Auto-Acceptance Logic
When `generatePreview(messageId)` is called:
1. If activePreview exists, apply it to Excel via `ExcelService.bulkWrite()`
2. Clear existing highlights via `GridVisualizer.clearHighlights()`
3. Capture current workbook state as new baseline
4. Generate and display new preview

### State Consistency (Simplified)
- Only one preview active at any time
- `originalSnapshot` represents workbook state before current preview
- No complex diff chains to manage
- Rejecting simply reverts to originalSnapshot

### Performance
- Single preview = faster operations
- No need to track multiple pending states
- Direct Excel API calls for accept/reject

### Error Handling
- If auto-acceptance fails, show error and keep current preview
- Simple rollback to originalSnapshot on errors
- Clear error messaging to user

## Key Benefits of Simplified Approach

1. **Clearer Mental Model**
   - Users only need to think about one preview at a time
   - No confusion about which changes are pending
   - Straightforward accept/reject decisions

2. **Reduced Complexity**
   - Simpler state management code
   - Fewer edge cases to handle
   - Easier to debug and maintain

3. **Better Performance**
   - Less memory usage (one preview vs many)
   - Faster state updates
   - Simpler Excel API interactions

4. **Explicit Control**
   - Preview parameter gives AI clear intent
   - Users can request direct execution when needed
   - Maintains human-in-the-loop principle

## Success Criteria
1. ✅ Previews appear inline within chat messages
2. ✅ Excel cells show visual highlights immediately
3. ✅ AI can build on unaccepted changes
4. ✅ Older previews auto-accept when new ones arrive
5. ✅ No cascading failures from rejected diffs
6. ✅ Clear visual feedback at every step
7. ✅ Complete audit trail maintained

## Future Enhancements
- Batch accept/reject for multiple pending previews
- Keyboard shortcuts for accept/reject
- Preview groups for related changes
- Undo/redo for accepted changes
- Side-by-side diff view option