[Debug] [vite] connecting... (client, line 495)
[Debug] [vite] connected. (client, line 618)
[Log] 🚀 app.tsx loaded (app.tsx, line 22)
[Log] 🔍 Office object: – "Available" (app.tsx, line 23)
[Log] 🔍 Document ready state: – "interactive" (app.tsx, line 24)
[Log] 📌 Office is defined, calling Office.onReady (app.tsx, line 39)
[Log] ✅ Office.onReady fired! – {host: "Excel", platform: "Mac", addin: null} (app.tsx, line 41)
[Log] 📋 Office info: – "{↵  \"host\": \"Excel\",↵  \"platform\": \"Mac\",↵  \"addin\": null↵}" (app.tsx, line 42)
"{
  \"host\": \"Excel\",
  \"platform\": \"Mac\",
  \"addin\": null
}"
[Log] 🎯 Root element: –  (app.tsx, line 45)
<div id="root">…</div>

<div id="root">…</div>
[Log] 🌳 React root created (app.tsx, line 51)
[Log] ✅ React render called (app.tsx, line 57)
[Log] 🎨 MainApp rendering (app.tsx, line 26)
[Log] 🎨 EnhancedChatInterfaceWrapper rendering with REFACTORED component (EnhancedChatInterfaceWrapper.tsx, line 19)
[Log] [ExcelService] Creating new instance (ExcelService.ts, line 30)
[Log] [ExcelService] Excel object is available (ExcelService.ts, line 34)
[Log] [6:23:09 PM] [INFO] Initiating SignalR connection... (RefactoredChatInterface.tsx, line 57)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Log] [6:23:09 PM] [INFO] Initializing selection change listener... (RefactoredChatInterface.tsx, line 57)
[Log] [6:23:09 PM] [INFO] Initializing context and mentions on load... (RefactoredChatInterface.tsx, line 57)
[Error] Could not connect to the server.
[Error] Fetch API cannot load https://localhost:7171/hub/negotiate?access_token=dev-token-123&negotiateVersion=1 due to access control checks.
[Error] Failed to load resource: Could not connect to the server. (negotiate, line 0)
[Warning] [2025-07-24T22:23:09.659Z] Warning: Error from HTTP request. TypeError: Load failed. (@microsoft_signalr.js, line 296)
[Error] [2025-07-24T22:23:09.659Z] Error: Failed to complete negotiation with the server: TypeError: Load failed
	log (@microsoft_signalr.js:293)
	(anonymous function) (@microsoft_signalr.js:2343)
[Error] [2025-07-24T22:23:09.659Z] Error: Failed to start the connection: Error: Failed to complete negotiation with the server: TypeError: Load failed
	log (@microsoft_signalr.js:293)
	(anonymous function) (@microsoft_signalr.js:2305)
[Error] Failed to create SignalR connection: – Error: Failed to complete negotiation with the server: TypeError: Load failed — Errors.ts:177
Error: Failed to complete negotiation with the server: TypeError: Load failed — Errors.ts:177
	(anonymous function) (SignalRClient.ts:39)
[Error] SignalR error: – Error: Failed to complete negotiation with the server: TypeError: Load failed — Errors.ts:177
Error: Failed to complete negotiation with the server: TypeError: Load failed — Errors.ts:177
	(anonymous function) (useSignalRManager.ts:51)
	emit (events.js:103)
	(anonymous function) (SignalRClient.ts:40)
