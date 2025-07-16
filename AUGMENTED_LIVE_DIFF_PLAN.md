# Plan: Live Visual Diff Implementation and UI Refactoring (Augmented)

**Status:** Not Started
**Last Updated:** 2025-07-15

## 1. Objective

This document outlines a comprehensive plan to significantly improve the Gridmate frontend through a phased approach:
1.  **Fix the Current Visual Diff:** First implement the `VISUAL_DIFF_ORCHESTRATION_FIX_PLAN.md` to establish a working baseline
2.  **Modularize the Chat UI:** Refactor the monolithic 1771-line `EnhancedChatInterfaceWithSignalR.tsx` component into smaller, focused hooks
3.  **Implement Live Visual Diff:** Upgrade to a real-time, "Cursor-like" preview that updates as operations are generated

## 2. Prerequisites

Before starting this plan:
- Complete implementation of `VISUAL_DIFF_ORCHESTRATION_FIX_PLAN.md`
- Ensure basic visual diff is working correctly
- Establish comprehensive logging for debugging

---

## 3. Migration Strategy

To minimize risk and ensure continuous functionality, we'll follow a phased approach:

### **Phase 1: Prerequisite - Fix Current Visual Diff (1-2 days)**
- Implement `VISUAL_DIFF_ORCHESTRATION_FIX_PLAN.md`
- Validate visual diff works for basic write operations
- Ensure logging infrastructure is operational

### **Phase 2: Extract Simple Hooks (2-3 days)**
- Extract non-dependent utility hooks first
- Maintain backward compatibility
- Test each extraction independently

### **Phase 3: Extract Core Hooks (3-4 days)**
- Extract SignalR and chat management
- Use event emitter pattern to avoid circular dependencies
- Gradual migration of functionality

### **Phase 4: Refactor Main Component (2-3 days)**
- Integrate all hooks into cleaned component
- Remove duplicated logic
- Comprehensive testing

### **Phase 5: Implement Live Visual Diff (3-4 days)**
- Build on clean architecture
- Add real-time preview capabilities
- Performance optimization

---

## 4. Part 1: Refactoring `EnhancedChatInterfaceWithSignalR.tsx`

The current component handles too many responsibilities. We'll extract focused hooks with clear interfaces.

### **Step 4.1: Extract Logic into Custom Hooks**

Create the following hooks in `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/`:

#### **`useSignalRManager.ts` (Example)**
This hook will solely manage the SignalR connection and message dispatching.

```typescript
// excel-addin/src/hooks/useSignalRManager.ts
import { useState, useEffect, useRef } from 'react';
import { SignalRClient } from '../services/signalr/SignalRClient';

// Keep a global instance to survive hot-reloads and prevent multiple connections.
let globalSignalRClient: SignalRClient | null = null;

export const useSignalRManager = (onMessage: (data: any) => void) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const client = useRef<SignalRClient | null>(globalSignalRClient);

  useEffect(() => {
    if (client.current) {
      // If a client already exists, just update status
      if (client.current.isConnected()) setConnectionStatus('connected');
      return;
    }

    const signalRUrl = 'http://localhost:5000/hub'; // Or from config
    const newClient = new SignalRClient(signalRUrl);
    client.current = newClient;
    globalSignalRClient = newClient;

    newClient.on('connected', () => setConnectionStatus('connected'));
    newClient.on('disconnected', () => setConnectionStatus('disconnected'));
    newClient.on('message', (data) => {
      if (data.type === 'auth_success') {
        setIsAuthenticated(true);
      }
      onMessage(data); // Pass all messages to the parent handler
    });

    newClient.connect('dev-token-123').catch(err => console.error("SignalR connection failed", err));

  }, [onMessage]);

  return { connectionStatus, isAuthenticated, signalRClient: client.current };
};
```

#### **`useChatManager.ts` (Example)**
This hook will manage the state of the chat messages and user input.

