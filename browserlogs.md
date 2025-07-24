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
[Log] [5:54:04 PM] [INFO] Initiating SignalR connection... (RefactoredChatInterface.tsx, line 57)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Log] [5:54:04 PM] [INFO] Initializing selection change listener... (RefactoredChatInterface.tsx, line 57)
[Log] [5:54:04 PM] [INFO] Initializing context and mentions on load... (RefactoredChatInterface.tsx, line 57)
[Log] [5:54:04 PM] [SUCCESS] Selection change listener registered. (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 386)
[Error] Could not connect to the server.
[Error] Fetch API cannot load https://localhost:7171/hub/negotiate?access_token=dev-token-123&negotiateVersion=1 due to access control checks.
[Error] Failed to load resource: Could not connect to the server. (negotiate, line 0)
[Warning] [2025-07-24T21:54:04.379Z] Warning: Error from HTTP request. TypeError: Load failed. (@microsoft_signalr.js, line 296)
[Error] [2025-07-24T21:54:04.379Z] Error: Failed to complete negotiation with the server: TypeError: Load failed
	log (@microsoft_signalr.js:293)
	(anonymous function) (@microsoft_signalr.js:2343)
[Error] [2025-07-24T21:54:04.380Z] Error: Failed to start the connection: Error: Failed to complete negotiation with the server: TypeError: Load failed
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
[Log] [5:54:04 PM] [ERROR] SignalR error: Failed to complete negotiation with the server: TypeError: Load failed - undefined (RefactoredChatInterface.tsx, line 57)
[Log] 🔄 Attempting reconnect 1/10 in 5000ms... (SignalRClient.ts, line 43)
[Log] [5:54:04 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 386)
[Log] [5:54:04 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 57)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Info] [2025-07-24T21:54:09.504Z] Information: WebSocket connected to wss://localhost:7171/hub?access_token=dev-token-123&id=tl6SN7Ktp3AD-MlKjy2zZA. (@microsoft_signalr.js, line 299)
[Info] [2025-07-24T21:54:09.504Z] Information: Using HubProtocol 'json'. (@microsoft_signalr.js, line 299)
[Log] ✅ SignalR connected successfully! (SignalRClient.ts, line 33)
[Log] ✅ Connection state: – "Connected" (SignalRClient.ts, line 34)
[Log] [5:54:09 PM] [SUCCESS] SignalR connected successfully (RefactoredChatInterface.tsx, line 57)
[Log] 📥 Received connected event: – {connectionId: "trCIMokb1DaVDPOmIsaAFQ", timestamp: "2025-07-24T21:54:09.509301Z"} (SignalRClient.ts, line 67)
[Log] [5:54:09 PM] [INFO] SignalR raw message: {"type":"notification","data":{"connectionId":"trCIMokb1DaVDPOmIsaAFQ","timestamp":"2025-07-24T21:54:09.509301Z"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: {type: "notification", data: {connectionId: "trCIMokb1DaVDPOmIsaAFQ", timestamp: "2025-07-24T21:54:09.509301Z"}}} (useMessageHandlers.ts, line 13)
[Log] [5:54:09 PM] [INFO] Backend connected. Connection ID: trCIMokb1DaVDPOmIsaAFQ (RefactoredChatInterface.tsx, line 57)
[Log] 🔐 Authenticating after connection... (SignalRClient.ts, line 69)
[Log] 📥 Received authSuccess: – {sessionId: "session_638889908495158730", userId: "user_dev-token-123", timestamp: "2025-07-24T21:54:09.516904Z"} (SignalRClient.ts, line 75)
[Log] [5:54:09 PM] [SUCCESS] SignalR authenticated successfully. Session: session_638889908495158730 (RefactoredChatInterface.tsx, line 57)
[Log] [5:54:09 PM] [INFO] SignalR raw message: {"type":"auth_success","data":{"sessionId":"session_638889908495158730","userId":"user_dev-token-123","timestamp":"2025-07-24T21:54:09.516904Z"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: {type: "auth_success", data: {sessionId: "session_638889908495158730", userId: "user_dev-token-123", timestamp: "2025-07-24T21:54:09.516904Z"}}} (useMessageHandlers.ts, line 13)
[Log] [5:54:09 PM] [SUCCESS] Authentication successful. Session ID: session_638889908495158730 (RefactoredChatInterface.tsx, line 57)
[Log] 🔐 Authentication request sent (SignalRClient.ts, line 112)
[Log] [ChatManager] Adding message: – {id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", type: "user", role: "user", …} (useChatManager.ts, line 29)
{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", type: "user", role: "user", isStreaming: false, contentLength: 50}Object
[Log] [ChatManager] Previous messages count: – 0 (useChatManager.ts, line 36)
[Log] [5:54:18 PM] [INFO] User message sent: 99c57b49-85b7-4f87-a753-a4303f1e2c03 - All state reset (RefactoredChatInterface.tsx, line 57)
[Log] 🌊 Starting streaming chat via SignalR (SignalRClient.ts, line 281)
[Log] [ChatManager] Adding message: – {id: "stream_1753394058602", type: "chat", role: "assistant", …} (useChatManager.ts, line 29)
{id: "stream_1753394058602", type: "chat", role: "assistant", isStreaming: true, contentLength: 0}Object
[Log] [ChatManager] Previous messages count: – 1 (useChatManager.ts, line 36)
[Log] [Stream] Chunk #1 received at 3282ms, length: 90 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 1, content length: 1 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "I", …}Object
[Log] [handleStreamChunk] Text to append: – "I" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 1, totalContent: "I...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 1, totalContent: "I...", totalLength: 1}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: ""}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 0, appendLength: 1, newLength: 1} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 0, newLength: 1, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 0, newLength: 1, delta: 1}Object
[Log] [Stream] Chunk #2 received at 3285ms, length: 94 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 3, content length: 3 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "'ll", …}Object
[Log] [handleStreamChunk] Text to append: – "'ll" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 2, totalContent: "I'll...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 2, totalContent: "I'll...", totalLength: 4}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 1, appendLength: 3, newLength: 4} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 1, newLength: 4, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 1, newLength: 4, delta: 3}Object
[Log] [Stream] Chunk #3 received at 3293ms, length: 98 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 5, content length: 5 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " help", …}Object
[Log] [handleStreamChunk] Text to append: – " help" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 3, totalContent: "I'll help...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 3, totalContent: "I'll help...", totalLength: 9}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 4, appendLength: 5, newLength: 9} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 4, newLength: 9, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 4, newLength: 9, delta: 5}Object
[Log] [Stream] Chunk #4 received at 3303ms, length: 102 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 7, content length: 7 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " create", …}Object
[Log] [handleStreamChunk] Text to append: – " create" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 4, totalContent: "I'll help create...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 4, totalContent: "I'll help create...", totalLength: 16}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 9, appendLength: 7, newLength: 16} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 9, newLength: 16, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 9, newLength: 16, delta: 7}Object
[Log] [Stream] Chunk #5 received at 3314ms, length: 118 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 15, content length: 15 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " a professional", …}Object
[Log] [handleStreamChunk] Text to append: – " a professional" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 5, totalContent: "I'll help create a professional...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 5, totalContent: "I'll help create a professional...", totalLength: 31}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 16, appendLength: 15, newLength: 31} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 16, newLength: 31, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 16, newLength: 31, delta: 15}Object
[Log] [Stream] Chunk #6 received at 3325ms, length: 108 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 10, content length: 10 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " DCF (Disc", …}Object
[Log] [handleStreamChunk] Text to append: – " DCF (Disc" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 6, totalContent: "I'll help create a professional DCF (Disc...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 6, totalContent: "I'll help create a professional DCF (Disc...", totalLength: 41}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 31, appendLength: 10, newLength: 41} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 31, newLength: 41, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 31, newLength: 41, delta: 10}Object
[Log] [Stream] Chunk #7 received at 3336ms, length: 134 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 23, content length: 23 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "ounted Cash Flow) model", …}Object
[Log] [handleStreamChunk] Text to append: – "ounted Cash Flow) model" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 7, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 7, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 64}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Disc"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 41, appendLength: 23, newLength: 64} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 41, newLength: 64, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 41, newLength: 64, delta: 23}Object
[Log] [Stream] Chunk #8 received at 3347ms, length: 110 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 11, content length: 11 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " using best", …}Object
[Log] [handleStreamChunk] Text to append: – " using best" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 8, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 8, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 75}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 64, appendLength: 11, newLength: 75} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 64, newLength: 75, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 64, newLength: 75, delta: 11}Object
[Log] [Stream] Chunk #9 received at 3358ms, length: 140 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 26, content length: 26 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " practices. I'll structure", …}Object
[Log] [handleStreamChunk] Text to append: – " practices. I'll structure" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 9, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 9, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 101}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 75, appendLength: 26, newLength: 101} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 75, newLength: 101, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 75, newLength: 101, delta: 26}Object
[Log] [Stream] Chunk #10 received at 3369ms, length: 98 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 5, content length: 5 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " this", …}Object
[Log] [handleStreamChunk] Text to append: – " this" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 10, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 10, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 106}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 101, appendLength: 5, newLength: 106} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 101, newLength: 106, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 101, newLength: 106, delta: 5}Object
[Log] [Stream] Chunk #11 received at 3380ms, length: 106 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 9, content length: 9 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " systemat", …}Object
[Log] [handleStreamChunk] Text to append: – " systemat" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 11, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 11, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 115}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 106, appendLength: 9, newLength: 115} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 106, newLength: 115, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 106, newLength: 115, delta: 9}Object
[Log] [Stream] Chunk #12 received at 3391ms, length: 112 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 12, content length: 12 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "ically using", …}Object
[Log] [handleStreamChunk] Text to append: – "ically using" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 12, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 12, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 127}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 115, appendLength: 12, newLength: 127} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 115, newLength: 127, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 115, newLength: 127, delta: 12}Object
[Log] [Stream] Chunk #13 received at 3401ms, length: 106 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 9, content length: 9 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " parallel", …}Object
[Log] [handleStreamChunk] Text to append: – " parallel" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 13, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 13, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 136}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 127, appendLength: 9, newLength: 136} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 127, newLength: 136, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 127, newLength: 136, delta: 9}Object
[Log] [Stream] Chunk #14 received at 3412ms, length: 110 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 11, content length: 11 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " operations", …}Object
[Log] [handleStreamChunk] Text to append: – " operations" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 14, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 14, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 147}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 136, appendLength: 11, newLength: 147} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 136, newLength: 147, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 136, newLength: 147, delta: 11}Object
[Log] [Stream] Chunk #15 received at 3424ms, length: 120 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 16, content length: 16 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " for efficiency.", …}Object
[Log] [handleStreamChunk] Text to append: – " for efficiency." (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 15, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 15, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 163}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 147, appendLength: 16, newLength: 163} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 147, newLength: 163, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 147, newLength: 163, delta: 16}Object
[Log] [Stream] Chunk #16 received at 3434ms, length: 106 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 7, content length: 7 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "↵↵First", …}Object
[Log] [handleStreamChunk] Text to append: – "↵↵First" (useMessageHandlers.ts, line 658)
"

