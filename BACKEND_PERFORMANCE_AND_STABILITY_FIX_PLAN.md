# Backend Performance and Stability Fix Plan

## 1. Executive Summary

This document outlines a comprehensive plan to fix critical backend issues that are causing:
- Excessive memory usage when sending spreadsheet data
- Server crashes due to unhandled errors
- Poor performance when processing large Excel ranges
- Timeout issues despite increased timeout settings

The root causes identified are:
1. **Inefficient Data Serialization**: The backend sends entire spreadsheet ranges including thousands of empty cells
2. **Memory Exhaustion**: Large JSON payloads (110×31 arrays) overwhelm the system
3. **Error Handling Gaps**: Unhandled errors in the AI response processing chain cause crashes
4. **Synchronization Issues**: Potential race conditions in tool handler management

## 2. Critical Issues Analysis

### 2.1 Spreadsheet Data Optimization Issue

**Current Problem:**
- When `read_range` is called with large ranges (e.g., `A1:AE110`), the backend returns ALL cells including empty ones
- This creates massive JSON arrays with thousands of empty string entries
- Example from logs: 3,410 cells (110 rows × 31 columns) mostly containing empty strings

**Impact:**
- Memory exhaustion on both backend and frontend
- Network bandwidth waste
- JSON serialization/deserialization overhead
- Anthropic API payload size issues

### 2.2 Error Handling Gaps

**Current Problem:**
- The error "An unexpected error occurred while processing your message" indicates unhandled exceptions
- Error occurs after tool responses are processed but before AI response is sent
- No proper error boundaries in the AI service chain

**Impact:**
- Complete request failure
- User receives generic error message
- No recovery mechanism
- Potential data loss

### 2.3 Timeout Configuration Mismatch

**Current Problem:**
- Tool timeout increased to 300 seconds in `excel_bridge_impl.go`
- But AI request timeout might still be 30 seconds (configurable)
- Frontend expects responses within 60 seconds

**Impact:**
- Cascading timeouts at different layers
- Inconsistent behavior
- Poor user experience

## 3. Proposed Solutions

### 3.1 Optimize Spreadsheet Data Handling

#### Solution A: Backend Filtering (Recommended)

**File:** `/backend/internal/services/ai/tool_executor_basic_ops.go`

**Implementation:**
```go
// Add after line 35 in executeReadRange function
func filterEmptyRows(data *ai.RangeData) *ai.RangeData {
    filtered := &ai.RangeData{
        Address:  data.Address,
        ColCount: data.ColCount,
        RowCount: 0,
        Values:   [][]interface{}{},
        Formulas: [][]string{},
    }
    
    lastNonEmptyRow := -1
    
    // Find last non-empty row
    for i := len(data.Values) - 1; i >= 0; i-- {
        row := data.Values[i]
        hasContent := false
        for _, cell := range row {
            if cell != nil && cell != "" {
                hasContent = true
                break
            }
        }
        if hasContent {
            lastNonEmptyRow = i
            break
        }
    }
    
    // Copy only up to last non-empty row
    if lastNonEmptyRow >= 0 {
        filtered.Values = data.Values[:lastNonEmptyRow+1]
        if len(data.Formulas) > 0 {
            filtered.Formulas = data.Formulas[:lastNonEmptyRow+1]
        }
        filtered.RowCount = lastNonEmptyRow + 1
    }
    
    return filtered
}

// Update executeReadRange to use filtering
result, err := te.excelBridge.ReadRange(ctx, sessionID, rangeAddr, includeFormulas, includeFormatting)
if err != nil {
    return nil, err
}

// Filter out empty rows
result = filterEmptyRows(result)
```

#### Solution B: Smart Range Detection

**File:** `/backend/internal/services/ai/tool_executor_basic_ops.go`

**Implementation:**
```go
// Add configuration for maximum range sizes
const (
    MaxReadRangeCells = 10000  // Maximum cells to read
    MaxReadRangeRows  = 1000   // Maximum rows
    MaxReadRangeCols  = 100    // Maximum columns
)

// Add validation before calling ReadRange
func validateAndOptimizeRange(rangeAddr string) (string, error) {
    // Parse range to check size
    // If range is too large, either:
    // 1. Return error asking for smaller range
    // 2. Automatically clip to maximum size
    // 3. Use Excel's UsedRange to limit scope
}
```

