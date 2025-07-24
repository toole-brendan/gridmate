[Debug] [vite] connecting... (client, line 495)
[Debug] [vite] connected. (client, line 618)
[Log] 🚀 app.tsx loaded (app.tsx, line 22)
[Log] 🔍 Office object: – "Available" (app.tsx, line 23)
[Log] 🔍 Document ready state: – "interactive" (app.tsx, line 24)
[Log] 📌 Office is defined, calling Office.onReady (app.tsx, line 35)
[Log] ✅ Office.onReady fired! – Object (app.tsx, line 37)
Object
[Log] 📋 Office info: – "{↵  \"host\": \"Excel\",↵  \"platform\": \"Mac\",↵  \"addin\": null↵}" (app.tsx, line 38)
"{
  \"host\": \"Excel\",
  \"platform\": \"Mac\",
  \"addin\": null
}"
[Log] 🎯 Root element: –  (app.tsx, line 41)
<div id="root">…</div>

<div id="root">…</div>
[Log] 🌳 React root created (app.tsx, line 47)
[Log] ✅ React render called (app.tsx, line 53)
[Log] 🎨 MainApp rendering (app.tsx, line 26)
[Log] 🎨 EnhancedChatInterfaceWrapper rendering with REFACTORED component (EnhancedChatInterfaceWrapper.tsx, line 19)
[Log] [ExcelService] Creating new instance (ExcelService.ts, line 28)
[Log] [ExcelService] Excel object is available (ExcelService.ts, line 32)
[Log] [1:04:19 PM] [INFO] Initiating SignalR connection... (RefactoredChatInterface.tsx, line 56)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Log] [1:04:19 PM] [INFO] Initializing selection change listener... (RefactoredChatInterface.tsx, line 56)
[Log] [1:04:19 PM] [INFO] Initializing context and mentions on load... (RefactoredChatInterface.tsx, line 56)
[Log] [1:04:19 PM] [SUCCESS] Selection change listener registered. (RefactoredChatInterface.tsx, line 56)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 384)
[Info] [2025-07-24T17:04:19.911Z] Information: WebSocket connected to wss://localhost:7171/hub?access_token=dev-token-123&id=s5h6BA_VKnL2PI2ogWDGvQ. (@microsoft_signalr.js, line 299)
[Info] [2025-07-24T17:04:19.912Z] Information: Using HubProtocol 'json'. (@microsoft_signalr.js, line 299)
[Log] ✅ SignalR connected successfully! (SignalRClient.ts, line 33)
[Log] ✅ Connection state: – "Connected" (SignalRClient.ts, line 34)
[Log] [1:04:19 PM] [SUCCESS] SignalR connected successfully (RefactoredChatInterface.tsx, line 56)
[Log] 📥 Received connected event: – Object (SignalRClient.ts, line 67)
Object
[Log] [1:04:19 PM] [INFO] SignalR raw message: {"type":"notification","data":{"connectionId":"I0_teoYibCwn3AWqOu5zBQ","timestamp":"2025-07-24T17:04:19.915628Z"}} (RefactoredChatInterface.tsx, line 56)
[Log] [info] [Message Handler] Received raw SignalR message – Object (useMessageHandlers.ts, line 14)
Object
[Log] [1:04:19 PM] [INFO] Backend connected. Connection ID: I0_teoYibCwn3AWqOu5zBQ (RefactoredChatInterface.tsx, line 56)
[Log] 🔐 Authenticating after connection... (SignalRClient.ts, line 69)
[Log] 📥 Received authSuccess: – Object (SignalRClient.ts, line 75)
Object
[Log] [1:04:19 PM] [SUCCESS] SignalR authenticated successfully. Session: session_638889734599242320 (RefactoredChatInterface.tsx, line 56)
[Log] [1:04:19 PM] [INFO] SignalR raw message: {"type":"auth_success","data":{"sessionId":"session_638889734599242320","userId":"user_dev-token-123","timestamp":"2025-07-24T17:04:19.924801Z"}} (RefactoredChatInterface.tsx, line 56)
[Log] [info] [Message Handler] Received raw SignalR message – Object (useMessageHandlers.ts, line 14)
Object
[Log] [1:04:19 PM] [SUCCESS] Authentication successful. Session ID: session_638889734599242320 (RefactoredChatInterface.tsx, line 56)
[Log] 🔐 Authentication request sent (SignalRClient.ts, line 112)
[Log] [1:04:20 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 56)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 384)
[Log] [1:04:20 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 56)
[Log] [ChatManager] Adding message: – Object (useChatManager.ts, line 27)
Object
[Log] [ChatManager] Previous messages count: – 0 (useChatManager.ts, line 34)
[Log] 🌊 Starting streaming chat via SignalR (SignalRClient.ts, line 281)
[Log] [ChatManager] Adding message: – Object (useChatManager.ts, line 27)
Object
[Log] [ChatManager] Previous messages count: – 1 (useChatManager.ts, line 34)
[Log] [Stream] Chunk #1 received at 10822ms, length: 100 (useMessageHandlers.ts, line 522)
[Log] [Stream] Chunk type: undefined, has delta: false, has content: false, delta length: 0, content length: 0 (useMessageHandlers.ts, line 532)
[Log] [handleStreamChunk] Processing chunk: – Object (useMessageHandlers.ts, line 569)
Object
[Log] [Stream] Chunk #2 received at 10822ms, length: 6 (useMessageHandlers.ts, line 522)
[Log] [Stream] Completed. Total chunks: 2, Duration: 10822ms (useMessageHandlers.ts, line 524)
[Log] [1:04:35 PM] [INFO] Streaming completed in 10834ms with 2 chunks (RefactoredChatInterface.tsx, line 56)
[Log] [1:04:36 PM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 56)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 384)
[Log] [1:04:36 PM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 56)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260)