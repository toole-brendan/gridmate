Last login: Sun Jul 20 23:33:26 on ttys262
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
      Client connected: yUB3hL3pVpKePevIMdcSpg
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: yUB3hL3pVpKePevIMdcSpg
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638886477110954120
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638886477110954120","messageId":"01596284-de27-4e0d-8a3e-90cca9dc307a","content":"Please make DCF model in this sheet, use mock data","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A1","selectedData":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"visibleRangeData":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1","data":{"values":[[""]],"formulas":[[""]],"address":"Sheet1!A1","rowCount":1,"colCount":1},"lastRow":1,"lastColumn":1}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":1},"activeContext":[{"type":"selection","value":"Sheet1!A1"}]},"autonomyMode":"agent-default","timestamp":"2025-07-20T22:35:27.650142Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 81e0b305-2b88-469f-9741-1f920c3b5ab5
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 4.0525ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 12.8894ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c86fadc5-d239-4a83-9dca-2d4c7e040a46
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7369ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7797ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 81e0b305-2b88-469f-9741-1f920c3b5ab5
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7315ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8225ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c86fadc5-d239-4a83-9dca-2d4c7e040a46
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3639ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4029ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request beb4e1f0-2cdb-4a14-9315-92ad5cfab8f2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1391ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.2805ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 94e844f1-49f9-45e1-a0e8-e235c5c75c1c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6121ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7384ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5291f454-dec7-4b61-bd43-685b1bdb10e2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4218ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4981ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2e9dd7ec-b7af-4b0d-aa44-240dc68d5b81
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3034ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3289ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 95744c7c-2fcd-45de-8641-78f047a10612
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4026ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4393ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 37d04cd3-d0c8-4a83-8d9a-699987f636a3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3283ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3723ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 48da35f5-61a6-44ef-864e-c061f036653a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3329ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3661ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6a462d11-a7b8-4aa4-b64d-3160d364595b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2604ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3097ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request fcd94b94-a34c-41c9-9d9e-d27164b4a284
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3072ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3407ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9ea6ddab-e14e-47a9-a133-2055c761a5ed
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3644ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3938ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 8004.0582ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 8007.751ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request beb4e1f0-2cdb-4a14-9315-92ad5cfab8f2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0423ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1741ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 5291f454-dec7-4b61-bd43-685b1bdb10e2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6223ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6958ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 95744c7c-2fcd-45de-8641-78f047a10612
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3915ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4311ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 48da35f5-61a6-44ef-864e-c061f036653a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3411ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3719ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request fcd94b94-a34c-41c9-9d9e-d27164b4a284
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3943ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4792ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 94e844f1-49f9-45e1-a0e8-e235c5c75c1c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5656ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7811ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 2e9dd7ec-b7af-4b0d-aa44-240dc68d5b81
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9979ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0886ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 37d04cd3-d0c8-4a83-8d9a-699987f636a3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0082ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1547ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6a462d11-a7b8-4aa4-b64d-3160d364595b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1272ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.2124ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9ea6ddab-e14e-47a9-a133-2055c761a5ed
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2857ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.4283ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638886477110954120
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638886477110954120","messageId":"4e9fe572-9b79-4e10-b4bc-ec4770abd6fd","content":"please make more polished and flesh it out even more","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A11:G11","selectedData":{"values":[["Year","2024E","2025E","2026E","2027E","2028E","Terminal"]],"formulas":[["Year","2024E","2025E","2026E","2027E","2028E","Terminal"]],"address":"Sheet1!A11:G11","rowCount":1,"colCount":7},"visibleRangeData":{"values":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["Discount Rate (WACC)",0.1,"","","","",""],["Perpetual Growth Rate",0.02,"","","","",""],["Tax Rate",0.25,"","","","",""],["Initial Revenue Growth",0.05,"","","","",""],["Target EBIT Margin",0.15,"","","","",""],["","","","","","",""],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Year","2024E","2025E","2026E","2027E","2028E","Terminal"]],"formulas":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["Discount Rate (WACC)",0.1,"","","","",""],["Perpetual Growth Rate",0.02,"","","","",""],["Tax Rate",0.25,"","","","",""],["Initial Revenue Growth",0.05,"","","","",""],["Target EBIT Margin",0.15,"","","","",""],["","","","","","",""],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Year","2024E","2025E","2026E","2027E","2028E","Terminal"]],"address":"Sheet1!A1:G11","rowCount":11,"colCount":7},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1:G11","data":{"values":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["Discount Rate (WACC)",0.1,"","","","",""],["Perpetual Growth Rate",0.02,"","","","",""],["Tax Rate",0.25,"","","","",""],["Initial Revenue Growth",0.05,"","","","",""],["Target EBIT Margin",0.15,"","","","",""],["","","","","","",""],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Year","2024E","2025E","2026E","2027E","2028E","Terminal"]],"formulas":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["Discount Rate (WACC)",0.1,"","","","",""],["Perpetual Growth Rate",0.02,"","","","",""],["Tax Rate",0.25,"","","","",""],["Initial Revenue Growth",0.05,"","","","",""],["Target EBIT Margin",0.15,"","","","",""],["","","","","","",""],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Year","2024E","2025E","2026E","2027E","2028E","Terminal"]],"address":"Sheet1!A1:G11","rowCount":11,"colCount":7},"lastRow":11,"lastColumn":7}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":77},"activeContext":[{"type":"selection","value":"Sheet1!A11:G11"},{"type":"edit","value":"A4:B8"},{"type":"edit","value":"A10:G10"},{"type":"edit","value":"A11:G11"}]},"autonomyMode":"agent-default","timestamp":"2025-07-20T22:35:59.800952Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request abeae9a0-b3ef-4d6d-aa92-05e90da9e66f
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.761ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8223ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0588ebe9-d9d9-4911-8b86-ab2d770cdc86
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3644ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4094ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request abeae9a0-b3ef-4d6d-aa92-05e90da9e66f
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2352ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.3047ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0588ebe9-d9d9-4911-8b86-ab2d770cdc86
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8734ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9515ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d6e90218-8d74-47ed-9eab-e1acddf6dd73
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8382ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9249ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 785510a0-0676-4db8-8353-7f8f10db546b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4672ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5024ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request abba891a-dda7-45dc-83af-86954e1a446e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4627ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5059ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request dae989be-d4b0-4fe5-8129-ab50d470ed61
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3828ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4145ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d655667a-8546-401c-aee8-5cce8b161dd2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4385ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5022ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 8fecaeca-d301-4fe2-9ffe-9ce59caf81eb
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3577ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3897ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4bd21ec3-992e-4cea-b177-2401126c198c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5134ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.608ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3421957f-5947-4e38-9b0f-e0847c560c90
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2942ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3292ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a0410589-0956-493b-8a3f-ce1d79934a65
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2495ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2716ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4409b36e-dfba-4deb-9ac0-d62daea78e27
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3522ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3764ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 66de296c-3e55-4b7f-abd1-42dedd499c07
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3243ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3555ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7557a95b-88fe-4973-a999-ecfb0a31f2e2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3216ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3425ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 401b9f69-6982-43af-ac53-0bd46c1e6fb8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3234ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3478ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request dd93f6b9-f32f-4d9a-8630-8780ceb38e12
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2485ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2729ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3a177b20-5f3e-42af-b453-8539ad641b03
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3387ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3626ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 15c57484-c846-4a5e-b7bb-dffb4564d4f0
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.256ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2735ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7892cccb-3289-46b8-b464-5d70c6701e65
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2541ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2777ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7eb0cba3-b95c-40cb-9cb7-d30e7b766d6d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2749ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.303ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request cc810197-d645-42e2-9978-744d5be005d3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2619ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2868ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c038a9ca-7358-4df2-95fd-f743b075c85c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.1896ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.202ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 99434698-4147-4548-a58a-a9af67470d62
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2318ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2485ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9a515232-e297-4c2c-9ecc-87f58a90ebbb
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2237ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2399ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 1ac83c59-64f7-4411-90ad-3be2a44fd2b6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2069ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2266ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6930d02d-c0d3-4007-9e29-86c4da2dcfea
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2837ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3205ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 59b1ad79-3c59-487e-8775-56000383af95
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.235ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2565ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c657481a-beec-458c-a6c4-11f96c97f6c4
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2398ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2596ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a613b2a8-11e2-44de-a887-5011731dbfd5
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2675ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.288ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ccb291b0-02fe-44fa-b995-fd92f8c788e3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2193ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2351ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e557bb63-6661-4b3a-98b9-f22a557c9cc8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2007ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2198ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 8bebcc1c-9c59-4b2d-9904-e9893531c4f6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5139ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5515ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4802e832-24b4-4df1-84c0-d349ead0466e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3732ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4072ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9843b221-402d-4b44-9730-5b73e1e22318
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2385ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2552ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 051d70eb-19fe-4f56-9687-430b9c403809
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2159ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2579ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 31b89c3f-2775-4fa9-8324-46e0a07448af
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.357ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.395ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 36b58e8c-1f7c-4226-a4f0-0ffb9e1934ca
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3646ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4292ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 05fa3c9b-43fc-41c4-b1e2-da7a346dae71
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.423ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4719ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 20687.9067ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 20687.9876ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d6e90218-8d74-47ed-9eab-e1acddf6dd73
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8718ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9434ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request dae989be-d4b0-4fe5-8129-ab50d470ed61
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7232ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7802ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4bd21ec3-992e-4cea-b177-2401126c198c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4359ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4713ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a0410589-0956-493b-8a3f-ce1d79934a65
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3969ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4383ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 66de296c-3e55-4b7f-abd1-42dedd499c07
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2495ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2677ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 401b9f69-6982-43af-ac53-0bd46c1e6fb8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3908ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4197ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3a177b20-5f3e-42af-b453-8539ad641b03
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3057ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3273ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7892cccb-3289-46b8-b464-5d70c6701e65
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3106ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3336ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request cc810197-d645-42e2-9978-744d5be005d3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2855ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3095ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9a515232-e297-4c2c-9ecc-87f58a90ebbb
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3426ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3666ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 59b1ad79-3c59-487e-8775-56000383af95
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3163ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3412ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request a613b2a8-11e2-44de-a887-5011731dbfd5
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3878ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4091ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 8bebcc1c-9c59-4b2d-9904-e9893531c4f6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3121ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3354ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 051d70eb-19fe-4f56-9687-430b9c403809
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3161ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3491ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 36b58e8c-1f7c-4226-a4f0-0ffb9e1934ca
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.3051ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3252ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 785510a0-0676-4db8-8353-7f8f10db546b
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.4221ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.5101ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request abba891a-dda7-45dc-83af-86954e1a446e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0972ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1693ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d655667a-8546-401c-aee8-5cce8b161dd2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 2.1427ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 2.2712ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 8fecaeca-d301-4fe2-9ffe-9ce59caf81eb
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8967ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9992ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3421957f-5947-4e38-9b0f-e0847c560c90
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7861ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.832ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4409b36e-dfba-4deb-9ac0-d62daea78e27
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4722ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5058ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7557a95b-88fe-4973-a999-ecfb0a31f2e2
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4431ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4788ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request dd93f6b9-f32f-4d9a-8630-8780ceb38e12
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.714ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7913ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 15c57484-c846-4a5e-b7bb-dffb4564d4f0
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9747ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0984ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7eb0cba3-b95c-40cb-9cb7-d30e7b766d6d
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7251ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7836ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c038a9ca-7358-4df2-95fd-f743b075c85c
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.0526ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1178ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 99434698-4147-4548-a58a-a9af67470d62
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8668ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9203ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 1ac83c59-64f7-4411-90ad-3be2a44fd2b6
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.799ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8595ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6930d02d-c0d3-4007-9e29-86c4da2dcfea
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8731ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9394ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c657481a-beec-458c-a6c4-11f96c97f6c4
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1453ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.2518ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ccb291b0-02fe-44fa-b995-fd92f8c788e3
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8669ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9568ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request e557bb63-6661-4b3a-98b9-f22a557c9cc8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8182ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8747ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 4802e832-24b4-4df1-84c0-d349ead0466e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5587ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5928ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9843b221-402d-4b44-9730-5b73e1e22318
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1059ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1776ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 31b89c3f-2775-4fa9-8324-46e0a07448af
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4921ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5313ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 05fa3c9b-43fc-41c4-b1e2-da7a346dae71
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8877ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9533ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638886477110954120
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638886477110954120","messageId":"162d2793-0937-43eb-babe-e5e122fbbeba","content":"please continue","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!B22:B23","selectedData":{"values":[[0.1],[0.03]],"formulas":[[0.1],[0.03]],"address":"Sheet1!B22:B23","rowCount":2,"colCount":1},"visibleRangeData":{"values":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["","2023A","2024E","2025E","2026E","2027E","Terminal"],["Revenue Growth",0.15,0.12,0.1,0.09,0.08,0.03],["EBIT Margin",0.22,0.23,0.24,0.25,0.25,0.25],["Tax Rate",0.25,0.25,0.25,0.25,0.25,0.25],["D\u0026A % of Revenue",0.05,0.05,0.05,0.05,0.05,0.05],["Capex % of Revenue",0.07,0.07,0.07,0.07,0.07,0.07],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections"],["Revenue",1000,"","","","",""],["EBIT","","","","","",""],["Less: Taxes","","","","","",""],["NOPAT","","","","","",""],["Plus: D\u0026A","","","","","",""],["Less: Capex","","","","","",""],["Less: Change in NWC","","","","","",""],["Unlevered Free Cash Flow","","","","","",""],["","","","","","",""],["Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions"],["WACC",0.1,"","","","",""],["Terminal Growth Rate",0.03,"","","","",""],["Terminal Value","","","","","",""],["Present Value Factor","","","","","",""]],"formulas":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["","2023A","2024E","2025E","2026E","2027E","Terminal"],["Revenue Growth",0.15,0.12,0.1,0.09,0.08,0.03],["EBIT Margin",0.22,0.23,0.24,0.25,0.25,0.25],["Tax Rate",0.25,0.25,0.25,0.25,0.25,0.25],["D\u0026A % of Revenue",0.05,0.05,0.05,0.05,0.05,0.05],["Capex % of Revenue",0.07,0.07,0.07,0.07,0.07,0.07],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections"],["Revenue",1000,"","","","",""],["EBIT","","","","","",""],["Less: Taxes","","","","","",""],["NOPAT","","","","","",""],["Plus: D\u0026A","","","","","",""],["Less: Capex","","","","","",""],["Less: Change in NWC","","","","","",""],["Unlevered Free Cash Flow","","","","","",""],["","","","","","",""],["Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions"],["WACC",0.1,"","","","",""],["Terminal Growth Rate",0.03,"","","","",""],["Terminal Value","","","","","",""],["Present Value Factor","","","","","",""]],"address":"Sheet1!A1:G25","rowCount":25,"colCount":7},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1:G25","data":{"values":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["","2023A","2024E","2025E","2026E","2027E","Terminal"],["Revenue Growth",0.15,0.12,0.1,0.09,0.08,0.03],["EBIT Margin",0.22,0.23,0.24,0.25,0.25,0.25],["Tax Rate",0.25,0.25,0.25,0.25,0.25,0.25],["D\u0026A % of Revenue",0.05,0.05,0.05,0.05,0.05,0.05],["Capex % of Revenue",0.07,0.07,0.07,0.07,0.07,0.07],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections"],["Revenue",1000,"","","","",""],["EBIT","","","","","",""],["Less: Taxes","","","","","",""],["NOPAT","","","","","",""],["Plus: D\u0026A","","","","","",""],["Less: Capex","","","","","",""],["Less: Change in NWC","","","","","",""],["Unlevered Free Cash Flow","","","","","",""],["","","","","","",""],["Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions"],["WACC",0.1,"","","","",""],["Terminal Growth Rate",0.03,"","","","",""],["Terminal Value","","","","","",""],["Present Value Factor","","","","","",""]],"formulas":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["","2023A","2024E","2025E","2026E","2027E","Terminal"],["Revenue Growth",0.15,0.12,0.1,0.09,0.08,0.03],["EBIT Margin",0.22,0.23,0.24,0.25,0.25,0.25],["Tax Rate",0.25,0.25,0.25,0.25,0.25,0.25],["D\u0026A % of Revenue",0.05,0.05,0.05,0.05,0.05,0.05],["Capex % of Revenue",0.07,0.07,0.07,0.07,0.07,0.07],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections"],["Revenue",1000,"","","","",""],["EBIT","","","","","",""],["Less: Taxes","","","","","",""],["NOPAT","","","","","",""],["Plus: D\u0026A","","","","","",""],["Less: Capex","","","","","",""],["Less: Change in NWC","","","","","",""],["Unlevered Free Cash Flow","","","","","",""],["","","","","","",""],["Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions"],["WACC",0.1,"","","","",""],["Terminal Growth Rate",0.03,"","","","",""],["Terminal Value","","","","","",""],["Present Value Factor","","","","","",""]],"address":"Sheet1!A1:G25","rowCount":25,"colCount":7},"lastRow":25,"lastColumn":7}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":175},"activeContext":[{"type":"selection","value":"Sheet1!B22:B23"},{"type":"edit","value":"A21:G21"},{"type":"edit","value":"A22:A25"},{"type":"edit","value":"B22:B23"}]},"autonomyMode":"agent-default","timestamp":"2025-07-20T22:37:01.53962Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 118f7b0c-c71e-43e3-a692-b2066bb92355
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7195ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7659ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7d420e03-5bd0-465f-a8bf-2f8edbbb9fe8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2365ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.2527ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 118f7b0c-c71e-43e3-a692-b2066bb92355
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.3533ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.417ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 7d420e03-5bd0-465f-a8bf-2f8edbbb9fe8
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2357ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.2654ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 44185f97-0791-48e4-8961-b9f5fbe4513e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.3619ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.5926ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f41fe3ea-b7a7-440a-b0b0-1450d46cd565
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9048ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9632ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3688.9291ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3689.1115ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 44185f97-0791-48e4-8961-b9f5fbe4513e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9333ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0186ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request f41fe3ea-b7a7-440a-b0b0-1450d46cd565
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.141ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.2073ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] SendChatMessage invoked for Session ID: session_638886477110954120
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Session validated successfully.
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Preparing payload for Go backend...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Payload prepared successfully. JSON: {"sessionId":"session_638886477110954120","messageId":"a5a2be8a-078c-4af5-8e96-2e0b331e1beb","content":"please continue with previous task","excelContext":{"workbook":"Excel add-in 12345678-1234-1234-1234-123456789012.xlsx","worksheet":"Sheet1","selectedRange":"Sheet1!A1:G1","selectedData":{"values":[["DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary"]],"formulas":[["DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary"]],"address":"Sheet1!A1:G1","rowCount":1,"colCount":7},"visibleRangeData":{"values":[["DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["","2023A","2024E","2025E","2026E","2027E","Terminal"],["Revenue Growth",0.15,0.12,0.1,0.09,0.08,0.03],["EBIT Margin",0.22,0.23,0.24,0.25,0.25,0.25],["Tax Rate",0.25,0.25,0.25,0.25,0.25,0.25],["D\u0026A % of Revenue",0.05,0.05,0.05,0.05,0.05,0.05],["Capex % of Revenue",0.07,0.07,0.07,0.07,0.07,0.07],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections"],["Revenue",1000,"","","","",""],["EBIT","","","","","",""],["Less: Taxes","","","","","",""],["NOPAT","","","","","",""],["Plus: D\u0026A","","","","","",""],["Less: Capex","","","","","",""],["Less: Change in NWC","","","","","",""],["Unlevered Free Cash Flow","","","","","",""],["","","","","","",""],["Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions"],["WACC",0.1,"","","","",""],["Terminal Growth Rate",0.03,"","","","",""],["Terminal Value","","","","","",""],["Present Value Factor","","","","","",""]],"formulas":[["DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary","DCF Valuation Model - Summary"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["","2023A","2024E","2025E","2026E","2027E","Terminal"],["Revenue Growth",0.15,0.12,0.1,0.09,0.08,0.03],["EBIT Margin",0.22,0.23,0.24,0.25,0.25,0.25],["Tax Rate",0.25,0.25,0.25,0.25,0.25,0.25],["D\u0026A % of Revenue",0.05,0.05,0.05,0.05,0.05,0.05],["Capex % of Revenue",0.07,0.07,0.07,0.07,0.07,0.07],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections"],["Revenue",1000,"","","","",""],["EBIT","","","","","",""],["Less: Taxes","","","","","",""],["NOPAT","","","","","",""],["Plus: D\u0026A","","","","","",""],["Less: Capex","","","","","",""],["Less: Change in NWC","","","","","",""],["Unlevered Free Cash Flow","","","","","",""],["","","","","","",""],["Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions"],["WACC",0.1,"","","","",""],["Terminal Growth Rate",0.03,"","","","",""],["Terminal Value","","","","","",""],["Present Value Factor","","","","","",""]],"address":"Sheet1!A1:G25","rowCount":25,"colCount":7},"workbookSummary":{"sheets":[{"name":"Sheet1","usedRange":"Sheet1!A1:G25","data":{"values":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["","2023A","2024E","2025E","2026E","2027E","Terminal"],["Revenue Growth",0.15,0.12,0.1,0.09,0.08,0.03],["EBIT Margin",0.22,0.23,0.24,0.25,0.25,0.25],["Tax Rate",0.25,0.25,0.25,0.25,0.25,0.25],["D\u0026A % of Revenue",0.05,0.05,0.05,0.05,0.05,0.05],["Capex % of Revenue",0.07,0.07,0.07,0.07,0.07,0.07],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections"],["Revenue",1000,"","","","",""],["EBIT","","","","","",""],["Less: Taxes","","","","","",""],["NOPAT","","","","","",""],["Plus: D\u0026A","","","","","",""],["Less: Capex","","","","","",""],["Less: Change in NWC","","","","","",""],["Unlevered Free Cash Flow","","","","","",""],["","","","","","",""],["Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions"],["WACC",0.1,"","","","",""],["Terminal Growth Rate",0.03,"","","","",""],["Terminal Value","","","","","",""],["Present Value Factor","","","","","",""]],"formulas":[["DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model","DCF Valuation Model"],["","","","","","",""],["Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions","Key Assumptions"],["","2023A","2024E","2025E","2026E","2027E","Terminal"],["Revenue Growth",0.15,0.12,0.1,0.09,0.08,0.03],["EBIT Margin",0.22,0.23,0.24,0.25,0.25,0.25],["Tax Rate",0.25,0.25,0.25,0.25,0.25,0.25],["D\u0026A % of Revenue",0.05,0.05,0.05,0.05,0.05,0.05],["Capex % of Revenue",0.07,0.07,0.07,0.07,0.07,0.07],["Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance","Projected Financial Performance"],["Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections","Financial Projections"],["Revenue",1000,"","","","",""],["EBIT","","","","","",""],["Less: Taxes","","","","","",""],["NOPAT","","","","","",""],["Plus: D\u0026A","","","","","",""],["Less: Capex","","","","","",""],["Less: Change in NWC","","","","","",""],["Unlevered Free Cash Flow","","","","","",""],["","","","","","",""],["Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions","Valuation Assumptions"],["WACC",0.1,"","","","",""],["Terminal Growth Rate",0.03,"","","","",""],["Terminal Value","","","","","",""],["Present Value Factor","","","","","",""]],"address":"Sheet1!A1:G25","rowCount":25,"colCount":7},"lastRow":25,"lastColumn":7}],"namedRanges":[],"activeSheet":"Sheet1","totalCells":175},"activeContext":[{"type":"selection","value":"Sheet1!A1:G1"},{"type":"edit","value":"A22:A25"},{"type":"edit","value":"B22:B23"},{"type":"edit","value":"A1:G1"}]},"autonomyMode":"agent-default","timestamp":"2025-07-20T22:37:24.617728Z"}
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] HttpClient created. Attempting to POST to http://localhost:8080//api/chat...
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/chat
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/chat
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3e0e9512-bdb3-4bda-95d0-563946d3267a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7324ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7768ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c0b09852-0ac5-4086-8e75-d450f7572b1a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7742ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8089ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 3e0e9512-bdb3-4bda-95d0-563946d3267a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.822ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8449ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request c0b09852-0ac5-4086-8e75-d450f7572b1a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8216ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8336ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 71e6b640-b73a-4237-bbd0-044bab6e4426
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.2687ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.301ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 51a90fd3-3951-4fdb-ae72-e685e599b2ae
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7795ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8672ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 98331c06-0615-4cb6-9462-2baae55dbb87
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4802ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5097ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6ca86f85-7907-4a2c-bf0d-4233d6c9a02a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.461ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.4941ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 374bf550-095f-4099-b5e8-5db206152818
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4878ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5116ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d135343c-ab22-4a94-bc34-b70b0bea0346
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.2935ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.3046ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6f86c84d-5b23-4689-b8a8-0ee75232bc43
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.4739ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.52ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b5a9475d-cdb3-413d-b731-7d1f0d8de2d9
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6267ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6935ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d3c25741-7d26-4318-be72-fc7e76bc8888
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5396ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.5772ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ceba2741-f662-45a9-8eed-601ced1dca35
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6979ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7313ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9ec0c162-775e-4531-9cb3-472638bb3e5a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1399ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.1955ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b8593d06-7bd1-4099-9fb2-01a8cab3da61
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6362ms - 200
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 8363.74ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 8363.7885ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Background POST request completed with status code: OK
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 71e6b640-b73a-4237-bbd0-044bab6e4426
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5701ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6048ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 98331c06-0615-4cb6-9462-2baae55dbb87
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5779ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6156ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 374bf550-095f-4099-b5e8-5db206152818
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6399ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6698ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6f86c84d-5b23-4689-b8a8-0ee75232bc43
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.6701ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6985ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d3c25741-7d26-4318-be72-fc7e76bc8888
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.5477ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.583ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 9ec0c162-775e-4531-9cb3-472638bb3e5a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.9543ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9845ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 51a90fd3-3951-4fdb-ae72-e685e599b2ae
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7251ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7731ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 6ca86f85-7907-4a2c-bf0d-4233d6c9a02a
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.7881ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.8429ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request d135343c-ab22-4a94-bc34-b70b0bea0346
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.581ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.6379ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b5a9475d-cdb3-413d-b731-7d1f0d8de2d9
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3.5112ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3.5649ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request ceba2741-f662-45a9-8eed-601ced1dca35
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.712ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.7607ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request b8593d06-7bd1-4099-9fb2-01a8cab3da61
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.8795ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 0.9302ms - 200

