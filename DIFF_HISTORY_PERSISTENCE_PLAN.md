# Diff History Persistence Plan

## 1. Overview

This document outlines the implementation plan to permanently store inline diff previews within the chat history. Currently, previews disappear after being accepted or rejected because they are tied to a transient global state (`activePreview`). This plan will refactor the architecture to associate diff data directly with the chat message that generated it, ensuring a complete and persistent audit trail of all proposed and finalized changes.

The goal is to achieve a user experience where scrolling through the chat history shows the final state of every diff preview (e.g., "Changes Applied," "Changes Rejected"), not just the ones currently being previewed.

## 2. Core Architectural Change

The fundamental shift is moving the responsibility of storing diff information from a single, global "active preview" store to the message itself.

-   **From:** A single `activePreview` object in `useDiffSessionStore` that is constantly replaced.
-   **To:** An optional `diff` object within each `EnhancedChatMessage`. This object will hold the hunks, operations, and final status (`previewing`, `accepted`, `rejected`) for the suggestion in that message.

This makes `useChatManager` the source of truth for historical diffs, while `useDiffSessionStore` reverts to its original purpose: managing only the live, in-progress preview session.

## 3. Detailed File Changes

### 3.1. Update Core Types

First, we must update the message type definition to include the diff data.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/types/enhanced-chat.ts` (or wherever `EnhancedChatMessage` is defined)

**Action:** Add an optional `diff` property to the `EnhancedChatMessage` interface.

```typescript
import { DiffData } from '../store/useDiffSessionStore'; // We can reuse this type

// This is a hypothetical structure. Find the actual definition.
export interface EnhancedChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system' | 'tool_suggestion' | 'status';
  // ... other properties
  
  diff?: Omit<DiffData, 'messageId'>; // <-- ADD THIS PROPERTY
}
```

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`

**Action:** The `DiffData` status type should be updated to include `accepted`.

```typescript
// In useDiffSessionStore.ts
interface DiffData {
  status: 'previewing' | 'applying' | 'rejected' | 'accepted'; // <-- Ensure 'accepted' is here
  operations: AISuggestedOperation[];
  hunks: DiffHunk[];
  timestamp: number;
  messageId: string;
}
```

### 3.2. Refactor State Management

The roles of the two main stores will be clarified.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`

**Action:** Simplify the store to only manage the truly *live* preview. The `acceptActivePreview` and `rejectActivePreview` actions should be removed, as this logic will move to the `useDiffPreview` hook, which will then call `useChatManager` to persist the state. The store will only need `setActivePreview` and `clearPreview`.

```typescript
// In useDiffSessionStore.ts

interface DiffSessionState {
  activePreview: DiffData | null;
  originalSnapshot: WorkbookSnapshot | null;
  
  // ACTIONS
  setActivePreview: (messageId: string, operations: AISuggestedOperation[], hunks: DiffHunk[]) => void;
  clearPreview: () => void; // This will be called after accept/reject
}

// Implementation:
// ...
  setActivePreview: (messageId, operations, hunks) => {
    set({
      activePreview: {
        messageId,
        operations,
        hunks,
        status: 'previewing',
        timestamp: Date.now(),
      }
    });
  },
  clearPreview: () => {
    set({ activePreview: null, originalSnapshot: null });
  },
// ...
```

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useChatManager.ts`

**Action:** Add a new action to update the diff data for a specific message.

```typescript
// In useChatManager.ts, inside the hook's return value:

// ... existing actions like addMessage, updateMessage ...
updateMessageDiff: useCallback((messageId: string, diffData: Omit<DiffData, 'messageId'>) => {
  setMessages(prev => 
    prev.map(msg => 
      msg.id === messageId ? { ...msg, diff: diffData } : msg
    )
  );
}, []),
```

### 3.3. Update the Preview Orchestrator

The `useDiffPreview` hook will orchestrate the new flow.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Action:** Modify `acceptCurrentPreview` and `rejectCurrentPreview` to persist the final diff state to the message via `useChatManager` and then clear the live session store.

