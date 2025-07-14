# Session Cleanup and Format Error Fix Implementation Plan

## Overview

This document outlines the implementation plan to address two critical issues identified in the Gridmate application:
1. **Session Cleanup Issue**: Old sessions aren't being properly cleaned up, leading to memory leaks
2. **Format Error Issue**: Some Excel formatting operations fail with "invalid or missing argument" errors

## Issue #1: Session Cleanup

### Current State Analysis

#### Problem Description
- Multiple sessions remain active even after users disconnect
- Sessions are tracked in multiple places without centralized management
- No timeout-based cleanup for abnormal disconnections
- Memory usage grows over time due to stale sessions

#### Root Causes
1. **SignalR sessions** only cleaned on proper disconnect events
2. **No periodic database cleanup** job running
3. **Session tracking fragmented** across SignalR, ExcelBridge, WebSocket Hub, and Database
4. **No handling for abnormal disconnections** (network failures, browser crashes)

#### Current Session Storage Locations
- **SignalR Service**: In-memory `_sessionConnections` dictionary
- **Backend Database**: PostgreSQL `sessions` table
- **ExcelBridge**: In-memory map with mutex protection
- **WebSocket Hub**: Active client connections map

### Implementation Plan

#### Phase 1: Immediate Fixes (2-3 hours)

##### 1.1 Add Database Cleanup Job
**File**: `backend/cmd/api/main.go`

Add after server initialization:
```go
// Start periodic session cleanup
go func() {
    ticker := time.NewTicker(15 * time.Minute)
    defer ticker.Stop()
    
    for range ticker.C {
        ctx := context.Background()
        deleted, err := sessionRepo.CleanupExpired(ctx)
        if err != nil {
            logger.Error("Failed to cleanup expired sessions", "error", err)
        } else {
            logger.Info("Cleaned up expired sessions", "count", deleted)
        }
    }
}()
```

##### 1.2 Add SignalR Session Activity Tracking
**File**: `signalr-service/GridmateSignalR/Hubs/GridmateHub.cs`

Add to class:
```csharp
private static readonly ConcurrentDictionary<string, DateTime> _sessionActivity = new();

// Update activity timestamp on any hub method call
private void UpdateSessionActivity(string sessionId)
{
    _sessionActivity[sessionId] = DateTime.UtcNow;
}
```

Update `Authenticate` method:
```csharp
_sessionActivity[sessionId] = DateTime.UtcNow;
```

Update all hub methods to call `UpdateSessionActivity`.

#### Phase 2: Timeout-Based Cleanup (3-4 hours)

##### 2.1 Implement SignalR Session Timeout
**File**: `signalr-service/GridmateSignalR/Program.cs`

Add hosted service for cleanup:
```csharp
public class SessionCleanupService : BackgroundService
{
    private readonly IHubContext<GridmateHub> _hubContext;
    private readonly ILogger<SessionCleanupService> _logger;
    private readonly TimeSpan _cleanupInterval = TimeSpan.FromMinutes(5);
    private readonly TimeSpan _sessionTimeout = TimeSpan.FromMinutes(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(_cleanupInterval, stoppingToken);
            CleanupInactiveSessions();
        }
    }

    private void CleanupInactiveSessions()
    {
        var cutoff = DateTime.UtcNow - _sessionTimeout;
        var toRemove = GridmateHub._sessionActivity
            .Where(kvp => kvp.Value < cutoff)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var sessionId in toRemove)
        {
            GridmateHub.RemoveSession(sessionId);
            _logger.LogInformation("Removed inactive session: {SessionId}", sessionId);
        }
    }
}
```

Register in `Program.cs`:
```csharp
builder.Services.AddHostedService<SessionCleanupService>();
```

##### 2.2 Add Heartbeat Mechanism
**File**: `excel-addin/src/services/signalr/SignalRClient.ts`

Add heartbeat:
```typescript
private startHeartbeat(): void {
  this.heartbeatInterval = setInterval(async () => {
    if (this.connection?.state === signalR.HubConnectionState.Connected && this.sessionId) {
      try {
        await this.connection.invoke('Heartbeat', this.sessionId)
        console.log('💓 Heartbeat sent')
      } catch (error) {
        console.error('Failed to send heartbeat:', error)
      }
    }
  }, 60000) // Every minute
}

private stopHeartbeat(): void {
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval)
    this.heartbeatInterval = null
  }
}
```