```typescript
// excel-addin/src/hooks/useChatManager.ts
import { useState, useCallback } from 'react';
import { EnhancedChatMessage, ToolSuggestionMessage, StatusMessage } from '../types/enhanced-chat';

export const useChatManager = () => {
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((message: EnhancedChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateMessage = useCallback((messageId: string, updates: Partial<EnhancedChatMessage>) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, ...updates } : msg));
  }, []);
  
  // ... other message helpers like createToolSuggestionMessage, addStatusMessage etc.

  return {
    messages,
    input,
    setInput,
    isLoading,
    setIsLoading,
    addMessage,
    updateMessage,
  };
};
```

#### **Additional Hooks to Extract**

1. **`useDebugInfo.ts`**: Consolidate all debug/logging functionality
2. **`useAutonomyMode.ts`**: Handle autonomy mode state and business logic
3. **`useToolRequestQueue.ts`**: Manage tool request queue and execution
4. **`useBulkActions.ts`**: Extract bulk approve/reject logic
5. **`useExcelContext.ts`**: Manage Excel context and mentions
6. **`useMessageHandlers.ts`**: Centralize all message handling logic

### **Step 4.2: Addressing Circular Dependencies**

To prevent circular dependencies between hooks, we'll use an event emitter pattern:

```typescript
// excel-addin/src/hooks/useMessageBus.ts
import { EventEmitter } from 'events';

const messageBus = new EventEmitter();

export const useMessageBus = () => {
  const emit = useCallback((event: string, data: any) => {
    messageBus.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    messageBus.on(event, handler);
    return () => messageBus.off(event, handler);
  }, []);

  return { emit, on };
};
```

### **Step 4.3: The New Orchestrator Component**

After refactoring, `EnhancedChatInterfaceWithSignalR.tsx` becomes a clean orchestrator:

```typescript
// excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx (Refactored)

// Import the new hooks
import { useSignalRManager } from '../../hooks/useSignalRManager';
import { useChatManager } from '../../hooks/useChatManager';
import { useDiffPreview } from '../../hooks/useDiffPreview';
// ... other imports

const WRITE_TOOLS = new Set(['write_range', 'apply_formula', 'clear_range', 'smart_format_cells']);

export const EnhancedChatInterfaceWithSignalR: React.FC = () => {
  const { messages, input, setInput, isLoading, setIsLoading, addMessage } = useChatManager();
  const [isLivePreviewActive, setIsLivePreviewActive] = useState(false);
  
  // The message handler passed to the SignalR hook
  const handleSignalRMessage = useCallback((data: any) => {
    if (data.type === 'tool_request') {
      handleToolRequest(data.data);
    }
    if (data.type === 'ai_response') {
      handleAIResponse(data.data);
    }
  }, [/* dependencies */]);

  const { connectionStatus, isAuthenticated, signalRClient } = useSignalRManager(handleSignalRMessage);
  const { status: diffStatus, startPreviewSession, updatePreview, applyChanges, cancelPreview } = useDiffPreview(signalRClient, 'some-workbook-id');

  const handleSendMessage = async (content: string) => {
    if (diffStatus === 'previewing') {
      await cancelPreview();
    }
    // ... logic to send message via signalRClient
  };

  const handleToolRequest = useCallback(async (toolRequest: any) => {
    // This is the core orchestration logic
    if (WRITE_TOOLS.has(toolRequest.tool)) {
      const operation = { tool: toolRequest.tool, input: { ...toolRequest } };
      if (!isLivePreviewActive) {
        setIsLivePreviewActive(true);
        await startPreviewSession(operation);
      } else {
        await updatePreview(operation);
      }
      // ... inform backend tool is queued for preview
    } else {
      // ... handle read-only tools
    }
  }, [isLivePreviewActive, startPreviewSession, updatePreview]);

  const handleAIResponse = (response: any) => {
    addMessage({ role: 'assistant', content: response.content, /*...*/ });
    if (isLivePreviewActive) {
      setIsLivePreviewActive(false); // Finalize the preview session
    }
  };

  return (
    <div /* main layout */>
      <EnhancedChatInterface messages={messages} /* ... */ />
      <DiffPreviewBar onApply={applyChanges} onCancel={cancelPreview} isLoading={diffStatus !== 'idle'} />
      {/* ... other UI components like DebugContainer ... */}
    </div>
  );
};
```

