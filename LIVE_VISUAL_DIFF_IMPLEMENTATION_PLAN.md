# Plan: Live Visual Diff Implementation (Detailed)

**Status:** In Progress
**Last Updated:** 2025-01-16
**Implementation Started:** 2025-01-16

## 1. Objective

This document provides a detailed, actionable plan to refactor the Gridmate frontend and upgrade the existing batch-based visual diff into a real-time, "Cursor-like" live preview. This plan incorporates all prior fixes and provides code skeletons and specific implementation guidance.

## 2. Implementation Progress

### Completed Phases ✅

- **Phase 0: Type Definitions** - Created SignalR type definitions
- **Phase 1: Foundational UI Refactoring** - Created core hooks (useSignalRManager, useChatManager)
- **Phase 2: State Management Enhancement** - Enhanced Zustand store with session management
- **Phase 3: Live Preview Engine** - Built diff preview hook with simulation capabilities
- **Phase 4: Final Orchestration** - Created message handlers and example integration

### Files Created/Modified

1. **New Files Created:**
   - `/excel-addin/src/types/signalr.ts` - SignalR type definitions
   - `/excel-addin/src/hooks/useSignalRManager.ts` - SignalR connection management
   - `/excel-addin/src/hooks/useChatManager.ts` - Chat state management
   - `/excel-addin/src/hooks/useMessageHandlers.ts` - Message handling orchestration
   - `/excel-addin/src/utils/debouncedValidation.ts` - Debounced validation utility
   - `/excel-addin/src/utils/diffSimulator.ts` - Operation simulation for preview
   - `/excel-addin/src/components/chat/RefactoredChatInterface.tsx` - Example integration

2. **Files Modified:**
   - `/excel-addin/src/store/useDiffOrchestrationStore.ts` → renamed to `useDiffSessionStore.ts` with enhanced functionality
   - `/excel-addin/src/services/diff/GridVisualizer.ts` - Added batched highlighting
   - `/excel-addin/src/hooks/useDiffPreview.ts` - Complete rewrite for live preview
   - `/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx` - Updated imports with compatibility wrapper

## 3. What Still Needs to Be Done

### 3.1 Integration Work

1. **Update EnhancedChatInterfaceWithSignalR.tsx**
   - Remove the temporary compatibility wrapper for `addOperation`
   - Integrate the new hooks properly with feature flag
   - Wire up the message handlers to actual SignalR messages
   - Remove old state management code

2. **SignalR Message Type Updates**
   - Update SignalR client to emit proper message types (`tool_request`, `ai_response`, etc.)
   - Ensure backend sends messages in the expected format
   - Add proper TypeScript types for all message payloads

3. **Excel Context Integration**
   - Wire up Excel context to be sent with user messages
   - Ensure operation ranges include proper sheet names
   - Handle multi-sheet operations correctly

### 3.2 UI Components

1. **Create/Update UI Components**
   - `DiffPreviewBar` component that shows pending operations count
   - Enhanced `MessageList` that properly renders different message types
   - `StatusIndicator` for connection and preview status
   - Progress indicator for multi-operation previews

2. **Visual Feedback**
   - Add animations for diff highlights appearing/disappearing
   - Show operation progress for batch operations
   - Add tooltips explaining what each highlight color means

### 3.3 Performance Optimizations

1. **Snapshot Optimization**
   - Implement incremental snapshots for better performance
   - Add caching for unchanged regions
   - Optimize range detection for large operations

2. **Diff Calculation**
   - Move heavy diff calculations to Web Workers
   - Implement progressive diff rendering for large changes
   - Add operation coalescing for rapid changes

### 3.4 Error Handling Enhancements

1. **Recovery Mechanisms**
   - Implement automatic reconnection with state recovery
   - Add operation rollback on failure
   - Persist preview state to handle page refreshes

2. **User Feedback**
   - Better error messages for common failures
   - Add suggestions for fixing errors
   - Implement error reporting to backend

### 3.5 Backend Integration

