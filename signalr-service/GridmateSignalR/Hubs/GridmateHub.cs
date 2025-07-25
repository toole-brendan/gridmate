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
                try
                {
                    // Log response details for debugging
                    var responseJson = System.Text.Json.JsonSerializer.Serialize(aiResponse);
                    Console.WriteLine($"[HUB RELAY] Sending AI response to session {sessionId}. Size: {responseJson.Length} chars");
                    
                    await hubContext.Clients.Client(connectionId).SendAsync("aiResponse", aiResponse);
                    
                    // Update activity
                    _sessionActivity[sessionId] = DateTime.UtcNow;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[HUB RELAY ERROR] Failed to send AI response to session {sessionId}: {ex.Message}");
                }
            }
            else
            {
                Console.WriteLine($"[HUB RELAY WARNING] No connection found for session {sessionId} when sending AI response");
            }
        }
        
        // Method to send streaming chunks to client (called via HTTP from Go)
        public static async Task SendStreamChunkToClient(IHubContext<GridmateHub> hubContext, string sessionId, object chunk)
        {
            var logger = hubContext as ILogger<GridmateHub> ?? null;
            
            if (_sessionConnections.TryGetValue(sessionId, out var connectionId))
            {
                try
                {
                    // Log chunk details for debugging
                    var chunkJson = System.Text.Json.JsonSerializer.Serialize(chunk);
                    Console.WriteLine($"[HUB RELAY] Sending chunk to session {sessionId}: {chunkJson.Substring(0, Math.Min(chunkJson.Length, 200))}...");
                    
                    await hubContext.Clients.Client(connectionId).SendAsync("streamChunk", chunk);
                    
                    // Update activity
                    _sessionActivity[sessionId] = DateTime.UtcNow;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[HUB RELAY ERROR] Failed to send chunk to session {sessionId}: {ex.Message}");
                }
            }
            else
            {
                Console.WriteLine($"[HUB RELAY WARNING] No connection found for session {sessionId}");
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
        
        // Streaming chat support - proxy to Go backend
        public async Task StreamChat(string sessionId, string content, string autonomyMode)
        {
            UpdateSessionActivity(sessionId);
            _logger.LogInformation("[HUB] StreamChat request received for session {SessionId}", sessionId);
            
            try
            {
                var httpClient = _httpClientFactory.CreateClient("GoBackend");
                
                // Build query parameters
                var queryParams = new Dictionary<string, string>
                {
                    { "sessionId", sessionId },
                    { "content", content },
                    { "autonomyMode", autonomyMode ?? "auto" },
                    { "token", "dev-token-123" }
                };
                
                var queryString = string.Join("&", queryParams.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value)}"));
                var streamUrl = $"/api/chat/stream?{queryString}";
                
                _logger.LogInformation("[HUB] Starting streaming request to {StreamUrl}", streamUrl);
                
                // Use a more compatible approach for SSE
                var request = new HttpRequestMessage(HttpMethod.Get, streamUrl);
                request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("text/event-stream"));
                
                using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
                
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("[HUB] Streaming request failed: {StatusCode} - {Error}", response.StatusCode, error);
                    await Clients.Caller.SendAsync("streamError", new
                    {
                        error = $"Backend error: {response.StatusCode}",
                        details = error,
                        sessionId,
                        timestamp = DateTime.UtcNow
                    });
                    return;
                }
                
                // Read the SSE stream
                using var stream = await response.Content.ReadAsStreamAsync();
                using var reader = new StreamReader(stream);
                
                var buffer = new List<string>();
                string line;
                int chunkCount = 0;
                var startTime = DateTime.UtcNow;
                
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    if (line.StartsWith("data: "))
                    {
                        var data = line.Substring(6);
                        if (!string.IsNullOrWhiteSpace(data))
                        {
                            chunkCount++;
                            var elapsed = (DateTime.UtcNow - startTime).TotalMilliseconds;
                            
                            _logger.LogDebug("[HUB] Forwarding chunk #{ChunkNumber} at {ElapsedMs}ms: {DataLength} chars", 
                                chunkCount, elapsed, data.Length);
                            
                            await Clients.Caller.SendAsync("streamChunk", data);
                            
                            // Add a small delay to ensure chunks are sent separately
                            if (chunkCount > 1)
                            {
                                await Task.Delay(10); // 10ms delay between chunks
                            }
                        }
                    }
                    else if (string.IsNullOrWhiteSpace(line) && buffer.Count > 0)
                    {
                        // Empty line signals end of event
                        buffer.Clear();
                    }
                }
                
                var totalElapsed = (DateTime.UtcNow - startTime).TotalMilliseconds;
                _logger.LogInformation("[HUB] Streaming completed for session {SessionId}. Total chunks: {ChunkCount}, Duration: {DurationMs}ms", 
                    sessionId, chunkCount, totalElapsed);
                    
                await Clients.Caller.SendAsync("streamComplete", new
                {
                    sessionId,
                    timestamp = DateTime.UtcNow,
                    totalChunks = chunkCount,
                    durationMs = totalElapsed
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[HUB] Streaming failed for session {SessionId}", sessionId);
                await Clients.Caller.SendAsync("streamError", new
                {
                    error = ex.Message,
                    sessionId,
                    timestamp = DateTime.UtcNow
                });
            }
        }
        
        // Debug endpoint: Get streaming health status
        public async Task GetStreamingHealth(string sessionId)
        {
            _logger.LogInformation("[HUB DEBUG] GetStreamingHealth called for session {SessionId}", sessionId);
            
            var health = new
            {
                sessionId,
                connectionId = Context.ConnectionId,
                isConnected = _sessionConnections.ContainsKey(sessionId),
                lastActivity = _sessionActivity.TryGetValue(sessionId, out var activity) ? activity : (DateTime?)null,
                timestamp = DateTime.UtcNow,
                sessionCount = _sessionConnections.Count,
                activeSessionCount = _sessionActivity.Count(x => x.Value > DateTime.UtcNow.AddMinutes(-5))
            };
            
            await Clients.Caller.SendAsync("streamingHealth", health);
            _logger.LogInformation("[HUB DEBUG] Streaming health: {@Health}", health);
        }
        
        // Debug endpoint: Trace streaming phases
        public async Task TraceStreamingPhases(string sessionId, bool enable)
        {
            _logger.LogInformation("[HUB DEBUG] TraceStreamingPhases called for session {SessionId}, enable: {Enable}", sessionId, enable);
            
            // Store tracing preference (in production, this would be per-session)
            var traceKey = $"trace_{sessionId}";
            
            await Clients.Caller.SendAsync("tracingEnabled", new
            {
                sessionId,
                enabled = enable,
                timestamp = DateTime.UtcNow
            });
        }
        
        // Debug endpoint: Simulate streaming with phases
        public async Task SimulatePhaseStreaming(string sessionId, string message)
        {
            _logger.LogInformation("[HUB DEBUG] SimulatePhaseStreaming called for session {SessionId}", sessionId);
            UpdateSessionActivity(sessionId);
            
            try
            {
                // Phase 1: Initial acknowledgment
                await Clients.Caller.SendAsync("streamChunk", System.Text.Json.JsonSerializer.Serialize(new
                {
                    type = "phase_change",
                    phase = "initial",
                    timestamp = DateTime.UtcNow
                }));
                
                await Task.Delay(100);
                
                // Send initial text
                var initialText = "I'll help you with that. Let me analyze your request...\n\n";
                foreach (var word in initialText.Split(' '))
                {
                    await Clients.Caller.SendAsync("streamChunk", System.Text.Json.JsonSerializer.Serialize(new
                    {
                        type = "text",
                        delta = word + " ",
                        timestamp = DateTime.UtcNow
                    }));
                    await Task.Delay(50);
                }
                
                // Phase 2: Tool execution
                if (message.ToLower().Contains("create") || message.ToLower().Contains("formula"))
                {
                    await Clients.Caller.SendAsync("streamChunk", System.Text.Json.JsonSerializer.Serialize(new
                    {
                        type = "phase_change",
                        phase = "tool_execution",
                        timestamp = DateTime.UtcNow
                    }));
                    
                    await Task.Delay(500);
                    
                    // Simulate tool call
                    await Clients.Caller.SendAsync("streamChunk", System.Text.Json.JsonSerializer.Serialize(new
                    {
                        type = "tool_start",
                        tool = new { id = "test_tool_1", name = "write_range" },
                        timestamp = DateTime.UtcNow
                    }));
                    
                    await Task.Delay(1000);
                    
                    await Clients.Caller.SendAsync("streamChunk", System.Text.Json.JsonSerializer.Serialize(new
                    {
                        type = "tool_complete",
                        tool = new { id = "test_tool_1", name = "write_range" },
                        timestamp = DateTime.UtcNow
                    }));
                }
                
                // Phase 3: Continuation
                await Clients.Caller.SendAsync("streamChunk", System.Text.Json.JsonSerializer.Serialize(new
                {
                    type = "phase_change",
                    phase = "continuation",
                    timestamp = DateTime.UtcNow
                }));
                
                await Task.Delay(100);
                
                // Send continuation text
                var continuationText = "\n\nI've completed the operation successfully.";
                foreach (var word in continuationText.Split(' '))
                {
                    await Clients.Caller.SendAsync("streamChunk", System.Text.Json.JsonSerializer.Serialize(new
                    {
                        type = "text",
                        delta = word + " ",
                        timestamp = DateTime.UtcNow
                    }));
                    await Task.Delay(50);
                }
                
                // Phase 4: Final
                await Clients.Caller.SendAsync("streamChunk", System.Text.Json.JsonSerializer.Serialize(new
                {
                    type = "phase_change",
                    phase = "final",
                    timestamp = DateTime.UtcNow
                }));
                
                await Clients.Caller.SendAsync("streamComplete", new
                {
                    sessionId,
                    timestamp = DateTime.UtcNow,
                    debug = true,
                    phases = new[] { "initial", "tool_execution", "continuation", "final" }
                });
                
                _logger.LogInformation("[HUB DEBUG] Phase simulation completed for session {SessionId}", sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[HUB DEBUG] Phase simulation failed for session {SessionId}", sessionId);
                await Clients.Caller.SendAsync("streamError", new
                {
                    error = ex.Message,
                    sessionId,
                    timestamp = DateTime.UtcNow,
                    debug = true
                });
            }
        }
        
        // Test streaming endpoint for debugging
        public async Task TestStream()
        {
            _logger.LogInformation("[HUB] TestStream request received");
            
            try
            {
                var httpClient = _httpClientFactory.CreateClient("GoBackend");
                var streamUrl = "/api/test/stream";
                
                _logger.LogInformation("[HUB] Starting test streaming request");
                
                var request = new HttpRequestMessage(HttpMethod.Get, streamUrl);
                request.Headers.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("text/event-stream"));
                
                using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
                
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("[HUB] Test streaming request failed: {StatusCode} - {Error}", response.StatusCode, error);
                    await Clients.Caller.SendAsync("streamError", new
                    {
                        error = $"Test stream error: {response.StatusCode}",
                        details = error,
                        timestamp = DateTime.UtcNow
                    });
                    return;
                }
                
                // Read the SSE stream
                using var stream = await response.Content.ReadAsStreamAsync();
                using var reader = new StreamReader(stream);
                
                string line;
                int chunkCount = 0;
                var startTime = DateTime.UtcNow;
                
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    if (line.StartsWith("data: "))
                    {
                        var data = line.Substring(6);
                        if (!string.IsNullOrWhiteSpace(data))
                        {
                            chunkCount++;
                            var elapsed = (DateTime.UtcNow - startTime).TotalMilliseconds;
                            
                            _logger.LogInformation("[HUB TEST] Forwarding chunk #{ChunkNumber} at {ElapsedMs}ms: {Data}", 
                                chunkCount, elapsed, data);
                            
                            await Clients.Caller.SendAsync("streamChunk", data);
                            
                            // Ensure chunks are sent separately
                            await Task.Delay(5);
                        }
                    }
                }
                
                var totalElapsed = (DateTime.UtcNow - startTime).TotalMilliseconds;
                _logger.LogInformation("[HUB TEST] Test streaming completed. Total chunks: {ChunkCount}, Duration: {DurationMs}ms", 
                    chunkCount, totalElapsed);
                    
                await Clients.Caller.SendAsync("streamComplete", new
                {
                    test = true,
                    timestamp = DateTime.UtcNow,
                    totalChunks = chunkCount,
                    durationMs = totalElapsed
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[HUB] Test streaming failed");
                await Clients.Caller.SendAsync("streamError", new
                {
                    error = ex.Message,
                    test = true,
                    timestamp = DateTime.UtcNow
                });
            }
        }
    }
}