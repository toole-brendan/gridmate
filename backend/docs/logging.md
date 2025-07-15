# Enhanced Logging System for Gridmate

## Overview

The Gridmate backend now features an enhanced logging system that makes logs more readable and easier to understand, especially during development. The system provides:

- **Grouped Operations**: Related operations (like batch Excel updates) are visually grouped
- **Color Coding**: Different components and operations use different colors for easy scanning
- **Smart Filtering**: Reduces noise by filtering repetitive operations
- **Batch Summaries**: Provides summaries for batch operations instead of logging each one
- **Environment-Aware**: Different formatting for development vs production

## Configuration

### Environment Variables

```bash
# Set environment (development, production, debug)
export APP_ENV=development

# Log level (trace, debug, info, warn, error)
export LOG_LEVEL=info

# Log format (json, text)
export LOG_FORMAT=text

# Enable operation grouping
export LOG_GROUP_OPERATIONS=true

# Component-specific log levels
export LOG_LEVEL_SIGNALR=debug
export LOG_LEVEL_EXCEL_BRIDGE=info
export LOG_LEVEL_TOOL_EXECUTOR=debug
export LOG_LEVEL_AI_SERVICE=info
```

### Development Mode Features

In development mode, logs are enhanced with:

1. **Color-coded components**:
   - 🔵 Blue: AI Service operations
   - 🟡 Yellow: Tool Executor operations
   - 🟣 Magenta: Excel Bridge operations
   - 🔷 Cyan: SignalR operations
   - 🟢 Green: Auth operations
   - 🔴 Red: Database/Error operations

2. **Grouped batch operations**:
   ```
   ══════ Batch Operation Group [batch_2_session_123] ══════
   15:04:05.124   ├─ Format A1 { range: A1, preview: Format A1 }
   15:04:05.125   ├─ Format A3:G3 { range: A3:G3, preview: Format A3:G3 }
   ══════ End Group [batch_2_session_123] ══════
   ```

3. **Batch summaries**:
   ```
   📊 Batch Summary [batch_2_session_123]
      Total: 11 | Success: 11 | Failed: 0
      ├─ write_range: 6
      ├─ format_range: 5
      ⏱️  Duration: 2.5s
   ════════════════════════
   ```

### Production Mode

In production, logs are:
- JSON formatted for easy parsing
- Filtered to reduce volume
- Only significant events logged
- No color coding or special formatting

Example:
```json
{
  "timestamp": "2025-07-14T22:01:06.424Z",
  "level": "info",
  "message": "Tool request completed",
  "component": "tool_executor",
  "request_id": "abc-123",
  "status": 200,
  "duration_ms": 11
}
```

## Usage Examples

### Setting Up Logging in Your Service

```go
import (
    "github.com/gridmate/backend/internal/config"
    "github.com/gridmate/backend/pkg/logger"
)

// For development
func setupDevelopmentLogging() {
    cfg := config.DevelopmentConfig()
    log := config.SetupDevelopmentLogging()
    
    // Component-specific logger
    aiLogger := logger.NewComponentLogger("ai_service")
    aiLogger.Info("AI service started")
}

// For production
func setupProductionLogging() {
    log := config.SetupProductionLogging()
    log.Info("Service started in production mode")
}
```

### Using the Enhanced Middleware

```go
import (
    "github.com/gridmate/backend/internal/middleware"
)

func main() {
    // Create logger and config
    logger := config.SetupDevelopmentLogging()
    cfg := config.DevelopmentConfig()
    
    // Create enhanced middleware
    loggingMiddleware := middleware.NewEnhancedLoggingMiddleware(logger, cfg)
    
    // Apply to router
    router.Use(loggingMiddleware.Middleware)
}
```

### Logging Best Practices

1. **Use structured fields** instead of string concatenation:
   ```go
   // Good
   log.WithFields(logrus.Fields{
       "request_id": requestID,
       "tool": toolName,
       "status": "success",
   }).Info("Tool executed")
   
   // Avoid
   log.Info(fmt.Sprintf("Tool %s executed for request %s", toolName, requestID))
   ```

2. **Use appropriate log levels**:
   - `Debug`: Detailed information for debugging
   - `Info`: General operational information
   - `Warn`: Warning conditions that should be reviewed
   - `Error`: Error conditions that need attention

3. **Group related operations**:
   ```go
   log.WithFields(logrus.Fields{
       "operation_group": batchID,
       "operation_type": "batch_write",
       "group_start": true,
   }).Info("Starting batch operation")
   ```

## Troubleshooting

### Too Much Noise

Adjust component log levels:
```bash
export LOG_LEVEL_SIGNALR=warn
export LOG_LEVEL_EXCEL_BRIDGE=info
```

Or use quiet mode:
```go
cfg := config.GetLoggingPresets().Quiet()
```

### Missing Details

Enable debug or trace mode:
```bash
export APP_ENV=debug
export LOG_LEVEL=trace
```

### Performance Impact

In production, ensure:
- JSON formatting is used
- Appropriate log levels set
- Path filtering enabled for health checks

## Log Interpretation Guide

### Common Patterns

1. **Excel Tool Operations**:
   - `[INFO][tool_executor]` - Tool request received
   - `queued` status - Operation awaiting user approval
   - `success` status - Operation completed

2. **Batch Operations**:
   - Look for batch summaries instead of individual operations
   - Check success/failure counts
   - Monitor duration for performance

3. **Error Patterns**:
   - `[ERRO]` - Immediate attention needed
   - `[WARN]` - Potential issues, monitor
   - Stack traces in debug mode only

### Performance Monitoring

Watch for:
- Operations taking > 1 second (logged as warnings)
- High failure rates in batch summaries
- Repeated errors from same component

## Migration from Old Logging

The new system is backward compatible. To migrate:

1. Update logger initialization to use enhanced formatter
2. Add component fields to existing log statements
3. Group related operations where applicable
4. Review and adjust log levels per component

No code changes required for basic functionality - enhanced formatting is automatic in development mode.