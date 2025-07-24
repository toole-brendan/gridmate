package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
)

// gzipResponseWriter wraps http.ResponseWriter to provide gzip compression
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

// GzipMiddleware compresses HTTP responses using gzip
func GzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if client accepts gzip encoding
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		// Skip compression for streaming endpoints (SSE)
		// This is crucial for Server-Sent Events to work properly
		if strings.Contains(r.URL.Path, "/stream") {
			next.ServeHTTP(w, r)
			return
		}

		// Skip compression for small responses or specific content types
		// that are already compressed
		contentType := w.Header().Get("Content-Type")
		if strings.Contains(contentType, "image/") ||
			strings.Contains(contentType, "video/") ||
			strings.Contains(contentType, "audio/") {
			next.ServeHTTP(w, r)
			return
		}

		// Create gzip writer
		gz := gzip.NewWriter(w)
		defer gz.Close()

		// Set content encoding header
		w.Header().Set("Content-Encoding", "gzip")

		// Remove content-length header as it will change after compression
		w.Header().Del("Content-Length")

		// Wrap the response writer
		gzw := gzipResponseWriter{Writer: gz, ResponseWriter: w}

		// Call the next handler with our wrapped response writer
		next.ServeHTTP(gzw, r)
	})
}