First"
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 16, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 16, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 170}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 163, appendLength: 7, newLength: 170} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 163, newLength: 170, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 163, newLength: 170, delta: 7}Object
[Log] [Stream] Chunk #17 received at 3444ms, length: 104 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 8, content length: 8 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: ", let me", …}Object
[Log] [handleStreamChunk] Text to append: – ", let me" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 17, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 17, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 178}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 170, appendLength: 8, newLength: 178} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 170, newLength: 178, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 170, newLength: 178, delta: 8}Object
[Log] [Stream] Chunk #18 received at 3456ms, length: 104 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 8, content length: 8 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " analyze", …}Object
[Log] [handleStreamChunk] Text to append: – " analyze" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 18, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 18, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 186}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 178, appendLength: 8, newLength: 186} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 178, newLength: 186, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 178, newLength: 186, delta: 8}Object
[Log] [Stream] Chunk #19 received at 3466ms, length: 112 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 12, content length: 12 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " the current", …}Object
[Log] [handleStreamChunk] Text to append: – " the current" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 19, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 19, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 198}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 186, appendLength: 12, newLength: 198} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 186, newLength: 198, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 186, newLength: 198, delta: 12}Object
[Log] [Stream] Chunk #20 received at 3479ms, length: 118 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 15, content length: 15 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " sheet and then", …}Object
[Log] [handleStreamChunk] Text to append: – " sheet and then" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 20, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 20, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 213}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 198, appendLength: 15, newLength: 213} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 198, newLength: 213, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 198, newLength: 213, delta: 15}Object
[Log] [Stream] Chunk #21 received at 3490ms, length: 134 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 23, content length: 23 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " create a comprehensive", …}Object
[Log] [handleStreamChunk] Text to append: – " create a comprehensive" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 21, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 21, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 236}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 213, appendLength: 23, newLength: 236} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 213, newLength: 236, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 213, newLength: 236, delta: 23}Object
[Log] [Stream] Chunk #22 received at 3501ms, length: 128 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 20, content length: 20 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " DCF model structure", …}Object
[Log] [handleStreamChunk] Text to append: – " DCF model structure" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 22, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 22, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 256}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 236, appendLength: 20, newLength: 256} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 236, newLength: 256, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 236, newLength: 256, delta: 20}Object
[Log] [Stream] Chunk #23 received at 3512ms, length: 90 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 1, content length: 1 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: ".", …}Object
[Log] [handleStreamChunk] Text to append: – "." (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753394058602", updateCount: 23, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753394058602", updateCount: 23, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 257}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753394058602" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "99c57b49-85b7-4f87-a753-a4303f1e2c03", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753394058602", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 256, appendLength: 1, newLength: 257} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753394058602", oldLength: 256, newLength: 257, …} (useChatManager.ts, line 80)
{messageId: "stream_1753394058602", oldLength: 256, newLength: 257, delta: 1}Object
[Log] [Stream] Chunk #24 received at 3522ms, length: 191 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_start, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_start", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_start", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] 📥 Received tool request: – {include_formatting: false, include_formulas: true, range: "A1:Z100", …} (SignalRClient.ts, line 86)
{include_formatting: false, include_formulas: true, range: "A1:Z100", request_id: "daad36d7-9fcd-4413-a8bf-fbf98a484373", tool: "read_range"}Object
[Log] [5:54:22 PM] [INFO] SignalR raw message: {"type":"tool_request","data":{"include_formatting":false,"include_formulas":true,"range":"A1:Z100","request_id":"daad36d7-9fcd-4413-a8bf-fbf98a484373","tool":"read_range"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: Object} (useMessageHandlers.ts, line 13)
{rawMessage: Object}Object
[Log] [5:54:22 PM] [INFO] ← Received tool_request: read_range (daad36d7-9fcd-4413-a8bf-fbf98a484373) (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received tool request daad36d7-9fcd-4413-a8bf-fbf98a484373 (read_range) – {parameters: Object} (useMessageHandlers.ts, line 13)
{parameters: Object}Object
[Log] [DEBUG] Full tool request received: – "{↵  \"include_formatting\": false,↵  \"include_formulas\": true,↵  \"range\": \"A1:Z100\",↵  \"request_id\": \"daad36d7-9fcd-4413-a8bf-fbf98a484373\",…" (useMessageHandlers.ts, line 198)
"{
  \"include_formatting\": false,
  \"include_formulas\": true,
  \"range\": \"A1:Z100\",
  \"request_id\": \"daad36d7-9fcd-4413-a8bf-fbf98a484373\",
  \"tool\": \"read_range\"
}"
[Log] [DEBUG] Preview field: – undefined (useMessageHandlers.ts, line 199)
[Log] [DEBUG] Current autonomy mode: – "agent-default" (useMessageHandlers.ts, line 200)
[Log] [DEBUG] Tool request parameters: – undefined (useMessageHandlers.ts, line 201)
[Log] 📤 Sending SignalR message: – {type: "tool_response", data: Object} (SignalRClient.ts, line 125)
{type: "tool_response", data: Object}Object
[Log] 📤 Sending tool response: – {request_id: "daad36d7-9fcd-4413-a8bf-fbf98a484373", has_result: true, has_error: false, …} (SignalRClient.ts, line 165)
{request_id: "daad36d7-9fcd-4413-a8bf-fbf98a484373", has_result: true, has_error: false, queued: true, has_errorDetails: false, …}Object
[Log] [Stream] Chunk #25 received at 3533ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #26 received at 3543ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #27 received at 3555ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #28 received at 3566ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [5:54:32 PM] [WARNING] Stream health check: No updates for 10491ms, possible stream stall (RefactoredChatInterface.tsx, line 57)
[Log] [5:54:33 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 386)
[Log] [5:54:33 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 57)
[Log] [Stream] Chunk #29 received at 33529ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #30 received at 33539ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #31 received at 33550ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #32 received at 33562ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #33 received at 33572ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #34 received at 33583ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #35 received at 33594ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #36 received at 33605ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #37 received at 33616ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #38 received at 33627ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #39 received at 33638ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #40 received at 33650ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #41 received at 33661ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_complete, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_complete", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_complete", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #42 received at 33672ms, length: 391 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_result, has delta: false, has content: true, delta length: 0, content length: 168 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: "tool_result", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: "tool_result", hasDelta: false, hasContent: true, deltaValue: "", …}Object
[Log] [Stream] Chunk #43 received at 33682ms, length: 73 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: undefined, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753394058602", chunkType: undefined, hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753394058602", chunkType: undefined, hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #44 received at 33693ms, length: 6 (useMessageHandlers.ts, line 584)
[Log] [Stream] Completed. Total chunks: 44, Duration: 33693ms (useMessageHandlers.ts, line 586)
[Log] [5:54:52 PM] [INFO] Streaming completed in 33710ms with 44 chunks (RefactoredChatInterface.tsx, line 57)
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [5:54:52 PM] [INFO] Tool read_range is read-only. Adding to batch queue. (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Adding read_range request to batch queue – undefined (useMessageHandlers.ts, line 13)
[Log] [5:54:52 PM] [INFO] Processing batch of 1 read requests (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Processing batch of 1 read requests – undefined (useMessageHandlers.ts, line 13)
[Log] [info] [Message Handler] Batch request: daad36d7-9fcd-4413-a8bf-fbf98a484373 for range: A1:Z100 – undefined (useMessageHandlers.ts, line 13)
[Log] [ExcelService] Batch reading 1 ranges (logging.ts, line 40)
[Log] [ExcelService] Processing range Sheet1!A1:Z100 for request daad36d7-9fcd-4413-a8bf-fbf98a484373 (logging.ts, line 40)
[Log] [5:54:52 PM] [INFO] Sending tool_response for daad36d7-9fcd-4413-a8bf-fbf98a484373 - Data size: 80 bytes (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Tool response data size: 80 bytes – {rowCount: 0, colCount: 0, cellCount: 0} (useMessageHandlers.ts, line 13)
[Log] [Message Handler] Sending final tool response: – {sessionId: "session_638889908495158730", requestId: "daad36d7-9fcd-4413-a8bf-fbf98a484373", result: Object, …} (useMessageHandlers.ts, line 27)
{sessionId: "session_638889908495158730", requestId: "daad36d7-9fcd-4413-a8bf-fbf98a484373", result: Object, error: "", errorDetails: "", …}Object
[Log] 📤 Sending SignalR message: – {type: "tool_response", data: Object} (SignalRClient.ts, line 125)
{type: "tool_response", data: Object}Object
[Log] 📤 Sending tool response: – {request_id: "daad36d7-9fcd-4413-a8bf-fbf98a484373", has_result: true, has_error: false, …} (SignalRClient.ts, line 165)
{request_id: "daad36d7-9fcd-4413-a8bf-fbf98a484373", has_result: true, has_error: false, queued: false, has_errorDetails: false, …}Object
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [5:54:52 PM] [SUCCESS] Batch processing complete for 1 requests (RefactoredChatInterface.tsx, line 57)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260)
[Log] [5:55:18 PM] [WARNING] Message 99c57b49-85b7-4f87-a753-a4303f1e2c03 timed out (RefactoredChatInterface.tsx, line 57)
[Log] [ChatManager] Adding message: – {id: "timeout_99c57b49-85b7-4f87-a753-a4303f1e2c03", type: "error", role: "system", …} (useChatManager.ts, line 29)
{id: "timeout_99c57b49-85b7-4f87-a753-a4303f1e2c03", type: "error", role: "system", isStreaming: false, contentLength: 39}Object
[Log] [ChatManager] Previous messages count: – 2 (useChatManager.ts, line 36)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260)