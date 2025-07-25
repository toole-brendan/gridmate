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
		h.logger.WithFields(logrus.Fields{
			"session_id": sessionID,
			"existing": true,
		}).Debug("[STREAMING] Retrieved existing session")
		return session
	}

	session := &StreamSession{
		SessionID:     sessionID,
		LastSentIndex: make(map[string]int),
	}
	h.sessions[sessionID] = session
	h.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"existing": false,
	}).Debug("[STREAMING] Created new session")
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
		h.logger.WithFields(logrus.Fields{
			"message_id": messageID,
			"content_length": len(fullContent),
			"first_time": true,
		}).Debug("[STREAMING] First delta for message")
		return fullContent
	}

	// Calculate delta
	if lastIndex >= len(fullContent) {
		h.logger.WithFields(logrus.Fields{
			"message_id": messageID,
			"last_index": lastIndex,
			"content_length": len(fullContent),
		}).Debug("[STREAMING] No new content to send")
		return "" // Nothing new to send
	}

	delta := fullContent[lastIndex:]
	session.LastSentIndex[messageID] = len(fullContent)
	
	deltaPreview := delta
	if len(delta) > 50 {
		deltaPreview = delta[:50] + "..."
	}
	
	h.logger.WithFields(logrus.Fields{
		"message_id": messageID,
		"last_index": lastIndex,
		"new_index": len(fullContent),
		"delta_length": len(delta),
		"delta_preview": deltaPreview,
	}).Debug("[STREAMING] Calculated delta")
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
		"content_length": len(content),
		"timestamp": time.Now().Format(time.RFC3339Nano),
	}).Info("[STREAMING] Starting streaming chat request")

	// Get or create streaming session
	streamSession := h.getOrCreateSession(sessionID)
	h.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"session_ptr": fmt.Sprintf("%p", streamSession),
	}).Debug("[STREAMING] Session ready for streaming")

	// Create chat message
	chatMsg := services.ChatMessage{
		Content:      content,
		SessionID:    sessionID,
		AutonomyMode: autonomyMode,
		Context:      make(map[string]interface{}), // Will be populated from session
	}

	// Get streaming response
	ctx := r.Context()
	deadline, hasDeadline := ctx.Deadline()
	h.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"has_deadline": hasDeadline,
		"deadline": deadline,
	}).Debug("[STREAMING] Calling ProcessChatMessageStreaming")
	
	chunks, err := h.excelBridge.ProcessChatMessageStreaming(ctx, sessionID, chatMsg)
	if err != nil {
		h.logger.WithError(err).WithFields(logrus.Fields{
			"session_id": sessionID,
		}).Error("[STREAMING] Failed to start streaming")
		errorData, _ := json.Marshal(map[string]string{"error": err.Error()})
		fmt.Fprintf(w, "data: %s\n\n", errorData)
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		return
	}
	
	h.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"channel_ptr": fmt.Sprintf("%p", chunks),
	}).Debug("[STREAMING] Got chunks channel from ProcessChatMessageStreaming")

	// Stream chunks to client
	flusher, ok := w.(http.Flusher)
	if !ok {
		h.logger.Warn("[STREAMING] ResponseWriter does not support flushing, attempting to continue anyway")
		// Continue anyway - the response will be buffered but should still work
	} else {
		h.logger.Debug("[STREAMING] Flusher interface available")
	}

	chunkCount := 0
	startTime := time.Now()
	firstChunkSent := false
	currentMessageID := ""
	fullContent := strings.Builder{}

	h.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
	}).Debug("[STREAMING] Starting to read from chunks channel")
	
	for chunk := range chunks {
		select {
		case <-ctx.Done():
			h.logger.WithFields(logrus.Fields{
				"session_id": sessionID,
				"chunks_sent": chunkCount,
			}).Info("[STREAMING] Client disconnected, stopping stream")
			return
		default:
			chunkCount++
			h.logger.WithFields(logrus.Fields{
				"chunk_number": chunkCount,
				"chunk_type": chunk.Type,
				"chunk_id": chunk.ID,
				"has_content": chunk.Content != "",
				"has_delta": chunk.Delta != "",
				"is_done": chunk.Done,
			}).Debug("[STREAMING] Received chunk from channel")

			// Track message ID
			if chunk.ID != "" && currentMessageID == "" {
				currentMessageID = chunk.ID
				h.logger.WithFields(logrus.Fields{
					"message_id": currentMessageID,
					"chunk_number": chunkCount,
				}).Debug("[STREAMING] Set current message ID")
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
						"delta_length":         len(delta),
						"message_id":           currentMessageID,
					}).Info("[STREAMING] First chunk being sent - streaming is active")
				}

				h.logger.WithFields(logrus.Fields{
					"chunk_number": chunkCount,
					"chunk_type":   chunk.Type,
					"has_delta":    delta != "",
					"delta_length": len(delta),
					"is_done":      chunk.Done,
					"elapsed_ms":   time.Since(startTime).Milliseconds(),
					"message_id":   currentMessageID,
					"full_content_length": fullContent.Len(),
				}).Debug("[STREAMING] Sending delta chunk")

				fmt.Fprintf(w, "data: %s\n\n", data)
				if flusher != nil {
					flusher.Flush()
					h.logger.WithFields(logrus.Fields{
						"chunk_number": chunkCount,
						"data_size": len(data),
						"chunk_type": "text_delta",
					}).Debug("[STREAMING] Flushed delta chunk to client")
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
					"chunk_number":  chunkCount,
					"elapsed_ms":    time.Since(startTime).Milliseconds(),
				}).Info("[STREAMING] Sending actions chunk")

				fmt.Fprintf(w, "data: %s\n\n", data)
				if flusher != nil {
					flusher.Flush()
					h.logger.WithFields(logrus.Fields{
						"chunk_type": "actions",
						"data_size": len(data),
					}).Debug("[STREAMING] Flushed actions chunk to client")
				}
			} else {
				// Non-text chunks (tool events, etc.) - send as-is
				h.logger.WithFields(logrus.Fields{
					"chunk_type": chunk.Type,
					"chunk_number": chunkCount,
					"has_content": chunk.Content != "",
					"has_delta": chunk.Delta != "",
				}).Debug("[STREAMING] Processing non-text chunk")
				
				data, err := json.Marshal(chunk)
				if err != nil {
					h.logger.WithError(err).Error("[STREAMING] Failed to marshal chunk")
					continue
				}

				fmt.Fprintf(w, "data: %s\n\n", data)
				if flusher != nil {
					flusher.Flush()
					h.logger.WithFields(logrus.Fields{
						"chunk_type": chunk.Type,
						"data_size": len(data),
					}).Debug("[STREAMING] Flushed non-text chunk to client")
				}
			}

			if chunk.Done {
				h.logger.WithFields(logrus.Fields{
					"chunk_number": chunkCount,
					"total_content_length": fullContent.Len(),
				}).Debug("[STREAMING] Sending DONE signal")
				
				fmt.Fprintf(w, "data: [DONE]\n\n")
				if flusher != nil {
					flusher.Flush()
					h.logger.Debug("[STREAMING] Flushed DONE signal to client")
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
					"session_id":        sessionID,
					"message_id":        currentMessageID,
					"final_content_length": fullContent.Len(),
				}).Log(logLevel, "[STREAMING] Streaming completed")
				return
			}
		}
	}
	
	h.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"chunks_sent": chunkCount,
		"duration_ms": time.Since(startTime).Milliseconds(),
	}).Warn("[STREAMING] Channel closed without done signal")
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
