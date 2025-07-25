Last login: Thu Jul 24 20:47:55 on ttys059
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
      Client connected: Zn3OqRCmYX4X-mZzUcr48Q
info: GridmateSignalR.Hubs.GridmateHub[0]
      Authentication attempt for connection: Zn3OqRCmYX4X-mZzUcr48Q
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] StreamChat request received for session session_638890018388161680
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Starting streaming request to /api/chat/stream?sessionId=session_638890018388161680&content=Please%20make%20DCF%20model%20in%20this%20sheet%2C%20use%20mock%20data&autonomyMode=agent-default&token=dev-token-123
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request GET http://localhost:8080/api/chat/stream?*
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 3477.6277ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 3492.9306ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      [HUB] Streaming completed for session session_638890018388161680. Total chunks: 50, Duration: 30326.554ms
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0efc5932-03ec-4322-b560-a86923eeff78
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[101]
      Received HTTP response headers after 4.5053ms - 200
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[101]
      End processing HTTP request after 4.6225ms - 200
info: GridmateSignalR.Hubs.GridmateHub[0]
      Tool response for request 0efc5932-03ec-4322-b560-a86923eeff78
info: System.Net.Http.HttpClient.GoBackend.LogicalHandler[100]
      Start processing HTTP request POST http://localhost:8080/api/tool-response
info: System.Net.Http.HttpClient.GoBackend.ClientHandler[100]
      Sending HTTP request POST http://localhost:8080/api/tool-response
fail: GridmateSignalR.Hubs.GridmateHub[0]
      Error forwarding tool response
      System.Threading.Tasks.TaskCanceledException: The request was canceled due to the configured HttpClient.Timeout of 100 seconds elapsing.
       ---> System.TimeoutException: The operation was canceled.
       ---> System.Threading.Tasks.TaskCanceledException: The operation was canceled.
       ---> System.Net.Http.HttpIOException: The response ended prematurely. (ResponseEnded)
         at System.Net.Http.HttpConnection.SendAsync(HttpRequestMessage request, Boolean async, CancellationToken cancellationToken)
         --- End of inner exception stack trace ---
         at System.Net.Http.HttpConnection.SendAsync(HttpRequestMessage request, Boolean async, CancellationToken cancellationToken)
         at System.Net.Http.HttpConnectionPool.SendWithVersionDetectionAndRetryAsync(HttpRequestMessage request, Boolean async, Boolean doRequestAuth, CancellationToken cancellationToken)
         at System.Net.Http.RedirectHandler.SendAsync(HttpRequestMessage request, Boolean async, CancellationToken cancellationToken)
         at Microsoft.Extensions.Http.Logging.LoggingHttpMessageHandler.<SendCoreAsync>g__Core|4_0(HttpRequestMessage request, Boolean useAsync, CancellationToken cancellationToken)
         at Microsoft.Extensions.Http.Logging.LoggingScopeHttpMessageHandler.<SendCoreAsync>g__Core|4_0(HttpRequestMessage request, Boolean useAsync, CancellationToken cancellationToken)
         at System.Net.Http.HttpClient.<SendAsync>g__Core|83_0(HttpRequestMessage request, HttpCompletionOption completionOption, CancellationTokenSource cts, Boolean disposeCts, CancellationTokenSource pendingRequestsCts, CancellationToken originalCancellationToken)
         --- End of inner exception stack trace ---
         --- End of inner exception stack trace ---
         at System.Net.Http.HttpClient.HandleFailure(Exception e, Boolean telemetryStarted, HttpResponseMessage response, CancellationTokenSource cts, CancellationToken cancellationToken, CancellationTokenSource pendingRequestsCts)
         at System.Net.Http.HttpClient.<SendAsync>g__Core|83_0(HttpRequestMessage request, HttpCompletionOption completionOption, CancellationTokenSource cts, Boolean disposeCts, CancellationTokenSource pendingRequestsCts, CancellationToken originalCancellationToken)
         at GridmateSignalR.Hubs.GridmateHub.SendToolResponse(String requestId, Object result, String error, Boolean queued, String errorDetails, Dictionary`2 metadata) in /Users/brendantoole/projects2/gridmate/signalr-service/GridmateSignalR/Hubs/GridmateHub.cs:line 262

