using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace GridmateSignalR.Hubs
{
    public class GridmateHub : Hub
    {
        private static readonly ConcurrentDictionary<string, string> _sessionConnections = new();
        private static readonly ConcurrentDictionary<string, DateTime> _sessionActivity = new();
        private readonly ILogger<GridmateHub> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public GridmateHub(ILogger<GridmateHub> logger, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        // Update activity timestamp on any hub method call
        private void UpdateSessionActivity(string sessionId)
        {
            _sessionActivity[sessionId] = DateTime.UtcNow;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation($"Client connected: {Context.ConnectionId}");
            
            // Send connection success message
            await Clients.Caller.SendAsync("connected", new
            {
                connectionId = Context.ConnectionId,
                timestamp = DateTime.UtcNow
            });
            
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation($"Client disconnected: {Context.ConnectionId}");
            
            // Remove session mapping
            var sessionToRemove = _sessionConnections.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;
            if (!string.IsNullOrEmpty(sessionToRemove))
            {
                _sessionConnections.TryRemove(sessionToRemove, out _);
                _sessionActivity.TryRemove(sessionToRemove, out _);
            }
            
            await base.OnDisconnectedAsync(exception);
        }

        // Authentication method
        public async Task Authenticate(string token)
        {
            _logger.LogInformation($"Authentication attempt for connection: {Context.ConnectionId}");
            
            // For development, accept any token
            // In production, validate the token with your auth service
            if (string.IsNullOrEmpty(token))
            {
                await Clients.Caller.SendAsync("authError", "Token required");
                return;
            }

            // Generate session ID
            var sessionId = $"session_{DateTime.UtcNow.Ticks}";
            _sessionConnections[sessionId] = Context.ConnectionId;
            _sessionActivity[sessionId] = DateTime.UtcNow;
            
            await Clients.Caller.SendAsync("authSuccess", new
            {
                sessionId,
                userId = $"user_{token}",
                timestamp = DateTime.UtcNow
            });
        }

        // Join a workbook group for receiving diff broadcasts
        public async Task JoinWorkbookGroup(string workbookId)
        {
            if (string.IsNullOrEmpty(workbookId))
            {
                await Clients.Caller.SendAsync("error", "Workbook ID required");
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"workbook_{workbookId}");
            _logger.LogInformation($"Connection {Context.ConnectionId} joined workbook group: {workbookId}");
            
            await Clients.Caller.SendAsync("joinedWorkbookGroup", new
            {
                workbookId,
                timestamp = DateTime.UtcNow
            });
        }

        // Leave a workbook group
        public async Task LeaveWorkbookGroup(string workbookId)
        {
            if (string.IsNullOrEmpty(workbookId))
            {
                await Clients.Caller.SendAsync("error", "Workbook ID required");
                return;
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"workbook_{workbookId}");
            _logger.LogInformation($"Connection {Context.ConnectionId} left workbook group: {workbookId}");
            
            await Clients.Caller.SendAsync("leftWorkbookGroup", new
            {
                workbookId,
                timestamp = DateTime.UtcNow
            });
        }

        public async Task SendChatMessage(string sessionId, string content, object? excelContext = null, string autonomyMode = "agent-default", string? messageId = null)
        {
            _logger.LogInformation("[HUB] SendChatMessage invoked for Session ID: {SessionId}", sessionId);

            var connectionSessionId = _sessionConnections.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;
            if (string.IsNullOrEmpty(connectionSessionId) || connectionSessionId != sessionId)
            {
                _logger.LogWarning("[HUB] Session validation failed. Connection ID {ConnectionId} does not match Session ID {SessionId}.", Context.ConnectionId, sessionId);
                await Clients.Caller.SendAsync("error", "Session validation failed.");
                return;
            }
            _logger.LogInformation("[HUB] Session validated successfully.");

            UpdateSessionActivity(sessionId);

            object requestPayload;
            string payloadJson;

            try
            {
                _logger.LogInformation("[HUB] Preparing payload for Go backend...");
                requestPayload = new
                {
                    sessionId,
                    messageId,
                    content,
                    excelContext,
                    autonomyMode,
                    timestamp = DateTime.UtcNow
                };
                payloadJson = System.Text.Json.JsonSerializer.Serialize(requestPayload);
                _logger.LogInformation("[HUB] Payload prepared successfully. JSON: {PayloadJson}", payloadJson);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[HUB] FATAL: Failed to serialize the request payload for Session ID {SessionId}.", sessionId);
                await Clients.Caller.SendAsync("error", "Failed to serialize request payload.");
                return; // Stop execution if payload can't be created
            }

            try
            {
                var httpClient = _httpClientFactory.CreateClient("GoBackend");
                _logger.LogInformation("[HUB] HttpClient created. Attempting to POST to {BaseAddress}/api/chat...", httpClient.BaseAddress);

                var httpContent = new StringContent(payloadJson, System.Text.Encoding.UTF8, "application/json");
                
                // Fire and forget - don't wait for response since Go backend processes asynchronously
                // and will send responses via the aiResponse webhook
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var response = await httpClient.PostAsync("/api/chat", httpContent);
                        _logger.LogInformation("[HUB] Background POST request completed with status code: {StatusCode}", response.StatusCode);
                        
                        if (!response.IsSuccessStatusCode)
                        {
                            var errorBody = await response.Content.ReadAsStringAsync();
                            _logger.LogError("[HUB] Go backend returned a non-success status code {StatusCode}. Body: {ErrorBody}", response.StatusCode, errorBody);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "[HUB] Background request to Go backend failed for session {SessionId}", sessionId);
                    }
                });
                
                _logger.LogInformation("[HUB] Chat message sent to Go backend (async). Client will receive responses via aiResponse.");
                
                // Send acknowledgment to client
                await Clients.Caller.SendAsync("chatAcknowledged", new
                {
                    sessionId,
                    timestamp = DateTime.UtcNow,
                    message = "Processing your request..."
                });
            }
            catch (System.Net.Http.HttpRequestException ex)
            {
                _logger.LogError(ex, "[HUB] FATAL: HttpRequestException occurred. The Go backend is likely down or unreachable at {BaseAddress}. Check if the service is running.", _httpClientFactory.CreateClient("GoBackend").BaseAddress);
                await Clients.Caller.SendAsync("error", "Network error: Could not connect to the AI service.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[HUB] FATAL: An unexpected error occurred while forwarding the message for Session ID {SessionId}.", sessionId);
                await Clients.Caller.SendAsync("error", "An unexpected error occurred while processing your message.");
            }
        }

        // Handle selection updates from Excel add-in
        public async Task UpdateSelection(string sessionId, string selection, string worksheet)
        {
            UpdateSessionActivity(sessionId);
            _logger.LogInformation($"Selection update for session {sessionId}: {selection} on {worksheet}");
            
            try
            {
                // Forward to Go backend
                var httpClient = _httpClientFactory.CreateClient("GoBackend");
                var response = await httpClient.PostAsJsonAsync("/api/selection-update", new
                {
                    sessionId,
                    selection,
                    worksheet,
                    timestamp = DateTime.UtcNow
                });

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Backend error: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error forwarding selection update");
            }
        }

        // Handle tool responses from Excel add-in (enhanced with detailed error info)
        public async Task SendToolResponse(string requestId, object? result, string? error = null, 
            bool queued = false, string? errorDetails = null, Dictionary<string, object>? metadata = null)
        {
            _logger.LogInformation($"Tool response for request {requestId}");
            
            // Get session ID for this connection
            var sessionId = _sessionConnections.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;
            if (string.IsNullOrEmpty(sessionId))
            {
                _logger.LogError("No session found for connection");
                await Clients.Caller.SendAsync("error", new { 
                    message = "Session not found",
                    details = "Unable to find session for current connection",
                    timestamp = DateTime.UtcNow
                });
                return;
            }
            
            UpdateSessionActivity(sessionId);
            
            try
            {
                // Forward to Go backend with enhanced error information
                var httpClient = _httpClientFactory.CreateClient("GoBackend");
                var response = await httpClient.PostAsJsonAsync("/api/tool-response", new
                {
                    sessionId,
                    requestId,
                    result,
                    error,
                    errorDetails,
                    metadata,
                    queued,
                    timestamp = DateTime.UtcNow
                });

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Backend error: {response.StatusCode}, Content: {errorContent}");
                    await Clients.Caller.SendAsync("error", new {
                        message = $"Backend error: {response.StatusCode}",
                        details = errorContent,
                        timestamp = DateTime.UtcNow
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error forwarding tool response");
                await Clients.Caller.SendAsync("error", new {
                    message = "Failed to send tool response",
                    details = ex.Message,
                    stackTrace = ex.StackTrace,
                    timestamp = DateTime.UtcNow
                });
            }
        }

        // Method to receive tool requests from backend (called via HTTP from Go)
        public static async Task SendToolRequestToClient(IHubContext<GridmateHub> hubContext, string sessionId, object toolRequest)
        {
            if (_sessionConnections.TryGetValue(sessionId, out var connectionId))
            {
                await hubContext.Clients.Client(connectionId).SendAsync("toolRequest", toolRequest);
            }
        }

        // Method to receive AI responses from backend (called via HTTP from Go)
        public static async Task SendAIResponseToClient(IHubContext<GridmateHub> hubContext, string sessionId, object aiResponse)
        {
            if (_sessionConnections.TryGetValue(sessionId, out var connectionId))
            {
                await hubContext.Clients.Client(connectionId).SendAsync("aiResponse", aiResponse);
            }
        }

        // Method to get session activity for cleanup purposes
        public static Dictionary<string, DateTime> GetSessionActivity()
        {
            return new Dictionary<string, DateTime>(_sessionActivity);
        }

        // Method to remove a session (for cleanup purposes)
        public static void RemoveSession(string sessionId)
        {
            _sessionConnections.TryRemove(sessionId, out _);
            _sessionActivity.TryRemove(sessionId, out _);
        }

        // Heartbeat method to keep sessions alive
        public Task Heartbeat(string sessionId)
        {
            UpdateSessionActivity(sessionId);
            _logger.LogDebug("Heartbeat received for session: {SessionId}", sessionId);
            return Task.CompletedTask;
        }
    }
}