---

## 5. State Management Improvements

### **Consolidated Diff State**

To avoid state synchronization issues, consolidate all diff-related state in the diffStore:

```typescript
// excel-addin/src/store/diffStore.ts (Enhanced)
interface DiffState {
  // Session management
  sessionId: string | null
  originalSnapshot: WorkbookSnapshot | null
  liveSnapshot: WorkbookSnapshot | null
  
  // Current diff data
  hunks: DiffHunk[] | null
  status: DiffStatus
  
  // Operations tracking
  pendingOperations: AISuggestedOperation[]
  appliedOperations: AISuggestedOperation[]
  
  // Performance optimization
  lastUpdateTime: number
  updateDebounceTimer: NodeJS.Timeout | null
  
  // Actions
  startSession: (workbookId: string) => void
  updateLiveSnapshot: (operation: AISuggestedOperation) => void
  commitSession: () => void
  cancelSession: () => void
}
```

### **GridVisualizer Memory Management**

Enhance GridVisualizer to prevent memory leaks:

```typescript
// excel-addin/src/services/diff/GridVisualizer.ts (Enhanced)
export class GridVisualizer {
  // Use WeakMap for automatic garbage collection
  private static sessionFormats = new WeakMap<object, Map<string, any>>()
  private static currentSession: object | null = null
  
  static startSession(): void {
    this.currentSession = {}
    this.sessionFormats.set(this.currentSession, new Map())
  }
  
  static endSession(): void {
    if (this.currentSession) {
      this.sessionFormats.delete(this.currentSession)
      this.currentSession = null
    }
  }
  
  static async clearAllHighlights(): Promise<void> {
    // Implementation to clear all highlights without needing hunks
    return Excel.run(async (context) => {
      // Clear all highlighted cells in the workbook
      // This requires tracking highlighted ranges
    })
  }
}
```

---

## 6. Part 2: Implementing the Live Visual Diff

This requires redesigning the diffing process from a "batch" model to a "streaming" model with performance optimizations.

### **Phase 6.1: Performance Optimizations**

Before implementing the live diff, add performance considerations:

#### **Debounced Backend Calls**
```typescript
// excel-addin/src/utils/debouncedDiff.ts
export class DebouncedDiffCalculator {
  private pendingOperations: AISuggestedOperation[] = []
  private timer: NodeJS.Timeout | null = null
  private readonly delay = 150 // ms
  
  constructor(
    private onCalculate: (ops: AISuggestedOperation[]) => void
  ) {}
  
  addOperation(op: AISuggestedOperation): void {
    this.pendingOperations.push(op)
    
    if (this.timer) clearTimeout(this.timer)
    
    this.timer = setTimeout(() => {
      this.onCalculate([...this.pendingOperations])
      this.pendingOperations = []
      this.timer = null
    }, this.delay)
  }
  
  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.onCalculate([...this.pendingOperations])
      this.pendingOperations = []
      this.timer = null
    }
  }
}
```

#### **Client-Side Diff Preview**
For immediate visual feedback, calculate a preliminary diff client-side:

```typescript
// excel-addin/src/utils/clientDiff.ts
export function calculateQuickDiff(
  before: WorkbookSnapshot,
  after: WorkbookSnapshot
): DiffHunk[] {
  // Simplified diff calculation for immediate feedback
  // This provides instant highlights while waiting for backend validation
  const hunks: DiffHunk[] = []
  
  // Check for additions and modifications
  for (const [key, afterCell] of Object.entries(after)) {
    const beforeCell = before[key]
    if (!beforeCell) {
      // Added
      hunks.push({ 
        key: parseKey(key), 
        kind: DiffKind.Added,
        after: afterCell 
      })
    } else if (JSON.stringify(beforeCell) !== JSON.stringify(afterCell)) {
      // Modified
      const kind = beforeCell.f !== afterCell.f ? DiffKind.FormulaChanged : DiffKind.ValueChanged
      hunks.push({ 
        key: parseKey(key), 
        kind,
        before: beforeCell,
        after: afterCell 
      })
    }
  }
  
  // Check for deletions
  for (const key of Object.keys(before)) {
    if (!after[key]) {
      hunks.push({ 
        key: parseKey(key), 
        kind: DiffKind.Deleted,
        before: before[key] 
      })
    }
  }
  
  return hunks
}
```

