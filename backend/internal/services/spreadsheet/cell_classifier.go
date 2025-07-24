package spreadsheet

import (
	"regexp"
	"strings"
)

// CellPurpose represents the purpose or role of a cell in a spreadsheet
type CellPurpose string

const (
	PurposeHeader      CellPurpose = "header"
	PurposeLabel       CellPurpose = "label"
	PurposeInput       CellPurpose = "input"
	PurposeCalculation CellPurpose = "calculation"
	PurposeTotal       CellPurpose = "total"
	PurposeSubtotal    CellPurpose = "subtotal"
	PurposeReference   CellPurpose = "reference"
	PurposeConstant    CellPurpose = "constant"
	PurposeEmpty       CellPurpose = "empty"
	PurposeUnknown     CellPurpose = "unknown"
)

// CellClassification contains the classification results for a cell
type CellClassification struct {
	Purpose    CellPurpose            `json:"purpose"`
	Confidence float64                `json:"confidence"`
	DataType   string                 `json:"dataType"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// CellClassifier classifies cells based on their content and context
type CellClassifier struct {
	// Patterns for classification
	totalPattern    *regexp.Regexp
	subtotalPattern *regexp.Regexp
	labelPattern    *regexp.Regexp
	yearPattern     *regexp.Regexp
	quarterPattern  *regexp.Regexp
}

// NewCellClassifier creates a new cell classifier
func NewCellClassifier() *CellClassifier {
	return &CellClassifier{
		totalPattern:    regexp.MustCompile(`(?i)\b(total|sum|grand\s*total)\b`),
		subtotalPattern: regexp.MustCompile(`(?i)\b(subtotal|sub\s*total)\b`),
		labelPattern:    regexp.MustCompile(`(?i)^(revenue|cost|expense|profit|margin|sales|income|assets|liabilities|equity)`),
		yearPattern:     regexp.MustCompile(`^(19|20)\d{2}$`),
		quarterPattern:  regexp.MustCompile(`(?i)^Q[1-4](\s+\d{4})?$`),
	}
}

// ClassifyCell determines the purpose of a cell based on its content and context
func (cc *CellClassifier) ClassifyCell(
	value interface{},
	formula string,
	row, col int,
	context CellContext,
) CellClassification {
	// Handle empty cells
	if cc.isEmpty(value) && formula == "" {
		return CellClassification{
			Purpose:    PurposeEmpty,
			Confidence: 1.0,
			DataType:   "empty",
		}
	}
	
	// Check if it's a formula
	if formula != "" && strings.HasPrefix(formula, "=") {
		return cc.classifyFormula(formula, value, context)
	}
	
	// Check if it's a text value
	if str, ok := value.(string); ok {
		return cc.classifyText(str, row, col, context)
	}
	
	// Check if it's a numeric value
	if cc.isNumeric(value) {
		return cc.classifyNumeric(value, row, col, context)
	}
	
	return CellClassification{
		Purpose:    PurposeUnknown,
		Confidence: 0.5,
		DataType:   cc.getDataType(value),
	}
}

// classifyFormula classifies cells containing formulas
func (cc *CellClassifier) classifyFormula(formula string, value interface{}, context CellContext) CellClassification {
	formulaLower := strings.ToLower(formula)
	attributes := make(map[string]interface{})
	
	// Check for total formulas
	if strings.Contains(formulaLower, "sum(") {
		// Check if it's referencing a column or row
		if cc.isTotalFormula(formula, context) {
			return CellClassification{
				Purpose:    PurposeTotal,
				Confidence: 0.9,
				DataType:   "formula",
				Attributes: map[string]interface{}{
					"formulaType": "sum",
					"formula":     formula,
				},
			}
		}
		
		return CellClassification{
			Purpose:    PurposeCalculation,
			Confidence: 0.8,
			DataType:   "formula",
			Attributes: map[string]interface{}{
				"formulaType": "aggregation",
				"formula":     formula,
			},
		}
	}
	
	// Check for lookup formulas
	if cc.containsAny(formulaLower, []string{"vlookup", "hlookup", "index", "match", "xlookup"}) {
		return CellClassification{
			Purpose:    PurposeReference,
			Confidence: 0.85,
			DataType:   "formula",
			Attributes: map[string]interface{}{
				"formulaType": "lookup",
				"formula":     formula,
			},
		}
	}
	
	// Default formula classification
	return CellClassification{
		Purpose:    PurposeCalculation,
		Confidence: 0.7,
		DataType:   "formula",
		Attributes: map[string]interface{}{
			"formula": formula,
		},
	}
}

// classifyText classifies cells containing text
func (cc *CellClassifier) classifyText(text string, row, col int, context CellContext) CellClassification {
	text = strings.TrimSpace(text)
	
	// Check for total indicators
	if cc.totalPattern.MatchString(text) {
		return CellClassification{
			Purpose:    PurposeLabel,
			Confidence: 0.9,
			DataType:   "text",
			Attributes: map[string]interface{}{
				"labelType": "total",
			},
		}
	}
	
	// Check for subtotal indicators
	if cc.subtotalPattern.MatchString(text) {
		return CellClassification{
			Purpose:    PurposeLabel,
			Confidence: 0.85,
			DataType:   "text",
			Attributes: map[string]interface{}{
				"labelType": "subtotal",
			},
		}
	}
	
	// Check if it's in a header row
	if context.IsHeaderRow {
		return CellClassification{
			Purpose:    PurposeHeader,
			Confidence: 0.8,
			DataType:   "text",
		}
	}
	
	// Check for common labels
	if cc.labelPattern.MatchString(text) {
		return CellClassification{
			Purpose:    PurposeLabel,
			Confidence: 0.75,
			DataType:   "text",
			Attributes: map[string]interface{}{
				"labelType": "metric",
			},
		}
	}
	
	// Check for year/quarter patterns
	if cc.yearPattern.MatchString(text) || cc.quarterPattern.MatchString(text) {
		return CellClassification{
			Purpose:    PurposeHeader,
			Confidence: 0.7,
			DataType:   "text",
			Attributes: map[string]interface{}{
				"headerType": "time",
			},
		}
	}
	
	// Default text classification
	if col == 0 { // First column is often labels
		return CellClassification{
			Purpose:    PurposeLabel,
			Confidence: 0.6,
			DataType:   "text",
		}
	}
	
	return CellClassification{
		Purpose:    PurposeConstant,
		Confidence: 0.5,
		DataType:   "text",
	}
}

// classifyNumeric classifies cells containing numeric values
func (cc *CellClassifier) classifyNumeric(value interface{}, row, col int, context CellContext) CellClassification {
	// Check if it's in an input region
	if context.IsInputRegion {
		return CellClassification{
			Purpose:    PurposeInput,
			Confidence: 0.8,
			DataType:   "numeric",
		}
	}
	
	// Check if it's in a total row
	if context.IsTotalRow {
		return CellClassification{
			Purpose:    PurposeTotal,
			Confidence: 0.75,
			DataType:   "numeric",
		}
	}
	
	// Default numeric classification
	return CellClassification{
		Purpose:    PurposeConstant,
		Confidence: 0.6,
		DataType:   "numeric",
	}
}

// Helper methods

func (cc *CellClassifier) isEmpty(value interface{}) bool {
	if value == nil {
		return true
	}
	if str, ok := value.(string); ok {
		return strings.TrimSpace(str) == ""
	}
	return false
}

func (cc *CellClassifier) isNumeric(value interface{}) bool {
	switch value.(type) {
	case int, int8, int16, int32, int64,
		uint, uint8, uint16, uint32, uint64,
		float32, float64:
		return true
	default:
		return false
	}
}

func (cc *CellClassifier) getDataType(value interface{}) string {
	switch value.(type) {
	case string:
		return "text"
	case int, int8, int16, int32, int64,
		uint, uint8, uint16, uint32, uint64,
		float32, float64:
		return "numeric"
	case bool:
		return "boolean"
	default:
		return "unknown"
	}
}

func (cc *CellClassifier) containsAny(text string, patterns []string) bool {
	for _, pattern := range patterns {
		if strings.Contains(text, pattern) {
			return true
		}
	}
	return false
}

func (cc *CellClassifier) isTotalFormula(formula string, context CellContext) bool {
	// Simple heuristic: if SUM formula spans multiple cells and is at bottom/right
	formulaLower := strings.ToLower(formula)
	if strings.Contains(formulaLower, "sum(") && strings.Contains(formulaLower, ":") {
		// Check if it's likely a total (at edge of data)
		return context.IsEdgeCell || context.IsTotalRow
	}
	return false
}

// CellContext provides context about a cell's position and surroundings
type CellContext struct {
	IsHeaderRow   bool
	IsTotalRow    bool
	IsInputRegion bool
	IsEdgeCell    bool
	RowData       []interface{}
	ColData       []interface{}
}