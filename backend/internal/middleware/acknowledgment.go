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
					"success":    true,
					"message":    "Acknowledgment received",
					"request_id": payload.RequestID,
					"timestamp":  time.Now().UTC().Format(time.RFC3339),
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
