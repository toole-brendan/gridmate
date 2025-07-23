Last login: Wed Jul 23 15:42:00 on ttys269
cd '/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https
brendantoole@Brendans-MacBook-Pro ~ % cd '/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https
--- .NET SignalR Service ---
Using launch settings from /Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR/Properties/launchSettings.json...
Building...
info: GridmateSignalR.Services.SessionCleanupService[0]
      SessionCleanupService started
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: https://localhost:7171
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5252
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
info: Microsoft.Hosting.Lifetime[0]
      Content root path: /Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR
info: GridmateSignalR.Hubs.GridmateHub[0]
      Client connected: IeEv2XfUaJS9-9G-n_WU-A
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: IeEv2XfUaJS9-9G-n_WU-A
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638888785749667170
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638888785749667170","messageId":"79ea4afe-e654-4a61-874f-7f0fa49eeea7","content":"Please make DCF model in this sheet, use mock data","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A1","selectedData":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"visibleRangeData":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1","data":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"lastRow":1,"lastColumn":1}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":1},"activeContext":[{"type":"selection","value":"Sheet1!A1"}]},"autonomyMode":"agent-default","timestamp":"2025-07-23T14:43:01.682506Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 19570435-c410-4741-acb6-7a9aff062e8d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3.6474ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 10.6913ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 30a6695e-2ea8-4a1d-961f-d03ea405e315
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5295ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.564ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 89b09bda-c1b8-492c-8021-a3d77a3f3004
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2393ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2588ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 19570435-c410-4741-acb6-7a9aff062e8d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4714ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5313ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 30a6695e-2ea8-4a1d-961f-d03ea405e315
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2972ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3258ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 89b09bda-c1b8-492c-8021-a3d77a3f3004
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3066ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3433ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c38e9f5a-862c-4646-ae2b-102cfd1b87f6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 2.3737ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 2.5601ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0ead3209-9f81-481b-971a-7210eda3f55c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.7155ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.8671ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d4116f4d-7db0-4fc2-8a4d-6f9b84f79330
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0542ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.15ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9bb8d118-d80d-449e-91a2-5e0ae44d0b35
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.991ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0712ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d6739442-d6c1-454b-812e-832ca4295ed5
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8055ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.91ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 11abc22e-e9f2-44b7-94fe-83075a0b682a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8599ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9445ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 9440.3322ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 9443.3488ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c38e9f5a-862c-4646-ae2b-102cfd1b87f6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6125ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6739ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9bb8d118-d80d-449e-91a2-5e0ae44d0b35
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5814ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6437ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0ead3209-9f81-481b-971a-7210eda3f55c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.3594ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.5087ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d4116f4d-7db0-4fc2-8a4d-6f9b84f79330
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1873ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3284ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d6739442-d6c1-454b-812e-832ca4295ed5
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9934ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0492ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 11abc22e-e9f2-44b7-94fe-83075a0b682a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0267ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0806ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638888785749667170
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638888785749667170","messageId":"c4532e87-cca5-4505-a949-338f3f37bec1","content":"please flesh out mock model some more","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A3:H3","selectedData":{"values":[["","2023A","2024E","2025E","2026E","2027E","2028E","Terminal"]],"formulas":[["","2023A","2024E","2025E","2026E","2027E","2028E","Terminal"]],"address":"Sheet1!A3:H3","rowCount":1,"colCount":8},"visibleRangeData":{"values":[["Discounted Cash Flow Model","","","","","","",""],["","","","","","","",""],["","2023A","2024E","2025E","2026E","2027E","2028E","Terminal"]],"formulas":[["Discounted Cash Flow Model","","","","","","",""],["","","","","","","",""],["","2023A","2024E","2025E","2026E","2027E","2028E","Terminal"]],"address":"Sheet1!A1:H3","rowCount":3,"colCount":8},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1","data":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"lastRow":1,"lastColumn":1}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":1},"activeContext":[{"type":"selection","value":"Sheet1!A3:H3"},{"type":"edit","value":"A1"},{"type":"edit","value":"A3:H3"}]},"autonomyMode":"agent-default","timestamp":"2025-07-23T14:43:28.52696Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7a3d3ea3-e9fd-4eea-8913-5b293342a36c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8548ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9312ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 526f1eef-3fb6-47ce-8a7b-6a3a72caf8e1
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7378ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8361ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7a3d3ea3-e9fd-4eea-8913-5b293342a36c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2448ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3649ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 526f1eef-3fb6-47ce-8a7b-6a3a72caf8e1
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.471ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5127ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 79462be2-fe41-4268-86d7-248a6e470284
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0058ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.176ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 95aa3cff-a9b9-4a5c-831c-815a25f05547
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2371ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3122ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 52a69b8d-b8d6-45d2-be0e-e1f445ccd707
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6541ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7205ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 5011.9007ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 5011.9447ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 79462be2-fe41-4268-86d7-248a6e470284
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5653ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6121ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 95aa3cff-a9b9-4a5c-831c-815a25f05547
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1063ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.204ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 52a69b8d-b8d6-45d2-be0e-e1f445ccd707
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.254ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3437ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638888785749667170
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638888785749667170","messageId":"d72f7273-413a-4968-9ca8-eaf958bf31c7","content":"even more please","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A1:K1","selectedData":{"values":[["Discounted Cash Flow Valuation Model","","","","","","","","","",""]],"formulas":[["Discounted Cash Flow Valuation Model","","","","","","","","","",""]],"address":"Sheet1!A1:K1","rowCount":1,"colCount":11},"visibleRangeData":{"values":[["Discounted Cash Flow Valuation Model","","","","","","","","","",""],["","","","","","","","","","",""],["","2023A","2024E","2025E","2026E","2027E","2028E","Terminal","","",""]],"formulas":[["Discounted Cash Flow Valuation Model","","","","","","","","","",""],["","","","","","","","","","",""],["","2023A","2024E","2025E","2026E","2027E","2028E","Terminal","","",""]],"address":"Sheet1!A1:K3","rowCount":3,"colCount":11},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1:K3","data":{"values":[["Discounted Cash Flow Valuation Model","","","","","","","","","",""],["","","","","","","","","","",""],["","2023A","2024E","2025E","2026E","2027E","2028E","Terminal","","",""]],"formulas":[["Discounted Cash Flow Valuation Model","","","","","","","","","",""],["","","","","","","","","","",""],["","2023A","2024E","2025E","2026E","2027E","2028E","Terminal","","",""]],"address":"Sheet1!A1:K3","rowCount":3,"colCount":11},"lastRow":3,"lastColumn":11}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":33},"activeContext":[{"type":"selection","value":"Sheet1!A1:K1"},{"type":"edit","value":"A1"},{"type":"edit","value":"A3:H3"},{"type":"edit","value":"A1"}]},"autonomyMode":"agent-default","timestamp":"2025-07-23T14:43:42.051643Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0260a84e-670d-40b9-bc5f-e98505ccc655
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7326ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8132ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c559e7b7-30f6-42b6-a1cb-4f6164c72f88
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3131ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3405ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0260a84e-670d-40b9-bc5f-e98505ccc655
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6514ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7145ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c559e7b7-30f6-42b6-a1cb-4f6164c72f88
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3722ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3965ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9c3e1460-6621-4bf3-8dd6-b35331f95130
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 2.0534ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 2.3039ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 35c93aac-3947-4f14-a0ab-829d851de17d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2203ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3838ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c9abb0dc-6de3-47c5-8976-cd4a76c212c7
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6678ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7245ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9c3e1460-6621-4bf3-8dd6-b35331f95130
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6887ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7446ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 35c93aac-3947-4f14-a0ab-829d851de17d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4608ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.497ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c9abb0dc-6de3-47c5-8976-cd4a76c212c7
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4745ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5062ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3130.6919ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3130.7307ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK

