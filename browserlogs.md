[Warning] 620 console messages are not shown.
[Log] 📤 Sending tool response: – Object (SignalRClient.ts, line 165)
Object
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [12:40:51 PM] [INFO] Tool format_range - streaming: true, autonomyMode: agent-default, shouldPreview: true (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:51 PM] [INFO] Tool format_range adding to preview queue (RefactoredChatInterface.tsx, line 57)
[Log] [Message Handler] Sending final tool response: – Object (useMessageHandlers.ts, line 29)
Object
[Log] 📤 Sending SignalR message: – Object (SignalRClient.ts, line 125)
Object
[Log] 📤 Sending tool response: – Object (SignalRClient.ts, line 165)
Object
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [12:40:51 PM] [INFO] Queued 2 operations for preview (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:51 PM] [INFO] Starting queue processing via startProcessingQueue (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:51 PM] [INFO] processNextOperation called. Queue length: 2, isProcessing: false (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:51 PM] [INFO] Processing operation 1 of 2 (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:51 PM] [INFO] showOperationPreview called for write_range (toolu_01KBBDENj3poM4AxCq3JfjT1) (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:51 PM] [INFO] Generating visual preview for preview_toolu_01KBBDENj3poM4AxCq3JfjT1 (RefactoredChatInterface.tsx, line 57)
[Log] [Diff Preview] Starting new preview session, creating initial snapshot. (useDiffPreview.ts, line 115)
[Log] [info] [Simulator] Starting simulation for write_range – Object (diffSimulator.ts, line 17)
Object
[Log] [info] [Simulator] Applying write operation to range: undefined – undefined (diffSimulator.ts, line 26)
[Log] [warning] [Simulator] Write operation missing range or values – Object (diffSimulator.ts, line 63)
Object
[Log] [info] [Simulator] Simulation complete. Cells modified: 0 – Object (diffSimulator.ts, line 53)
Object
[Log] [ClientDiff] Calculated 0 diffs in 0.00ms (clientDiff.ts, line 56)
[Log] [info] [Visualizer] Clearing 0 highlights – undefined (GridVisualizer.ts, line 265)
[Log] [success] [Visualizer] Highlights cleared successfully – undefined (GridVisualizer.ts, line 404)
[Log] [info] [Visualizer] No hunks to highlight – undefined (GridVisualizer.ts, line 34)
[Log] [info] [Visualizer] No preview values to apply – undefined (GridVisualizer.ts, line 445)
[Log] [Diff Preview] Preview values applied successfully during re-calculation (useDiffPreview.ts, line 156)
[Log] [12:40:51 PM] [INFO] Visual preview generated successfully (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:51 PM] [INFO] Adding preview message to chat: preview_toolu_01KBBDENj3poM4AxCq3JfjT1 (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:51 PM] [INFO] Preview message added successfully (RefactoredChatInterface.tsx, line 57)
[Log] [ChatManager] Adding message: – Object (useChatManager.ts, line 29)
Object
[Log] [ChatManager] Previous messages count: – 2 (useChatManager.ts, line 36)
[Log] [12:40:51 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 385)
[Log] [12:40:51 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 57)
[Log] [ChatManager] updateMessage called: – Object (useChatManager.ts, line 42)
Object
[Log] [ChatManager] Found message to update: – Object (useChatManager.ts, line 49)
Object
[Log] [info] [Visualizer] Clearing 0 highlights – undefined (GridVisualizer.ts, line 265)
[Log] [success] [Visualizer] Highlights cleared successfully – undefined (GridVisualizer.ts, line 404)
[Log] [✅ Diff Apply Success] ExcelService received tool request to execute. – Object (ExcelService.ts, line 748)
Object
[Log] [✅ Diff Apply Success] Executing toolWriteRange. – Object (ExcelService.ts, line 1106)
Object
[Error] [❌ Diff Error] Failed inside toolWriteRange. – Object
Object
	(anonymous function) (ExcelService.ts:1156)
[Error] [❌ Diff Error] Error during tool execution in ExcelService. – Object
Object
	(anonymous function) (ExcelService.ts:780)
