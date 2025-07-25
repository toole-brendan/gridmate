package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"

	"github.com/gridmate/backend/internal/services"
	"github.com/gridmate/backend/internal/services/documents"
)

// ChatHandler handles AI chat requests with Excel and document context
type ChatHandler struct {
	excelBridge *services.ExcelBridge
	docService  *documents.DocumentService
	logger      *logrus.Logger
}

// NewChatHandler creates a new chat handler
func NewChatHandler(
	excelBridge *services.ExcelBridge,
	docService *documents.DocumentService,
	logger *logrus.Logger,
) *ChatHandler {
	return &ChatHandler{
		excelBridge: excelBridge,
		docService:  docService,
		logger:      logger,
	}
}

// ChatRequest represents an AI chat request
type ChatRequest struct {
	Message      string                 `json:"message" validate:"required"`
	SessionID    string                 `json:"session_id" validate:"required"`
	ExcelContext ExcelContext           `json:"excel_context,omitempty"`
	IncludeDocs  bool                   `json:"include_docs,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// ExcelContext represents Excel-specific context
type ExcelContext struct {
	Workbook     string                    `json:"workbook,omitempty"`
	Worksheet    string                    `json:"worksheet,omitempty"`
	Selection    services.SelectionChanged `json:"selection,omitempty"`
	CellValues   map[string]interface{}    `json:"cell_values,omitempty"`
	Formulas     map[string]string         `json:"formulas,omitempty"`
	VisibleRange string                    `json:"visible_range,omitempty"`
}

// ChatResponse represents the AI's response
type ChatResponse struct {
	Message      string                    `json:"message"`
	Suggestions  []string                  `json:"suggestions,omitempty"`
	Actions      []services.ProposedAction `json:"actions,omitempty"`
	DocumentRefs []DocumentReference       `json:"document_refs,omitempty"`
	SessionID    string                    `json:"session_id"`
}

// DocumentReference represents a reference to a source document
type DocumentReference struct {
	DocumentID string  `json:"document_id"`
	Title      string  `json:"title"`
	ChunkID    string  `json:"chunk_id"`
	Excerpt    string  `json:"excerpt"`
	Relevance  float64 `json:"relevance"`
}

// Chat handles AI chat requests with full context
func (h *ChatHandler) Chat(w http.ResponseWriter, r *http.Request) {
	// Add panic recovery for handler
	defer func() {
		if p := recover(); p != nil {
			h.logger.WithFields(logrus.Fields{
				"panic": p,
				"path":  r.URL.Path,
			}).Error("Panic in chat handler")
			h.sendError(w, http.StatusInternalServerError, "Internal server error")
		}
	}()

	userIDStr := r.Context().Value("user_id").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid user ID")
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Build context for chat
	context := make(map[string]interface{})

	// Add Excel context if provided
	if req.ExcelContext.Worksheet != "" {
		context["workbook"] = req.ExcelContext.Workbook
		context["worksheet"] = req.ExcelContext.Worksheet
		context["selection"] = req.ExcelContext.Selection
		context["cellValues"] = req.ExcelContext.CellValues
		context["formulas"] = req.ExcelContext.Formulas
	}

	// Add document context if requested
	var documentRefs []DocumentReference
	if req.IncludeDocs {
		// Search for relevant documents based on the message
		docContext, err := h.docService.GetDocumentContext(r.Context(), userID, req.Message, 5)
		if err != nil {
			h.logger.WithError(err).Warn("Failed to get document context")
		} else {
			// Add document context to the chat context
			documentTexts := []string{}
			for _, chunk := range docContext.Chunks {
				documentTexts = append(documentTexts, chunk.Content)

				// Create document reference
				if docInfo, ok := docContext.Documents[chunk.DocumentID]; ok {
					ref := DocumentReference{
						DocumentID: chunk.DocumentID,
						Title:      docInfo.Title,
						ChunkID:    chunk.ChunkID,
						Excerpt:    truncateText(chunk.Content, 200),
						Relevance:  chunk.Relevance,
					}
					documentRefs = append(documentRefs, ref)
				}
			}
			context["document_context"] = documentTexts
			context["key_metrics"] = docContext.KeyMetrics
		}
	}

	// Add any additional metadata
	for k, v := range req.Metadata {
		context[k] = v
	}

	// Create chat message for Excel bridge
	chatMsg := services.ChatMessage{
		Content:   req.Message,
		Context:   context,
		SessionID: req.SessionID,
	}

	// Process through Excel bridge (which includes AI processing)
	response, err := h.excelBridge.ProcessChatMessage("", chatMsg)
	if err != nil {
		h.logger.WithError(err).Error("Failed to process chat message")
		h.sendError(w, http.StatusInternalServerError, "Failed to process message")
		return
	}

	// Build response
	resp := ChatResponse{
		Message:      response.Content,
		Suggestions:  response.Suggestions,
		Actions:      response.Actions,
		DocumentRefs: documentRefs,
		SessionID:    response.SessionID,
	}

	h.sendJSON(w, http.StatusOK, resp)
}

// GetChatSuggestions returns contextual suggestions
func (h *ChatHandler) GetChatSuggestions(w http.ResponseWriter, r *http.Request) {
	// userIDStr := r.Context().Value("user_id").(string) // TODO: Use when needed

	// Get context from query params
	worksheet := r.URL.Query().Get("worksheet")
	selectedCell := r.URL.Query().Get("selected_cell")

	suggestions := []string{
		"Explain this formula",
		"Check for errors in this range",
		"Create a sum formula",
		"Format as currency",
		"Generate a chart",
		"Find related financial data",
	}

	// Customize suggestions based on context
	if worksheet != "" && selectedCell != "" {
		suggestions = append([]string{
			"What does cell " + selectedCell + " calculate?",
			"Trace precedents for " + selectedCell,
		}, suggestions...)
	}

	h.sendJSON(w, http.StatusOK, map[string][]string{"suggestions": suggestions[:8]})
}

// SuggestFormula suggests formulas based on context
type SuggestFormulaRequest struct {
	Description   string       `json:"description" validate:"required"`
	CellReference string       `json:"cell_reference"`
	ExcelContext  ExcelContext `json:"excel_context,omitempty"`
}

type SuggestFormulaResponse struct {
	Formulas []FormulaSuggestion `json:"formulas"`
}

type FormulaSuggestion struct {
	Formula     string  `json:"formula"`
	Description string  `json:"description"`
	Example     string  `json:"example,omitempty"`
	Confidence  float64 `json:"confidence"`
}

// SuggestFormula provides AI-powered formula suggestions
func (h *ChatHandler) SuggestFormula(w http.ResponseWriter, r *http.Request) {
	// Add panic recovery for handler
	defer func() {
		if p := recover(); p != nil {
			h.logger.WithFields(logrus.Fields{
				"panic": p,
				"path":  r.URL.Path,
			}).Error("Panic in SuggestFormula handler")
			h.sendError(w, http.StatusInternalServerError, "Internal server error")
		}
	}()

	var req SuggestFormulaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Build prompt for formula suggestion
	prompt := "Suggest Excel formulas for: " + req.Description
	if req.CellReference != "" {
		prompt += " (for cell " + req.CellReference + ")"
	}

	// Add Excel context if available
	context := make(map[string]interface{})
	if req.ExcelContext.Worksheet != "" {
		context["worksheet"] = req.ExcelContext.Worksheet
		context["cellValues"] = req.ExcelContext.CellValues
		context["formulas"] = req.ExcelContext.Formulas
	}

	// Process through Excel bridge
	chatMsg := services.ChatMessage{
		Content: prompt,
		Context: context,
	}

	_, err := h.excelBridge.ProcessChatMessage("", chatMsg)
	if err != nil {
		h.logger.WithError(err).Error("Failed to process formula suggestion")
		h.sendError(w, http.StatusInternalServerError, "Failed to generate suggestions")
		return
	}

	// Parse AI response into formula suggestions
	// For now, return mock suggestions
	suggestions := []FormulaSuggestion{
		{
			Formula:     "=SUM(A1:A10)",
			Description: "Sums values in range A1 to A10",
			Example:     "=SUM(Revenue!B2:B13)",
			Confidence:  0.95,
		},
		{
			Formula:     "=SUMIF(A:A,\">0\",B:B)",
			Description: "Sums values in column B where corresponding value in column A is greater than 0",
			Example:     "=SUMIF(Expenses!A:A,\"Marketing\",Expenses!B:B)",
			Confidence:  0.85,
		},
	}

	resp := SuggestFormulaResponse{
		Formulas: suggestions,
	}

	h.sendJSON(w, http.StatusOK, resp)
}

func (h *ChatHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode response")
	}
}

func (h *ChatHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}

func truncateText(text string, maxLength int) string {
	if len(text) <= maxLength {
		return text
	}
	return text[:maxLength] + "..."
}
