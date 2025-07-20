Last login: Sat Jul 19 09:54:49 on ttys257
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
      Client connected: e0jJhXRCMvuuF1sV1drh3Q
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: e0jJhXRCMvuuF1sV1drh3Q
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638885242894001720
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638885242894001720","messageId":"e6ffe1b0-6309-49ec-a37f-531cd44eff02","content":"Please make DCF model in this sheet, use mock data","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A1","selectedData":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"visibleRangeData":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1","data":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"lastRow":1,"lastColumn":1}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":1},"activeContext":[{"type":"selection","value":"Sheet1!A1"}]},"autonomyMode":"agent-default","timestamp":"2025-07-19T12:18:16.091362Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ca7478cc-05fe-4a50-a416-b66e92e6c08b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3.1873ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 8.6032ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e8efa5fb-a4eb-409b-8d9f-1c014cd03a48
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.538ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5834ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request cad9619f-44f9-4099-a2b1-dc8b2959815b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2215ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2512ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2c584978-b510-41a0-96a7-b477ff90e704
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2827ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3287ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 072d1744-d673-4434-af35-4501af72bce0
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3331ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3704ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 1cb49024-b3d6-4859-8bd7-255a23578f53
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3109ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3531ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b001ed0a-ce84-42bd-b10c-0409c02feb6c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2601ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.288ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e4ea60e6-4e82-429f-a747-aaaccc1b7a58
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2811ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3121ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5a401547-6cb1-443c-addd-73ddf25ec2b1
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2729ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2934ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5f927014-107a-4eb0-8417-688f8b0cc43d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3819ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4134ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 1cee45ec-6815-4ef6-8ad8-781f542ff1b2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2708ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3037ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e6a76c4e-6c67-4ed2-b3f7-3f3e3886855d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2541ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2973ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request abfc03d6-bb4c-45f2-acbd-c7507aff51d2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2777ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3045ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request de457799-befc-4d8c-ad33-f07b44b68c21
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3498ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3867ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request bedfcc43-13c6-4d49-9d84-9cebc20b646a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2232ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2617ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 529e8162-428f-4710-99a8-1fc0a0203130
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.254ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2791ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b31912b4-8c53-437e-871c-f8381eba1470
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2397ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2775ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request bae41664-f8d5-489d-adf9-6174684f5c5c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2657ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2974ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ec3564e4-7858-479c-967c-19f0c3637d2d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2266ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2564ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 832ae016-fc89-4680-ade0-e16d1aa08df0
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2258ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2464ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 917ee509-acba-42f7-af09-28735afce023
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2587ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2876ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 34ea1f9b-8866-4f8e-80ec-9f89198412f4
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2617ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2867ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6e1de000-f8be-439a-b5e1-fbc3cb4656d3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2417ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2676ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request eaead406-bb71-4e51-9ae0-c4eb359ecc79
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2101ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2405ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4ff0f6a8-edb0-408f-ac06-85ce1ac9f72a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2441ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2728ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a600870d-86c1-42ac-be42-09976be138a6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.205ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.225ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ba0da082-2275-4845-a2e9-7c1e2e1e7c32
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.276ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3125ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 90754249-bd7a-415a-9eff-cf141f474781
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.268ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2948ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 75cb68a4-5a30-49de-8d4e-d47cb31cf466
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2232ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2463ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 66ed7cd5-f448-48ae-a072-cdca243358e7
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2239ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2557ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a0f219cd-d739-4c27-a3b4-872b6d59583a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3207ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3602ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2820417e-8b83-43fc-95a2-be0c39f830cb
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1976ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2236ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 48f845ed-0219-421f-b876-52a51d51bc95
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1933ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.213ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5fa96147-dd36-4c9f-974a-b396a033bcb2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2013ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2274ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5e6105b1-6cc3-4eab-aac8-f89e498f39f3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1886ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2137ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 037fdf47-cc5c-4e34-b7b0-ee7a11ac34fc
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2463ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2792ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6b27c0d6-365b-4cf8-b4b4-e04686397621
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2567ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2898ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 31311daa-1ae5-4865-b311-9f703278942e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2267ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2567ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 1eaa1329-f683-4308-ba2b-3a1f4c6c11ff
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2182ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2426ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 118541c8-6cdb-4891-aa42-2fd3e1234a5e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2243ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2472ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9a75053e-d0c2-49a1-b1aa-aa2b06975b41
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.25ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2805ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f71a5f50-8eda-4170-ac35-41adb392d934
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2352ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2582ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ea797380-ee1d-420b-b559-5b0b1f1f4cfd
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2587ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2855ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 24f9ff1c-f268-49ff-a64d-fb486da538b7
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2207ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2397ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2479cc23-d22c-44c9-bd87-70259383ad99
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.24ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2731ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d4ffb8a5-9edb-475c-9c8a-6c20b6f4f020
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2502ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2806ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e64a51cd-e51c-412d-bf9d-94e4760d24f2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.193ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2238ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 45a8c6bb-f1ec-4c91-89ef-2ae23460afed
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2163ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2393ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 034c60d3-b78f-4f28-966a-ee85ab10d82f
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.193ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.214ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 99cb1fce-b9ee-45da-b00a-648f116e9753
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2045ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2263ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6f3ed2e6-888e-46c8-a3b9-c441d3735ee0
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1797ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2005ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 099bd05a-6900-4c61-9fa5-ba8cd220a193
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3043ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3437ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 885ff673-7db6-495a-8a5d-ea60c811101b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2207ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.247ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 77266bb3-6ecf-4a6f-bfe5-612ceb153dbc
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2855ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3085ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 24442.1333ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 24445.5607ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ca7478cc-05fe-4a50-a416-b66e92e6c08b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3964ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4336ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2c584978-b510-41a0-96a7-b477ff90e704
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2318ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.264ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 1cb49024-b3d6-4859-8bd7-255a23578f53
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2906ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3237ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e4ea60e6-4e82-429f-a747-aaaccc1b7a58
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5704ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6466ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5f927014-107a-4eb0-8417-688f8b0cc43d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3697ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4115ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e6a76c4e-6c67-4ed2-b3f7-3f3e3886855d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.346ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3978ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request de457799-befc-4d8c-ad33-f07b44b68c21
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4553ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5035ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 529e8162-428f-4710-99a8-1fc0a0203130
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3916ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4401ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b31912b4-8c53-437e-871c-f8381eba1470
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.852ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.898ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request bae41664-f8d5-489d-adf9-6174684f5c5c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3331ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3909ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 832ae016-fc89-4680-ade0-e16d1aa08df0
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2887ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3257ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 917ee509-acba-42f7-af09-28735afce023
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2535ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2788ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 34ea1f9b-8866-4f8e-80ec-9f89198412f4
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2057ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2367ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6e1de000-f8be-439a-b5e1-fbc3cb4656d3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2471ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2686ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4ff0f6a8-edb0-408f-ac06-85ce1ac9f72a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2277ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.246ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ba0da082-2275-4845-a2e9-7c1e2e1e7c32
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2277ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.255ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 75cb68a4-5a30-49de-8d4e-d47cb31cf466
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2548ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2859ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a0f219cd-d739-4c27-a3b4-872b6d59583a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2041ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2317ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2820417e-8b83-43fc-95a2-be0c39f830cb
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2565ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.28ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 48f845ed-0219-421f-b876-52a51d51bc95
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2523ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2841ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5fa96147-dd36-4c9f-974a-b396a033bcb2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1948ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2122ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5e6105b1-6cc3-4eab-aac8-f89e498f39f3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1815ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.1973ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6b27c0d6-365b-4cf8-b4b4-e04686397621
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2112ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2345ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 1eaa1329-f683-4308-ba2b-3a1f4c6c11ff
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2018ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2246ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9a75053e-d0c2-49a1-b1aa-aa2b06975b41
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1835ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2065ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ea797380-ee1d-420b-b559-5b0b1f1f4cfd
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1828ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2017ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 24f9ff1c-f268-49ff-a64d-fb486da538b7
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1737ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.1935ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2479cc23-d22c-44c9-bd87-70259383ad99
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3281ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3622ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d4ffb8a5-9edb-475c-9c8a-6c20b6f4f020
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1952ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2117ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e64a51cd-e51c-412d-bf9d-94e4760d24f2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2612ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2836ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 45a8c6bb-f1ec-4c91-89ef-2ae23460afed
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2023ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2288ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e8efa5fb-a4eb-409b-8d9f-1c014cd03a48
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.7986ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 2.0535ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request cad9619f-44f9-4099-a2b1-dc8b2959815b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8682ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9697ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 072d1744-d673-4434-af35-4501af72bce0
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.6661ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.7628ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b001ed0a-ce84-42bd-b10c-0409c02feb6c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7222ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7894ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5a401547-6cb1-443c-addd-73ddf25ec2b1
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2147ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3193ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 1cee45ec-6815-4ef6-8ad8-781f542ff1b2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.4635ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.5896ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request abfc03d6-bb4c-45f2-acbd-c7507aff51d2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.942ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0716ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request bedfcc43-13c6-4d49-9d84-9cebc20b646a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.012ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1135ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ec3564e4-7858-479c-967c-19f0c3637d2d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.9247ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 2.0316ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request eaead406-bb71-4e51-9ae0-c4eb359ecc79
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7546ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8277ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a600870d-86c1-42ac-be42-09976be138a6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6057ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6719ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 90754249-bd7a-415a-9eff-cf141f474781
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9559ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0295ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 66ed7cd5-f448-48ae-a072-cdca243358e7
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4376ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4792ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 037fdf47-cc5c-4e34-b7b0-ee7a11ac34fc
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6784ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7357ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 31311daa-1ae5-4865-b311-9f703278942e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1404ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.2681ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 118541c8-6cdb-4891-aa42-2fd3e1234a5e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7946ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8926ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f71a5f50-8eda-4170-ac35-41adb392d934
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0877ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1572ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 034c60d3-b78f-4f28-966a-ee85ab10d82f
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.75ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8068ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 99cb1fce-b9ee-45da-b00a-648f116e9753
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.123ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1993ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6f3ed2e6-888e-46c8-a3b9-c441d3735ee0
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9771ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0629ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 099bd05a-6900-4c61-9fa5-ba8cd220a193
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.071ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1372ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 885ff673-7db6-495a-8a5d-ea60c811101b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2231ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3337ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 77266bb3-6ecf-4a6f-bfe5-612ceb153dbc
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1806ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.4414ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638885242894001720
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638885242894001720","messageId":"20c05a1e-dafe-410c-807a-87156c074c06","content":"please continue to flesh out mock model","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A17:A21","selectedData":{"values":[["Valuation Assumptions:"],["WACC"],["Terminal Growth"],["Terminal Value"],["Enterprise Value"]],"formulas":[["Valuation Assumptions:"],["WACC"],["Terminal Growth"],["Terminal Value"],["Enterprise Value"]],"address":"Sheet1!A17:A21","rowCount":5,"colCount":1},"visibleRangeData":{"values":[["DCF Valuation Model","","","","","","",""],["","","","","","","",""],["($ in millions)","2023A","2024E","2025E","2026E","2027E","2028E","Terminal"],["Revenue",1000,1100,1210,1331,1464,1610,1690.5],["Growth %","",10,10,10,10,10,5],["EBIT Margin %",15,16,17,18,19,20,20],["EBIT","","","","","","",""],["Tax Rate",25,25,25,25,25,25,25],["NOPAT","","","","","","",""],["D\u0026A",50,55,60.5,66.55,73.2,80.5,84.53],["CapEx",60,66,72.6,79.86,87.85,96.63,101.46],["Changes in WC",20,22,24.2,26.62,29.28,32.21,33.82],["","","","","","","",""],["Free Cash Flow","","","","","","",""],["Discount Factor","","","","","","",""],["","","","","","","",""],["Valuation Assumptions:",10,"%","","","","",""],["WACC",2,"%","","","","",""],["Terminal Growth","","","","","","",""],["Terminal Value",0,"","","","","",""],["Enterprise Value","","","","","","",""]],"formulas":[["DCF Valuation Model","","","","","","",""],["","","","","","","",""],["($ in millions)","2023A","2024E","2025E","2026E","2027E","2028E","Terminal"],["Revenue",1000,1100,1210,1331,1464,1610,1690.5],["Growth %","",10,10,10,10,10,5],["EBIT Margin %",15,16,17,18,19,20,20],["EBIT","","","","","","",""],["Tax Rate",25,25,25,25,25,25,25],["NOPAT","","","","","","",""],["D\u0026A",50,55,60.5,66.55,73.2,80.5,84.53],["CapEx",60,66,72.6,79.86,87.85,96.63,101.46],["Changes in WC",20,22,24.2,26.62,29.28,32.21,33.82],["","","","","","","",""],["Free Cash Flow","","","","","","",""],["Discount Factor","","","","","","",""],["","","","","","","",""],["Valuation Assumptions:",10,"%","","","","",""],["WACC",2,"%","","","","",""],["Terminal Growth","","","","","","",""],["Terminal Value","=SUMPRODUCT(B14:G14,B15:G15)\u002BH15*B19","","","","","",""],["Enterprise Value","","","","","","",""]],"address":"Sheet1!A1:H21","rowCount":21,"colCount":8},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1:H21","data":{"values":[["DCF Valuation Model","","","","","","",""],["","","","","","","",""],["($ in millions)","2023A","2024E","2025E","2026E","2027E","2028E","Terminal"],["Revenue",1000,1100,1210,1331,1464,1610,1690.5],["Growth %","",10,10,10,10,10,5],["EBIT Margin %",15,16,17,18,19,20,20],["EBIT","","","","","","",""],["Tax Rate",25,25,25,25,25,25,25],["NOPAT","","","","","","",""],["D\u0026A",50,55,60.5,66.55,73.2,80.5,84.53],["CapEx",60,66,72.6,79.86,87.85,96.63,101.46],["Changes in WC",20,22,24.2,26.62,29.28,32.21,33.82],["","","","","","","",""],["Free Cash Flow","","","","","","",""],["Discount Factor","","","","","","",""],["","","","","","","",""],["Valuation Assumptions:",10,"%","","","","",""],["WACC",2,"%","","","","",""],["Terminal Growth","","","","","","",""],["Terminal Value",0,"","","","","",""],["Enterprise Value","","","","","","",""]],"formulas":[["DCF Valuation Model","","","","","","",""],["","","","","","","",""],["($ in millions)","2023A","2024E","2025E","2026E","2027E","2028E","Terminal"],["Revenue",1000,1100,1210,1331,1464,1610,1690.5],["Growth %","",10,10,10,10,10,5],["EBIT Margin %",15,16,17,18,19,20,20],["EBIT","","","","","","",""],["Tax Rate",25,25,25,25,25,25,25],["NOPAT","","","","","","",""],["D\u0026A",50,55,60.5,66.55,73.2,80.5,84.53],["CapEx",60,66,72.6,79.86,87.85,96.63,101.46],["Changes in WC",20,22,24.2,26.62,29.28,32.21,33.82],["","","","","","","",""],["Free Cash Flow","","","","","","",""],["Discount Factor","","","","","","",""],["","","","","","","",""],["Valuation Assumptions:",10,"%","","","","",""],["WACC",2,"%","","","","",""],["Terminal Growth","","","","","","",""],["Terminal Value","=SUMPRODUCT(B14:G14,B15:G15)\u002BH15*B19","","","","","",""],["Enterprise Value","","","","","","",""]],"address":"Sheet1!A1:H21","rowCount":21,"colCount":8},"lastRow":21,"lastColumn":8}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":168},"activeContext":[{"type":"selection","value":"Sheet1!A17:A21"},{"type":"edit","value":"B17:C17"},{"type":"edit","value":"B18:C18"},{"type":"edit","value":"B20"}]},"autonomyMode":"agent-default","timestamp":"2025-07-19T12:19:24.026132Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c764c52f-ef56-4c62-af18-6b066e71c758
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4348ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4761ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9fd9ed5f-bac4-41ab-bb44-35f10148caf6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3257ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.352ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c764c52f-ef56-4c62-af18-6b066e71c758
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2424ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3014ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9fd9ed5f-bac4-41ab-bb44-35f10148caf6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.42ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.4681ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ba4ecc19-4126-4879-a753-64a38151f229
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.4701ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.5629ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b4f74097-3b09-4503-b314-5eaba1c3d93e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6104ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6767ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 80026a1c-74ea-46f9-823f-bfff2a38c4d4
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5361ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5758ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4d0cc340-65d1-44c6-949f-66926e29b65d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.3363ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3765ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5816836f-4aa6-4c9e-b261-1cc2e34b5506
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4382ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4791ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e8a4c85b-5c50-4e51-81ba-c34f1d094e46
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3426ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.373ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 5743.9705ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 5744.0038ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ba4ecc19-4126-4879-a753-64a38151f229
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3509ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3766ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 80026a1c-74ea-46f9-823f-bfff2a38c4d4
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2782ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2975ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b4f74097-3b09-4503-b314-5eaba1c3d93e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.805ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8974ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4d0cc340-65d1-44c6-949f-66926e29b65d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9319ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9924ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5816836f-4aa6-4c9e-b261-1cc2e34b5506
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.705ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7485ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e8a4c85b-5c50-4e51-81ba-c34f1d094e46
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5305ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5699ms - 200

