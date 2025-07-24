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
[Log] [11:38:16 AM] [INFO] Initiating SignalR connection... (RefactoredChatInterface.tsx, line 56)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Log] [11:38:16 AM] [INFO] Initializing selection change listener... (RefactoredChatInterface.tsx, line 56)
[Log] [11:38:16 AM] [INFO] Initializing context and mentions on load... (RefactoredChatInterface.tsx, line 56)
[Error] Could not connect to the server.
[Error] Fetch API cannot load https://localhost:7171/hub/negotiate?access_token=dev-token-123&negotiateVersion=1 due to access control checks.
[Error] Failed to load resource: Could not connect to the server. (negotiate, line 0)
[Warning] [2025-07-24T15:38:16.868Z] Warning: Error from HTTP request. TypeError: Load failed. (@microsoft_signalr.js, line 296)
[Error] [2025-07-24T15:38:16.868Z] Error: Failed to complete negotiation with the server: TypeError: Load failed
	log (@microsoft_signalr.js:293)
	(anonymous function) (@microsoft_signalr.js:2343)
[Error] [2025-07-24T15:38:16.868Z] Error: Failed to start the connection: Error: Failed to complete negotiation with the server: TypeError: Load failed
	log (@microsoft_signalr.js:293)
	(anonymous function) (@microsoft_signalr.js:2305)
[Error] Failed to create SignalR connection: – Error: Failed to complete negotiation with the server: TypeError: Load failed
Error: Failed to complete negotiation with the server: TypeError: Load failed
	(anonymous function) (SignalRClient.ts:39)
[Error] SignalR error: – Error: Failed to complete negotiation with the server: TypeError: Load failed
Error: Failed to complete negotiation with the server: TypeError: Load failed
	(anonymous function) (useSignalRManager.ts:51)
	emit (events.js:103)
	(anonymous function) (SignalRClient.ts:40)
[Log] [11:38:16 AM] [ERROR] SignalR error: Failed to complete negotiation with the server: TypeError: Load failed - undefined (RefactoredChatInterface.tsx, line 56)
[Log] 🔄 Attempting reconnect 1/10 in 5000ms... (SignalRClient.ts, line 43)
[Log] [11:38:16 AM] [SUCCESS] Selection change listener registered. (RefactoredChatInterface.tsx, line 56)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 384)
[Log] [11:38:17 AM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 56)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 384)
[Log] [11:38:17 AM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 56)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Info] [2025-07-24T15:38:22.002Z] Information: WebSocket connected to wss://localhost:7171/hub?access_token=dev-token-123&id=Y5Gv1gjrkgZk5mPnHQ8JuA. (@microsoft_signalr.js, line 299)
[Info] [2025-07-24T15:38:22.002Z] Information: Using HubProtocol 'json'. (@microsoft_signalr.js, line 299)
[Log] ✅ SignalR connected successfully! (SignalRClient.ts, line 33)
[Log] ✅ Connection state: – "Connected" (SignalRClient.ts, line 34)
[Log] [11:38:22 AM] [SUCCESS] SignalR connected successfully (RefactoredChatInterface.tsx, line 56)
[Log] 📥 Received connected event: – Object (SignalRClient.ts, line 67)
Object
[Log] [11:38:22 AM] [INFO] SignalR raw message: {"type":"notification","data":{"connectionId":"MVyJzojD0SZsTylLRGWQ-A","timestamp":"2025-07-24T15:38:22.006419Z"}} (RefactoredChatInterface.tsx, line 56)
[Log] [info] [Message Handler] Received raw SignalR message – Object (useMessageHandlers.ts, line 13)
Object
[Log] [11:38:22 AM] [INFO] Backend connected. Connection ID: MVyJzojD0SZsTylLRGWQ-A (RefactoredChatInterface.tsx, line 56)
[Log] 🔐 Authenticating after connection... (SignalRClient.ts, line 69)
[Log] 📥 Received authSuccess: – Object (SignalRClient.ts, line 75)
Object
[Log] [11:38:22 AM] [SUCCESS] SignalR authenticated successfully. Session: session_638889683020138520 (RefactoredChatInterface.tsx, line 56)
[Log] [11:38:22 AM] [INFO] SignalR raw message: {"type":"auth_success","data":{"sessionId":"session_638889683020138520","userId":"user_dev-token-123","timestamp":"2025-07-24T15:38:22.014582Z"}} (RefactoredChatInterface.tsx, line 56)
[Log] [info] [Message Handler] Received raw SignalR message – Object (useMessageHandlers.ts, line 13)
Object
[Log] [11:38:22 AM] [SUCCESS] Authentication successful. Session ID: session_638889683020138520 (RefactoredChatInterface.tsx, line 56)
[Log] 🔐 Authentication request sent (SignalRClient.ts, line 112)
[Log] 🌊 Starting streaming chat via SignalR (SignalRClient.ts, line 281)
[Log] [11:38:35 AM] [INFO] Streaming completed (RefactoredChatInterface.tsx, line 56)
[Log] [11:38:36 AM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 56)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 384)
[Log] [11:38:36 AM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 56)
[Log] 💓 Heartbeat sent (SignalRClient.ts, line 260, x3)