1. **SignalR Hub Updates**
   - Implement proper message routing for tool requests
   - Add session management on the backend
   - Implement operation validation endpoints

2. **API Endpoints**
   - Create endpoint for validating operation batches
   - Add endpoint for retrieving operation history
   - Implement conflict resolution for concurrent edits

### 3.6 Feature Enhancements

1. **Advanced Preview Features**
   - Add "step through" mode for reviewing changes one by one
   - Implement partial application of changes
   - Add change grouping/ungrouping

2. **Collaboration Features**
   - Show other users' pending changes
   - Implement conflict detection for shared workbooks
   - Add change attribution in multi-user scenarios

## 4. Migration Strategy

Since the component is currently in use, we'll use a feature flag approach to ensure safe migration:

```typescript
// In EnhancedChatInterfaceWithSignalR
const USE_REFACTORED_HOOKS = process.env.REACT_APP_USE_REFACTORED_HOOKS === 'true';
```

### Migration Steps:

1. **Phase 1**: Deploy with feature flag OFF
   - All new code is deployed but inactive
   - Existing functionality continues to work

2. **Phase 2**: Enable for internal testing
   - Set flag to true for development/staging
   - Run comprehensive tests
   - Fix any integration issues

3. **Phase 3**: Gradual rollout
   - Enable for select beta users
   - Monitor performance and errors
   - Gather user feedback

4. **Phase 4**: Full rollout
   - Enable for all users
   - Remove old code after stability period

## 5. Testing Requirements

### Unit Tests Needed:
- `useDiffSessionStore` - State transitions and error handling
- `diffSimulator` - Operation simulation accuracy
- `useMessageHandlers` - Message routing logic
- Range parsing utilities

### Integration Tests Needed:
- Full flow from tool request to preview
- Multi-operation batching
- Error recovery scenarios
- Connection loss handling

### E2E Tests Needed:
- Complete user workflow with live preview
- Performance with large datasets
- Multi-user scenarios
- Browser compatibility

## 6. Documentation Needs

1. **Developer Documentation**
   - Architecture overview with diagrams
   - Hook API documentation
   - Migration guide for plugins

2. **User Documentation**
   - How to use live preview
   - Understanding diff colors
   - Troubleshooting guide

---

## Original Implementation Plan Sections

### Type Definitions

First, create proper type definitions to ensure type safety throughout the implementation:

### **Step 0: Create Type Definitions** ✅
*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/types/signalr.ts` (New)
*   **Code:**
    ```typescript
    import { SignalRMessage } from '../services/signalr/SignalRClient';
    
    export interface SignalRMessageHandler {
      (message: SignalRMessage): void
    }
    
    export interface SignalRToolRequest {
      request_id: string
      tool: string
      parameters: Record<string, any>
      sheet?: string
      range?: string
    }
    
    export interface SignalRAIResponse {
      content: string
      messageId: string
      isComplete: boolean
    }
    ```

---

## 4. Detailed Implementation Plan

### **Phase 1: Foundational UI Refactoring (High Priority)** ✅

**Goal:** Deconstruct the monolithic `EnhancedChatInterfaceWithSignalR.tsx` into a set of smaller, focused, and maintainable hooks.

*   **Step 1.1: Create `useSignalRManager.ts`** ✅
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useSignalRManager.ts` (New)
    *   **Action:** This hook will own the `SignalRClient` instance and its connection state with proper memory management.
    *   **Code Skeleton:**
        ```typescript
        import { useState, useEffect, useRef, useCallback } from 'react';
        import { SignalRClient } from '../services/signalr/SignalRClient';
        import { SignalRMessageHandler } from '../types/signalr';

        // Use a global instance to prevent re-connections on hot-reloads
        let globalSignalRClient: SignalRClient | null = null;

        export const useSignalRManager = (onMessage: SignalRMessageHandler) => {
          const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
          const clientRef = useRef<SignalRClient | null>(null);
          const messageHandlerRef = useRef<SignalRMessageHandler>(onMessage);

          // Update ref when handler changes
          useEffect(() => {
            messageHandlerRef.current = onMessage;
          }, [onMessage]);

          useEffect(() => {
            if (globalSignalRClient && globalSignalRClient.isConnected()) {
              clientRef.current = globalSignalRClient;
              setConnectionStatus('connected');
            } else {
              const newClient = new SignalRClient(process.env.REACT_APP_SIGNALR_URL || 'http://localhost:5000/hub');
              globalSignalRClient = newClient;
              clientRef.current = newClient;

              newClient.on('connected', () => setConnectionStatus('connected'));
              newClient.on('disconnected', () => setConnectionStatus('disconnected'));
              newClient.on('error', (error) => {
                console.error('SignalR error:', error);
                setConnectionStatus('disconnected');
              });
              
              newClient.connect('dev-token-123').catch(err => {
                console.error("SignalR connection failed", err);
                setConnectionStatus('disconnected');
              });
            }
            
            // Create a stable handler that uses the ref
            const stableHandler = (message: any) => {
              messageHandlerRef.current(message);
            };
            
            // Register the message handler
            clientRef.current?.on('message', stableHandler);

            return () => {
              // Important: Only remove this specific handler, not disconnect
              clientRef.current?.off('message', stableHandler);
            };
          }, []); // Empty deps - only run once

          return { 
            signalRClient: clientRef.current, 
            connectionStatus 
          };
        };
        ```

