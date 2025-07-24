package handlers

import (
    "encoding/json"
    "fmt"
    "net/http"
    
    "github.com/gridmate/backend/internal/services"
    "github.com/sirupsen/logrus"
)

type StreamingHandler struct {
    excelBridge *services.ExcelBridge
    logger      *logrus.Logger
}

func NewStreamingHandler(excelBridge *services.ExcelBridge, logger *logrus.Logger) *StreamingHandler {
    return &StreamingHandler{
        excelBridge: excelBridge,
        logger:      logger,
    }
}

// HandleChatStream handles streaming chat requests
func (h *StreamingHandler) HandleChatStream(w http.ResponseWriter, r *http.Request) {
    // Set SSE headers
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")
    
    // Parse query params
    sessionID := r.URL.Query().Get("sessionId")
    content := r.URL.Query().Get("content")
    autonomyMode := r.URL.Query().Get("autonomyMode")
    
    if sessionID == "" || content == "" {
        fmt.Fprintf(w, "data: {\"error\": \"Missing required parameters\"}\n\n")
        return
    }
    
    h.logger.WithFields(logrus.Fields{
        "session_id": sessionID,
        "content": content,
        "autonomy_mode": autonomyMode,
    }).Info("Starting streaming chat request")
    
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
        return
    }
    
    // Stream chunks to client
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming not supported", http.StatusInternalServerError)
        return
    }
    
    for chunk := range chunks {
        select {
        case <-ctx.Done():
            h.logger.Info("Client disconnected, stopping stream")
            return
        default:
            data, err := json.Marshal(chunk)
            if err != nil {
                h.logger.WithError(err).Error("Failed to marshal chunk")
                continue
            }
            
            fmt.Fprintf(w, "data: %s\n\n", data)
            flusher.Flush()
            
            if chunk.Done {
                fmt.Fprintf(w, "data: [DONE]\n\n")
                flusher.Flush()
                h.logger.Info("Streaming completed successfully")
                return
            }
        }
    }
}