# Backend Acknowledgment Middleware Implementation Plan - Corrected Version

## 1. Executive Summary

This document provides a corrected implementation plan to fix the backend startup failure by properly implementing and integrating the acknowledgment middleware for handling "acknowledged" tool responses from the frontend. The previous plan had incorrect route paths and integration points. This corrected version addresses the actual application structure where SignalR routes are registered in `main.go` under `/api/` paths, not `/signalr/` paths.

## 2. Current State Analysis

### 2.1 Actual Route Structure
Based on code inspection, the SignalR routes are registered in `backend/cmd/api/main.go` (lines 165-167):
```go
router.HandleFunc("/api/chat", signalRHandler.HandleSignalRChat).Methods("POST")
router.HandleFunc("/api/tool-response", signalRHandler.HandleSignalRToolResponse).Methods("POST")
router.HandleFunc("/api/selection-update", signalRHandler.HandleSignalRSelectionUpdate).Methods("POST")
```

### 2.2 Existing Middleware
The application already has:
- `LoggingMiddleware` - Basic request/response logging
- `EnhancedLoggingMiddleware` - Advanced logging with tool request grouping
- `AuthMiddleware` - JWT/API key authentication
- `GzipMiddleware` - Response compression

### 2.3 Current Acknowledgment Implementation
The acknowledgment logic is currently embedded in `HandleSignalRToolResponse` in `backend/internal/handlers/signalr_handler.go` (lines 161-178). This needs to be extracted into a proper middleware.

## 3. Root Cause of Backend Startup Failure

The backend is likely failing because:
1. A middleware was created but not properly integrated into the router
2. Incorrect function signature or interface implementation
3. Possible circular dependencies or import issues
4. Request body consumption issues (reading body multiple times)

## 4. Corrected Implementation Plan

### 4.1 Create Acknowledgment Middleware

Create a new file: `backend/internal/middleware/acknowledgment.go`

```go
package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/sirupsen/logrus"
)

// ToolResponsePayload represents the minimal structure needed to check acknowledgment
type ToolResponsePayload struct {
	SessionID    string `json:"sessionId"`
	RequestID    string `json:"requestId"`
	Acknowledged bool   `json:"acknowledged"`
}

// AcknowledgmentMiddleware handles acknowledged tool responses immediately
func AcknowledgmentMiddleware(logger *logrus.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Only process POST requests to tool-response endpoint
			if r.Method != http.MethodPost || r.URL.Path != "/api/tool-response" {
				next.ServeHTTP(w, r)
				return
			}

			// Read the request body
			bodyBytes, err := io.ReadAll(r.Body)
			if err != nil {
				logger.WithError(err).Error("Failed to read request body in acknowledgment middleware")
				http.Error(w, "Failed to read request", http.StatusBadRequest)
				return
			}

			// Restore the body for downstream handlers
			r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

			// Try to parse just the fields we need
			var payload ToolResponsePayload
			if err := json.Unmarshal(bodyBytes, &payload); err != nil {
				// If parsing fails, let the main handler deal with it
				logger.WithError(err).Debug("Failed to parse tool response in middleware, passing to handler")
				next.ServeHTTP(w, r)
				return
			}

			// Check if this is an acknowledgment
			if payload.Acknowledged {
				logger.WithFields(logrus.Fields{
					"request_id": payload.RequestID,
					"session_id": payload.SessionID,
					"timestamp":  time.Now().UTC(),
				}).Info("Handling acknowledged tool response in middleware")

				// Send immediate response
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				
				response := map[string]interface{}{
					"success": true,
					"message": "Acknowledgment received",
					"request_id": payload.RequestID,
					"timestamp": time.Now().UTC().Format(time.RFC3339),
				}
				
				if err := json.NewEncoder(w).Encode(response); err != nil {
					logger.WithError(err).Error("Failed to encode acknowledgment response")
				}
				
				// Stop processing - don't call next handler
				return
			}

			// Not an acknowledgment, continue to main handler
			next.ServeHTTP(w, r)
		})
	}
}
```

### 4.2 Update main.go to Use Middleware

Modify `backend/cmd/api/main.go`:

```diff
--- a/backend/cmd/api/main.go
+++ b/backend/cmd/api/main.go
@@ -139,8 +139,12 @@ func main() {
 	// Initialize logging middleware
 	loggingMiddleware := middleware.NewLoggingMiddleware(logger)
 	router.Use(loggingMiddleware.Middleware)
 
+	// Initialize acknowledgment middleware
+	ackMiddleware := middleware.AcknowledgmentMiddleware(logger)
+	router.Use(ackMiddleware)
+
 	// Add compression middleware for better performance
 	router.Use(middleware.GzipMiddleware)
 
 	// Health check endpoint
```