*   **Step 1.2: Create `useChatManager.ts`** ✅
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useChatManager.ts` (New)
    *   **Action:** Manages the array of chat messages and related UI state.
    *   **Code Skeleton:**
        ```typescript
        import { useState, useCallback } from 'react';
        import { EnhancedChatMessage } from '../types/enhanced-chat';
        import { v4 as uuidv4 } from 'uuid';

        export const useChatManager = (initialMessages: EnhancedChatMessage[] = []) => {
          const [messages, setMessages] = useState<EnhancedChatMessage[]>(initialMessages);
          const [isLoading, setIsLoading] = useState(false);
          const [aiIsGenerating, setAiIsGenerating] = useState(false);

          const addMessage = useCallback((message: Omit<EnhancedChatMessage, 'id'>) => {
            const newMessage = { ...message, id: uuidv4() } as EnhancedChatMessage;
            setMessages(prev => [...prev, newMessage]);
            return newMessage;
          }, []);

          const updateMessage = useCallback((messageId: string, updates: Partial<EnhancedChatMessage>) => {
            setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg));
          }, []);
          
          const removeMessage = useCallback((messageId: string) => {
            setMessages(prev => prev.filter(msg => msg.id !== messageId));
          }, []);

          const clearThinkingMessages = useCallback(() => {
            setMessages(prev => prev.filter(msg => 
              !(msg.type === 'assistant' && (msg.content.includes('thinking') || msg.content.includes('...')))
            ));
          }, []);

          return {
            messages,
            setMessages,
            addMessage,
            updateMessage,
            removeMessage,
            clearThinkingMessages,
            isLoading,
            setIsLoading,
            aiIsGenerating,
            setAiIsGenerating,
          };
        };
        ```

*   **Step 1.3: Clean up existing state** ✅
    *   **Action:** During refactoring, properly clean up these existing refs and state:
        - `toolRequestQueue` - Migrate to the new message handlers
        - `pendingResponseTools` - No longer needed with new architecture
        - Debug logging state - Keep but isolate in a separate hook if needed

*   **Step 1.4: Refactor `EnhancedChatInterfaceWithSignalR.tsx`** 🚧
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx` (Modify)
    *   **Action:** Strip out all logic into the new hooks, leaving a clean orchestrator component.
    *   **Status:** Partially complete - imports updated but full refactoring pending

### **Phase 2: State Management Enhancement** ✅

**Goal:** Upgrade `useDiffOrchestrationStore` to handle the full state of a live preview session with enhanced error handling.

