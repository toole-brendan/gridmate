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

        // Send chat message to backend
        public async Task SendChatMessage(string sessionId, string content, object excelContext = null, string autonomyMode = "agent-default")
        {
            UpdateSessionActivity(sessionId);
            _logger.LogInformation($"Chat message from session {sessionId}: {content}");
            if (excelContext != null)
            {
                _logger.LogInformation($"Excel context provided: {System.Text.Json.JsonSerializer.Serialize(excelContext)}");
            }
            _logger.LogInformation($"Autonomy mode: {autonomyMode}");
            
            try
            {
                // Forward to Go backend
                var httpClient = _httpClientFactory.CreateClient("GoBackend");
                var response = await httpClient.PostAsJsonAsync("/api/chat", new
                {
                    sessionId,
                    content,
                    excelContext,
                    autonomyMode,
                    timestamp = DateTime.UtcNow
                });

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation($"Backend response: {result}");
                }
                else
                {
                    _logger.LogError($"Backend error: {response.StatusCode}");
                    await Clients.Caller.SendAsync("error", $"Backend error: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error forwarding to backend");
                await Clients.Caller.SendAsync("error", "Failed to process message");
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

        // Handle tool responses from Excel add-in
        public async Task SendToolResponse(string requestId, object result, string error = null, bool queued = false)
        {
            _logger.LogInformation($"Tool response for request {requestId}");
            
            // Get session ID for this connection
            var sessionId = _sessionConnections.FirstOrDefault(x => x.Value == Context.ConnectionId).Key;
            if (string.IsNullOrEmpty(sessionId))
            {
                _logger.LogError("No session found for connection");
                await Clients.Caller.SendAsync("error", "Session not found");
                return;
            }
            
            UpdateSessionActivity(sessionId);
            
            try
            {
                // Forward to Go backend
                var httpClient = _httpClientFactory.CreateClient("GoBackend");
                var response = await httpClient.PostAsJsonAsync("/api/tool-response", new
                {
                    sessionId,
                    requestId,
                    result,
                    error,
                    queued,
                    timestamp = DateTime.UtcNow
                });

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError($"Backend error: {response.StatusCode}");
                    await Clients.Caller.SendAsync("error", $"Backend error: {response.StatusCode}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error forwarding tool response");
                await Clients.Caller.SendAsync("error", "Failed to send tool response");
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