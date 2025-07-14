using Microsoft.AspNetCore.SignalR;
using GridmateSignalR.Hubs;

namespace GridmateSignalR.Services
{
    public class SessionCleanupService : BackgroundService
    {
        private readonly IHubContext<GridmateHub> _hubContext;
        private readonly ILogger<SessionCleanupService> _logger;
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromMinutes(5);
        private readonly TimeSpan _sessionTimeout = TimeSpan.FromMinutes(30);

        public SessionCleanupService(IHubContext<GridmateHub> hubContext, ILogger<SessionCleanupService> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("SessionCleanupService started");
            
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_cleanupInterval, stoppingToken);
                    CleanupInactiveSessions();
                }
                catch (TaskCanceledException)
                {
                    // This is expected when cancellation is requested
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during session cleanup");
                }
            }
            
            _logger.LogInformation("SessionCleanupService stopped");
        }

        private void CleanupInactiveSessions()
        {
            var cutoff = DateTime.UtcNow - _sessionTimeout;
            var sessionActivity = GridmateHub.GetSessionActivity();
            
            var toRemove = sessionActivity
                .Where(kvp => kvp.Value < cutoff)
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (var sessionId in toRemove)
            {
                GridmateHub.RemoveSession(sessionId);
                _logger.LogInformation("Removed inactive session: {SessionId}", sessionId);
            }

            if (toRemove.Count > 0)
            {
                _logger.LogInformation("Cleaned up {Count} inactive sessions", toRemove.Count);
            }
        }
    }
}