*   **File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffOrchestrationStore.ts`
*   **Action:** Rename the file to `useDiffSessionStore.ts` and expand its state and actions.
*   **Status:** Complete - File renamed and enhanced with session management, error handling, and retry logic

### **Phase 3: Building the Live Preview Engine** ✅

**Goal:** Rewrite `useDiffPreview` to be a stateful session manager that provides a real-time experience with performance optimizations.

*   **Step 3.1: Create Performance Utilities** ✅
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/debouncedValidation.ts` (New)
    *   **Action:** Create enhanced debouncing for backend validation
    *   **Status:** Complete

*   **Step 3.2: Update GridVisualizer for Performance** ✅
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts` (Modify)
    *   **Action:** Add batched highlighting method
    *   **Status:** Complete - Added `applyHighlightsBatched` method

*   **Step 3.3: Create Diff Simulator** ✅
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/diffSimulator.ts` (New)
    *   **Action:** Create utility to simulate operations on workbook snapshots
    *   **Status:** Complete

*   **Step 3.4: Rewrite `useDiffPreview.ts`** ✅
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts` (Modify)
    *   **Action:** Refactor the hook to manage a "preview session" using the enhanced Zustand store.
    *   **Status:** Complete

### **Phase 4: Final Orchestration & Error Handling** ✅

**Goal:** Wire everything together in the clean orchestrator component and add robust error handling.

*   **File to Create:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts` (New) ✅
*   **Action:** Create the message handlers hook with proper session management
*   **Status:** Complete

*   **Example Integration:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx` (New) ✅
*   **Action:** Create example showing how all hooks work together
*   **Status:** Complete

## 5. Error Handling & Edge Cases

-   **Connection Loss:** The `useMessageHandlers` hook now listens for disconnection events and updates the diff session store accordingly.
-   **Simulation Failure:** The `simulateOperation` utility must have robust `try...catch` blocks. Errors are handled through the centralized error handling in `useDiffSessionStore`.
-   **State Cleanup:** The hooks properly clean up their state and event listeners in their cleanup functions.
-   **Retry Logic:** The store includes retry functionality with a maximum of 3 attempts.
-   **Performance Monitoring:** Large operations (>100 hunks) automatically use batched highlighting.

## 6. Implementation Order

1. **Start with Phase 2** (State Management) - This is lowest risk and can be tested independently ✅
2. **Implement Type Definitions** - Ensure type safety from the start ✅
3. **Phase 1 with Feature Flags** - Use feature flags to gradually migrate components ✅
4. **Phase 3** (Live Preview Engine) - Build on the solid foundation ✅
5. **Phase 4** (Final Orchestration) - Wire everything together ✅

## 7. Verification Plan

1.  **Phase 1 (Refactoring):** After refactoring, run the app with `REACT_APP_USE_REFACTORED_HOOKS=false`. The existing batch diff functionality should work exactly as before.
2.  **Phase 2 (State Management):** Test the new store in isolation with unit tests before integration.
3.  **Phase 3 (Live Preview Engine):**
    -   **Streaming Test:** Ask: "In A1 write 'X', then in B2 write 'Y', then in C3 write 'Z'". Verify: Highlights appear sequentially as each `tool_request` message arrives.
    -   **Performance Test:** Give a command that generates 50+ operations. The UI must remain responsive. Check that batched highlighting is used.
    -   **Error Recovery Test:** Disconnect network during preview. Verify error message appears and retry functionality works.
    -   **Interruption Test:** Start a multi-step operation. Before it finishes, send a new message. Verify: The old preview is cleanly cancelled, and a new one starts correctly for the new message.
    -   **Accuracy Test:** The final state after clicking "Apply" must exactly match the state of the last preview.
    -   **Cancellation Test:** Click "Cancel". The sheet must be restored to its exact original state with no leftover formatting.
4.  **Migration Verification:** Toggle `REACT_APP_USE_REFACTORED_HOOKS` between true/false to ensure both implementations work correctly.