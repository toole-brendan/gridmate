[Debug] [vite] connecting... (client, line 495)
[Debug] [vite] connected. (client, line 618)
[Log] 🚀 app.tsx loaded (app.tsx, line 22)
[Log] 🔍 Office object: – "Available" (app.tsx, line 23)
[Log] 🔍 Document ready state: – "interactive" (app.tsx, line 24)
[Log] 📌 Office is defined, calling Office.onReady (app.tsx, line 39)
[Log] ✅ Office.onReady fired! – Object (app.tsx, line 41)
Object
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
[Log] [ExcelService] Creating new instance (ExcelService.ts, line 29)
[Log] [ExcelService] Excel object is available (ExcelService.ts, line 33)
[Log] [8:34:29 AM] [INFO] Initiating SignalR connection... (RefactoredChatInterface.tsx, line 57)
[Log] 🔌 Creating SignalR connection to: https://localhost:7171/hub?access_token=dev-token-123 (SignalRClient.ts, line 19)
[Log] [8:34:29 AM] [INFO] Initializing selection change listener... (RefactoredChatInterface.tsx, line 57)
[Log] [8:34:29 AM] [INFO] Initializing context and mentions on load... (RefactoredChatInterface.tsx, line 57)
[Log] [8:34:29 AM] [SUCCESS] Selection change listener registered. (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 385)
[Info] [2025-07-25T12:34:29.405Z] Information: WebSocket connected to wss://localhost:7171/hub?access_token=dev-token-123&id=HVa5kf4oo4rNqNS8_z2WEw. (@microsoft_signalr.js, line 299)
[Info] [2025-07-25T12:34:29.405Z] Information: Using HubProtocol 'json'. (@microsoft_signalr.js, line 299)
[Log] ✅ SignalR connected successfully! (SignalRClient.ts, line 33)
[Log] ✅ Connection state: – "Connected" (SignalRClient.ts, line 34)
[Log] [8:34:29 AM] [SUCCESS] SignalR connected successfully (RefactoredChatInterface.tsx, line 57)
[Log] 📥 Received connected event: – Object (SignalRClient.ts, line 67)
Object
[Log] [8:34:29 AM] [INFO] SignalR raw message: {"type":"notification","data":{"connectionId":"bKPfqes0Ow8YfTg9-EnwPg","timestamp":"2025-07-25T12:34:29.409799Z"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – Object (useMessageHandlers.ts, line 13)
Object
[Log] [8:34:29 AM] [INFO] Backend connected. Connection ID: bKPfqes0Ow8YfTg9-EnwPg (RefactoredChatInterface.tsx, line 57)
[Log] 🔐 Authenticating after connection... (SignalRClient.ts, line 69)
[Log] 📥 Received authSuccess: – Object (SignalRClient.ts, line 75)
Object
[Log] [8:34:29 AM] [SUCCESS] SignalR authenticated successfully. Session: session_638890436694157830 (RefactoredChatInterface.tsx, line 57)
[Log] [8:34:29 AM] [INFO] SignalR raw message: {"type":"auth_success","data":{"sessionId":"session_638890436694157830","userId":"user_dev-token-123","timestamp":"2025-07-25T12:34:29.416479Z"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – Object (useMessageHandlers.ts, line 13)
Object
[Log] [8:34:29 AM] [SUCCESS] Authentication successful. Session ID: session_638890436694157830 (RefactoredChatInterface.tsx, line 57)
[Log] 🔐 Authentication request sent (SignalRClient.ts, line 112)
[Log] [8:34:29 AM] [INFO] Updating available mentions... (RefactoredChatInterface.tsx, line 57)
[Log] [Context] Merge detection currently disabled - using placeholder implementation (ExcelService.ts, line 385)
[Log] [8:34:29 AM] [INFO] Tracked user selection: Sheet1!A1 (RefactoredChatInterface.tsx, line 57)
[Log] [ChatManager] Adding message: – Object (useChatManager.ts, line 29)
Object
[Log] [ChatManager] Previous messages count: – 0 (useChatManager.ts, line 36)
[Log] [8:34:36 AM] [INFO] User message sent: 32b7ab2d-55d0-4160-83d4-216d72069ecf - All state reset (RefactoredChatInterface.tsx, line 57)
[Log] [sendStreamingMessage] Called with: – Object (useMessageHandlers.ts, line 605)
Object
[Log] [sendStreamingMessage] Creating streaming message: – Object (useMessageHandlers.ts, line 623)
Object
[Log] [sendStreamingMessage] Adding message to chat manager (useMessageHandlers.ts, line 636)
[Log] [sendStreamingMessage] Setting up streaming handlers (useMessageHandlers.ts, line 676)
[Log] [sendStreamingMessage] Starting stream via SignalR (useMessageHandlers.ts, line 766)
[Log] 🌊 Starting streaming chat via SignalR (SignalRClient.ts, line 281)
[Log] [ChatManager] Adding message: – Object (useChatManager.ts, line 29)
Object
[Log] [ChatManager] Previous messages count: – 1 (useChatManager.ts, line 36)
[Log] [StreamingMessage stream_1753446876973] Mounting component – Object (StreamingMessage.tsx, line 31)
Object
[Log] [ChunkedRenderer 7koz8l] Created – Object (ChunkedRenderer.ts, line 16)
Object
[Log] [StreamingMessage stream_1753446876973] ChunkedRenderer created – Object (StreamingMessage.tsx, line 31)
Object
[Log] [StreamingMessage stream_1753446876973] Processing chunks – Object (StreamingMessage.tsx, line 31)
Object
[Log] [StreamingMessage stream_1753446876973] Message ID changed - resetting content – Object (StreamingMessage.tsx, line 31)
Object
[Log] 📥 Received tool request: – Object (SignalRClient.ts, line 86)
Object
[Log] [8:34:37 AM] [INFO] SignalR raw message: {"type":"tool_request","data":{"include_formatting":false,"include_formulas":false,"range":"A1:AZ1000","request_id":"f939379a-07e1-42e0-a2d8-f2ec7891415e","tool":"read_range"}} (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received raw SignalR message – Object (useMessageHandlers.ts, line 13)
Object
[Log] [8:34:37 AM] [INFO] ← Received tool_request: read_range (f939379a-07e1-42e0-a2d8-f2ec7891415e) (RefactoredChatInterface.tsx, line 57)
[Log] [info] [Message Handler] Received tool request f939379a-07e1-42e0-a2d8-f2ec7891415e (read_range) – Object (useMessageHandlers.ts, line 13)
Object
[Log] [DEBUG] Full tool request received: – "{↵  \"include_formatting\": false,↵  \"include_formulas\": false,↵  \"range\": \"A1:AZ1000\",↵  \"request_id\"…" (useMessageHandlers.ts, line 204)
"{
  \"include_formatting\": false,
  \"include_formulas\": false,
  \"range\": \"A1:AZ1000\",
  \"request_id\": \"f939379a-07e1-42e0-a2d8-f2ec7891415e\",
  \"tool\": \"read_range\"
}"
[Log] [DEBUG] Preview field: – undefined (useMessageHandlers.ts, line 205)
[Log] [DEBUG] Current autonomy mode: – "agent-default" (useMessageHandlers.ts, line 206)
[Log] [DEBUG] Tool request parameters: – undefined (useMessageHandlers.ts, line 207)
[Log] 📤 Sending SignalR message: – Object (SignalRClient.ts, line 125)
Object
[Log] 📤 Sending tool response: – Object (SignalRClient.ts, line 165)
Object