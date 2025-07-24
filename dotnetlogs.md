Last login: Thu Jul 24 16:33:14 on ttys045
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
      Client connected: 6tAQxhvfxpHZDaeJ6gKSow
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: 6tAQxhvfxpHZDaeJ6gKSow
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] StreamChat request received for session session_638889883210942510
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Starting streaming request to /api/chat/stream?sessionId=session_638889883210942510&content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data&autonomyMode=agent-default&token=dev-token-123
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 4715.158ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 4726.6241ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Streaming completed for session session_638889883210942510. Total chunks: 29, Duration: 30088.839ms
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 442e03c6-7c14-44bc-aca8-e0082165321e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3.8936ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 4.0347ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 442e03c6-7c14-44bc-aca8-e0082165321e
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 0.994ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 1.0645ms - 200

