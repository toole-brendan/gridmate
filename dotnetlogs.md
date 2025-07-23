Last login: Wed Jul 23 14:47:39 on ttys267
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
      Client connected: CDLVfo_TDyUYzLSusKwkpg
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: CDLVfo_TDyUYzLSusKwkpg
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638888759669176550
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638888759669176550","messageId":"9631bbc2-6019-4d9b-a64c-79ed4e3522b3","content":"Please make DCF model in this sheet, use mock data","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A1","selectedData":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"visibleRangeData":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1","data":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"lastRow":1,"lastColumn":1}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":1},"activeContext":[{"type":"selection","value":"Sheet1!A1"}]},"autonomyMode":"agent-default","timestamp":"2025-07-23T14:00:01.113312Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6135e48e-f249-4728-860c-16e765365113
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3.7674ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 11.4146ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f0eb1a90-b2a5-4c8a-88ce-17922d8b8920
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7121ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7513ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f3debdf1-fa0a-450e-9651-151f858a2d95
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3231ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3579ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6135e48e-f249-4728-860c-16e765365113
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6044ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.646ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f0eb1a90-b2a5-4c8a-88ce-17922d8b8920
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3399ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3722ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f3debdf1-fa0a-450e-9651-151f858a2d95
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2745ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3053ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2e7cb58b-5461-43a6-bcb2-7d7740ffc21c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 2.9518ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3.1905ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 43596db4-c508-4c1f-92e5-2537f3128a02
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0414ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1606ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 354fb142-183c-45ab-8fe7-4d91c303c3f4
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2216ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3177ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 6297.2168ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 6300.8998ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2e7cb58b-5461-43a6-bcb2-7d7740ffc21c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.4212ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.6559ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 43596db4-c508-4c1f-92e5-2537f3128a02
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1945ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3264ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 354fb142-183c-45ab-8fe7-4d91c303c3f4
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1471ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.278ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638888759669176550
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638888759669176550","messageId":"4b8cfc8b-d29a-4f6a-9fce-6693c253faa7","content":"please continue to flesh out the mock model","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A1:H1","selectedData":{"values":[["Discounted Cash Flow Model","","","","","","",""]],"formulas":[["Discounted Cash Flow Model","","","","","","",""]],"address":"Sheet1!A1:H1","rowCount":1,"colCount":8},"visibleRangeData":{"values":[["Discounted Cash Flow Model","","","","","","",""]],"formulas":[["Discounted Cash Flow Model","","","","","","",""]],"address":"Sheet1!A1:H1","rowCount":1,"colCount":8},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1","data":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"lastRow":1,"lastColumn":1}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":1},"activeContext":[{"type":"selection","value":"Sheet1!A1:H1"},{"type":"edit","value":"A1"}]},"autonomyMode":"agent-default","timestamp":"2025-07-23T14:00:28.012389Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2bbd55a3-78e3-4656-b058-aa3c0c975388
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2434ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3199ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 76588f36-2279-48fe-81d0-665a0dc46171
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.447ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.495ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2bbd55a3-78e3-4656-b058-aa3c0c975388
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7627ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8246ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 76588f36-2279-48fe-81d0-665a0dc46171
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.444ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4845ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 90b5ddb3-0e25-453e-b6dd-f4f1b17c29bd
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.4641ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.7068ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 18795d91-2648-45c9-b67d-514e3e081c0a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0097ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0995ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5bb6e44a-884c-4af9-a4aa-01d8642e337c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2044ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.2855ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9ae42514-5168-4d04-a9be-58949d0227da
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5652ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6339ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b1d92e8f-56a2-40df-9688-b87abc152406
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.456ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4922ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5464e73b-2f05-4e81-b032-fe99d8deb0a2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5979ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6312ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0bb5fb7b-4af2-48f7-8194-c459627ebb5b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5656ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6139ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 544218fb-7876-443f-90ce-b05bff83a0c8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.444ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.485ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3e1c05b9-8c8d-459b-971e-2e04c52fd253
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6377ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7079ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 7927.0267ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 7927.0795ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 90b5ddb3-0e25-453e-b6dd-f4f1b17c29bd
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7005ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7675ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9ae42514-5168-4d04-a9be-58949d0227da
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.613ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6701ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0bb5fb7b-4af2-48f7-8194-c459627ebb5b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6516ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6995ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 18795d91-2648-45c9-b67d-514e3e081c0a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0494ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1912ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5bb6e44a-884c-4af9-a4aa-01d8642e337c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6263ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6762ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b1d92e8f-56a2-40df-9688-b87abc152406
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9667ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0702ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5464e73b-2f05-4e81-b032-fe99d8deb0a2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5474ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6087ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 544218fb-7876-443f-90ce-b05bff83a0c8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6357ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6904ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3e1c05b9-8c8d-459b-971e-2e04c52fd253
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5787ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6322ms - 200
fail: Microsoft.AspNetCore.Server.Kestrel[0]
      Unexpected exception in TimingPipeFlusher.FlushAsync.
      System.IO.IOException: The encryption operation failed, see inner exception.
       ---> System.ComponentModel.Win32Exception (14): Bad address
         --- End of inner exception stack trace ---
         at System.Net.Security.SslStream.WriteSingleChunk[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.Net.Security.SslStream.WriteAsyncInternal[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.PipeWriterHelpers.TimingPipeFlusher.FlushAsync(MinDataRate minRate, Int64 count, IHttpOutputAborter outputAborter, CancellationToken cancellationToken)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2FrameWriter.WriteGoAwayAsync(Int32 lastStreamId, Http2ErrorCode errorCode)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2Connection.UpdateConnectionState()
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2Connection.ProcessRequestsAsync[TContext](IHttpApplication`1 application)
         at System.Threading.ExecutionContext.RunFromThreadPoolDispatchLoop(Thread threadPoolThread, ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Threading.ThreadPoolWorkQueue.Dispatch()
         at System.Threading.PortableThreadPool.WorkerThread.WorkerThreadStart()
         at System.Threading.Thread.StartCallback()
      --- End of stack trace from previous location ---
         at System.Net.Security.SslStream.WriteAsyncInternal[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.PoolingAsyncValueTaskMethodBuilder`1.StateMachineBox`1.System.Threading.Tasks.Sources.IValueTaskSource<TResult>.GetResult(Int16 token)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.PipeWriterHelpers.ConcurrentPipeWriter.FlushAsyncAwaited(ValueTask`1 flushTask, CancellationToken cancellationToken)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.PipeWriterHelpers.TimingPipeFlusher.TimeFlushAsyncAwaited(ValueTask`1 pipeFlushTask, MinDataRate minRate, IHttpOutputAborter outputAborter, CancellationToken cancellationToken)
fail: Microsoft.AspNetCore.Server.Kestrel[0]
      Unhandled exception while processing 0HNE9U4HG8A01.
      System.IO.IOException: The encryption operation failed, see inner exception.
       ---> System.ComponentModel.Win32Exception (14): Bad address
         --- End of inner exception stack trace ---
         at System.Net.Security.SslStream.WriteSingleChunk[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.Net.Security.SslStream.WriteAsyncInternal[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.IO.Pipelines.StreamPipeWriter.CompleteAsync(Exception exception)
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at System.IO.Pipelines.StreamPipeWriter.CompleteAsync(Exception exception)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.DuplexPipeStreamAdapter`1.DisposeAsync()
         at System.Runtime.CompilerServices.AsyncMethodBuilderCore.Start[TStateMachine](TStateMachine& stateMachine)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.DuplexPipeStreamAdapter`1.DisposeAsync()
         at Microsoft.AspNetCore.Server.Kestrel.Https.Internal.HttpsConnectionMiddleware.OnConnectionAsync(ConnectionContext context)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.ExecutionContextCallback(Object s)
         at System.Threading.ExecutionContext.RunInternal(ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext()
         at System.Threading.Tasks.AwaitTaskContinuation.RunOrScheduleAction(IAsyncStateMachineBox box, Boolean allowInlining)
         at System.Threading.Tasks.Task.RunContinuations(Object continuationObject)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder.SetResult()
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.HttpConnection.ProcessRequestsAsync[TContext](IHttpApplication`1 httpApplication)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.ExecutionContextCallback(Object s)
         at System.Threading.ExecutionContext.RunInternal(ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext()
         at System.Threading.Tasks.AwaitTaskContinuation.RunOrScheduleAction(IAsyncStateMachineBox box, Boolean allowInlining)
         at System.Threading.Tasks.Task.RunContinuations(Object continuationObject)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder.SetResult()
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2Connection.ProcessRequestsAsync[TContext](IHttpApplication`1 application)
         at System.Threading.ExecutionContext.RunInternal(ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext()
         at System.Threading.Tasks.AwaitTaskContinuation.RunOrScheduleAction(IAsyncStateMachineBox box, Boolean allowInlining)
         at System.Threading.Tasks.Task.RunContinuations(Object continuationObject)
         at System.Threading.Tasks.Task`1.TrySetResult(TResult result)
         at System.Threading.Tasks.UnwrapPromise`1.TrySetFromTask(Task task, Boolean lookForOce)
         at System.Threading.Tasks.UnwrapPromise`1.Invoke(Task completingTask)
         at System.Threading.Tasks.Task.RunContinuations(Object continuationObject)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder.SetResult()
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Http2.Http2FrameWriter.WriteToOutputPipe()
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.ExecutionContextCallback(Object s)
         at System.Threading.ExecutionContext.RunInternal(ExecutionContext executionContext, ContextCallback callback, Object state)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext(Thread threadPoolThread)
         at System.Runtime.CompilerServices.AsyncTaskMethodBuilder`1.AsyncStateMachineBox`1.MoveNext()
         at System.Threading.ThreadPoolWorkQueue.Dispatch()
         at System.Threading.PortableThreadPool.WorkerThread.WorkerThreadStart()
         at System.Threading.Thread.StartCallback()
      --- End of stack trace from previous location ---
         at System.Net.Security.SslStream.WriteAsyncInternal[TIOAdapter](ReadOnlyMemory`1 buffer, CancellationToken cancellationToken)
         at System.IO.Pipelines.StreamPipeWriter.FlushAsyncInternal(Boolean writeToStream, ReadOnlyMemory`1 data, CancellationToken cancellationToken)
         at System.Runtime.CompilerServices.PoolingAsyncValueTaskMethodBuilder`1.StateMachineBox`1.System.Threading.Tasks.Sources.IValueTaskSource<TResult>.GetResult(Int16 token)
         at System.IO.Pipelines.StreamPipeWriter.CompleteAsync(Exception exception)
         at System.IO.Pipelines.StreamPipeWriter.CompleteAsync(Exception exception)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.DuplexPipeStreamAdapter`1.DisposeAsync()
         at Microsoft.AspNetCore.Server.Kestrel.Https.Internal.HttpsConnectionMiddleware.OnConnectionAsync(ConnectionContext context)
         at Microsoft.AspNetCore.Server.Kestrel.Https.Internal.HttpsConnectionMiddleware.OnConnectionAsync(ConnectionContext context)
         at Microsoft.AspNetCore.Server.Kestrel.Core.Internal.Infrastructure.KestrelConnection`1.ExecuteAsync()

