# Plan: Live Visual Diff Implementation and UI Refactoring

**Status:** Not Started

## 1. Objective

This document outlines a two-part plan to significantly improve the Gridmate frontend.
1.  **Implement a "Live Visual Diff":** Refactor the visual diff feature to provide a real-time, "Cursor-like" preview. Instead of waiting for all AI operations to finish, the grid will update with highlights *as each write operation is generated*.
2.  **Modularize the Chat UI:** Refactor the monolithic `EnhancedChatInterfaceWithSignalR.tsx` component into smaller, more manageable hooks, services, and components to improve maintainability, testability, and developer velocity.

---

## 2. Part 1: Refactoring `EnhancedChatInterfaceWithSignalR.tsx`

The current component has become a "god component," handling state, data fetching, SignalR communication, and complex UI rendering. This makes it difficult to reason about and modify.

### Refactoring Strategy

We will decompose the component's responsibilities into a collection of specialized hooks and smaller components.

#### **Step 2.1: Extract Logic into Custom Hooks**

Create the following new hooks inside `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/`:

1.  **`useSignalR.ts`:**
    *   **Responsibility:** Manage the entire SignalR connection lifecycle.
    *   **Exports:** `connectionStatus`, `isAuthenticated`, `signalRClient` (the instance), and a stable `sendMessage` function.
    *   **Implementation:** This hook will contain all `useEffect` logic for initializing, connecting, and handling events from the `SignalRClient`. It will expose a clean and simple interface to the rest of the app.

2.  **`useChat.ts`:**
    *   **Responsibility:** Manage the state of the chat conversation.
    *   **Exports:** `messages`, `addMessage`, `updateMessageStatus`, `handleSendMessage` (which would internally use the `sendMessage` function from `useSignalR`).
    *   **Implementation:** This hook will contain the `useState` for `messages` and all the helper functions for creating, updating, and removing chat messages (`ToolSuggestionMessage`, `StatusMessage`, etc.).

3.  **`useExcelContext.ts`:**
    *   **Responsibility:** Manage all interactions with the Excel grid for context gathering.
    *   **Exports:** `availableMentions`, `activeContext`, `refreshContext`.
    *   **Implementation:** This will contain the logic for calling `ExcelService.getInstance().getSmartContext()`, debouncing selection changes, and setting up the `onSelectionChanged` event listeners.

#### **Step 2.2: Extract UI into Sub-Components**

Create the following new components inside `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/`:

1.  **`DebugContainer.tsx`:**
    *   **Responsibility:** Render the entire collapsible "Debug Info" section.
    *   **Props:** It will take the required state (logs, session info, etc.) as props, or preferably, read them directly from the relevant stores (`useLogStore`, `useChat`, etc.) to stay decoupled.

2.  **`ChatBar.tsx`:**
    *   **Responsibility:** Render the main chat input bar, including the `MentionsInput`, context pills, and send button.
    *   **Props:** `input`, `setInput`, `handleSendMessage`, `availableMentions`, `activeContext`, etc.

### **Outcome of Refactoring**

After this refactoring, `EnhancedChatInterfaceWithSignalR.tsx` will be transformed from a 2000-line behemoth into a clean orchestrator component, primarily responsible for:
1.  Initializing the new custom hooks (`useSignalR`, `useChat`, `useExcelContext`, `useDiffPreview`).
2.  Passing state and callbacks between them.
3.  Rendering the main layout and the new sub-components (`ChatBar`, `DebugContainer`, `DiffPreviewBar`).

---

## 3. Part 2: Implementing the Live Visual Diff

This requires redesigning the diffing process from a "batch" model to a "streaming" model.

### **Phase 3.1: Rewrite `useDiffPreview` as a Stateful Session Manager**

The hook will be refactored to manage a "preview session" that can be started, updated, and finalized.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**New Implementation:**

