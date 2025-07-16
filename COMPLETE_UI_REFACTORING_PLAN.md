# Plan: Complete UI Refactoring and Migration

**Status:** ✅ COMPLETED
**Last Updated:** 2025-01-16
**Migration Completed:** 2025-01-16

## 1. Objective

The primary goal of this plan is to finalize the migration from the old, monolithic `EnhancedChatInterfaceWithSignalR.tsx` to the new, hook-based `RefactoredChatInterface.tsx`. This will complete the work started in the `LIVE_VISUAL_DIFF_IMPLEMENTATION_PLAN`, resulting in a more maintainable, stable, and debuggable chat component.

This migration will directly fix the critical bug where visual diff logs are not appearing in the UI, as the new component architecture is correctly wired to the central `useDiffSessionStore`.

## 2. Root Cause of Current Issues

The application is currently running legacy code. The `EnhancedChatInterfaceWithSignalR.tsx` component contains a mixture of old and new state management, does not correctly use the new refactored hooks, and is the source of the logging failures. The new `RefactoredChatInterface.tsx` was created as a target for migration but was never fully built out or integrated.

This plan will complete that migration.

## 3. Key Files Involved

*   **Old Component (DELETED):** ~~`/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`~~
*   **New Component (ACTIVE):** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`
*   **Parent Application Component:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/app.tsx` (This is the file where the old chat component is rendered and needs to be updated).
*   **Core Hooks (already implemented):**
    *   `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useSignalRManager.ts`
    *   `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useChatManager.ts`
    *   `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`
    *   `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`
*   **Central State Store:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`

## 4. Detailed Implementation Plan

### Step 1: Flesh out `RefactoredChatInterface.tsx`

This is the main step. I will copy the necessary logic and JSX from the old component into the new one, adapting it to the hook-based architecture.

*   **Action:** Modify `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`.
*   **Details:**
    1.  **State Management:** Re-implement state for `autonomyMode`, `isDebugOpen`, `activeContext`, etc., using standard `useState` hooks.
    2.  **UI Structure:** Replace the placeholder JSX with the `EnhancedChatInterface` component and its props, as used in the old file. This includes passing down the `autonomySelector`.
    3.  **Feature Logic:**
        *   **Mention/Context System:** Port the `updateAvailableMentions`, `handleMentionSelect`, and `handleContextRemove` functions.
        *   **Debug Panel:** Move the entire `<details>` section for the debug panel into the new component. Ensure the "Copy" button logic is updated to pull logs from the correct sources (`useDiffSessionStore` for visual diff logs and a new local state for component-level debug logs).
        *   **Keyboard Shortcuts:** Port the `useEffect` hook that handles keyboard shortcuts for switching autonomy modes.
    4.  **Prop Wiring:** Connect the state and actions from the hooks (`useChatManager`, `useDiffPreview`) to the props of the `EnhancedChatInterface` component.

### Step 2: Clean up Hook Initialization

The current `RefactoredChatInterface.tsx` has a "hacky" `useEffect` to inject the `signalRClient`. This will be fixed.

*   **Action:** Modify `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`.
*   **Details:**
    *   The `useMessageHandlers` hook will be initialized once. The `handleSignalRMessage` function it returns will be passed to `useSignalRManager`. The `signalRClient` instance will be passed to `useMessageHandlers` via a ref or a state update to avoid re-creating handlers on every render.

### Step 3: Update the Main Application (`app.tsx`)

Once the new component is ready, we need to make the application use it.

*   **Action:** Modify `/Users/brendantoole/projects2/gridmate/excel-addin/src/app.tsx`.
*   **Details:**
    1.  Change the import from `EnhancedChatInterfaceWithSignalR` to `RefactoredChatInterface`.
    2.  Replace the component in the JSX:
        ```diff
        - import { EnhancedChatInterfaceWithSignalR } from './components/chat/EnhancedChatInterfaceWithSignalR';
        + import { RefactoredChatInterface } from './components/chat/RefactoredChatInterface';

        // ... inside the component's render method
        - <EnhancedChatInterfaceWithSignalR />
        + <RefactoredChatInterface />
        ```

### Step 4: Cleanup and Deletion

After verifying the new component works correctly, the final step is to remove the old code.

*   **Action:** Delete the old chat component file.
*   **File to Delete:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

## 5. Verification Plan

1.  **Run the application** and open the chat interface.
2.  **Send a message** that triggers write operations (e.g., "write 'hello' in A1 and 'world' in B1").
3.  **Verify Visual Diff:**
    *   The diff preview bar should appear.
    *   The grid should show visual highlights for the pending changes.
    *   **Crucially, the "Visual Diff Logs" in the debug panel must populate with detailed logs** about the session start, snapshot, simulation, and highlighting.
4.  **Test Core Functions:**
    *   Apply and cancel the diff preview.
    *   Switch autonomy modes and verify the behavior changes.
    *   Use the `@` mention system to reference a sheet or range.
    *   Use the "Copy All Debug Info" button and paste the content to ensure all log sections are present and correct.
5.  **Confirm Code Health:** After the changes, confirm that the application builds and runs without errors and that the old file has been deleted.

## 6. Implementation Summary (2025-01-16)

The following actions were completed to execute this plan:

1.  **Fleshed out `RefactoredChatInterface.tsx`:**
    *   The file `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx` was completely rewritten.
    *   It now incorporates the full UI and feature set from the legacy component, including the debug panel, autonomy selector, and mention system.
    *   All logic is now correctly wired to the new hook-based architecture (`useSignalRManager`, `useChatManager`, `useMessageHandlers`, `useDiffPreview`).
    *   Logging is now correctly handled by the new hooks and the central `useDiffSessionStore`.

2.  **Updated the Main Application Wrapper:**
    *   The file `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWrapper.tsx` was modified.
    *   It now imports and renders `<RefactoredChatInterface />` instead of the old `<EnhancedChatInterfaceWithSignalR />`, effectively switching the entire application to the new component.

3.  **Added Missing Features (2025-01-16):**
    *   Keyboard shortcuts (Cmd+. for mode switching, Cmd+/ for help)
    *   Comprehensive logging for all user actions
    *   AuditLogger integration in message handlers
    *   SignalR connection status logging

4.  **Deleted Old Component (2025-01-16):**
    *   The old `EnhancedChatInterfaceWithSignalR.tsx` file has been permanently deleted
    *   No references to the old component remain in the codebase

## 7. Migration Complete ✅

The migration is now 100% complete. The application is running on the new, refactored component architecture with all features preserved and enhanced logging capabilities.