**File**: `signalr-service/GridmateSignalR/Hubs/GridmateHub.cs`

Add method:
```csharp
public Task Heartbeat(string sessionId)
{
    UpdateSessionActivity(sessionId);
    return Task.CompletedTask;
}
```

#### Phase 3: Centralized Session Management (4-5 hours)

##### 3.1 Create Session Manager Service
**File**: `backend/internal/services/session_manager.go`

```go
package services

import (
    "context"
    "sync"
    "time"
)

type SessionType string

const (
    SessionTypeSignalR   SessionType = "signalr"
    SessionTypeWebSocket SessionType = "websocket"
    SessionTypeAPI       SessionType = "api"
)

type SessionInfo struct {
    ID          string
    Type        SessionType
    UserID      string
    CreatedAt   time.Time
    LastActivity time.Time
    Metadata    map[string]interface{}
}

type SessionManager struct {
    sessions map[string]*SessionInfo
    mu       sync.RWMutex
    logger   *logrus.Logger
}

func NewSessionManager(logger *logrus.Logger) *SessionManager {
    sm := &SessionManager{
        sessions: make(map[string]*SessionInfo),
        logger:   logger,
    }
    go sm.cleanupLoop()
    return sm
}

func (sm *SessionManager) RegisterSession(session *SessionInfo) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    sm.sessions[session.ID] = session
    sm.logger.WithFields(logrus.Fields{
        "session_id": session.ID,
        "type":       session.Type,
        "user_id":    session.UserID,
    }).Info("Session registered")
}

func (sm *SessionManager) UnregisterSession(sessionID string) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    if session, ok := sm.sessions[sessionID]; ok {
        delete(sm.sessions, sessionID)
        sm.logger.WithFields(logrus.Fields{
            "session_id": sessionID,
            "type":       session.Type,
            "duration":   time.Since(session.CreatedAt),
        }).Info("Session unregistered")
    }
}

func (sm *SessionManager) UpdateActivity(sessionID string) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    if session, ok := sm.sessions[sessionID]; ok {
        session.LastActivity = time.Now()
    }
}

func (sm *SessionManager) GetActiveSessions() map[string]*SessionInfo {
    sm.mu.RLock()
    defer sm.mu.RUnlock()
    
    // Return a copy to prevent external modifications
    copy := make(map[string]*SessionInfo)
    for k, v := range sm.sessions {
        copy[k] = v
    }
    return copy
}

func (sm *SessionManager) cleanupLoop() {
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()
    
    for range ticker.C {
        sm.cleanupInactiveSessions()
    }
}

func (sm *SessionManager) cleanupInactiveSessions() {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    
    cutoff := time.Now().Add(-30 * time.Minute)
    toRemove := []string{}
    
    for id, session := range sm.sessions {
        if session.LastActivity.Before(cutoff) {
            toRemove = append(toRemove, id)
        }
    }
    
    for _, id := range toRemove {
        delete(sm.sessions, id)
        sm.logger.WithField("session_id", id).Info("Cleaned up inactive session")
    }
}
```

##### 3.2 Integrate Session Manager
Update `main.go` to initialize and inject SessionManager into services.

#### Phase 4: Monitoring and Metrics (2-3 hours)

##### 4.1 Add Session Metrics Endpoint
**File**: `backend/internal/handlers/metrics_handler.go`

```go
func (h *MetricsHandler) GetSessionMetrics(w http.ResponseWriter, r *http.Request) {
    sessions := h.sessionManager.GetActiveSessions()
    
    metrics := map[string]interface{}{
        "total_sessions": len(sessions),
        "by_type": map[string]int{},
        "oldest_session": time.Time{},
        "average_age": time.Duration(0),
    }
    
    // Calculate metrics...
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(metrics)
}
```

##### 4.2 Add Health Check
Include session count in health check endpoint to monitor for leaks.

### Testing Strategy

1. **Unit Tests**
   - Test session timeout logic
   - Test cleanup algorithms
   - Test concurrent access patterns

2. **Integration Tests**
   - Test SignalR disconnection scenarios
   - Test database cleanup
   - Test heartbeat mechanism

