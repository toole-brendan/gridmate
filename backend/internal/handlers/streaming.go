package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gridmate/backend/internal/services"
	"github.com/sirupsen/logrus"
)

// StreamSession tracks streaming state for delta transmission
type StreamSession struct {
	SessionID     string
	LastSentIndex map[string]int // messageID -> lastIndex sent
	mu            sync.Mutex
}

type StreamingHandler struct {
	excelBridge *services.ExcelBridge
	logger      *logrus.Logger
	sessions    map[string]*StreamSession
	sessionsMu  sync.RWMutex
}

func NewStreamingHandler(excelBridge *services.ExcelBridge, logger *logrus.Logger) *StreamingHandler {
	return &StreamingHandler{
		excelBridge: excelBridge,
		logger:      logger,
		sessions:    make(map[string]*StreamSession),
	}
}

// getOrCreateSession retrieves or creates a streaming session
func (h *StreamingHandler) getOrCreateSession(sessionID string) *StreamSession {
	h.sessionsMu.Lock()
	defer h.sessionsMu.Unlock()

	if session, exists := h.sessions[sessionID]; exists {
		return session
	}

	session := &StreamSession{
		SessionID:     sessionID,
		LastSentIndex: make(map[string]int),
	}
	h.sessions[sessionID] = session
	return session
}

// calculateDelta calculates the delta content to send
func (h *StreamingHandler) calculateDelta(session *StreamSession, messageID string, fullContent string) string {
	session.mu.Lock()
	defer session.mu.Unlock()

	lastIndex, exists := session.LastSentIndex[messageID]
	if !exists {
		// First time sending this message
		session.LastSentIndex[messageID] = len(fullContent)
		return fullContent
	}

	// Calculate delta
	if lastIndex >= len(fullContent) {
		return "" // Nothing new to send
	}

	delta := fullContent[lastIndex:]
	session.LastSentIndex[messageID] = len(fullContent)
	return delta
}

