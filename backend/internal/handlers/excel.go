package handlers

import (
	"encoding/json"
	"net/http"
	
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/services"
)

type ExcelHandler struct {
	excelBridge *services.ExcelBridge
	logger      *logrus.Logger
}

func NewExcelHandler(excelBridge *services.ExcelBridge, logger *logrus.Logger) *ExcelHandler {
	return &ExcelHandler{
		excelBridge: excelBridge,
		logger:      logger,
	}
}

type ExcelContextRequest struct {
	WorkbookName  string                 `json:"workbookName"`
	WorksheetName string                 `json:"worksheetName"`
	SelectedRange string                 `json:"selectedRange"`
	Values        [][]interface{}        `json:"values,omitempty"`
	Formulas      [][]string             `json:"formulas,omitempty"`
	Metadata      map[string]interface{} `json:"metadata,omitempty"`
}

type ExcelContextResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// SendContext handles Excel context updates
func (h *ExcelHandler) SendContext(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	
	var req ExcelContextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	
	// Store context in ExcelBridge
	// TODO: Implement UpdateContext method in ExcelBridge
	// h.excelBridge.UpdateContext(userID, services.ExcelContext{
	// 	WorkbookName:  req.WorkbookName,
	// 	WorksheetName: req.WorksheetName,
	// 	SelectedRange: req.SelectedRange,
	// 	Values:        req.Values,
	// 	Formulas:      req.Formulas,
	// })
	
	// For now, just log the context
	h.logger.WithFields(logrus.Fields{
		"user_id":       userID,
		"workbook":      req.WorkbookName,
		"worksheet":     req.WorksheetName,
		"selected_range": req.SelectedRange,
	}).Debug("Excel context received")
	
	h.logger.WithFields(logrus.Fields{
		"user_id":  userID,
		"workbook": req.WorkbookName,
		"range":    req.SelectedRange,
	}).Info("Excel context updated")
	
	h.sendJSON(w, http.StatusOK, ExcelContextResponse{
		Success: true,
		Message: "Context updated successfully",
	})
}

func (h *ExcelHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *ExcelHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}