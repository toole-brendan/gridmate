package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/services/documents"
)

// DocumentHandler handles document-related HTTP requests
type DocumentHandler struct {
	docService *documents.DocumentService
	logger     *logrus.Logger
}

// NewDocumentHandler creates a new document handler
func NewDocumentHandler(docService *documents.DocumentService, logger *logrus.Logger) *DocumentHandler {
	return &DocumentHandler{
		docService: docService,
		logger:     logger,
	}
}

// UploadEDGARRequest represents a request to upload an EDGAR document
type UploadEDGARRequest struct {
	URL          string                    `json:"url" validate:"required,url"`
	DocumentType documents.DocumentType    `json:"document_type" validate:"required"`
	Content      string                    `json:"content,omitempty"` // If content is provided, URL is just for reference
}

// SearchDocumentsRequest represents a document search request
type SearchDocumentsRequest struct {
	Query string `json:"query" validate:"required"`
	Limit int    `json:"limit,omitempty"`
}

// UploadEDGARDocument handles EDGAR document upload and processing
func (h *DocumentHandler) UploadEDGARDocument(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req UploadEDGARRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// If content is not provided, fetch from URL
	content := req.Content
	if content == "" {
		// In production, you would fetch from the URL
		// For now, we'll return an error
		h.sendError(w, http.StatusNotImplemented, "URL fetching not implemented. Please provide content.")
		return
	}

	// Process the document
	doc, err := h.docService.ProcessEDGARDocument(r.Context(), userID, content, req.DocumentType, req.URL)
	if err != nil {
		h.logger.WithError(err).Error("Failed to process EDGAR document")
		h.sendError(w, http.StatusInternalServerError, "Failed to process document")
		return
	}

	h.sendJSON(w, http.StatusCreated, doc)
}

// SearchDocuments searches for relevant document chunks
func (h *DocumentHandler) SearchDocuments(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req SearchDocumentsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Default limit
	if req.Limit <= 0 || req.Limit > 50 {
		req.Limit = 10
	}

	results, err := h.docService.SearchDocuments(r.Context(), userID, req.Query, req.Limit)
	if err != nil {
		h.logger.WithError(err).Error("Failed to search documents")
		h.sendError(w, http.StatusInternalServerError, "Failed to search documents")
		return
	}

	h.sendJSON(w, http.StatusOK, results)
}

// GetDocumentContext retrieves relevant context for financial modeling
func (h *DocumentHandler) GetDocumentContext(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Get query from query params
	query := r.URL.Query().Get("query")
	if query == "" {
		h.sendError(w, http.StatusBadRequest, "Query parameter is required")
		return
	}

	// Get max chunks
	maxChunks := 5
	if maxChunksStr := r.URL.Query().Get("max_chunks"); maxChunksStr != "" {
		if parsed, err := strconv.Atoi(maxChunksStr); err == nil && parsed > 0 && parsed <= 20 {
			maxChunks = parsed
		}
	}

	context, err := h.docService.GetDocumentContext(r.Context(), userID, query, maxChunks)
	if err != nil {
		h.logger.WithError(err).Error("Failed to get document context")
		h.sendError(w, http.StatusInternalServerError, "Failed to get document context")
		return
	}

	h.sendJSON(w, http.StatusOK, context)
}

// ListDocuments lists recent documents for a user
func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Get limit from query params
	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	docs, err := h.docService.GetRecentDocuments(r.Context(), userID, limit)
	if err != nil {
		h.logger.WithError(err).Error("Failed to list documents")
		h.sendError(w, http.StatusInternalServerError, "Failed to list documents")
		return
	}

	h.sendJSON(w, http.StatusOK, docs)
}

// DeleteDocument deletes a document and its embeddings
func (h *DocumentHandler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	// Get document ID from URL
	docIDStr := mux.Vars(r)["id"]
	docID, err := uuid.Parse(docIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid document ID")
		return
	}

	if err := h.docService.DeleteDocument(r.Context(), userID, docID); err != nil {
		if err.Error() == "unauthorized" {
			h.sendError(w, http.StatusForbidden, "Access denied")
			return
		}
		h.logger.WithError(err).Error("Failed to delete document")
		h.sendError(w, http.StatusInternalServerError, "Failed to delete document")
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]string{"message": "Document deleted successfully"})
}

func (h *DocumentHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode response")
	}
}

func (h *DocumentHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}