[Log] [6:23:09 PM] [ERROR] SignalR error: Failed to complete negotiation with the server: TypeError: Load failed - undefined (RefactoredChatInterface.tsx, line 57)
[Log] 🔄 Attempting reconnect 1/10 in 5000ms... (SignalRClient.ts, line 43)
[Log] [6:23:09 PM] [SUCCESS] Selection change listener registered. (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 386)
[Log] [6:23:10 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 386)
[Log] [6:23:10 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 57)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Info] [2025-07-24T22:23:14.770Z] Information: WebSocket connected to wss://localhost:7171/hub?access_token=dev-token-123&id=ZQjgUK0S7oBEvw5uyB_p_Q. (@microsoft_signalr.js, line 299)
[Info] [2025-07-24T22:23:14.770Z] Information: Using HubProtocol 'json'. (@microsoft_signalr.js, line 299)
[Log] ✅ SignalR connected successfully! (SignalRClient.ts, line 33)
[Log] ✅ Connection state: – "Connected" (SignalRClient.ts, line 34)
[Log] [6:23:14 PM] [SUCCESS] SignalR connected successfully (RefactoredChatInterface.tsx, line 57)
[Log] 📥 Received connected event: – {connectionId: "Q5NihmmrgJpvPw2jRNwd5g", timestamp: "2025-07-24T22:23:14.775258Z"} (SignalRClient.ts, line 67)
[Log] [6:23:14 PM] [INFO] SignalR raw message: {"type":"notification","data":{"connectionId":"Q5NihmmrgJpvPw2jRNwd5g","timestamp":"2025-07-24T22:23:14.775258Z"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: {type: "notification", data: {connectionId: "Q5NihmmrgJpvPw2jRNwd5g", timestamp: "2025-07-24T22:23:14.775258Z"}}} (useMessageHandlers.ts, line 13)
[Log] [6:23:14 PM] [INFO] Backend connected. Connection ID: Q5NihmmrgJpvPw2jRNwd5g (RefactoredChatInterface.tsx, line 57)
[Log] 🔐 Authenticating after connection... (SignalRClient.ts, line 69)
[Log] 📥 Received authSuccess: – {sessionId: "session_638889925947819850", userId: "user_dev-token-123", timestamp: "2025-07-24T22:23:14.783071Z"} (SignalRClient.ts, line 75)
[Log] [6:23:14 PM] [SUCCESS] SignalR authenticated successfully. Session: session_638889925947819850 (RefactoredChatInterface.tsx, line 57)
[Log] [6:23:14 PM] [INFO] SignalR raw message: {"type":"auth_success","data":{"sessionId":"session_638889925947819850","userId":"user_dev-token-123","timestamp":"2025-07-24T22:23:14.783071Z"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: {type: "auth_success", data: {sessionId: "session_638889925947819850", userId: "user_dev-token-123", timestamp: "2025-07-24T22:23:14.783071Z"}}} (useMessageHandlers.ts, line 13)
[Log] [6:23:14 PM] [SUCCESS] Authentication successful. Session ID: session_638889925947819850 (RefactoredChatInterface.tsx, line 57)
[Log] 🔐 Authentication request sent (SignalRClient.ts, line 112)
[Log] [ChatManager] Adding message: – {id: "478023da-2bcf-4585-992f-33630f836dff", type: "user", role: "user", …} (useChatManager.ts, line 29)
{id: "478023da-2bcf-4585-992f-33630f836dff", type: "user", role: "user", isStreaming: false, contentLength: 50}Object
[Log] [ChatManager] Previous messages count: – 0 (useChatManager.ts, line 36)
[Log] [6:23:17 PM] [INFO] User message sent: 478023da-2bcf-4585-992f-33630f836dff - All state reset (RefactoredChatInterface.tsx, line 57)
[Log] 🌊 Starting streaming chat via SignalR (SignalRClient.ts, line 281)
[Log] [ChatManager] Adding message: – {id: "stream_1753395797721", type: "chat", role: "assistant", …} (useChatManager.ts, line 29)
{id: "stream_1753395797721", type: "chat", role: "assistant", isStreaming: true, contentLength: 0}Object
[Log] [ChatManager] Previous messages count: – 1 (useChatManager.ts, line 36)
[Log] 📥 Received tool request: – {include_formatting: false, include_formulas: true, range: "A1:Z100", …} (SignalRClient.ts, line 86)
{include_formatting: false, include_formulas: true, range: "A1:Z100", request_id: "6339e9cf-3378-463d-928b-d85a2c1be9ea", tool: "read_range"}Object
[Log] [6:23:27 PM] [INFO] SignalR raw message: {"type":"tool_request","data":{"include_formatting":false,"include_formulas":true,"range":"A1:Z100","request_id":"6339e9cf-3378-463d-928b-d85a2c1be9ea","tool":"read_range"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: Object} (useMessageHandlers.ts, line 13)
{rawMessage: Object}Object
[Log] [6:23:27 PM] [INFO] ← Received tool_request: read_range (6339e9cf-3378-463d-928b-d85a2c1be9ea) (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received tool request 6339e9cf-3378-463d-928b-d85a2c1be9ea (read_range) – {parameters: Object} (useMessageHandlers.ts, line 13)
{parameters: Object}Object
[Log] [DEBUG] Full tool request received: – "{↵  \"include_formatting\": false,↵  \"include_formulas\": true,↵  \"range\": \"A1:Z100\",↵  \"request_id\": \"6339e9cf-3378-463d-928b-d85a2c1be9ea\",…" (useMessageHandlers.ts, line 198)
"{
  \"include_formatting\": false,
  \"include_formulas\": true,
  \"range\": \"A1:Z100\",
  \"request_id\": \"6339e9cf-3378-463d-928b-d85a2c1be9ea\",
  \"tool\": \"read_range\"
}"
[Log] [DEBUG] Preview field: – undefined (useMessageHandlers.ts, line 199)
[Log] [DEBUG] Current autonomy mode: – "agent-default" (useMessageHandlers.ts, line 200)
[Log] [DEBUG] Tool request parameters: – undefined (useMessageHandlers.ts, line 201)
[Log] 📤 Sending SignalR message: – {type: "tool_response", data: Object} (SignalRClient.ts, line 125)
{type: "tool_response", data: Object}Object
[Log] 📤 Sending tool response: – {request_id: "6339e9cf-3378-463d-928b-d85a2c1be9ea", has_result: true, has_error: false, …} (SignalRClient.ts, line 165)
{request_id: "6339e9cf-3378-463d-928b-d85a2c1be9ea", has_result: true, has_error: false, queued: true, has_errorDetails: false, …}Object
[Log] [Stream] Chunk #1 received at 9387ms, length: 89 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 1, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: "I", …}Object
[Log] [handleStreamChunk] Text to append: – "I" (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 1, totalContent: "I...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 1, totalContent: "I...", totalLength: 1}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: ""}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 0, appendLength: 1, newLength: 1} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 0, newLength: 1, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 0, newLength: 1, delta: 1}Object
[Log] [Stream] Chunk #2 received at 9388ms, length: 122 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 34, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: "'ll help you create a professional", …}Object
[Log] [handleStreamChunk] Text to append: – "'ll help you create a professional" (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 2, totalContent: "I'll help you create a professional...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 2, totalContent: "I'll help you create a professional...", totalLength: 35}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 1, appendLength: 34, newLength: 35} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 1, newLength: 35, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 1, newLength: 35, delta: 34}Object
[Log] [Stream] Chunk #3 received at 9393ms, length: 103 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 15, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: " DCF (Discounte", …}Object
[Log] [handleStreamChunk] Text to append: – " DCF (Discounte" (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 3, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 3, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 50}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 35, appendLength: 15, newLength: 50} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 35, newLength: 50, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 35, newLength: 50, delta: 15}Object
[Log] [Stream] Chunk #4 received at 9402ms, length: 112 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 24, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: "d Cash Flow) model using", …}Object
[Log] [handleStreamChunk] Text to append: – "d Cash Flow) model using" (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 4, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 4, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 74}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 50, appendLength: 24, newLength: 74} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 50, newLength: 74, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 50, newLength: 74, delta: 24}Object
[Log] [Stream] Chunk #5 received at 9412ms, length: 114 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 26, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: " best practices. I'll buil", …}Object
[Log] [handleStreamChunk] Text to append: – " best practices. I'll buil" (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 5, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 5, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 100}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 74, appendLength: 26, newLength: 100} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 74, newLength: 100, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 74, newLength: 100, delta: 26}Object
[Log] [Stream] Chunk #6 received at 9423ms, length: 117 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 29, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: "d it section by section using", …}Object
[Log] [handleStreamChunk] Text to append: – "d it section by section using" (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 6, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 6, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 129}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 100, appendLength: 29, newLength: 129} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 100, newLength: 129, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 100, newLength: 129, delta: 29}Object
[Log] [Stream] Chunk #7 received at 9434ms, length: 124 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 36, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: " parallel operations for efficiency.", …}Object
[Log] [handleStreamChunk] Text to append: – " parallel operations for efficiency." (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 7, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 7, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 165}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 129, appendLength: 36, newLength: 165} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 129, newLength: 165, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 129, newLength: 165, delta: 36}Object
[Log] [Stream] Chunk #8 received at 9445ms, length: 113 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 23, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: "↵↵First, let me analyze", …}Object
[Log] [handleStreamChunk] Text to append: – "↵↵First, let me analyze" (useMessageHandlers.ts, line 680)
"