```typescript
// In useDiffPreview.ts
// The hook will need to accept `chatManager` as an argument or get it from a context.
// Assuming it has access to `chatManager.updateMessageDiff`

// --- In acceptCurrentPreview ---
const acceptCurrentPreview = useCallback(async () => {
  if (!store.activePreview) return;
  const { messageId, operations, hunks } = store.activePreview;

  // 1. Apply changes to Excel
  await excelService.executeToolRequest(...);

  // 2. Persist the final state to the message
  chatManager.updateMessageDiff(messageId, {
    operations,
    hunks,
    status: 'accepted',
    timestamp: Date.now(),
  });

  // 3. Clear the live preview session
  store.clearPreview();
  await GridVisualizer.clearHighlights(hunks);

}, [store, excelService, chatManager]);


// --- In rejectCurrentPreview ---
const rejectCurrentPreview = useCallback(async () => {
  if (!store.activePreview) return;
  const { messageId, operations, hunks } = store.activePreview;

  // 1. Persist the final state to the message
  chatManager.updateMessageDiff(messageId, {
    operations,
    hunks,
    status: 'rejected',
    timestamp: Date.now(),
  });

  // 2. Clear the live preview session
  store.clearPreview();
  await GridVisualizer.clearHighlights(hunks);

}, [store, chatManager]);
```

### 3.4. Update the UI Components

The UI will now read diff data from each message.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterface.tsx`

**Action:** Change the rendering logic to check for `message.diff` instead of `activePreview`.

```typescript
// In EnhancedChatInterface.tsx, inside the message map:

// --- BEFORE ---
{activePreview?.messageId === message.id && (
  <ChatMessageDiffPreview
    messageId={message.id}
    hunks={activePreview.hunks || []}
    status={activePreview.status}
    onAccept={onAcceptDiff}
    onReject={onRejectDiff}
  />
)}

// --- AFTER ---
{message.diff && (
  <ChatMessageDiffPreview
    messageId={message.id}
    hunks={message.diff.hunks || []}
    status={message.diff.status}
    // Only pass actions if the diff is in a previewing state
    onAccept={message.diff.status === 'previewing' ? onAcceptDiff : undefined}
    onReject={message.diff.status === 'previewing' ? onRejectDiff : undefined}
  />
)}
```

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/ChatMessageDiffPreview.tsx`

**Action:** Update the component's props to make `onAccept` and `onReject` optional, as they won't be available for historical previews.

```typescript
// In ChatMessageDiffPreview.tsx

interface ChatMessageDiffPreviewProps {
  messageId: string;
  hunks: DiffHunk[];
  status: 'previewing' | 'applying' | 'rejected' | 'accepted';
  onAccept?: () => void; // <-- Make optional
  onReject?: () => void; // <-- Make optional
}

// In the component's JSX, ensure the buttons are only rendered if the functions are provided:
{status === 'previewing' && onAccept && onReject && (
  <div className="flex items-center space-x-2">
    <button onClick={onAccept}>Accept</button>
    <button onClick={onReject}>Reject</button>
  </div>
)}
```

## 4. Implementation Sequence

1.  **Update Types:** Modify `EnhancedChatMessage` and `DiffData` types first.
2.  **Refactor Stores:** Update `useDiffSessionStore` to simplify it and add the `updateMessageDiff` action to `useChatManager`.
3.  **Update Hooks:** Refactor `useDiffPreview` to handle the new orchestration logic. This is the most critical step.
4.  **Update UI:** Modify `EnhancedChatInterface.tsx` and `ChatMessageDiffPreview.tsx` to render based on the new message-centric data model.
5.  **Testing:** Perform thorough end-to-end testing.

## 5. Verification Plan

-   **Accept Flow:**
    1.  AI suggests a change. Preview appears.
    2.  Click "Accept".
    3.  The preview card remains in the chat, now showing "Changes Applied" with a green check. The "Accept/Reject" buttons are gone.
    4.  The Excel sheet is updated correctly.
-   **Reject Flow:**
    1.  AI suggests a change. Preview appears.
    2.  Click "Reject".
    3.  The preview card remains, now showing "Changes Rejected" with a red 'X'. The buttons are gone.
    4.  The Excel sheet is not changed.
-   **History Test:**
    1.  Perform several accept/reject actions.
    2.  Scroll up through the chat history.
    3.  Verify that every preview card is still present with its correct final status.
-   **New Preview Test:**
    1.  Accept a change. The "Changes Applied" card is visible.
    2.  AI suggests a new change. A new preview card appears for the new message.
    3.  The old "Changes Applied" card for the previous message remains visible and unchanged.

This plan will create a much more robust and user-friendly system that preserves the full context of the AI's interactions.