### **Phase 6.2: Rewrite `useDiffPreview` as a Stateful Session Manager**

The hook will be refactored to manage a "preview session" with performance optimizations.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Enhanced Implementation with Performance:**

```typescript
// excel-addin/src/hooks/useDiffPreview.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { WorkbookSnapshot, AISuggestedOperation, DiffHunk } from '../types';
import { ExcelService } from '../services/excel/ExcelService';
import { GridVisualizer } from '../services/diff/GridVisualizer';
import { useDiffStore } from '../store/useDiffStore';
import { simulateOperations } from '../utils/diffSimulator';
import { calculateQuickDiff } from '../utils/clientDiff';
import { DebouncedDiffCalculator } from '../utils/debouncedDiff';
import { log } from '../store/logStore';

export const useDiffPreview = (signalRClient: any, workbookId: string) => {
  const [status, setStatus] = useState<'idle' | 'previewing' | 'applying'>('idle');
  const sessionRef = useRef<string | null>(null);
  const debouncedDiff = useRef<DebouncedDiffCalculator | null>(null);
  
  const excelService = ExcelService.getInstance();
  const store = useDiffStore();

  // Initialize debounced diff calculator
  useEffect(() => {
    debouncedDiff.current = new DebouncedDiffCalculator(async (operations) => {
      if (!store.originalSnapshot || !signalRClient) return;
      
      try {
        // Calculate backend diff for the accumulated operations
        const after = await simulateOperations(
          store.originalSnapshot, 
          operations,
          store.activeSheetName || 'Sheet1'
        );
        
        const diffResult = await signalRClient.invoke('GetVisualDiff', { 
          workbookId, 
          before: store.originalSnapshot, 
          after 
        });
        
        // Update store with validated diff
        store.setValidatedDiff(diffResult);
        
      } catch (error) {
        log('visual-diff', '[❌ Error] Backend diff calculation failed', { error });
      }
    });
    
    return () => {
      debouncedDiff.current = null;
    };
  }, [signalRClient, workbookId, store]);

  const startPreviewSession = useCallback(async (initialOperation: AISuggestedOperation) => {
    log('visual-diff', '[🚀 Preview Session Started]', { operation: initialOperation });
    
    // Start GridVisualizer session for memory management
    GridVisualizer.startSession();
    
    // Create new session ID
    const newSessionId = `session_${Date.now()}`;
    sessionRef.current = newSessionId;
    
    // Get initial snapshot
    const before = await excelService.createWorkbookSnapshot({ 
      rangeAddress: 'UsedRange', 
      includeFormulas: true 
    });
    
    // Initialize store state
    store.startSession(newSessionId, before);
    setStatus('previewing');
    
    // Process first operation
    await updatePreview(initialOperation);
    
  }, [excelService, store]);

  const updatePreview = useCallback(async (newOperation: AISuggestedOperation) => {
    if (!sessionRef.current || status !== 'previewing') {
      log('visual-diff', '[⚠️ Warning] updatePreview called outside active session');
      return startPreviewSession(newOperation);
    }
    
    log('visual-diff', '[🔄 Preview Updated]', { newOperation });
    
    // Add operation to store
    store.addPendingOperation(newOperation);
    
    // Calculate immediate client-side diff for instant feedback
    const currentSnapshot = store.liveSnapshot || store.originalSnapshot;
    if (currentSnapshot) {
      const quickAfter = await simulateOperations(
        currentSnapshot,
        [newOperation],
        store.activeSheetName || 'Sheet1'
      );
      
      const quickDiff = calculateQuickDiff(store.originalSnapshot!, quickAfter);
      
      // Apply highlights immediately
      await GridVisualizer.applyHighlights(quickDiff);
      store.setPreviewDiff(quickDiff);
      
      // Update live snapshot
      store.updateLiveSnapshot(quickAfter);
    }
    
    // Queue backend validation (debounced)
    debouncedDiff.current?.addOperation(newOperation);
    
  }, [status, store, startPreviewSession]);

  const applyChanges = useCallback(async () => {
    if (status !== 'previewing' || !sessionRef.current) return;
    
    log('visual-diff', '[✅ Applying Changes]');
    setStatus('applying');
    
    // Flush any pending backend calculations
    debouncedDiff.current?.flush();
    
    try {
      // Clear all highlights
      await GridVisualizer.clearAllHighlights();
      
      // Execute all pending operations
      for (const op of store.pendingOperations) {
        await excelService.executeToolRequest(op.tool, op.input);
      }
      
      log('visual-diff', '[✅ Apply Complete]');
      
    } catch (error) {
      log('visual-diff', '[❌ Error] Failed to apply changes', { error });
      store.setError('Failed to apply changes: ' + error);
    } finally {
      // Clean up session
      GridVisualizer.endSession();
      store.endSession();
      sessionRef.current = null;
      setStatus('idle');
    }
  }, [status, store, excelService]);

  const cancelPreview = useCallback(async () => {
    if (status !== 'previewing') return;
    
    log('visual-diff', '[❌ Preview Cancelled]');
    
    // Cancel pending backend calculations
    debouncedDiff.current?.flush();
    
    // Clear highlights
    await GridVisualizer.clearAllHighlights();
    
    // Clean up session
    GridVisualizer.endSession();
    store.endSession();
    sessionRef.current = null;
    setStatus('idle');
  }, [status, store]);

  return { status, startPreviewSession, updatePreview, applyChanges, cancelPreview };
};
```

