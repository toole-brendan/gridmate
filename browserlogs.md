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
[Log] [5:27:05 PM] [INFO] Initiating SignalR connection... (RefactoredChatInterface.tsx, line 57)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Log] [5:27:05 PM] [INFO] Initializing selection change listener... (RefactoredChatInterface.tsx, line 57)
[Log] [5:27:05 PM] [INFO] Initializing context and mentions on load... (RefactoredChatInterface.tsx, line 57)
[Error] Could not connect to the server.
[Error] Fetch API cannot load https://localhost:7171/hub/negotiate?access_token=dev-token-123&negotiateVersion=1 due to access control checks.
[Error] Failed to load resource: Could not connect to the server. (negotiate, line 0)
[Warning] [2025-07-24T21:27:05.563Z] Warning: Error from HTTP request. TypeError: Load failed. (@microsoft_signalr.js, line 296)
[Error] [2025-07-24T21:27:05.563Z] Error: Failed to complete negotiation with the server: TypeError: Load failed
	log (@microsoft_signalr.js:293)
	(anonymous function) (@microsoft_signalr.js:2343)
[Error] [2025-07-24T21:27:05.563Z] Error: Failed to start the connection: Error: Failed to complete negotiation with the server: TypeError: Load failed
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
[Log] [5:27:05 PM] [ERROR] SignalR error: Failed to complete negotiation with the server: TypeError: Load failed - undefined (RefactoredChatInterface.tsx, line 57)
[Log] 🔄 Attempting reconnect 1/10 in 5000ms... (SignalRClient.ts, line 43)
[Log] [5:27:06 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 57)
[Log] [5:27:06 PM] [SUCCESS] Selection change listener registered. (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 386, x2)
[Log] [5:27:06 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 57)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Info] [2025-07-24T21:27:10.682Z] Information: WebSocket connected to wss://localhost:7171/hub?access_token=dev-token-123&id=wGfFbXy734ydaE_FFZn8aw. (@microsoft_signalr.js, line 299)
[Info] [2025-07-24T21:27:10.683Z] Information: Using HubProtocol 'json'. (@microsoft_signalr.js, line 299)
[Log] ✅ SignalR connected successfully! (SignalRClient.ts, line 33)
[Log] ✅ Connection state: – "Connected" (SignalRClient.ts, line 34)
[Log] [5:27:10 PM] [SUCCESS] SignalR connected successfully (RefactoredChatInterface.tsx, line 57)
[Log] 📥 Received connected event: – {connectionId: "i9mhohBzDHORM0c9SNS1zg", timestamp: "2025-07-24T21:27:10.687974Z"} (SignalRClient.ts, line 67)
[Log] [5:27:10 PM] [INFO] SignalR raw message: {"type":"notification","data":{"connectionId":"i9mhohBzDHORM0c9SNS1zg","timestamp":"2025-07-24T21:27:10.687974Z"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: {type: "notification", data: {connectionId: "i9mhohBzDHORM0c9SNS1zg", timestamp: "2025-07-24T21:27:10.687974Z"}}} (useMessageHandlers.ts, line 13)
[Log] [5:27:10 PM] [INFO] Backend connected. Connection ID: i9mhohBzDHORM0c9SNS1zg (RefactoredChatInterface.tsx, line 57)
[Log] 🔐 Authenticating after connection... (SignalRClient.ts, line 69)
[Log] 📥 Received authSuccess: – {sessionId: "session_638889892307001200", userId: "user_dev-token-123", timestamp: "2025-07-24T21:27:10.700799Z"} (SignalRClient.ts, line 75)
[Log] [5:27:10 PM] [SUCCESS] SignalR authenticated successfully. Session: session_638889892307001200 (RefactoredChatInterface.tsx, line 57)
[Log] [5:27:10 PM] [INFO] SignalR raw message: {"type":"auth_success","data":{"sessionId":"session_638889892307001200","userId":"user_dev-token-123","timestamp":"2025-07-24T21:27:10.700799Z"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: {type: "auth_success", data: {sessionId: "session_638889892307001200", userId: "user_dev-token-123", timestamp: "2025-07-24T21:27:10.700799Z"}}} (useMessageHandlers.ts, line 13)
[Log] [5:27:10 PM] [SUCCESS] Authentication successful. Session ID: session_638889892307001200 (RefactoredChatInterface.tsx, line 57)
[Log] 🔐 Authentication request sent (SignalRClient.ts, line 112)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260)
[Log] [ChatManager] Adding message: – {id: "67c85571-edad-4ef3-a0d4-04659f104283", type: "user", role: "user", …} (useChatManager.ts, line 29)
{id: "67c85571-edad-4ef3-a0d4-04659f104283", type: "user", role: "user", isStreaming: false, contentLength: 50}Object
[Log] [ChatManager] Previous messages count: – 0 (useChatManager.ts, line 36)
[Log] [5:28:11 PM] [INFO] User message sent: 67c85571-edad-4ef3-a0d4-04659f104283 - All state reset (RefactoredChatInterface.tsx, line 57)
[Log] 🌊 Starting streaming chat via SignalR (SignalRClient.ts, line 281)
[Log] [ChatManager] Adding message: – {id: "stream_1753392491672", type: "chat", role: "assistant", …} (useChatManager.ts, line 29)
{id: "stream_1753392491672", type: "chat", role: "assistant", isStreaming: true, contentLength: 0}Object
[Log] [ChatManager] Previous messages count: – 1 (useChatManager.ts, line 36)
[Log] [Stream] Chunk #1 received at 6142ms, length: 90 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 1, content length: 1 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "I", …}Object
[Log] [handleStreamChunk] Text to append: – "I" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 1, totalContent: "I...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 1, totalContent: "I...", totalLength: 1}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: ""}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 0, appendLength: 1, newLength: 1} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 0, newLength: 1, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 0, newLength: 1, delta: 1}Object
[Log] [Stream] Chunk #2 received at 6145ms, length: 148 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 30, content length: 30 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "'ll help create a professional", …}Object
[Log] [handleStreamChunk] Text to append: – "'ll help create a professional" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 2, totalContent: "I'll help create a professional...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 2, totalContent: "I'll help create a professional...", totalLength: 31}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 1, appendLength: 30, newLength: 31} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 1, newLength: 31, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 1, newLength: 31, delta: 30}Object
[Log] [Stream] Chunk #3 received at 6153ms, length: 118 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 15, content length: 15 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " DCF (Discounte", …}Object
[Log] [handleStreamChunk] Text to append: – " DCF (Discounte" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 3, totalContent: "I'll help create a professional DCF (Discounte...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 3, totalContent: "I'll help create a professional DCF (Discounte...", totalLength: 46}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 31, appendLength: 15, newLength: 46} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 31, newLength: 46, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 31, newLength: 46, delta: 15}Object
[Log] [Stream] Chunk #4 received at 6164ms, length: 134 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 23, content length: 23 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "d Cash Flow) model with", …}Object
[Log] [handleStreamChunk] Text to append: – "d Cash Flow) model with" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 4, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 4, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 69}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounte"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 46, appendLength: 23, newLength: 69} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 46, newLength: 69, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 46, newLength: 69, delta: 23}Object
[Log] [Stream] Chunk #5 received at 6176ms, length: 160 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 36, content length: 36 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " a proper structure using mock data.", …}Object
[Log] [handleStreamChunk] Text to append: – " a proper structure using mock data." (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 5, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 5, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 105}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 69, appendLength: 36, newLength: 105} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 69, newLength: 105, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 69, newLength: 105, delta: 36}Object
[Log] [Stream] Chunk #6 received at 6187ms, length: 132 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 22, content length: 22 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " I'll use the organize", …}Object
[Log] [handleStreamChunk] Text to append: – " I'll use the organize" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 6, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 6, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 127}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 105, appendLength: 22, newLength: 127} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 105, newLength: 127, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 105, newLength: 127, delta: 22}Object
[Log] [Stream] Chunk #7 received at 6198ms, length: 142 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 27, content length: 27 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: "_financial_model tool first", …}Object
[Log] [handleStreamChunk] Text to append: – "_financial_model tool first" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 7, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 7, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 154}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 127, appendLength: 27, newLength: 154} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 127, newLength: 154, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 127, newLength: 154, delta: 27}Object
[Log] [Stream] Chunk #8 received at 6208ms, length: 136 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 24, content length: 24 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " to set up the structure", …}Object
[Log] [handleStreamChunk] Text to append: – " to set up the structure" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 8, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 8, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 178}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 154, appendLength: 24, newLength: 178} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 154, newLength: 178, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 154, newLength: 178, delta: 24}Object
[Log] [Stream] Chunk #9 received at 6219ms, length: 130 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 21, content length: 21 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: ", then build out each", …}Object
[Log] [handleStreamChunk] Text to append: – ", then build out each" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 9, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 9, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 199}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 178, appendLength: 21, newLength: 199} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 178, newLength: 199, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 178, newLength: 199, delta: 21}Object
[Log] [Stream] Chunk #10 received at 6230ms, length: 154 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 31, content length: 31 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " section systematically.↵↵Let's", …}Object
[Log] [handleStreamChunk] Text to append: – " section systematically.↵↵Let's" (useMessageHandlers.ts, line 658)
" section systematically.

