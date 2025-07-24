Last login: Thu Jul 24 17:27:02 on ttys051
cd '/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https
--- .NET SignalR Service ---
Using launch settings from /Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR/Properties/launchSettings.json...
Building...
/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR/Hubs/GridmateHub.cs(389,32): warning CS8600: Converting null literal or possible null value to non-nullable type.
/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR/Hubs/GridmateHub.cs(480,32): warning CS8600: Converting null literal or possible null value to non-nullable type.
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
      Client connected: trCIMokb1DaVDPOmIsaAFQ
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: trCIMokb1DaVDPOmIsaAFQ
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] StreamChat request received for session session_638889908495158730
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Starting streaming request to /api/chat/stream?sessionId=session_638889908495158730&content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data&autonomyMode=agent-default&token=dev-token-123
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3246.775ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3259.7635ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Streaming completed for session session_638889908495158730. Total chunks: 44, Duration: 30426.03ms
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request daad36d7-9fcd-4413-a8bf-fbf98a484373
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.9901ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 2.0498ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request daad36d7-9fcd-4413-a8bf-fbf98a484373
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 1.1423ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.24ms - 200