### 3.2 Implement Comprehensive Error Handling

#### Error Boundary Implementation

**File:** `/backend/internal/services/ai/service.go`

**Add error recovery at the service level:**
```go
// Wrap ProcessChatWithToolsAndHistory with panic recovery
func (s *Service) ProcessChatWithToolsAndHistory(ctx context.Context, req *ProcessChatRequest) (resp *ProcessChatResponse, err error) {
    // Add panic recovery
    defer func() {
        if r := recover(); r != nil {
            s.logger.Error().
                Interface("panic", r).
                Str("stack", string(debug.Stack())).
                Msg("Panic in ProcessChatWithToolsAndHistory")
            
            err = fmt.Errorf("internal error processing request: %v", r)
            resp = &ProcessChatResponse{
                Error: "An error occurred processing your request. Please try again.",
            }
        }
    }()
    
    // Existing implementation...
}
```

**File:** `/backend/internal/handlers/chat_handler.go`

**Add request timeout and error handling:**
```go
// In handleProcessChat function
func (h *ChatHandler) handleProcessChat(w http.ResponseWriter, r *http.Request) {
    // Add timeout to context
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Minute)
    defer cancel()
    
    // Add recovery for handler panics
    defer func() {
        if r := recover(); r != nil {
            h.logger.Error().
                Interface("panic", r).
                Msg("Panic in chat handler")
            h.sendError(w, http.StatusInternalServerError, "Internal server error")
        }
    }()
    
    // Existing implementation with ctx...
}
```

### 3.3 Fix Timeout Configuration

**File:** `/backend/internal/config/config.go`

**Add new configuration options:**
```go
type Config struct {
    // Existing fields...
    
    // Timeout configurations
    AIRequestTimeout   time.Duration `env:"AI_REQUEST_TIMEOUT" default:"5m"`
    ToolRequestTimeout time.Duration `env:"TOOL_REQUEST_TIMEOUT" default:"300s"`
    ChatRequestTimeout time.Duration `env:"CHAT_REQUEST_TIMEOUT" default:"5m"`
}
```

**File:** `/backend/cmd/server/main.go`

**Update HTTP server configuration:**
```go
// Configure server timeouts
server := &http.Server{
    Addr:         fmt.Sprintf(":%d", cfg.Port),
    Handler:      router,
    ReadTimeout:  30 * time.Second,
    WriteTimeout: 6 * time.Minute,  // Longer than max request timeout
    IdleTimeout:  120 * time.Second,
}
```

### 3.4 Implement Tool Response Batching

**File:** `/backend/internal/services/ai/tool_executor.go`

**Add response size limits:**
```go
const (
    MaxToolResponseSize = 1 * 1024 * 1024  // 1MB max per tool response
)

// Add validation in ExecuteTool
func (te *ToolExecutor) ExecuteTool(ctx context.Context, tool ToolCall) (*ToolResult, error) {
    // Execute tool...
    
    // Validate response size
    if responseSize := calculateResponseSize(result); responseSize > MaxToolResponseSize {
        te.logger.Warn().
            Int("size", responseSize).
            Str("tool", tool.Name).
            Msg("Tool response exceeds size limit")
        
        // Return truncated or summary response
        return &ToolResult{
            Success: false,
            Error:   "Response too large. Please request a smaller range.",
        }, nil
    }
    
    return result, nil
}
```

### 3.5 Add Response Compression

**File:** `/backend/internal/handlers/middleware.go`

**Add gzip compression middleware:**
```go
func GzipMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Check if client accepts gzip
        if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
            next.ServeHTTP(w, r)
            return
        }
        
        // Wrap response writer with gzip
        gz := gzip.NewWriter(w)
        defer gz.Close()
        
        w.Header().Set("Content-Encoding", "gzip")
        gzw := &gzipResponseWriter{Writer: gz, ResponseWriter: w}
        next.ServeHTTP(gzw, r)
    })
}
```

## 4. Implementation Plan

### Phase 1: Critical Fixes (Immediate)

1. **Implement empty cell filtering** in `tool_executor_basic_ops.go`
   - Reduces payload size by 90%+ for typical spreadsheets
   - Prevents memory exhaustion
   - Quick win with minimal risk

