Last login: Thu Jul 24 12:07:44 on ttys028
cd '/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https
brendantoole@Mac ~ % cd '/Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https
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
      Client connected: i4WlkHcdSxMrY_STLOQy9Q
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: i4WlkHcdSxMrY_STLOQy9Q
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] StreamChat request received for session session_638889702454265550
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Starting streaming request to /api/chat/stream?sessionId=session_638889702454265550&content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data&autonomyMode=agent-default&token=dev-token-123
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3377.8887ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3389.5745ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Streaming completed for session session_638889702454265550. Total chunks: 41, Duration: 443.238ms