**Note**: We're adding the middleware to the global router chain BEFORE the compression middleware. This ensures acknowledgments are handled before any response compression occurs.

### 4.3 Clean Up SignalR Handler

Remove the redundant acknowledgment handling from `backend/internal/handlers/signalr_handler.go`:

```diff
--- a/backend/internal/handlers/signalr_handler.go
+++ b/backend/internal/handlers/signalr_handler.go
@@ -155,23 +155,7 @@ func (h *SignalRHandler) HandleSignalRToolResponse(w http.ResponseWriter, r *htt
 		"queued":       req.Queued,
 	}).Info("Received tool response from SignalR")
 
-	// Handle acknowledged responses - don't process as final
-	if req.Acknowledged {
-		h.logger.WithFields(logrus.Fields{
-			"request_id": req.RequestID,
-			"session_id": req.SessionID,
-		}).Info("Received acknowledgment for tool request")
-
-		// Don't route to handler yet, wait for final response
-		w.Header().Set("Content-Type", "application/json")
-		json.NewEncoder(w).Encode(SignalRResponse{
-			Success: true,
-			Message: "Acknowledgment received",
-		})
-		return
-	}
-
-	// Log detailed error information if present
 	if req.Error != "" && req.ErrorDetails != "" {
```

### 4.4 Ensure EnhancedLoggingMiddleware Compatibility

The `EnhancedLoggingMiddleware` already has special handling for tool endpoints. We need to ensure our acknowledgment middleware works well with it:

1. The acknowledgment middleware runs BEFORE the enhanced logging middleware
2. For acknowledged responses, the enhanced logging will see a 200 OK response
3. The enhanced logging middleware's batch tracking won't be disrupted

No changes needed to `EnhancedLoggingMiddleware` - it will naturally handle the acknowledged responses as successful completions.

## 5. Alternative Approach (If Global Middleware Causes Issues)

If adding the middleware globally causes problems, use a route-specific approach:

```go
// In main.go, wrap just the tool-response handler
toolResponseHandler := middleware.AcknowledgmentMiddleware(logger)(
    http.HandlerFunc(signalRHandler.HandleSignalRToolResponse),
)
router.HandleFunc("/api/tool-response", toolResponseHandler).Methods("POST")
```

## 6. Testing Plan

### 6.1 Startup Test
```bash
cd backend
go build -o gridmate-api cmd/api/main.go
./gridmate-api
```
Expected: Server starts without errors

### 6.2 Acknowledgment Test
```bash
curl -X POST http://localhost:8080/api/tool-response \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "requestId": "test-request",
    "acknowledged": true
  }'
```
Expected Response:
```json
{
  "success": true,
  "message": "Acknowledgment received",
  "request_id": "test-request",
  "timestamp": "2024-01-10T12:00:00Z"
}
```

### 6.3 Normal Tool Response Test
```bash
curl -X POST http://localhost:8080/api/tool-response \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "requestId": "test-request",
    "acknowledged": false,
    "result": {"data": "test"},
    "error": null
  }'
```
Expected: Normal processing by SignalRHandler

## 7. Debugging Steps if Backend Still Fails

1. **Check Compile Errors**:
   ```bash
   cd backend
   go build -v ./...
   ```

2. **Check Import Cycles**:
   ```bash
   go list -f '{{.ImportPath}} -> {{join .Imports " "}}' ./... | grep -E "cycle|middleware"
   ```

3. **Run with Debug Logging**:
   ```bash
   LOG_LEVEL=debug ./gridmate-api
   ```

4. **Check Middleware Order**:
   - Ensure acknowledgment middleware is registered before compression
   - Ensure it's after CORS if CORS is needed for these endpoints

## 8. File Locations Summary

Files to be created:
- `backend/internal/middleware/acknowledgment.go`

Files to be modified:
- `backend/cmd/api/main.go` - Add middleware to router
- `backend/internal/handlers/signalr_handler.go` - Remove redundant acknowledgment handling

## 9. Success Criteria

1. Backend starts successfully without errors
2. Acknowledged tool responses receive immediate 200 OK responses
3. Non-acknowledged tool responses are processed normally
4. No impact on other endpoints or functionality
5. Logs show acknowledgments handled by middleware, not handler

## 10. Rollback Plan

If issues persist:
1. Delete `backend/internal/middleware/acknowledgment.go`
2. Revert changes to `main.go`
3. Revert changes to `signalr_handler.go`
4. The acknowledgment logic will remain in the handler as before

This corrected plan addresses the actual application structure and should resolve the backend startup issues while properly implementing the acknowledgment middleware pattern. 