2. **Add panic recovery** in `service.go` and `chat_handler.go`
   - Prevents crashes from bubbling up
   - Provides better error messages
   - Improves system stability

### Phase 2: Configuration & Optimization (Week 1)

3. **Update timeout configurations**
   - Make all timeouts configurable
   - Align timeouts across layers
   - Document timeout flow

4. **Implement response size limits**
   - Prevent oversized responses
   - Add helpful error messages
   - Guide users to request smaller ranges

### Phase 3: Performance Enhancements (Week 2)

5. **Add response compression**
   - Reduces network bandwidth
   - Improves response times
   - Especially effective for repetitive data

6. **Implement smart range detection**
   - Automatically optimize large range requests
   - Use Excel's UsedRange when appropriate
   - Provide suggestions for better queries

## 5. Testing Strategy

### 5.1 Unit Tests

**File:** `/backend/internal/services/ai/tool_executor_test.go`

```go
func TestFilterEmptyRows(t *testing.T) {
    // Test with sparse data
    // Test with no data
    // Test with full data
    // Test edge cases
}

func TestResponseSizeLimits(t *testing.T) {
    // Test rejection of oversized responses
    // Test truncation logic
    // Test error messages
}
```

### 5.2 Integration Tests

1. **Large Range Test**
   - Request `A1:ZZ1000`
   - Verify filtered response
   - Check memory usage

2. **Error Recovery Test**
   - Simulate panics
   - Verify graceful recovery
   - Check error messages

3. **Timeout Test**
   - Simulate slow operations
   - Verify timeout handling
   - Check cascade behavior

### 5.3 Load Tests

1. **Concurrent Request Test**
   - 10 simultaneous large range requests
   - Monitor memory usage
   - Check response times

2. **Memory Leak Test**
   - 1000 sequential requests
   - Monitor memory growth
   - Verify cleanup

## 6. Monitoring & Metrics

### 6.1 Key Metrics to Track

1. **Response Size Metrics**
   ```go
   metrics.Histogram("tool_response_size_bytes", size).
       Tag("tool", toolName).
       Tag("filtered", wasFiltered)
   ```

2. **Error Rate Metrics**
   ```go
   metrics.Counter("tool_errors_total").
       Tag("tool", toolName).
       Tag("error_type", errorType)
   ```

3. **Performance Metrics**
   ```go
   metrics.Timer("tool_execution_duration").
       Tag("tool", toolName)
   ```

### 6.2 Alerting Rules

1. **High Error Rate Alert**
   - Threshold: >5% error rate over 5 minutes
   - Action: Page on-call engineer

2. **Memory Usage Alert**
   - Threshold: >80% memory usage
   - Action: Alert and consider scaling

3. **Response Time Alert**
   - Threshold: p95 > 30 seconds
   - Action: Investigate performance

## 7. Rollback Plan

If issues arise after deployment:

1. **Feature Flags**
   - Add flag for empty cell filtering
   - Add flag for response size limits
   - Can disable without deployment

2. **Quick Rollback**
   - Git revert prepared
   - Previous version tagged
   - Deployment automation ready

3. **Data Recovery**
   - No data storage changes
   - No database migrations
   - Safe to rollback anytime

## 8. Success Criteria

1. **Performance Improvements**
   - 90% reduction in response payload size for typical spreadsheets
   - <5 second response time for 1000-cell reads
   - <100MB memory usage per request

2. **Stability Improvements**
   - Zero crashes from tool response handling
   - <0.1% error rate for tool requests
   - Graceful handling of all error scenarios

3. **User Experience**
   - Clear error messages
   - Helpful suggestions for large ranges
   - Consistent timeout behavior

## 9. Long-term Recommendations

1. **Implement Streaming Responses**
   - For very large data sets
   - Progressive loading in UI
   - Better perceived performance

2. **Add Caching Layer**
   - Cache frequently accessed ranges
   - Invalidate on writes
   - Reduce Excel API calls

3. **Implement Query Language**
   - Allow filtering at request time
   - Support for "only non-empty cells"
   - Range expressions like "A1:A* where value != ''"

This plan addresses the immediate stability issues while setting up the foundation for long-term performance improvements.