```typescript
// In /Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts

import { useState, useCallback } from 'react';
import { WorkbookSnapshot, AISuggestedOperation, DiffHunk } from '../../types';
import { ExcelService } from '../../services/excel/ExcelService';
import { GridVisualizer } from '../../services/diff/GridVisualizer';
import { useDiffStore } from '../../store/useDiffStore'; // Assuming a simple store for hunks
import { simulateOperations } from '../../utils/diffSimulator'; // Move simulation logic here
import { log } from '../../store/logStore';

export const useDiffPreview = (signalRClient: any, workbookId: string) => {
  const [status, setStatus] = useState<'idle' | 'previewing' | 'applying'>('idle');
  const [originalSnapshot, setOriginalSnapshot] = useState<WorkbookSnapshot | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<WorkbookSnapshot | null>(null);
  const [pendingOps, setPendingOps] = useState<AISuggestedOperation[]>([]);

  const excelService = ExcelService.getInstance();

  const startPreviewSession = useCallback(async (initialOperation: AISuggestedOperation) => {
    log('visual-diff', '[🚀 Preview Session Started]', { operation: initialOperation });
    setStatus('previewing');
    
    const before = await excelService.createWorkbookSnapshot({ rangeAddress: 'UsedRange' });
    setOriginalSnapshot(before);
    setPendingOps([initialOperation]);

    const after = await simulateOperations(before, [initialOperation]);
    setLiveSnapshot(after);

    // Initial diff against the original state
    const diffResult = await signalRClient.invoke('GetVisualDiff', { workbookId, before, after });
    useDiffStore.setState({ diffs: diffResult, isPreviewing: true });
    
  }, [excelService, signalRClient, workbookId]);

  const updatePreview = useCallback(async (newOperation: AISuggestedOperation) => {
    if (status !== 'previewing' || !originalSnapshot || !liveSnapshot) {
      log('visual-diff', '[❌ Error] updatePreview called outside of a session.');
      return;
    }
    log('visual-diff', '[🔄 Preview Session Updated]', { newOperation });

    const updatedOps = [...pendingOps, newOperation];
    setPendingOps(updatedOps);

    // Simulate the new operation against the *current live* snapshot
    const nextLiveSnapshot = await simulateOperations(liveSnapshot, [newOperation]);
    setLiveSnapshot(nextLiveSnapshot);

    // Calculate the total diff from the beginning
    const diffResult = await signalRClient.invoke('GetVisualDiff', { 
        workbookId, 
        before: originalSnapshot, 
        after: nextLiveSnapshot 
    });
    useDiffStore.setState({ diffs: diffResult, isPreviewing: true });

  }, [status, originalSnapshot, liveSnapshot, pendingOps, signalRClient, workbookId]);

  const applyChanges = useCallback(async () => {
    if (status !== 'previewing' || pendingOps.length === 0) return;
    log('visual-diff', '[✅ Applying Changes]', { count: pendingOps.length });
    setStatus('applying');
    
    // Clear highlights first
    await GridVisualizer.clearAllHighlights();
    
    for (const op of pendingOps) {
      await excelService.executeToolRequest(op.tool, op.input);
    }
    
    // Reset state
    setStatus('idle');
    setOriginalSnapshot(null);
    setLiveSnapshot(null);
    setPendingOps([]);
    useDiffStore.setState({ diffs: [], isPreviewing: false });
    log('visual-diff', '[✅ Apply Complete]');

  }, [status, pendingOps, excelService]);

  const cancelPreview = useCallback(async () => {
    if (status !== 'previewing') return;
    log('visual-diff', '[❌ Preview Cancelled]');
    
    await GridVisualizer.clearAllHighlights();
    
    setStatus('idle');
    setOriginalSnapshot(null);
    setLiveSnapshot(null);
    setPendingOps([]);
    useDiffStore.setState({ diffs: [], isPreviewing: false });
  }, [status]);

  return { status, startPreviewSession, updatePreview, applyChanges, cancelPreview };
};
```

### **Phase 3.2: Orchestrate the Live Preview**

Modify `EnhancedChatInterfaceWithSignalR.tsx` to drive the new stateful hook.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

**New Logic:**