3. **Load Tests**
   - Create many sessions and verify cleanup
   - Test memory usage over time
   - Verify no race conditions

## Issue #2: Format Error Fix

### Current State Analysis

#### Problem Description
- Format operations randomly fail with "The argument is invalid or missing or has an incorrect format"
- Errors occur specifically with font formatting (bold property)
- Number formatting generally succeeds

#### Root Causes
1. **Excel API expects colors without `#` prefix**
2. **Complex loading patterns** causing timing issues
3. **No validation** of format parameters before sending
4. **Poor error messages** from Excel API

### Implementation Plan

#### Phase 1: Parameter Validation (2 hours)

##### 1.1 Create Format Validator
**File**: `backend/internal/services/excel/format_validator.go`

```go
package excel

import (
    "fmt"
    "regexp"
    "strings"
)

type FormatValidator struct{}

func NewFormatValidator() *FormatValidator {
    return &FormatValidator{}
}

func (fv *FormatValidator) ValidateFormat(format *ai.CellFormat) error {
    if format == nil {
        return nil
    }
    
    // Validate number format
    if format.NumberFormat != "" {
        if err := fv.validateNumberFormat(format.NumberFormat); err != nil {
            return fmt.Errorf("invalid number format: %w", err)
        }
    }
    
    // Validate font
    if format.Font != nil {
        if err := fv.validateFont(format.Font); err != nil {
            return fmt.Errorf("invalid font: %w", err)
        }
    }
    
    // Validate colors
    if format.FillColor != "" {
        format.FillColor = fv.normalizeColor(format.FillColor)
    }
    
    // Validate alignment
    if format.Alignment != nil {
        if err := fv.validateAlignment(format.Alignment); err != nil {
            return fmt.Errorf("invalid alignment: %w", err)
        }
    }
    
    return nil
}

func (fv *FormatValidator) validateNumberFormat(format string) error {
    // Add validation logic for common Excel number formats
    validFormats := []string{
        "#,##0", "#,##0.00", "0.00%", "$#,##0.00",
        "0.0%", "#,##0.0", "0.000", 
    }
    
    // Check if it matches known formats or patterns
    for _, valid := range validFormats {
        if format == valid {
            return nil
        }
    }
    
    // Allow custom formats but validate basic structure
    if strings.ContainsAny(format, "0#$%") {
        return nil
    }
    
    return fmt.Errorf("unrecognized number format: %s", format)
}

func (fv *FormatValidator) validateFont(font *ai.FontFormat) error {
    if font.Size < 1 || font.Size > 409 {
        return fmt.Errorf("font size must be between 1 and 409, got %f", font.Size)
    }
    
    if font.Color != "" {
        font.Color = fv.normalizeColor(font.Color)
    }
    
    return nil
}

func (fv *FormatValidator) normalizeColor(color string) string {
    // Remove # prefix if present
    color = strings.TrimPrefix(color, "#")
    
    // Validate hex format
    if match, _ := regexp.MatchString("^[0-9A-Fa-f]{6}$", color); !match {
        // Return default black if invalid
        return "000000"
    }
    
    return strings.ToUpper(color)
}

func (fv *FormatValidator) validateAlignment(align *ai.AlignmentFormat) error {
    validHorizontal := []string{"left", "center", "right", "fill", "justify"}
    validVertical := []string{"top", "middle", "bottom"}
    
    if align.Horizontal != "" {
        valid := false
        for _, v := range validHorizontal {
            if align.Horizontal == v {
                valid = true
                break
            }
        }
        if !valid {
            return fmt.Errorf("invalid horizontal alignment: %s", align.Horizontal)
        }
    }
    
    if align.Vertical != "" {
        valid := false
        for _, v := range validVertical {
            if align.Vertical == v {
                valid = true
                break
            }
        }
        if !valid {
            return fmt.Errorf("invalid vertical alignment: %s", align.Vertical)
        }
    }
    
    return nil
}
```

##### 1.2 Integrate Validator
**File**: `backend/internal/services/excel/excel_bridge_impl.go`

Update `FormatRange` method:
```go
func (b *BridgeImpl) FormatRange(ctx context.Context, sessionID string, rangeAddr string, format *ai.CellFormat) error {
    // Validate format before sending
    validator := NewFormatValidator()
    if err := validator.ValidateFormat(format); err != nil {
        return fmt.Errorf("format validation failed: %w", err)
    }
    
    // Continue with existing logic...
}
```

