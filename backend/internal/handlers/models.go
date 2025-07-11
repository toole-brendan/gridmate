package handlers

import (
	"encoding/json"
	"net/http"
	
	"github.com/sirupsen/logrus"
)

type ModelsHandler struct {
	logger *logrus.Logger
}

func NewModelsHandler(logger *logrus.Logger) *ModelsHandler {
	return &ModelsHandler{
		logger: logger,
	}
}

type ModelTemplate struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Category    string                 `json:"category"`
	Description string                 `json:"description"`
	Structure   map[string]interface{} `json:"structure"`
	Formulas    map[string]string      `json:"formulas"`
	Assumptions map[string]interface{} `json:"assumptions"`
}

var defaultTemplates = []ModelTemplate{
	{
		ID:          "dcf-basic",
		Name:        "DCF Model - Basic",
		Category:    "Valuation",
		Description: "Basic Discounted Cash Flow model with revenue projections and WACC calculation",
		Structure: map[string]interface{}{
			"sheets": []string{"Assumptions", "Revenue", "Costs", "FCF", "Valuation"},
		},
		Formulas: map[string]string{
			"fcf":           "=EBIT*(1-TaxRate)+Depreciation-CapEx-ChangeInNWC",
			"terminalValue": "=FCF_LastYear*(1+TerminalGrowth)/(WACC-TerminalGrowth)",
			"npv":           "=NPV(WACC,FCF_Range)+TerminalValue/(1+WACC)^Years",
		},
		Assumptions: map[string]interface{}{
			"wacc":           0.10,
			"terminalGrowth": 0.025,
			"taxRate":        0.21,
		},
	},
	{
		ID:          "lbo-basic",
		Name:        "LBO Model - Basic",
		Category:    "Private Equity",
		Description: "Basic Leveraged Buyout model with debt schedule and returns analysis",
		Structure: map[string]interface{}{
			"sheets": []string{"Assumptions", "Sources & Uses", "OpModel", "DebtSchedule", "Returns"},
		},
		Formulas: map[string]string{
			"debtPaydown":    "=MIN(CashAvailable,BeginningDebt)",
			"exitEquity":     "=ExitEV-NetDebt",
			"moic":           "=ExitEquity/InitialEquity",
			"irr":            "=IRR(CashFlows)",
		},
		Assumptions: map[string]interface{}{
			"entryMultiple": 10.0,
			"exitMultiple":  12.0,
			"debtMultiple":  5.0,
			"holdPeriod":    5,
		},
	},
	{
		ID:          "comps-analysis",
		Name:        "Trading Comps Analysis",
		Category:    "Valuation",
		Description: "Trading comparables analysis with peer benchmarking",
		Structure: map[string]interface{}{
			"sheets": []string{"CompanyData", "Multiples", "Benchmarking", "Summary"},
		},
		Formulas: map[string]string{
			"evToEbitda":     "=EnterpriseValue/EBITDA",
			"peRatio":        "=Price/EPS",
			"evToRevenue":    "=EnterpriseValue/Revenue",
			"medianMultiple": "=MEDIAN(MultiplesRange)",
		},
		Assumptions: map[string]interface{}{
			"outlierThreshold": 2.0,
			"sectorFilter":     true,
		},
	},
}

// GetTemplates returns available financial model templates
func (h *ModelsHandler) GetTemplates(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	
	var templates []ModelTemplate
	if category != "" {
		for _, tmpl := range defaultTemplates {
			if tmpl.Category == category {
				templates = append(templates, tmpl)
			}
		}
	} else {
		templates = defaultTemplates
	}
	
	h.logger.WithField("count", len(templates)).Info("Returning model templates")
	
	h.sendJSON(w, http.StatusOK, map[string]interface{}{
		"templates": templates,
		"count":     len(templates),
	})
}

// GetTemplate returns a specific template by ID
func (h *ModelsHandler) GetTemplate(w http.ResponseWriter, r *http.Request) {
	templateID := r.URL.Query().Get("id")
	if templateID == "" {
		h.sendError(w, http.StatusBadRequest, "Template ID required")
		return
	}
	
	for _, tmpl := range defaultTemplates {
		if tmpl.ID == templateID {
			h.sendJSON(w, http.StatusOK, tmpl)
			return
		}
	}
	
	h.sendError(w, http.StatusNotFound, "Template not found")
}

func (h *ModelsHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func (h *ModelsHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}