```typescript
// In EnhancedChatInterfaceWithSignalR.tsx

// State to track if a preview is active for the current AI response
const [isLivePreviewActive, setIsLivePreviewActive] = useState(false);

// Instantiate the new hook
const { startPreviewSession, updatePreview, applyChanges, cancelPreview } = useDiffPreview(signalRClient.current, workbookId);

// In handleSendMessage:
// When a new message is sent, cancel any lingering preview from the previous turn.
const handleSendMessage = async (content?: string) => {
    if (isLivePreviewActive) {
        await cancelPreview();
        setIsLivePreviewActive(false);
    }
    // ... rest of the function
}

// In handleToolRequest:
const handleToolRequest = useCallback(async (toolRequest: any) => {
    // ... (logic for read-only, ask mode, yolo mode) ...

    if (autonomyMode === 'agent-default' && WRITE_TOOLS.has(toolRequest.tool)) {
        const operation: AISuggestedOperation = { /* ... create operation object ... */ };
        
        if (!isLivePreviewActive) {
            // This is the FIRST write tool in the sequence. Start the session.
            setIsLivePreviewActive(true);
            await startPreviewSession(operation);
        } else {
            // A session is already active. Update it with the new tool.
            await updatePreview(operation);
        }
        // Send 'queued_for_preview' response to backend
        // ...
    }
}, [isLivePreviewActive, startPreviewSession, updatePreview /* ... */]);

// In handleAIResponse:
const handleAIResponse = (response: any) => {
    // ... (add AI message to chat) ...

    // The AI has finished its turn. "Lock in" the preview and reset the flag
    // for the next turn. The preview remains on screen for user action.
    if (isLivePreviewActive) {
        setIsLivePreviewActive(false);
        log('visual-diff', '[🏁 Preview Session Finalized]');
    }
}
```

### **Phase 3.3: Enhance `GridVisualizer` (Optional but Recommended)**

To prevent flickering as highlights are updated, `GridVisualizer` can be made more intelligent.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`

**Action:** Instead of a simple `clearAll` and `apply`, create a method that calculates the delta between highlight sets. The `useDiffStore` would need to store both `diffs` and `previousDiffs`.

```typescript
// In GridVisualizer.ts
public static async updateHighlights(newHunks: DiffHunk[], oldHunks: DiffHunk[]) {
    await Excel.run(async (context) => {
        const newKeys = new Set(newHunks.map(h => h.key));
        const oldKeys = new Set(oldHunks.map(h => h.key));

        // Find hunks to remove
        for (const hunk of oldHunks) {
            if (!newKeys.has(hunk.key)) {
                // ... logic to clear format for this hunk's range ...
            }
        }

        // Find hunks to add or update
        for (const hunk of newHunks) {
            // ... logic to apply format for this hunk's range ...
        }
        
        await context.sync();
    });
}
```

## 4. Verification Plan

1.  **Streaming Test:**
    -   **Action:** Ask the AI to perform a multi-step write operation (e.g., "In A1 write 'X', in B2 write 'Y', in C3 write 'Z'").
    -   **Expected Result:** The grid highlights should appear sequentially for A1, then B2, then C3 as the `tool_request` messages arrive from the backend. The `DiffPreviewBar` should update its summary accordingly.

2.  **Interruption Test:**
    -   **Action:** Start a multi-step write operation. Before it finishes, type and send a new message.
    -   **Expected Result:** The existing highlights and the `DiffPreviewBar` should disappear immediately and cleanly.

3.  **Finalization Test:**
    -   **Action:** Let a multi-step write operation complete.
    -   **Expected Result:** The `DiffPreviewBar` should show the final summary of all changes. Clicking "Apply" should execute all queued operations correctly. Clicking "Cancel" should clear everything.

4.  **Refactoring Test:**
    -   **Action:** Perform all standard chat and tool operations.
    -   **Expected Result:** The application should function identically to before the UI refactoring, with no regressions in behavior. The code in `EnhancedChatInterfaceWithSignalR.tsx` should be significantly smaller and easier to read.
