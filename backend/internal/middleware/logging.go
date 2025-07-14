package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

// responseWriter wraps http.ResponseWriter to capture status code and response size
type responseWriter struct {
	http.ResponseWriter
	status int
	size   int
	body   *bytes.Buffer
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.status == 0 {
		rw.status = http.StatusOK
	}
	size, err := rw.ResponseWriter.Write(b)
	rw.size += size
	// Capture response body for logging (limit to 1KB to avoid memory issues)
	if rw.body.Len() < 1024 {
		rw.body.Write(b)
	}
	return size, err
}

// LoggingMiddleware provides comprehensive HTTP request/response logging
type LoggingMiddleware struct {
	logger      *logrus.Logger
	skipPaths   map[string]bool
	logBody     bool
	logResponse bool
}

// NewLoggingMiddleware creates a new logging middleware
func NewLoggingMiddleware(logger *logrus.Logger) *LoggingMiddleware {
	return &LoggingMiddleware{
		logger: logger,
		skipPaths: map[string]bool{
			"/health":        true,
			"/readiness":     true,
			"/api/v1/health": true,
		},
		logBody:     true,
		logResponse: true,
	}
}

// Middleware returns the logging middleware handler
func (m *LoggingMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip logging for certain paths
		if m.skipPaths[r.URL.Path] {
			next.ServeHTTP(w, r)
			return
		}

		// Generate request ID
		requestID := r.Header.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Add request ID to context
		ctx := r.Context()
		ctx = context.WithValue(ctx, "request_id", requestID)
		r = r.WithContext(ctx)

		// Start timer
		start := time.Now()

		// Create logger with base fields
		logger := m.logger.WithFields(logrus.Fields{
			"request_id": requestID,
			"method":     r.Method,
			"path":       r.URL.Path,
			"query":      r.URL.RawQuery,
			"remote_ip":  getClientIP(r),
			"user_agent": r.UserAgent(),
		})

		// Log request body if enabled
		var requestBody []byte
		if m.logBody && r.Body != nil && shouldLogBody(r) {
			requestBody, _ = io.ReadAll(r.Body)
			r.Body = io.NopCloser(bytes.NewBuffer(requestBody))

			// Parse and log structured request body
			if len(requestBody) > 0 && isJSON(r) {
				var bodyData map[string]interface{}
				if err := json.Unmarshal(requestBody, &bodyData); err == nil {
					// Sanitize sensitive fields
					sanitizeData(bodyData)
					logger = logger.WithField("request_body", bodyData)
				}
			}
		}

		// Wrap response writer
		rw := &responseWriter{
			ResponseWriter: w,
			body:           &bytes.Buffer{},
		}

		// Add request ID to response header
		w.Header().Set("X-Request-ID", requestID)

		// Get route pattern if using gorilla/mux
		routePattern := "unknown"
		if route := mux.CurrentRoute(r); route != nil {
			if pattern, err := route.GetPathTemplate(); err == nil {
				routePattern = pattern
			}
		}

		// Process request
		next.ServeHTTP(rw, r)

		// Calculate duration
		duration := time.Since(start)

		// Add response fields
		logger = logger.WithFields(logrus.Fields{
			"status":        rw.status,
			"size":          rw.size,
			"duration_ms":   duration.Milliseconds(),
			"route_pattern": routePattern,
		})

		// Log response body if enabled
		if m.logResponse && rw.body.Len() > 0 && isJSON(rw) {
			var responseData map[string]interface{}
			if err := json.Unmarshal(rw.body.Bytes(), &responseData); err == nil {
				// Sanitize sensitive fields
				sanitizeData(responseData)
				logger = logger.WithField("response_body", responseData)
			}
		}

		// Add user context if available
		if userID, ok := GetUserID(ctx); ok {
			logger = logger.WithField("user_id", userID)
		}

		// Determine log level based on status code
		switch {
		case rw.status >= 500:
			logger.Error("Request processed with error")
		case rw.status >= 400:
			logger.Warn("Request processed with client error")
		case rw.status >= 300:
			logger.Info("Request redirected")
		default:
			logger.Info("Request processed successfully")
		}
	})
}

// Helper functions

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	ip := r.RemoteAddr
	if colon := strings.LastIndex(ip, ":"); colon != -1 {
		ip = ip[:colon]
	}
	return ip
}

func shouldLogBody(r *http.Request) bool {
	// Skip large uploads
	if r.ContentLength > 1024*1024 { // 1MB
		return false
	}

	// Skip multipart forms
	if strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
		return false
	}

	return true
}

func isJSON(r interface{}) bool {
	switch v := r.(type) {
	case *http.Request:
		return strings.Contains(v.Header.Get("Content-Type"), "application/json")
	case http.ResponseWriter:
		return strings.Contains(v.Header().Get("Content-Type"), "application/json")
	default:
		return false
	}
}

func sanitizeData(data map[string]interface{}) {
	sensitiveFields := []string{
		"password", "token", "secret", "api_key", "authorization",
		"credit_card", "ssn", "access_token", "refresh_token",
	}

	for key, value := range data {
		// Check if key contains sensitive field
		lowerKey := strings.ToLower(key)
		for _, field := range sensitiveFields {
			if strings.Contains(lowerKey, field) {
				data[key] = "[REDACTED]"
				break
			}
		}

		// Recursively sanitize nested objects
		if nested, ok := value.(map[string]interface{}); ok {
			sanitizeData(nested)
		}
	}
}

// SetSkipPaths sets paths that should not be logged
func (m *LoggingMiddleware) SetSkipPaths(paths []string) {
	m.skipPaths = make(map[string]bool)
	for _, path := range paths {
		m.skipPaths[path] = true
	}
}

// SetLogBody enables/disables request body logging
func (m *LoggingMiddleware) SetLogBody(enable bool) {
	m.logBody = enable
}

// SetLogResponse enables/disables response body logging
func (m *LoggingMiddleware) SetLogResponse(enable bool) {
	m.logResponse = enable
}