// HandleChatStream handles streaming chat requests
func (h *StreamingHandler) HandleChatStream(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// CORS is handled by middleware, don't set it here

	// Parse query params
	sessionID := r.URL.Query().Get("sessionId")
	content := r.URL.Query().Get("content")
	autonomyMode := r.URL.Query().Get("autonomyMode")
	token := r.URL.Query().Get("token")

	// Basic auth check for development
	if token != "dev-token-123" {
		h.logger.Warn("Unauthorized streaming request")
		fmt.Fprintf(w, "data: {\"error\": \"Unauthorized\"}\n\n")
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		return
	}

	if sessionID == "" || content == "" {
		h.logger.Warn("Missing required parameters for streaming")
		fmt.Fprintf(w, "data: {\"error\": \"Missing required parameters\"}\n\n")
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		return
	}

	h.logger.WithFields(logrus.Fields{
		"session_id":    sessionID,
		"content":       content,
		"autonomy_mode": autonomyMode,
	}).Info("Starting streaming chat request")

	// Get or create streaming session
	streamSession := h.getOrCreateSession(sessionID)

	// Create chat message
	chatMsg := services.ChatMessage{
		Content:      content,
		SessionID:    sessionID,
		AutonomyMode: autonomyMode,
		Context:      make(map[string]interface{}), // Will be populated from session
	}

	// Get streaming response
	ctx := r.Context()
	chunks, err := h.excelBridge.ProcessChatMessageStreaming(ctx, sessionID, chatMsg)
	if err != nil {
		h.logger.WithError(err).Error("Failed to start streaming")
		errorData, _ := json.Marshal(map[string]string{"error": err.Error()})
		fmt.Fprintf(w, "data: %s\n\n", errorData)
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		return
	}

	// Stream chunks to client
	flusher, ok := w.(http.Flusher)
	if !ok {
		h.logger.Warn("ResponseWriter does not support flushing, attempting to continue anyway")
		// Continue anyway - the response will be buffered but should still work
	}

	chunkCount := 0
	startTime := time.Now()
	firstChunkSent := false
	currentMessageID := ""
	fullContent := strings.Builder{}

	for chunk := range chunks {
		select {
		case <-ctx.Done():
			h.logger.Info("Client disconnected, stopping stream")
			return
		default:
			chunkCount++

			// Track message ID
			if chunk.ID != "" && currentMessageID == "" {
				currentMessageID = chunk.ID
			}

			// For text chunks, calculate delta
			if chunk.Type == "text" && chunk.Delta != "" {
				fullContent.WriteString(chunk.Delta)
				delta := h.calculateDelta(streamSession, currentMessageID, fullContent.String())

				// Create chunk with only delta
				deltaChunk := chunk
				deltaChunk.Content = "" // Clear full content
				deltaChunk.Delta = delta

				data, err := json.Marshal(deltaChunk)
				if err != nil {
					h.logger.WithError(err).Error("Failed to marshal chunk")
					continue
				}

				// Special logging for first chunk
				if !firstChunkSent {
					firstChunkSent = true
					h.logger.WithFields(logrus.Fields{
						"first_chunk_delay_ms": time.Since(startTime).Milliseconds(),
						"chunk_type":           chunk.Type,
					}).Info("First chunk being sent - streaming is active")
				}

				h.logger.WithFields(logrus.Fields{
					"chunk_number": chunkCount,
					"chunk_type":   chunk.Type,
					"has_delta":    delta != "",
					"delta_length": len(delta),
					"is_done":      chunk.Done,
					"elapsed_ms":   time.Since(startTime).Milliseconds(),
				}).Debug("Sending delta chunk")

				fmt.Fprintf(w, "data: %s\n\n", data)
				if flusher != nil {
					flusher.Flush()
				}
			} else if chunk.Type == "actions" {
				// Handle actions chunk specially
				actionsChunk := map[string]interface{}{
					"type":    "actions",
					"content": chunk.Content,
					"actions": []interface{}{}, // Will be populated from Delta
				}

				// Parse actions from delta
				if chunk.Delta != "" {
					var actions []interface{}
					if err := json.Unmarshal([]byte(chunk.Delta), &actions); err == nil {
						actionsChunk["actions"] = actions
					} else {
						h.logger.WithError(err).Error("Failed to parse actions from chunk delta")
					}
				}

				data, err := json.Marshal(actionsChunk)
				if err != nil {
					h.logger.WithError(err).Error("Failed to marshal actions chunk")
					continue
				}

				h.logger.WithFields(logrus.Fields{
					"chunk_type":    chunk.Type,
					"content":       chunk.Content,
					"actions_count": len(actionsChunk["actions"].([]interface{})),
				}).Info("Sending actions chunk")

				fmt.Fprintf(w, "data: %s\n\n", data)
				if flusher != nil {
					flusher.Flush()
				}
			} else {
				// Non-text chunks (tool events, etc.) - send as-is
				data, err := json.Marshal(chunk)
				if err != nil {
					h.logger.WithError(err).Error("Failed to marshal chunk")
					continue
				}

				fmt.Fprintf(w, "data: %s\n\n", data)
				if flusher != nil {
					flusher.Flush()
				}
			}

			if chunk.Done {
				fmt.Fprintf(w, "data: [DONE]\n\n")
				if flusher != nil {
					flusher.Flush()
				}

				// Warn if we only sent one chunk for a non-trivial response
				logLevel := logrus.InfoLevel
				if chunkCount == 1 && len(content) > 20 {
					logLevel = logrus.WarnLevel
				}

				h.logger.WithFields(logrus.Fields{
					"total_chunks":      chunkCount,
					"duration_ms":       time.Since(startTime).Milliseconds(),
					"avg_chunk_time_ms": time.Since(startTime).Milliseconds() / int64(chunkCount),
				}).Log(logLevel, "Streaming completed")
				return
			}
		}
	}
}

// HandleTestStream provides a test endpoint for debugging streaming
func (h *StreamingHandler) HandleTestStream(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		h.logger.Warn("ResponseWriter does not support flushing")
		fmt.Fprintf(w, "data: {\"error\": \"Streaming not supported\"}\n\n")
		return
	}

	h.logger.Info("Starting test stream")

	// Send test chunks with delays
	testMessage := "This is a test streaming response to verify that the streaming pipeline is working correctly. Each word should appear separately."
	words := strings.Split(testMessage, " ")

	for i, word := range words {
		chunk := map[string]interface{}{
			"type":  "text",
			"delta": word + " ",
			"done":  false,
		}

		data, _ := json.Marshal(chunk)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()

		h.logger.WithFields(logrus.Fields{
			"chunk_number": i + 1,
			"word":         word,
		}).Debug("Sent test chunk")

		// Add delay between chunks
		time.Sleep(200 * time.Millisecond)
	}

	// Send completion
	fmt.Fprintf(w, "data: {\"done\":true}\n\n")
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()

	h.logger.Info("Test stream completed")
}
