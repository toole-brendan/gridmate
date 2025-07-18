Last login: Fri Jul 18 18:03:31 on ttys245
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
      Client connected: NG5pA5mmjqD-0IGqaOh3GQ
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: NG5pA5mmjqD-0IGqaOh3GQ
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638884560242577410
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638884560242577410","messageId":"ad511f0d-e718-4cdd-85c8-e79f2383d089","content":"Please make DCF model in this sheet, use mock data","excelContext":{"worksheet":"Sheet1","workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","selectedRange":"Sheet1!A1","selectedData":{"values":[[""]],"formulas":[[""]],"address":"A1","rowCount":1,"colCount":1,"isBlankSheet":true},"nearbyRange":{"values":[["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""]],"formulas":[["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""],["","","","","","","","","","",""]],"address":"Sheet1!A1:K20","rowCount":20,"colCount":11,"suggestedWorkArea":true},"activeContext":[{"type":"selection","value":""}]},"autonomyMode":"agent-default","timestamp":"2025-07-18T17:20:27.044823Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b91aa2b4-be58-4e14-a8bf-4b4b3148d0b5
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 5.4948ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 13.7355ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 65a1bc72-2ba8-416f-b9e1-7e6042793624
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0605ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1153ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e4b27bdb-e2c2-4939-8aee-c8a5976aafd8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3066ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3373ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 327f85f8-9551-4122-907d-000c87b0f9a8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3602ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4105ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9bac96cc-4255-4fd8-9a3c-7bc8de77de2d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.307ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3414ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 992075bf-0241-4061-8cfa-c589146b4027
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2752ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3203ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 6794.2062ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 6797.9812ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b91aa2b4-be58-4e14-a8bf-4b4b3148d0b5
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4705ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.519ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e4b27bdb-e2c2-4939-8aee-c8a5976aafd8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3102ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.343ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 65a1bc72-2ba8-416f-b9e1-7e6042793624
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.5073ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.6817ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 327f85f8-9551-4122-907d-000c87b0f9a8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.844ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9263ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9bac96cc-4255-4fd8-9a3c-7bc8de77de2d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.5791ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.6885ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 992075bf-0241-4061-8cfa-c589146b4027
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9335ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0279ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638884560242577410
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638884560242577410","messageId":"6d132012-8add-4f3e-9042-bd32be5033eb","content":"please expand on this model, more mock data","excelContext":{"worksheet":"Sheet1","workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","selectedRange":"Sheet1!A1","selectedData":{"values":[["DCF Valuation Model"]],"formulas":[["DCF Valuation Model"]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"nearbyRange":{"values":[["DCF Valuation Model","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["(in millions)","2022A","2023E","2024E","2025E","2026E","2027E","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""]],"formulas":[["DCF Valuation Model","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["(in millions)","2022A","2023E","2024E","2025E","2026E","2027E","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","",""]],"address":"Sheet1!A1:Q23","rowCount":23,"colCount":17},"activeContext":[{"type":"selection","value":""}]},"autonomyMode":"agent-default","timestamp":"2025-07-18T17:20:49.631349Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 22edb662-b2dc-4134-ad94-65725d1cf615
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3.1626ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3.4127ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9bd88819-b0b0-4144-a6e5-c97f90146be2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9404ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0957ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request cbea5578-2001-4bc0-a8c8-9fee610ed834
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1043ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1871ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 421cfa83-eae6-4251-b409-f857d6050871
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9084ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0212ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 780ec6b9-bff4-4618-aa15-5989f707987c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7758ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8472ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 53309f92-5020-448d-9891-d56661518b7c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7134ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7746ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3ee76cb7-0a7a-49cf-b0c3-7ae08cad3ccd
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3643ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4022ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 519d1a72-27ab-4f2b-8bc2-5c6649c4782f
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4216ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4554ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 519d1a72-27ab-4f2b-8bc2-5c6649c4782f
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3955ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5168ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 22edb662-b2dc-4134-ad94-65725d1cf615
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.571ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6361ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9bd88819-b0b0-4144-a6e5-c97f90146be2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4272ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4672ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 421cfa83-eae6-4251-b409-f857d6050871
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3753ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4072ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 780ec6b9-bff4-4618-aa15-5989f707987c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3033ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3258ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 53309f92-5020-448d-9891-d56661518b7c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7155ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8446ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3ee76cb7-0a7a-49cf-b0c3-7ae08cad3ccd
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5182ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5765ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request cbea5578-2001-4bc0-a8c8-9fee610ed834
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0701ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.2629ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5da262fe-753f-4d31-ae43-9e18690da212
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.3291ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.4693ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4cc041a4-1bb4-4cad-b8ea-f2d26a720adf
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9355ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.005ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 7623.8275ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 7623.9494ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5da262fe-753f-4d31-ae43-9e18690da212
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.291ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3701ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4cc041a4-1bb4-4cad-b8ea-f2d26a720adf
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9432ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0188ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638884560242577410
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638884560242577410","messageId":"3fe95748-575e-4348-8d2f-d838d9959bab","content":"expand into cells that you haven\u2019t edited yet","excelContext":{"worksheet":"Sheet1","workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","selectedRange":"Sheet1!A1","selectedData":{"values":[["DCF Valuation Model"]],"formulas":[["DCF Valuation Model"]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"nearbyRange":{"values":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","Discounted Cash Flow Model","Discounted Cash Flow Model","Discounted Cash Flow Model","Discounted Cash Flow Model","Discounted Cash Flow Model","Discounted Cash Flow Model","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["(in millions)","2022A","2023E","2024E","2025E","2026E","2027E","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""]],"formulas":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","Discounted Cash Flow Model","Discounted Cash Flow Model","Discounted Cash Flow Model","Discounted Cash Flow Model","Discounted Cash Flow Model","Discounted Cash Flow Model","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["(in millions)","2022A","2023E","2024E","2025E","2026E","2027E","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""],["","","","","","","","","","","","","","","","","","","","","","",""]],"address":"Sheet1!A1:W23","rowCount":23,"colCount":23},"activeContext":[{"type":"selection","value":""}]},"autonomyMode":"agent-default","timestamp":"2025-07-18T17:21:11.927292Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ed744f28-6e19-4612-866a-79cfd4add491
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.65ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.851ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d7be04b0-b6f8-42af-87c4-bcdddc0f61ae
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8395ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9039ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0eb09190-0183-4df2-8d66-bb5e6b8f12c2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7369ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8106ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0042f27e-c474-43f9-b6d5-496a59cfffbf
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3708ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4042ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 610af05a-b40a-466f-905a-2a1c5a1d8445
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3627ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4017ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9ff7edf7-0c04-42d5-94ca-aae8d7bb7216
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3678ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.392ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9ff7edf7-0c04-42d5-94ca-aae8d7bb7216
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3445ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3702ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ed744f28-6e19-4612-866a-79cfd4add491
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3672ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3915ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d7be04b0-b6f8-42af-87c4-bcdddc0f61ae
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2191ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2418ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0eb09190-0183-4df2-8d66-bb5e6b8f12c2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1769ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.1922ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0042f27e-c474-43f9-b6d5-496a59cfffbf
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1811ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.1949ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 610af05a-b40a-466f-905a-2a1c5a1d8445
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2424ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2559ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a0ffad5a-d350-457e-8275-9a7c49bffcc3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7926ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8564ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 74dc63cd-a71a-4990-a52b-62b0bb0ec04d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8866ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0962ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6f7105b6-ad4b-45bf-8bbb-11631eb22007
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.914ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9724ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 870179c8-d7de-4a81-b639-7bfefc5e1145
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7537ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7965ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request fe6b657f-3d6f-4e73-8716-66fa3c99ef36
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3965ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4221ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f7562b05-18cb-4411-83ee-804973867910
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3511ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3767ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d345939d-724f-479f-a687-df43da8cf78a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5628ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6205ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d345939d-724f-479f-a687-df43da8cf78a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3876ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4115ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a0ffad5a-d350-457e-8275-9a7c49bffcc3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9085ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9617ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6f7105b6-ad4b-45bf-8bbb-11631eb22007
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6821ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7228ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 870179c8-d7de-4a81-b639-7bfefc5e1145
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6221ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6617ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request fe6b657f-3d6f-4e73-8716-66fa3c99ef36
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5556ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5921ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f7562b05-18cb-4411-83ee-804973867910
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6727ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6907ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 74dc63cd-a71a-4990-a52b-62b0bb0ec04d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.3824ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.4765ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 377eb735-41ac-425f-82da-d360649d6af1
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1984ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3126ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request eba8c80f-2cb8-45c7-92d0-2183d2001e43
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8786ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9776ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 9383.0537ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 9383.1274ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 377eb735-41ac-425f-82da-d360649d6af1
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6122ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6498ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request eba8c80f-2cb8-45c7-92d0-2183d2001e43
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6726ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7094ms - 200
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
      Unhandled exception while processing 0HNE63TGQTH6T.
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
         at System.Threading.ThreadPool.<>c.<.cctor>b__52_0(Object state)
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