---

## 7. Error Recovery and Edge Cases

### **Connection Loss Recovery**

Handle SignalR disconnection during preview:

```typescript
// In useDiffPreview hook
useEffect(() => {
  if (!signalRClient) return;
  
  const handleDisconnect = () => {
    if (status === 'previewing') {
      log('visual-diff', '[⚠️ Warning] Connection lost during preview');
      store.setError('Connection lost. Preview may be out of sync.');
    }
  };
  
  signalRClient.on('disconnected', handleDisconnect);
  return () => signalRClient.off('disconnected', handleDisconnect);
}, [signalRClient, status, store]);
```

### **Race Condition Handling**

Ensure operations are processed in order:

```typescript
// In the message handler
const operationQueue = useRef<Map<string, AISuggestedOperation[]>>(new Map());

const handleToolRequest = useCallback(async (toolRequest: any) => {
  const { request_id, response_id } = toolRequest;
  
  // Group operations by response_id to maintain order
  if (!operationQueue.current.has(response_id)) {
    operationQueue.current.set(response_id, []);
  }
  
  operationQueue.current.get(response_id)!.push({
    tool: toolRequest.tool,
    input: toolRequest,
    description: getToolDescription(toolRequest.tool)
  });
  
  // Process in order when response completes
}, []);
```

### **Simulation Failure Recovery**

Handle cases where operation simulation fails:

```typescript
// In simulateOperations
try {
  simulateWriteRange(after, op.input, activeSheetName);
} catch (error) {
  log('visual-diff', `[⚠️ Warning] Failed to simulate ${op.tool}`, { error });
  // Continue with other operations or mark as failed
  op.simulationFailed = true;
}
```

### **Phase 6.3: Orchestrate the Live Preview**

This connects the SignalR messages to the new diff hook with proper error handling.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

**Enhanced Implementation:**