Let's"
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 10, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 10, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 230}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 199, appendLength: 31, newLength: 230} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 199, newLength: 230, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 199, newLength: 230, delta: 31}Object
[Log] [Stream] Chunk #11 received at 6241ms, length: 148 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 30, content length: 30 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " start by organizing the model", …}Object
[Log] [handleStreamChunk] Text to append: – " start by organizing the model" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 11, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 11, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 260}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 230, appendLength: 30, newLength: 260} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 230, newLength: 260, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 230, newLength: 260, delta: 30}Object
[Log] [Stream] Chunk #12 received at 6252ms, length: 110 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: text, has delta: true, has content: true, delta length: 11, content length: 11 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "text", hasDelta: true, hasContent: true, deltaValue: " structure:", …}Object
[Log] [handleStreamChunk] Text to append: – " structure:" (useMessageHandlers.ts, line 658)
[Log] [handleStreamChunk] Update tracking: – {messageId: "stream_1753392491672", updateCount: 12, totalContent: "I'll help create a professional DCF (Discounted Ca...", …} (useMessageHandlers.ts, line 664)
{messageId: "stream_1753392491672", updateCount: 12, totalContent: "I'll help create a professional DCF (Discounted Ca...", totalLength: 271}Object
[Log] [ChatManager] Updating streaming message: – "stream_1753392491672" (useChatManager.ts, line 72)
[Log] [ChatManager] Current messages: – [{id: "67c85571-edad-4ef3-a0d4-04659f104283", content: "Please make DCF model in this sheet, use mock data"}, {id: "stream_1753392491672", content: "I'll help create a professional DCF (Discounted Ca"}] (2) (useChatManager.ts, line 73)
[Log] [handleStreamChunk] Updating content: – {prevLength: 260, appendLength: 11, newLength: 271} (useMessageHandlers.ts, line 674)
[Log] [ChatManager] Content update: – {messageId: "stream_1753392491672", oldLength: 260, newLength: 271, …} (useChatManager.ts, line 80)
{messageId: "stream_1753392491672", oldLength: 260, newLength: 271, delta: 11}Object
[Log] [Stream] Chunk #13 received at 6262ms, length: 191 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_start, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_start", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_start", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #14 received at 6273ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #15 received at 6284ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #16 received at 6295ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #17 received at 6306ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #18 received at 6317ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #19 received at 6328ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] 📥 Received tool request: – {include_formatting: false, include_formulas: true, range: "A1:Z100", …} (SignalRClient.ts, line 86)
{include_formatting: false, include_formulas: true, range: "A1:Z100", request_id: "2de66fca-0b62-4935-a3b6-0baa0891d319", tool: "read_range"}Object
[Log] [5:28:18 PM] [INFO] SignalR raw message: {"type":"tool_request","data":{"include_formatting":false,"include_formulas":true,"range":"A1:Z100","request_id":"2de66fca-0b62-4935-a3b6-0baa0891d319","tool":"read_range"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – {rawMessage: Object} (useMessageHandlers.ts, line 13)
{rawMessage: Object}Object
[Log] [5:28:18 PM] [INFO] ← Received tool_request: read_range (2de66fca-0b62-4935-a3b6-0baa0891d319) (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received tool request 2de66fca-0b62-4935-a3b6-0baa0891d319 (read_range) – {parameters: Object} (useMessageHandlers.ts, line 13)
{parameters: Object}Object
[Log] [DEBUG] Full tool request received: – "{↵  \"include_formatting\": false,↵  \"include_formulas\": true,↵  \"range\": \"A1:Z100\",↵  \"request_id\": \"2de66fca-0b62-4935-a3b6-0baa0891d319\",…" (useMessageHandlers.ts, line 198)
"{
  \"include_formatting\": false,
  \"include_formulas\": true,
  \"range\": \"A1:Z100\",
  \"request_id\": \"2de66fca-0b62-4935-a3b6-0baa0891d319\",
  \"tool\": \"read_range\"
}"
[Log] [DEBUG] Preview field: – undefined (useMessageHandlers.ts, line 199)
[Log] [DEBUG] Current autonomy mode: – "agent-default" (useMessageHandlers.ts, line 200)
[Log] [DEBUG] Tool request parameters: – undefined (useMessageHandlers.ts, line 201)
[Log] 📤 Sending SignalR message: – {type: "tool_response", data: Object} (SignalRClient.ts, line 125)
{type: "tool_response", data: Object}Object
[Log] 📤 Sending tool response: – {request_id: "2de66fca-0b62-4935-a3b6-0baa0891d319", has_result: true, has_error: false, …} (SignalRClient.ts, line 165)
{request_id: "2de66fca-0b62-4935-a3b6-0baa0891d319", has_result: true, has_error: false, queued: true, has_errorDetails: false, …}Object
[Log] [Stream] Chunk #20 received at 6347ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #21 received at 6357ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #22 received at 6367ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [5:28:29 PM] [WARNING] Stream health check: No updates for 11754ms, possible stream stall (RefactoredChatInterface.tsx, line 57)
[Log] [5:28:30 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 386)
[Log] [5:28:30 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 57)
[Log] [Stream] Chunk #23 received at 36338ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #24 received at 36348ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #25 received at 36359ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #26 received at 36371ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #27 received at 36382ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #28 received at 36393ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #29 received at 36404ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_progress, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_progress", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #30 received at 36414ms, length: 194 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_complete, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_complete", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_complete", hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #31 received at 36425ms, length: 391 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: tool_result, has delta: false, has content: true, delta length: 0, content length: 168 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: "tool_result", hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: "tool_result", hasDelta: false, hasContent: true, deltaValue: "", …}Object
[Log] [Stream] Chunk #32 received at 36436ms, length: 73 (useMessageHandlers.ts, line 584)
[Log] [Stream] Chunk type: undefined, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 599)
[Log] [handleStreamChunk] Processing chunk: – {messageId: "stream_1753392491672", chunkType: undefined, hasDelta: false, …} (useMessageHandlers.ts, line 646)
{messageId: "stream_1753392491672", chunkType: undefined, hasDelta: false, hasContent: false, deltaValue: "", …}Object
[Log] [Stream] Chunk #33 received at 36446ms, length: 6 (useMessageHandlers.ts, line 584)
[Log] [Stream] Completed. Total chunks: 33, Duration: 36446ms (useMessageHandlers.ts, line 586)
[Log] [5:28:48 PM] [INFO] Streaming completed in 36459ms with 33 chunks (RefactoredChatInterface.tsx, line 57)
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [5:28:48 PM] [INFO] Tool read_range is read-only. Adding to batch queue. (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Adding read_range request to batch queue – undefined (useMessageHandlers.ts, line 13)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260)
[Log] [5:28:48 PM] [INFO] Processing batch of 1 read requests (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Processing batch of 1 read requests – undefined (useMessageHandlers.ts, line 13)
[Log] [info] [Message Handler] Batch request: 2de66fca-0b62-4935-a3b6-0baa0891d319 for range: A1:Z100 – undefined (useMessageHandlers.ts, line 13)
[Log] [ExcelService] Batch reading 1 ranges (logging.ts, line 40)
[Log] [ExcelService] Processing range Sheet1!A1:Z100 for request 2de66fca-0b62-4935-a3b6-0baa0891d319 (logging.ts, line 40)
[Log] [5:28:48 PM] [INFO] Sending tool_response for 2de66fca-0b62-4935-a3b6-0baa0891d319 - Data size: 80 bytes (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Tool response data size: 80 bytes – {rowCount: 0, colCount: 0, cellCount: 0} (useMessageHandlers.ts, line 13)
[Log] [Message Handler] Sending final tool response: – {sessionId: "session_638889892307001200", requestId: "2de66fca-0b62-4935-a3b6-0baa0891d319", result: Object, …} (useMessageHandlers.ts, line 27)
{sessionId: "session_638889892307001200", requestId: "2de66fca-0b62-4935-a3b6-0baa0891d319", result: Object, error: "", errorDetails: "", …}Object
[Log] 📤 Sending SignalR message: – {type: "tool_response", data: Object} (SignalRClient.ts, line 125)
{type: "tool_response", data: Object}Object
[Log] 📤 Sending tool response: – {request_id: "2de66fca-0b62-4935-a3b6-0baa0891d319", has_result: true, has_error: false, …} (SignalRClient.ts, line 165)
{request_id: "2de66fca-0b62-4935-a3b6-0baa0891d319", has_result: true, has_error: false, queued: false, has_errorDetails: false, …}Object
[Log] ✅ Tool response sent successfully (SignalRClient.ts, line 182)
[Log] ✅ Message sent successfully (SignalRClient.ts, line 199)
[Log] [5:28:48 PM] [SUCCESS] Batch processing complete for 1 requests (RefactoredChatInterface.tsx, line 57)
[Log] [5:29:11 PM] [WARNING] Message 67c85571-edad-4ef3-a0d4-04659f104283 timed out (RefactoredChatInterface.tsx, line 57)
[Log] [ChatManager] Adding message: – {id: "timeout_67c85571-edad-4ef3-a0d4-04659f104283", type: "error", role: "system", …} (useChatManager.ts, line 29)
{id: "timeout_67c85571-edad-4ef3-a0d4-04659f104283", type: "error", role: "system", isStreaming: false, contentLength: 39}Object
[Log] [ChatManager] Previous messages count: – 2 (useChatManager.ts, line 36)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260)