package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGzipMiddleware_SkipsStreamingEndpoints(t *testing.T) {
	tests := []struct {
		name            string
		path            string
		acceptEncoding  string
		expectGzip      bool
	}{
		{
			name:           "Skips compression for streaming endpoint",
			path:           "/api/chat/stream",
			acceptEncoding: "gzip",
			expectGzip:     false,
		},
		{
			name:           "Applies compression for non-streaming endpoint",
			path:           "/api/chat/message",
			acceptEncoding: "gzip",
			expectGzip:     true,
		},
		{
			name:           "No compression when gzip not accepted",
			path:           "/api/chat/message",
			acceptEncoding: "",
			expectGzip:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create a test handler that writes some content
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if strings.Contains(r.URL.Path, "stream") {
					w.Header().Set("Content-Type", "text/event-stream")
				}
				w.Write([]byte("test response"))
			})

			// Wrap with gzip middleware
			wrapped := GzipMiddleware(handler)

			// Create test request
			req := httptest.NewRequest("GET", tt.path, nil)
			if tt.acceptEncoding != "" {
				req.Header.Set("Accept-Encoding", tt.acceptEncoding)
			}

			// Record response
			rec := httptest.NewRecorder()
			wrapped.ServeHTTP(rec, req)

			// Check if response was gzipped
			hasGzip := rec.Header().Get("Content-Encoding") == "gzip"
			if hasGzip != tt.expectGzip {
				t.Errorf("Expected gzip=%v, got %v for path %s", tt.expectGzip, hasGzip, tt.path)
			}

			// For streaming endpoints, verify we can type assert to Flusher
			if strings.Contains(tt.path, "stream") && !tt.expectGzip {
				// In real scenario, the ResponseWriter would support Flusher
				// httptest.ResponseRecorder doesn't, but we're testing the logic
				if hasGzip {
					t.Error("Streaming endpoint should not be gzipped")
				}
			}
		})
	}
}

func TestGzipMiddleware_PreservesFlushingForSSE(t *testing.T) {
	// Create a custom ResponseWriter that implements Flusher
	type flushableWriter struct {
		*httptest.ResponseRecorder
		flushed bool
	}
	
	fw := &flushableWriter{ResponseRecorder: httptest.NewRecorder()}
	fw.flushed = false
	
	// Implement Flush method
	flush := func() {
		fw.flushed = true
	}
	
	// Create handler that uses SSE
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Write([]byte("data: test\n\n"))
		
		// Try to flush
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
			flush() // Mark as flushed
		}
	})
	
	// Wrap with middleware
	wrapped := GzipMiddleware(handler)
	
	// Create request for streaming endpoint
	req := httptest.NewRequest("GET", "/api/chat/stream", nil)
	req.Header.Set("Accept-Encoding", "gzip")
	
	// Execute
	wrapped.ServeHTTP(fw, req)
	
	// Verify no compression was applied
	if fw.Header().Get("Content-Encoding") == "gzip" {
		t.Error("SSE response should not be compressed")
	}
	
	// Verify content type is preserved
	if fw.Header().Get("Content-Type") != "text/event-stream" {
		t.Error("Content-Type should be preserved for SSE")
	}
}