```typescript
// In the refactored EnhancedChatInterfaceWithSignalR.tsx

// State to track if a preview is active for the current AI response
const [isLivePreviewActive, setIsLivePreviewActive] = useState(false);

// Instantiate the new hook
const { status: diffStatus, startPreviewSession, updatePreview, applyChanges, cancelPreview } = useDiffPreview(signalRClient, workbookId);

// This function is called when a new user message is sent
const handleSendMessage = async (content?: string) => {
    // If a preview from the *previous* turn is still active, cancel it.
    if (diffStatus === 'previewing') {
        await cancelPreview();
    }
    setIsLivePreviewActive(false); // Ensure the flag is reset for the new turn
    
    // ... rest of send message logic
};

// This function is the message handler for SignalR
const handleToolRequest = useCallback(async (toolRequest: any) => {
    // ... logic for read-only, ask mode, yolo mode ...

    if (autonomyMode === 'agent-default' && WRITE_TOOLS.has(toolRequest.tool)) {
        const { tool, request_id, ...input } = toolRequest;
        const operation: AISuggestedOperation = { tool, input, description: getToolDescription(tool) };
        
        // Add a pending tool card to the UI for visibility
        addMessage(createToolSuggestionMessage(toolRequest));

        if (!isLivePreviewActive) {
            // This is the FIRST write tool in the sequence. Start the session.
            setIsLivePreviewActive(true);
            await startPreviewSession(operation);
        } else {
            // A session is already active. Update it with the new tool.
            await updatePreview(operation);
        }
        
        // Inform backend that the tool is queued for preview so it can continue generation
        await signalRClient.send({
            type: 'tool_response',
            data: { request_id, result: { status: 'queued_for_preview' }, queued: true }
        });
    }
}, [isLivePreviewActive, autonomyMode, startPreviewSession, updatePreview, addMessage, signalRClient]);

// This function handles the final AI response
const handleAIResponse = (response: any) => {
    addMessage({ /* AI text response */ });
    setIsLoading(false);

    // The AI has finished its turn. "Lock in" the preview and reset the flag
    // for the next turn. The preview remains on screen for the user to action.
    if (isLivePreviewActive) {
        setIsLivePreviewActive(false);
        log('visual-diff', '[🏁 Preview Session Finalized and awaiting user action]');
    }
};
```

---

## 8. Testing Strategy

### **Unit Tests**

#### **Test Debounced Diff Calculator**
```typescript
// excel-addin/src/utils/__tests__/debouncedDiff.test.ts
describe('DebouncedDiffCalculator', () => {
  it('should batch operations within delay window', async () => {
    const onCalculate = jest.fn();
    const calculator = new DebouncedDiffCalculator(onCalculate);
    
    calculator.addOperation(op1);
    calculator.addOperation(op2);
    calculator.addOperation(op3);
    
    expect(onCalculate).not.toHaveBeenCalled();
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(onCalculate).toHaveBeenCalledTimes(1);
    expect(onCalculate).toHaveBeenCalledWith([op1, op2, op3]);
  });
  
  it('should flush immediately when requested', () => {
    const onCalculate = jest.fn();
    const calculator = new DebouncedDiffCalculator(onCalculate);
    
    calculator.addOperation(op1);
    calculator.flush();
    
    expect(onCalculate).toHaveBeenCalledWith([op1]);
  });
});
```

#### **Test Client-Side Diff**
```typescript
// excel-addin/src/utils/__tests__/clientDiff.test.ts
describe('calculateQuickDiff', () => {
  it('should detect added cells', () => {
    const before = { 'Sheet1!A1': { v: 'test' } };
    const after = { 
      'Sheet1!A1': { v: 'test' },
      'Sheet1!B1': { v: 'new' }
    };
    
    const diff = calculateQuickDiff(before, after);
    
    expect(diff).toHaveLength(1);
    expect(diff[0].kind).toBe(DiffKind.Added);
    expect(diff[0].key).toEqual({ sheet: 'Sheet1', row: 0, col: 1 });
  });
});
```

### **Integration Tests**