#### Phase 2: Excel API Improvements (3 hours)

##### 2.1 Simplify Format Application
**File**: `excel-addin/src/services/excel/ExcelService.ts`

Already implemented in investigation - ensure the simplified approach is maintained.

##### 2.2 Add Retry Logic
**File**: `excel-addin/src/services/excel/ExcelService.ts`

```typescript
private async retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error)
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
      }
    }
  }
  
  throw lastError
}

// Use in toolFormatRange:
async toolFormatRange(params: any): Promise<any> {
  return this.retryOperation(async () => {
    // Existing format logic
  })
}
```

#### Phase 3: Error Handling Enhancement (2 hours)

##### 3.1 Create Format Error Handler
**File**: `excel-addin/src/utils/formatErrorHandler.ts`

```typescript
export class FormatErrorHandler {
  static handleFormatError(error: Error, params: any): string {
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('invalid') && errorMessage.includes('argument')) {
      // Analyze parameters to provide specific guidance
      const suggestions: string[] = []
      
      if (params.font?.color && params.font.color.startsWith('#')) {
        suggestions.push('Remove # from color values')
      }
      
      if (params.font?.size && (params.font.size < 1 || params.font.size > 409)) {
        suggestions.push('Font size must be between 1 and 409')
      }
      
      if (params.fillColor && !isValidHexColor(params.fillColor)) {
        suggestions.push('Fill color must be valid hex format')
      }
      
      if (suggestions.length > 0) {
        return `Format error: ${error.message}. Suggestions: ${suggestions.join(', ')}`
      }
    }
    
    return `Format error: ${error.message}`
  }
}

function isValidHexColor(color: string): boolean {
  const hex = color.replace('#', '')
  return /^[0-9A-Fa-f]{6}$/.test(hex)
}
```

##### 3.2 Integrate Error Handler
Update `ExcelService.ts` to use the error handler for better error messages.

#### Phase 4: Testing and Monitoring (2 hours)

##### 4.1 Add Format Operation Logging
Create comprehensive logging for all format operations to identify patterns in failures.

##### 4.2 Create Format Test Suite
**File**: `backend/internal/services/excel/format_validator_test.go`

```go
func TestFormatValidator(t *testing.T) {
    validator := NewFormatValidator()
    
    tests := []struct {
        name    string
        format  *ai.CellFormat
        wantErr bool
    }{
        {
            name: "valid font format",
            format: &ai.CellFormat{
                Font: &ai.FontFormat{
                    Bold: true,
                    Size: 12,
                    Color: "#FF0000",
                },
            },
            wantErr: false,
        },
        {
            name: "invalid font size",
            format: &ai.CellFormat{
                Font: &ai.FontFormat{
                    Size: 500,
                },
            },
            wantErr: true,
        },
        // Add more test cases
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validator.ValidateFormat(tt.format)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateFormat() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### Rollout Strategy

1. **Phase 1**: Deploy validation and monitoring (low risk)
2. **Phase 2**: Deploy retry logic (medium risk, with feature flag)
3. **Phase 3**: Deploy full solution and monitor for 24 hours
4. **Phase 4**: Remove old workarounds if stable

### Success Metrics

1. **Session Cleanup**
   - No sessions older than 30 minutes inactive
   - Memory usage stable over 24-hour period
   - Session count proportional to active users

2. **Format Errors**
   - 90% reduction in format error rate
   - Clear error messages for remaining failures
   - No impact on successful operations

### Timeline

- **Week 1**: Implement Phase 1 of both issues (immediate fixes)
- **Week 2**: Implement Phase 2-3 (core improvements)
- **Week 3**: Testing and monitoring setup
- **Week 4**: Rollout and observation

### Risk Mitigation

1. **Feature Flags**: Use flags to enable/disable new functionality
2. **Gradual Rollout**: Test with internal users first
3. **Rollback Plan**: Keep old code paths available
4. **Monitoring**: Set up alerts for error spikes

## Conclusion

This implementation plan addresses both the session cleanup and format error issues with a phased approach that minimizes risk while providing immediate improvements. The plan includes proper testing, monitoring, and rollback strategies to ensure a smooth deployment.