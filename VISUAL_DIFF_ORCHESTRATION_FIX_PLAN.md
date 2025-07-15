# Plan: Fix Visual Diff Orchestration Logic

**Status:** Not Started

## 1. Problem Diagnosis

The visual diff feature is not being triggered because the application's central message handling logic in `EnhancedChatInterfaceWithSignalR.tsx` fails to route "write" operations to the visual diff system.

Based on the user-provided logs, we can see the following incorrect behavior:
1.  The AI suggests tool calls (e.g., `write_range`).
2.  The `handleToolRequest` function correctly identifies and auto-approves read-only tools (like `read_range`).
3.  However, when it receives a write tool, instead of initiating a visual preview, it adds the tool to a queue (`toolRequestQueue`).
4.  The tool is then sent to the backend with a `queued` status.
5.  Finally, a `Bulk approve` action is triggered, completely bypassing the intended visual diff workflow.

This is confirmed by the logs showing "Visual Diff Logs (0 entries)". The core issue is a logical flaw in how `handleToolRequest` and `executeToolRequest` interact within the `agent-default` autonomy mode.

## 2. Proposed Solution

The solution is to refactor the tool handling logic within `EnhancedChatInterfaceWithSignalR.tsx` to correctly identify and group write operations, and then pass them to the `useDiffPreview` hook's `initiatePreview` function.

### **Primary File to Modify:**
- `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

### **Key Changes:**

1.  **Introduce a `WRITE_TOOLS` constant:** Create a definitive list of tools that modify the grid and should trigger a visual diff. This avoids string-based checks like `tool.includes('write')`.
2.  **Refactor `handleToolRequest`:** This function will become the primary orchestrator. It will differentiate between read-only tools, write tools, and other tools.
3.  **Group Write Operations:** When in `agent-default` mode, instead of queuing write tools one-by-one, we will collect all consecutive write tool requests from a single AI response.
4.  **Trigger Preview:** Once the AI response is complete (indicated by an `ai_response` message), we will call `initiatePreview` with the entire group of collected write operations.
5.  **Deprecate Redundant Logic:** The flawed logic in `executeToolRequest` that attempts to call `initiatePreview` for single operations will be removed, as this responsibility will be moved to `handleToolRequest`.

---

## 3. Detailed Implementation Steps

### Step 1: Define Write Tools and State for Grouping

In `EnhancedChatInterfaceWithSignalR.tsx`, define the list of write tools and add a new state variable to hold pending write operations for the diff preview.

```typescript
// At the top of the file or in a constants file
const WRITE_TOOLS = new Set(['write_range', 'apply_formula', 'clear_range', 'smart_format_cells']);

// Inside the EnhancedChatInterfaceWithSignalR component
export const EnhancedChatInterfaceWithSignalR: React.FC = () => {
  // ... existing state
  const [pendingDiffOps, setPendingDiffOps] = useState<AISuggestedOperation[]>([]);
  // ...
```

### Step 2: Refactor `handleToolRequest`

Modify this function to handle the new logic for grouping write operations.

#### **Current Flawed Code (`handleToolRequest`)**
```typescript
  const handleToolRequest = useCallback(async (toolRequest: any) => {
    // ... (auto-approves read-only tools) ...
    
    if (autonomyMode === 'agent-default') {
      // <<< BUG: Immediately adds to UI and queues for later approval
      const suggestionMessage = createToolSuggestionMessage(toolRequest)
      setMessages(prev => [...prev, suggestionMessage])
      
      toolRequestQueue.current.set(toolRequest.request_id, toolRequest)
      
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: { status: 'queued', message: 'Tool queued for user approval' },
          // ...
        }
      })
      return
    }
    // ... (handles YOLO mode) ...
  }, [/* ... dependencies ... */])