#### **Test Live Preview Flow**
```typescript
// excel-addin/src/hooks/__tests__/useDiffPreview.integration.test.ts
describe('useDiffPreview integration', () => {
  it('should handle complete preview session', async () => {
    const { result } = renderHook(() => 
      useDiffPreview(mockSignalRClient, 'test-workbook')
    );
    
    // Start session
    await act(async () => {
      await result.current.startPreviewSession(writeOp1);
    });
    
    expect(result.current.status).toBe('previewing');
    
    // Add more operations
    await act(async () => {
      await result.current.updatePreview(writeOp2);
      await result.current.updatePreview(writeOp3);
    });
    
    // Apply changes
    await act(async () => {
      await result.current.applyChanges();
    });
    
    expect(result.current.status).toBe('idle');
    expect(mockExcelService.executeToolRequest).toHaveBeenCalledTimes(3);
  });
});
```

### **Performance Tests**

```typescript
// excel-addin/src/performance/__tests__/liveDiff.perf.test.ts
describe('Live Diff Performance', () => {
  it('should handle rapid operation sequences', async () => {
    const operations = generateOperations(100); // 100 rapid operations
    const startTime = performance.now();
    
    for (const op of operations) {
      await updatePreview(op);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(totalTime).toBeLessThan(5000); // Should complete in < 5 seconds
    expect(backendCalls).toBeLessThan(10); // Should batch effectively
  });
});
```

---

## 9. Comprehensive Verification Plan

### **Phase 1 Verification: Basic Visual Diff**
1. **Single Write Operation**
   - Ask: "Write 'Test' in A1"
   - Verify: Visual diff preview appears with green highlight on A1

2. **Multiple Write Operations**
   - Ask: "Write 'Revenue' in A1 and 'COGS' in A2"
   - Verify: Both cells are highlighted in the preview

3. **Mixed Operations**
   - Ask: "Read A1, then write 'Updated' in B1"
   - Verify: Only B1 triggers visual diff

### **Phase 2-4 Verification: UI Refactoring**
1. **Hook Extraction**
   - Extract one hook at a time
   - Run full test suite after each extraction
   - Verify no behavioral changes

2. **Memory Leak Test**
   - Create and destroy multiple preview sessions
   - Monitor memory usage

3. **Component Size**
   - Verify main component < 500 lines after refactoring

### **Phase 5 Verification: Live Visual Diff**

1. **Streaming Test**
   - Ask: "In A1 write 'X', in B2 write 'Y', in C3 write 'Z'"
   - Verify: Highlights appear sequentially as operations arrive
   - Check: DiffPreviewBar updates count live

2. **Performance Test**
   - Generate 50 rapid write operations
   - Verify: UI remains responsive
   - Check: Backend calls are debounced

3. **Interruption Test**
   - Start multi-step operation
   - Send new message before completion
   - Verify: Clean cancellation, no orphaned highlights

4. **Error Recovery Test**
   - Disconnect SignalR during preview
   - Verify: Error message appears
   - Check: Can recover when reconnected

5. **Edge Case Tests**
   - Empty worksheet
   - Very large ranges (1000+ cells)
   - Cross-sheet operations
   - Invalid ranges

---

## 10. Success Criteria

1. **Performance Metrics**
   - Initial highlight appears < 100ms after operation received
   - Backend validation completes < 500ms for typical operations
   - No UI freezing with 100+ operations

2. **Code Quality**
   - Main component reduced from 1771 to < 500 lines
   - All hooks have single responsibilities
   - Comprehensive test coverage > 80%

3. **User Experience**
   - Live preview feels as responsive as Cursor
   - Clear visual feedback at every stage
   - Graceful error handling

4. **Maintainability**
   - New developers can understand code structure quickly
   - Adding new features doesn't require modifying core logic
   - Clear separation of concerns

---

## 11. Rollback Plan

If issues arise during implementation:

1. **Phase 1 Issues**: Revert to previous visual diff implementation
2. **Phase 2-4 Issues**: Keep working implementation, gradually extract hooks
3. **Phase 5 Issues**: Keep batch preview, defer live preview to future sprint

Each phase is designed to be independently valuable and can be deployed separately.