First, let me analyze"
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 8, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 8, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 188}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 165, appendLength: 23, newLength: 188} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 165, newLength: 188, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 165, newLength: 188, delta: 23}Object
[Log] [Stream] Chunk #9 received at 9456ms, length: 116 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 28, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: " the current sheet to ensure", …}Object
[Log] [handleStreamChunk] Text to append: – " the current sheet to ensure" (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 9, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 9, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 216}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 188, appendLength: 28, newLength: 216} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 188, newLength: 216, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 188, newLength: 216, delta: 28}Object
[Log] [Stream] Chunk #10 received at 9467ms, length: 122 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 34, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: " we're starting fresh and organize", …}Object
[Log] [handleStreamChunk] Text to append: – " we're starting fresh and organize" (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 10, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 10, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 250}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 216, appendLength: 34, newLength: 250} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 216, newLength: 250, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 216, newLength: 250, delta: 34}Object
[Log] [Stream] Chunk #11 received at 9479ms, length: 108 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: false, delta length: 20, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "text", hasDelta: true, hasContent: false, deltaValue: " the model properly.", …}Object
[Log] [handleStreamChunk] Text to append: – " the model properly." (useMessageHandlers.ts, line 680)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753395797721", updateCount: 11, totalContent: "I'll help you create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 686)
{messageId: "stream_1753395797721", updateCount: 11, totalContent: "I'll help you create a professional DCF (Discounte...", totalLength: 270}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753395797721" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "478023da-2bcf-4585-992f-33630f836dff", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753395797721", content: "I'll help you create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 250, appendLength: 20, newLength: 270} (useMessageHandlers.ts, line 696)
[Log] [ChatManager] Content update: – {messageId: "stream_1753395797721", oldLength: 250, newLength: 270, …} (useChatManager.ts, line 80)
{messageId: "stream_1753395797721", oldLength: 250, newLength: 270, delta: 20}Object
[Log] [Stream] Chunk #12 received at 9490ms, length: 191 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_start, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_start", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_start", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #13 received at 9501ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #14 received at 9513ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #15 received at 9524ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #16 received at 9535ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #17 received at 9546ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #18 received at 9558ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #19 received at 9568ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #20 received at 9579ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #21 received at 9590ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #22 received at 9601ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #23 received at 9612ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [6:23:37 PM] [WARNING] Stream health check: No updates for 10524ms, possible stream stall (RefactoredChatInterface.tsx, line 57)
[Log] [6:23:38 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 386)
[Log] [6:23:38 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 57)
[Log] [Stream] Chunk #24 received at 39370ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #25 received at 39380ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #26 received at 39391ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #27 received at 39402ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #28 received at 39413ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #29 received at 39424ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_complete, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_complete", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_complete", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #30 received at 39436ms, length: 391 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_result, has delta: false, has content: true, delta length: 0, content length: 168 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: "tool_result", hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: "tool_result", hasDelta: false, hasContent: true, deltaValue: "", …}Object
[Log] [Stream] Chunk #31 received at 39447ms, length: 73 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: undefined, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753395797721", chunkType: undefined, hasDelta: false, …} (useMessageHandlers.ts, line 658)
{messageId: "stream_1753395797721", chunkType: undefined, hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #32 received at 39459ms, length: 6 (useMessageHandlers.ts, line 584)
[Log] [Stream] Completed. Total chunks: 32, Duration: 39459ms (useMessageHandlers.ts, line 586)
[Log] [6:23:57 PM] [INFO] Streaming completed in 39474ms with 32 chunks (RefactoredChatInterface.tsx, line 57)
[Error] [2025-07-24T22:23:57.196Z] Error: A callback for the method 'streamcomplete' threw error 'ReferenceError: Can't find variable: messageId'.
	log (@microsoft_signalr.js:293)
	(anonymous function) (@microsoft_signalr.js:1393)
	_invokeClientMethod (@microsoft_signalr.js:1366)
	_processIncomingData (@microsoft_signalr.js:1262)
	(anonymous function) (@microsoft_signalr.js:2080)
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [6:23:57 PM] [INFO] Tool read_range is read-only. Adding to batch queue. (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Adding read_range request to batch queue – undefined (useMessageHandlers.ts, line 13)
[Log] [6:23:57 PM] [INFO] Processing batch of 1 read requests (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Processing batch of 1 read requests – undefined (useMessageHandlers.ts, line 13)
[Log] [info] [Message Handler] Batch request: 6339e9cf-3378-463d-928b-d85a2c1be9ea for range: A1:Z100 – undefined (useMessageHandlers.ts, line 13)
[Log] [ExcelService] Batch reading 1 ranges (logging.ts, line 40)
[Log] [ExcelService] Processing range Sheet1!A1:Z100 for request 6339e9cf-3378-463d-928b-d85a2c1be9ea (logging.ts, line 40)
[Log] [6:23:57 PM] [INFO] Sending tool_response for 6339e9cf-3378-463d-928b-d85a2c1be9ea - Data size: 80 bytes (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Tool response data size: 80 bytes – {rowCount: 0, colCount: 0, cellCount: 0} (useMessageHandlers.ts, line 13)
[Log] [Message Handler] Sending final tool response: – {sessionId: "session_638889925947819850", requestId: "6339e9cf-3378-463d-928b-d85a2c1be9ea", result: Object, …} (useMessageHandlers.ts, line 27)
{sessionId: "session_638889925947819850", requestId: "6339e9cf-3378-463d-928b-d85a2c1be9ea", result: Object, error: "", errorDetails: "", …}Object
[Log] 📤 Sending SignalR message: – {type: "tool_response", data: Object} (SignalRClient.ts, line 125)
{type: "tool_response", data: Object}Object
[Log] 📤 Sending tool response: – {request_id: "6339e9cf-3378-463d-928b-d85a2c1be9ea", has_result: true, has_error: false, …} (SignalRClient.ts, line 165)
{request_id: "6339e9cf-3378-463d-928b-d85a2c1be9ea", has_result: true, has_error: false, queued: false, has_errorDetails: false, …}Object
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [6:23:57 PM] [SUCCESS] Batch processing complete for 1 requests (RefactoredChatInterface.tsx, line 57)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260)
[Log] [6:24:17 PM] [WARNING] Message 478023da-2bcf-4585-992f-33630f836dff timed out (RefactoredChatInterface.tsx, line 57)
[Log] [ChatManager] Adding message: – {id: "timeout_478023da-2bcf-4585-992f-33630f836dff", type: "error", role: "system", …} (useChatManager.ts, line 29)
{id: "timeout_478023da-2bcf-4585-992f-33630f836dff", type: "error", role: "system", isStreaming: false, contentLength: 39}Object
[Log] [ChatManager] Previous messages count: – 2 (useChatManager.ts, line 36)