[Log] [Message Handler] Sending final tool response: – Object (useMessageHandlers.ts, line 29)
Object
[Log] 📤 Sending SignalR message: – Object (SignalRClient.ts, line 125)
Object
[Log] 📤 Sending tool response: – Object (SignalRClient.ts, line 165)
Object
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [12:40:54 PM] [ERROR] Preview execution failed for toolu_01KBBDENj3poM4AxCq3JfjT1: ToolExecutionError: Failed to execute tool 'write_range' with params { (RefactoredChatInterface.tsx, line 57)
  "autonomy_mode": "agent-default",
  "parameters": {},
  "request_id": "toolu_01KBBDENj3poM4AxCq3JfjT1",
  "streaming_mode": true,
  "tool": "write_range"
}. Error: Failed to write to range "undefined": undefined is not an object (evaluating 'rangeStr.includes')
[Log] [12:40:54 PM] [INFO] Starting queue processing via startProcessingQueue (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:54 PM] [INFO] processNextOperation called. Queue length: 1, isProcessing: false (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:54 PM] [INFO] Processing operation 2 of 2 (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:54 PM] [INFO] showOperationPreview called for format_range (toolu_013Z6vdowHUQtKQumFh5cbik) (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:54 PM] [INFO] Generating visual preview for preview_toolu_013Z6vdowHUQtKQumFh5cbik (RefactoredChatInterface.tsx, line 57)
[Log] [Diff Preview] Starting new preview session, creating initial snapshot. (useDiffPreview.ts, line 115)
[Log] [info] [Simulator] Starting simulation for format_range – Object (diffSimulator.ts, line 17)
Object
[Log] [info] [Simulator] Applying format to range: undefined – undefined (diffSimulator.ts, line 39)
[Log] [warning] [Simulator] Format operation missing range – Object (diffSimulator.ts, line 141)
Object
[Log] [info] [Simulator] Simulation complete. Cells modified: 0 – Object (diffSimulator.ts, line 53)
Object
[Log] [ClientDiff] Calculated 0 diffs in 0.00ms (clientDiff.ts, line 56)
[Log] [info] [Visualizer] Clearing 0 highlights – undefined (GridVisualizer.ts, line 265)
[Log] [success] [Visualizer] Highlights cleared successfully – undefined (GridVisualizer.ts, line 404)
[Log] [info] [Visualizer] No hunks to highlight – undefined (GridVisualizer.ts, line 34)
[Log] [info] [Visualizer] No preview values to apply – undefined (GridVisualizer.ts, line 445)
[Log] [Diff Preview] Preview values applied successfully during re-calculation (useDiffPreview.ts, line 156)
[Log] [12:40:54 PM] [INFO] Visual preview generated successfully (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:54 PM] [INFO] Adding preview message to chat: preview_toolu_013Z6vdowHUQtKQumFh5cbik (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:54 PM] [INFO] Preview message added successfully (RefactoredChatInterface.tsx, line 57)
[Log] [ChatManager] Adding message: – Object (useChatManager.ts, line 29)
Object
[Log] [ChatManager] Previous messages count: – 2 (useChatManager.ts, line 36)
[Log] [ChatManager] updateMessage called: – Object (useChatManager.ts, line 42)
Object
[Log] [ChatManager] Found message to update: – Object (useChatManager.ts, line 49)
Object
[Log] [info] [Visualizer] Clearing 0 highlights – undefined (GridVisualizer.ts, line 265)
[Log] [success] [Visualizer] Highlights cleared successfully – undefined (GridVisualizer.ts, line 404)
[Log] [✅ Diff Apply Success] ExcelService received tool request to execute. – Object (ExcelService.ts, line 748)
Object
[Log] 🎨 toolFormatRange called with: – Object (ExcelService.ts, line 1268)
Object
[Error] ❌ toolFormatRange general error: – TypeError: undefined is not an object (evaluating 'rangeStr.includes')
TypeError: undefined is not an object (evaluating 'rangeStr.includes')
	(anonymous function) (ExcelService.ts:1476)
[Log] 📊 Format operation log: – Object (formatErrorHandler.ts, line 63)
Object
[Error]    Full error details: – Object
Object
	(anonymous function) (ExcelService.ts:1479)
[Error] [❌ Diff Error] Error during tool execution in ExcelService. – Object
Object
	(anonymous function) (ExcelService.ts:780)
[Log] [Message Handler] Sending final tool response: – Object (useMessageHandlers.ts, line 29)
Object
[Log] 📤 Sending SignalR message: – Object (SignalRClient.ts, line 125)
Object
[Log] 📤 Sending tool response: – Object (SignalRClient.ts, line 165)
Object
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [12:40:55 PM] [ERROR] Preview execution failed for toolu_013Z6vdowHUQtKQumFh5cbik: ToolExecutionError: Failed to execute tool 'format_range' with params { (RefactoredChatInterface.tsx, line 57)
  "autonomy_mode": "agent-default",
  "parameters": {},
  "request_id": "toolu_013Z6vdowHUQtKQumFh5cbik",
  "streaming_mode": true,
  "tool": "format_range"
}. Error: Range error: undefined is not an object (evaluating 'rangeStr.includes'). Please check that the range address is valid.
[Log] [12:40:55 PM] [INFO] Starting queue processing via startProcessingQueue (RefactoredChatInterface.tsx, line 57)
[Log] [12:40:55 PM] [INFO] processNextOperation called. Queue length: 0, isProcessing: false (RefactoredChatInterface.tsx, line 57)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260)