```

#### **Proposed New Code (`handleToolRequest`)**
```typescript
  const handleToolRequest = useCallback(async (toolRequest: any) => {
    console.log('🔧 Received tool request:', toolRequest)
    addToLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`)
    
    // Auto-approve read-only tools immediately
    if (isReadOnlyTool(toolRequest.tool)) {
      addDebugLog(`Auto-approving read-only tool: ${toolRequest.tool}`, 'info')
      const suggestionMessage = createToolSuggestionMessage(toolRequest)
      suggestionMessage.status = 'approved'
      suggestionMessage.description = (suggestionMessage.description || '') + ' (Auto-approved)'
      setMessages(prev => [...prev, suggestionMessage])
      await executeToolRequest(toolRequest) // Execute immediately
      return
    }
    
    // In 'ask' mode, reject any non-read-only tool
    if (autonomyMode === 'ask') {
      await rejectToolRequest(toolRequest, 'Tool execution not allowed in Ask mode')
      return
    }
    
    // In 'agent-yolo' mode, execute immediately
    if (autonomyMode === 'agent-yolo') {
        const suggestionMessage = createToolSuggestionMessage(toolRequest)
        suggestionMessage.status = 'approved'
        setMessages(prev => [...prev, suggestionMessage])
        await executeToolRequest(toolRequest)
        return
    }

    // --- NEW LOGIC for 'agent-default' ---
    if (autonomyMode === 'agent-default') {
      // If it's a write tool, add it to the pending diff operations group
      if (WRITE_TOOLS.has(toolRequest.tool)) {
        addDebugLog(`Queueing write tool for diff preview: ${toolRequest.tool}`, 'info');
        const operation: AISuggestedOperation = {
          tool: toolRequest.tool,
          input: { ...toolRequest },
          description: getToolDescription(toolRequest.tool)
        };
        // Use a functional update to ensure we have the latest state
        setPendingDiffOps(prevOps => [...prevOps, operation]);

        // Still add a "pending" message to the UI for user visibility
        const suggestionMessage = createToolSuggestionMessage(toolRequest);
        setMessages(prev => [...prev, suggestionMessage]);

        // Inform the backend that the tool is queued, so it can continue generation
        await signalRClient.current?.send({
            type: 'tool_response',
            data: {
                request_id: toolRequest.request_id,
                result: { status: 'queued_for_preview', message: 'Tool queued for visual diff preview' },
                error: null,
                queued: true
            }
        });

      } else {
        // Handle non-write, non-read-only tools if any exist in the future
        // For now, treat them as standard suggestions
        const suggestionMessage = createToolSuggestionMessage(toolRequest);
        setMessages(prev => [...prev, suggestionMessage]);
      }
    }
  }, [autonomyMode, addDebugLog, addToLog, setMessages, signalRClient, isReadOnlyTool, setPendingDiffOps])
```

### Step 3: Trigger the Preview When AI Finishes

Modify `handleAIResponse` to check for and initiate the preview with the collected operations.

#### **Proposed New Code (`handleAIResponse`)**
```typescript
  const handleAIResponse = (response: any) => {
    console.log('🤖 Handling AI response:', response)
    
    // ... (remove thinking/generating messages) ...
    
    const aiMessage: ChatMessage = { /* ... */ }
    setMessages(prev => [...prev, aiMessage])
    setIsLoading(false)
    setAiIsGenerating(false)
    
    // --- NEW LOGIC ---
    // Check if there are pending diff operations to preview
    if (pendingDiffOps.length > 0) {
      addDebugLog(`AI response finished. Initiating diff preview for ${pendingDiffOps.length} operations.`, 'info');
      initiatePreview(pendingDiffOps);
      // Clear the pending operations now that they've been passed to the hook
      setPendingDiffOps([]);
    }
    // ...
  }
```

### Step 4: Simplify `executeToolRequest`

This function no longer needs to decide whether to trigger a diff. Its only job is to execute a tool call.

#### **Current Flawed Code (`executeToolRequest`)**
```typescript
  const executeToolRequest = useCallback(async (toolRequest: any) => {
    const { tool, request_id, ...input } = toolRequest
    
    // <<< BUG: This logic is in the wrong place and only handles one operation at a time.
    const shouldUseDiffPreview = tool.includes('write') || tool.includes('apply') || tool.includes('format')
    if (shouldUseDiffPreview && autonomyMode === 'agent-default') {
      // ... calls initiatePreview for a single operation ...
      return
    }
    
    // ... (rest of the execution logic) ...
  }, [/* ... */])
```

#### **Proposed New Code (`executeToolRequest`)**
```typescript
  const executeToolRequest = useCallback(async (toolRequest: any) => {
    const { tool, request_id, ...input } = toolRequest
    
    console.log('🎯 Executing tool request:', { tool, request_id })
    
    // The decision to use diff preview is now handled upstream.
    // This function's role is to execute the tool directly.
    
    setMessages(prev => prev.map(msg => 
      msg.id === `tool_${request_id}` && isToolSuggestion(msg)
        ? { ...msg, status: 'approved' } as ToolSuggestionMessage
        : msg
    ))
    
    const statusId = addStatusMessage({ /* ... */ })
    
    try {
      // ... (existing execution logic remains the same) ...
      const excelService = ExcelService.getInstance()
      const result = await excelService.executeToolRequest(tool, input)
      // ... (handle success, send response) ...
    } catch (error) {
      // ... (handle error, send response) ...
    }
    
    toolRequestQueue.current.delete(request_id)
  }, [/* ... dependencies ... */])
```

## 4. Verification Plan

After implementing the changes, perform the following tests:

1.  **Single Write Operation:**
    -   **Action:** In `agent-default` mode, ask the AI to "write 'Test' in cell A1".
    -   **Expected Result:**
        -   A "pending" tool suggestion for `write_range` appears in the chat.
        -   The "Visual Diff Logs" in the debug UI show `[🚀 Diff Start]`.
        -   The `DiffPreviewBar` appears.
        -   Cell A1 is highlighted in the grid.
        -   Clicking "Apply" writes the value to the cell and clears the highlights.

2.  **Multiple Write Operations:**
    -   **Action:** In `agent-default` mode, ask the AI to "in A1, write 'Revenue', and in A2, write 'COGS'".
    -   **Expected Result:**
        -   Two "pending" tool suggestions appear.
        -   The `initiatePreview` function is called **once** with an array of two operations.
        -   The `DiffPreviewBar` appears, summarizing both changes.
        -   Cells A1 and A2 are both highlighted.
        -   Clicking "Apply" executes both `write_range` calls.

3.  **Mixed Read/Write Operations:**
    -   **Action:** In `agent-default` mode, ask a question that requires reading first, then writing (e.g., "What is in A1? Then, write 'Updated' in B1").
    -   **Expected Result:**
        -   The `read_range` tool is auto-approved and executed immediately.
        -   The `write_range` tool is queued for the diff preview.
        -   The visual diff is triggered correctly for the `write_range` operation after the AI's final response.

4.  **YOLO Mode Test:**
    -   **Action:** Switch to `agent-yolo` mode and ask to "write 'YOLO' in C1".
    -   **Expected Result:** The `write_range` tool is executed directly without a diff preview. The "Visual Diff Logs" should remain empty.

5.  **Ask Mode Test:**
    -   **Action:** Switch to `ask` mode and ask to "write 'ASK' in D1".
    -   **Expected Result:** The tool request is immediately rejected. No diff preview is shown.

This plan centralizes the diff orchestration logic, ensuring that all write operations in the appropriate mode are correctly funneled into the visual diff system, fixing the core bug.
