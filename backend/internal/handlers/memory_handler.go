package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gridmate/backend/internal/services"
	"github.com/gridmate/backend/internal/services/indexing"
	"github.com/sirupsen/logrus"
)

type MemoryHandler struct {
	indexingService *indexing.IndexingService
	excelBridge     *services.ExcelBridge
	logger          *logrus.Logger
}

// NewMemoryHandler creates a new memory handler
func NewMemoryHandler(indexingService *indexing.IndexingService, excelBridge *services.ExcelBridge, logger *logrus.Logger) *MemoryHandler {
	return &MemoryHandler{
		indexingService: indexingService,
		excelBridge:     excelBridge,
		logger:          logger,
	}
}

// GetMemoryStats returns memory statistics for a session
func (h *MemoryHandler) GetMemoryStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	session := h.excelBridge.GetSession(sessionID)
	if session == nil || session.MemoryStore == nil {
		h.sendError(w, http.StatusNotFound, "Session not found")
		return
	}

	stats := (*session.MemoryStore).GetStats()

	response := map[string]interface{}{
		"totalChunks":       stats.TotalChunks,
		"spreadsheetChunks": stats.SpreadsheetChunks,
		"documentChunks":    stats.DocumentChunks,
		"chatChunks":        stats.ChatChunks,
		"lastIndexed":       session.MemoryStats.LastIndexed,
		"indexVersion":      session.MemoryStats.IndexVersion,
	}

	h.sendJSON(w, response)
}

// UploadDocument handles document upload and indexing
func (h *MemoryHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	sessionID := r.FormValue("sessionId")

	session := h.excelBridge.GetSession(sessionID)
	if session == nil {
		h.sendError(w, http.StatusNotFound, "Session not found")
		return
	}

	// Parse uploaded file
	file, header, err := r.FormFile("file")
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Failed to parse file")
		return
	}
	defer file.Close()

	// Start indexing in background
	go h.indexingService.IndexDocument(
		r.Context(),
		sessionID,
		file,
		header.Filename,
		*session.MemoryStore,
	)

	response := map[string]interface{}{
		"documentId": uuid.New().String(),
		"status":     "indexing",
		"filename":   header.Filename,
	}

	h.sendJSON(w, response)
}

// ReindexWorkbook triggers reindexing of the current workbook
func (h *MemoryHandler) ReindexWorkbook(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	session := h.excelBridge.GetSession(sessionID)
	if session == nil {
		h.sendError(w, http.StatusNotFound, "Session not found")
		return
	}

	// Get current workbook data
	// TODO: Implement GetWorkbookData method on ExcelBridge
	// For now, we'll just update the stats
	session.MemoryStats.LastIndexed = time.Now()

	h.sendJSON(w, map[string]interface{}{
		"status": "started",
	})
}

// GetIndexingProgress returns current indexing progress
func (h *MemoryHandler) GetIndexingProgress(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sessionID := vars["sessionId"]

	progress := h.indexingService.GetProgress(sessionID)
	if progress == nil {
		h.sendJSON(w, map[string]interface{}{
			"status": "idle",
		})
		return
	}

	response := map[string]interface{}{
		"status":         progress.Status,
		"processedItems": progress.ProcessedItems,
		"totalItems":     progress.TotalItems,
	}

	if progress.Error != nil {
		response["error"] = progress.Error.Error()
	}

	h.sendJSON(w, response)
}

// SearchMemory performs memory search
func (h *MemoryHandler) SearchMemory(w http.ResponseWriter, r *http.Request) {
	var request struct {
		SessionID    string `json:"sessionId"`
		Query        string `json:"query"`
		SourceFilter string `json:"sourceFilter"`
		Limit        int    `json:"limit"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	session := h.excelBridge.GetSession(request.SessionID)
	if session == nil || session.MemoryStore == nil {
		h.sendJSON(w, map[string]interface{}{
			"results": []interface{}{},
			"message": "No memory available for this session",
		})
		return
	}

	// For now, return sample results
	// Full implementation would use the embedding service to search
	results := []map[string]interface{}{
		{
			"source":     "spreadsheet",
			"content":    "Revenue projections for Q1-Q4 2024",
			"similarity": 0.92,
			"reference":  "Sheet1!A1:E20",
		},
		{
			"source":     "document",
			"content":    "Market analysis indicates 15% growth potential",
			"similarity": 0.87,
			"reference":  "MarketAnalysis.pdf, page 5",
		},
	}

	h.sendJSON(w, map[string]interface{}{
		"results": results,
		"query":   request.Query,
		"total":   len(results),
	})
}

// Helper methods

func (h *MemoryHandler) sendJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode response")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

func (h *MemoryHandler) sendError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": message,
	})
}