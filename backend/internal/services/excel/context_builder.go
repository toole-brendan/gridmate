package excel

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gridmate/backend/internal/services/ai"
)

// ContextBuilder builds comprehensive Excel context for AI processing
type ContextBuilder struct {
	bridge    ai.ExcelBridge
	maxCells  int // Maximum cells to include in context
	maxRanges int // Maximum number of ranges to analyze
	// Cache for tracking cell changes
	cellChangeTracker map[string]*CellChangeInfo
	trackerMutex      sync.RWMutex
}

// CellChangeInfo tracks changes to individual cells
type CellChangeInfo struct {
	LastValue    interface{}
	LastFormula  string
	LastModified time.Time
	ModifyCount  int
}

// NewContextBuilder creates a new context builder
func NewContextBuilder(bridge ai.ExcelBridge) *ContextBuilder {
	return &ContextBuilder{
		bridge:            bridge,
		maxCells:          1000, // Default max cells to prevent context overflow
		maxRanges:         10,   // Default max ranges to analyze
		cellChangeTracker: make(map[string]*CellChangeInfo),
	}
}

// BuildContext builds comprehensive context from the current Excel state
// This overload is for the AI service interface
func (cb *ContextBuilder) BuildContext(ctx context.Context, sessionID string) (*ai.FinancialContext, error) {
	// Default to a reasonable range for context - can be enhanced later
	return cb.BuildContextWithRange(ctx, sessionID, "A1:Z100")
}

// BuildContextWithRange builds comprehensive context from the current Excel state with specific range
func (cb *ContextBuilder) BuildContextWithRange(ctx context.Context, sessionID string, selectedRange string) (*ai.FinancialContext, error) {
	context := &ai.FinancialContext{
		SelectedRange: selectedRange,
		CellValues:    make(map[string]interface{}),
		Formulas:      make(map[string]string),
		RecentChanges: []ai.CellChange{},
	}

	// Parse the selected range
	rangeInfo, err := parseRange(selectedRange)
	if err != nil {
		return nil, fmt.Errorf("invalid range: %w", err)
	}

	// 1. Get data from selected range
	if err := cb.addSelectedRangeData(ctx, sessionID, rangeInfo, context); err != nil {
		return nil, fmt.Errorf("failed to get selected range data: %w", err)
	}

	// 2. Get surrounding context
	if err := cb.addSurroundingContext(ctx, sessionID, rangeInfo, context); err != nil {
		// Log but don't fail - surrounding context is optional
		fmt.Printf("Warning: failed to get surrounding context: %v\n", err)
	}

	// 3. Detect headers and basic structure
	if err := cb.detectStructure(ctx, sessionID, rangeInfo, context); err != nil {
		fmt.Printf("Warning: failed to detect basic structure: %v\n", err)
	}

	// 3.5. Build comprehensive model structure understanding
	if err := cb.buildModelStructure(ctx, sessionID, rangeInfo, context); err != nil {
		fmt.Printf("Warning: failed to build model structure: %v\n", err)
	}

	// 4. Get named ranges that might be relevant
	if err := cb.addNamedRanges(ctx, sessionID, context); err != nil {
		fmt.Printf("Warning: failed to get named ranges: %v\n", err)
	}

	// 5. Analyze formulas and dependencies
	if err := cb.analyzeFormulas(context); err != nil {
		fmt.Printf("Warning: failed to analyze formulas: %v\n", err)
	}

	// 6. Auto-detect model type
	context.ModelType = cb.detectModelType(context)

	// 7. Add pending operations - the context builder doesn't have direct access to the registry
	// This will be populated by the AI service when it calls RefreshContext

	return context, nil
}

// addSelectedRangeData adds data from the selected range
func (cb *ContextBuilder) addSelectedRangeData(ctx context.Context, sessionID string, rangeInfo *RangeInfo, context *ai.FinancialContext) error {
	// Read the selected range
	data, err := cb.bridge.ReadRange(ctx, sessionID, rangeInfo.Address, true, false)
	if err != nil {
		return err
	}

	// Add values and formulas to context
	cellCount := 0
	for row := 0; row < data.RowCount && cellCount < cb.maxCells; row++ {
		for col := 0; col < data.ColCount && cellCount < cb.maxCells; col++ {
			cellAddr := getCellAddress(rangeInfo.StartRow+row, rangeInfo.StartCol+col)

			if row < len(data.Values) && col < len(data.Values[row]) {
				context.CellValues[cellAddr] = data.Values[row][col]
			}

			if data.Formulas != nil && row < len(data.Formulas) && col < len(data.Formulas[row]) {
				if formulaStr, ok := data.Formulas[row][col].(string); ok && formulaStr != "" {
					context.Formulas[cellAddr] = formulaStr
				}
			}

			cellCount++
		}
	}

	return nil
}

// addSurroundingContext adds context from cells around the selection
func (cb *ContextBuilder) addSurroundingContext(ctx context.Context, sessionID string, rangeInfo *RangeInfo, context *ai.FinancialContext) error {
	// Define context zones around selection
	zones := []struct {
		name      string
		rowOffset int
		colOffset int
		rows      int
		cols      int
	}{
		{"headers_above", -5, 0, 5, rangeInfo.ColCount},                 // 5 rows above
		{"labels_left", 0, -3, rangeInfo.RowCount, 3},                   // 3 columns to left
		{"context_below", rangeInfo.RowCount, 0, 3, rangeInfo.ColCount}, // 3 rows below
		{"context_right", 0, rangeInfo.ColCount, rangeInfo.RowCount, 2}, // 2 columns to right
	}

	for _, zone := range zones {
		startRow := rangeInfo.StartRow + zone.rowOffset
		startCol := rangeInfo.StartCol + zone.colOffset

		// Skip if out of bounds
		if startRow < 1 || startCol < 1 {
			continue
		}

		endRow := startRow + zone.rows - 1
		endCol := startCol + zone.cols - 1

		zoneRange := fmt.Sprintf("%s:%s", getCellAddress(startRow, startCol), getCellAddress(endRow, endCol))

		// Read zone data
		data, err := cb.bridge.ReadRange(ctx, sessionID, zoneRange, true, false)
		if err != nil {
			continue // Skip zones that fail
		}

		// Add zone data to context with zone prefix
		for row := 0; row < data.RowCount; row++ {
			for col := 0; col < data.ColCount; col++ {
				cellAddr := getCellAddress(startRow+row, startCol+col)

				if row < len(data.Values) && col < len(data.Values[row]) && data.Values[row][col] != nil {
					// Only add non-empty cells
					if str, ok := data.Values[row][col].(string); !ok || str != "" {
						context.CellValues[cellAddr] = data.Values[row][col]
					}
				}

				if data.Formulas != nil && row < len(data.Formulas) && col < len(data.Formulas[row]) {
					if formulaStr, ok := data.Formulas[row][col].(string); ok && formulaStr != "" {
						context.Formulas[cellAddr] = formulaStr
					}
				}
			}
		}
	}

	return nil
}

// detectStructure analyzes the data to detect headers and structure
func (cb *ContextBuilder) detectStructure(ctx context.Context, sessionID string, rangeInfo *RangeInfo, context *ai.FinancialContext) error {
	// Try to detect column headers (typically in row above selection)
	headerRow := rangeInfo.StartRow - 1
	if headerRow >= 1 {
		headerRange := fmt.Sprintf("%s:%s",
			getCellAddress(headerRow, rangeInfo.StartCol),
			getCellAddress(headerRow, rangeInfo.EndCol))

		data, err := cb.bridge.ReadRange(ctx, sessionID, headerRange, false, false)
		if err == nil && len(data.Values) > 0 {
			headers := []string{}
			for _, row := range data.Values {
				for _, val := range row {
					if str, ok := val.(string); ok && str != "" {
						headers = append(headers, str)
					}
				}
			}

			if len(headers) > 0 {
				// Add headers to document context
				context.DocumentContext = append(context.DocumentContext,
					fmt.Sprintf("Column headers: %s", strings.Join(headers, ", ")))
			}
		}
	}

	// Try to detect row labels (typically in column to left of selection)
	labelCol := rangeInfo.StartCol - 1
	if labelCol >= 1 {
		labelRange := fmt.Sprintf("%s:%s",
			getCellAddress(rangeInfo.StartRow, labelCol),
			getCellAddress(rangeInfo.EndRow, labelCol))

		data, err := cb.bridge.ReadRange(ctx, sessionID, labelRange, false, false)
		if err == nil && len(data.Values) > 0 {
			labels := []string{}
			for _, row := range data.Values {
				for _, val := range row {
					if str, ok := val.(string); ok && str != "" {
						labels = append(labels, str)
					}
				}
			}

			if len(labels) > 0 {
				// Add labels to document context
				context.DocumentContext = append(context.DocumentContext,
					fmt.Sprintf("Row labels: %s", strings.Join(labels, ", ")))
			}
		}
	}

	return nil
}

// addNamedRanges adds relevant named ranges to context
func (cb *ContextBuilder) addNamedRanges(ctx context.Context, sessionID string, context *ai.FinancialContext) error {
	namedRanges, err := cb.bridge.GetNamedRanges(ctx, sessionID, "workbook")
	if err != nil {
		return err
	}

	// Add named range information to document context
	if len(namedRanges) > 0 {
		rangeInfo := []string{}
		for _, nr := range namedRanges {
			rangeInfo = append(rangeInfo, fmt.Sprintf("%s (%s)", nr.Name, nr.Range))

			// If the named range is small, include its value
			if isSingleCell(nr.Range) {
				data, err := cb.bridge.ReadRange(ctx, sessionID, nr.Range, true, false)
				if err == nil && len(data.Values) > 0 && len(data.Values[0]) > 0 {
					context.CellValues[nr.Name] = data.Values[0][0]
					if len(data.Formulas) > 0 && len(data.Formulas[0]) > 0 {
						if formulaStr, ok := data.Formulas[0][0].(string); ok && formulaStr != "" {
							context.Formulas[nr.Name] = formulaStr
						}
					}
				}
			}
		}

		context.DocumentContext = append(context.DocumentContext,
			fmt.Sprintf("Named ranges: %s", strings.Join(rangeInfo, ", ")))
	}

	return nil
}

// analyzeFormulas analyzes formulas to understand dependencies
func (cb *ContextBuilder) analyzeFormulas(context *ai.FinancialContext) error {
	formulaPatterns := map[string]string{
		"SUM":     "Summation",
		"AVERAGE": "Average calculation",
		"IF":      "Conditional logic",
		"VLOOKUP": "Vertical lookup",
		"INDEX":   "Index/Match lookup",
		"NPV":     "Net Present Value",
		"IRR":     "Internal Rate of Return",
		"PMT":     "Payment calculation",
		"PV":      "Present Value",
		"FV":      "Future Value",
		"XNPV":    "Net Present Value (irregular)",
		"XIRR":    "Internal Rate of Return (irregular)",
	}

	functionCounts := make(map[string]int)

	// Analyze formulas
	for cell, formula := range context.Formulas {
		// Count function usage
		for pattern, _ := range formulaPatterns {
			if strings.Contains(strings.ToUpper(formula), pattern+"(") {
				functionCounts[pattern]++
			}
		}

		// Extract cell references
		refs := extractCellReferences(formula)
		for _, ref := range refs {
			// If referenced cell is not in context, note it
			if _, exists := context.CellValues[ref]; !exists && !strings.Contains(ref, ":") {
				// Could fetch this cell if needed
				_ = cell // Placeholder for future enhancement
			}
		}
	}

	// Add formula analysis to context
	if len(functionCounts) > 0 {
		functions := []string{}
		for fn, count := range functionCounts {
			functions = append(functions, fmt.Sprintf("%s (%d)", fn, count))
		}
		context.DocumentContext = append(context.DocumentContext,
			fmt.Sprintf("Functions used: %s", strings.Join(functions, ", ")))
	}

	return nil
}

// detectModelType attempts to detect the type of financial model
func (cb *ContextBuilder) detectModelType(context *ai.FinancialContext) string {
	// Keywords for different model types
	modelKeywords := map[string][]string{
		"DCF":                 {"discount", "dcf", "wacc", "terminal value", "free cash flow", "fcf", "npv", "present value"},
		"LBO":                 {"lbo", "leveraged", "debt schedule", "irr", "moic", "exit multiple", "sponsor", "management"},
		"M&A":                 {"merger", "acquisition", "synerg", "accretion", "dilution", "eps", "consideration", "premium"},
		"Comps":               {"comparable", "comps", "trading", "multiple", "ev/ebitda", "p/e", "peer", "median"},
		"Financial Statement": {"income statement", "balance sheet", "cash flow", "revenue", "ebitda", "net income"},
		"Budget":              {"budget", "forecast", "variance", "actual", "plan", "ytd", "month", "quarter"},
		"Valuation":           {"valuation", "value", "worth", "appraisal", "fair value", "market value"},
	}

	scores := make(map[string]int)

	// Check cell values and formulas
	allText := strings.Builder{}
	for _, val := range context.CellValues {
		if str, ok := val.(string); ok {
			allText.WriteString(strings.ToLower(str) + " ")
		}
	}

	// Check document context
	for _, ctx := range context.DocumentContext {
		allText.WriteString(strings.ToLower(ctx) + " ")
	}

	textLower := allText.String()

	// Score each model type
	for modelType, keywords := range modelKeywords {
		for _, keyword := range keywords {
			if strings.Contains(textLower, keyword) {
				scores[modelType]++
			}
		}
	}

	// Find highest scoring model type
	maxScore := 0
	detectedType := "General"

	for modelType, score := range scores {
		if score > maxScore {
			maxScore = score
			detectedType = modelType
		}
	}

	// Require minimum score to be confident
	if maxScore < 2 {
		return "General"
	}

	return detectedType
}

// RangeInfo contains parsed range information
type RangeInfo struct {
	Address  string
	Sheet    string
	StartRow int
	StartCol int
	EndRow   int
	EndCol   int
	RowCount int
	ColCount int
}

// parseRange parses an Excel range address
func parseRange(rangeAddr string) (*RangeInfo, error) {
	// Remove sheet reference if present
	sheet := ""
	if idx := strings.Index(rangeAddr, "!"); idx >= 0 {
		sheet = rangeAddr[:idx]
		rangeAddr = rangeAddr[idx+1:]
	}

	// Handle single cell
	if !strings.Contains(rangeAddr, ":") {
		row, col, err := parseCellAddress(rangeAddr)
		if err != nil {
			return nil, err
		}
		return &RangeInfo{
			Address:  rangeAddr,
			Sheet:    sheet,
			StartRow: row,
			StartCol: col,
			EndRow:   row,
			EndCol:   col,
			RowCount: 1,
			ColCount: 1,
		}, nil
	}

	// Handle range
	parts := strings.Split(rangeAddr, ":")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid range format")
	}

	startRow, startCol, err := parseCellAddress(parts[0])
	if err != nil {
		return nil, err
	}

	endRow, endCol, err := parseCellAddress(parts[1])
	if err != nil {
		return nil, err
	}

	return &RangeInfo{
		Address:  rangeAddr,
		Sheet:    sheet,
		StartRow: startRow,
		StartCol: startCol,
		EndRow:   endRow,
		EndCol:   endCol,
		RowCount: endRow - startRow + 1,
		ColCount: endCol - startCol + 1,
	}, nil
}

// parseCellAddress parses a cell address like "A1" into row and column numbers
func parseCellAddress(addr string) (row, col int, err error) {
	// Regular expression to match cell address
	re := regexp.MustCompile(`^([A-Z]+)(\d+)$`)
	matches := re.FindStringSubmatch(strings.ToUpper(addr))

	if len(matches) != 3 {
		return 0, 0, fmt.Errorf("invalid cell address: %s", addr)
	}

	// Convert column letters to number
	colStr := matches[1]
	col = 0
	for i := 0; i < len(colStr); i++ {
		col = col*26 + int(colStr[i]-'A'+1)
	}

	// Parse row number
	_, err = fmt.Sscanf(matches[2], "%d", &row)
	if err != nil {
		return 0, 0, err
	}

	return row, col, nil
}

// getCellAddress converts row and column numbers to cell address
func getCellAddress(row, col int) string {
	colStr := ""
	for col > 0 {
		col--
		colStr = string(rune('A'+col%26)) + colStr
		col /= 26
	}
	return fmt.Sprintf("%s%d", colStr, row)
}

// isSingleCell checks if a range is a single cell
func isSingleCell(rangeAddr string) bool {
	return !strings.Contains(rangeAddr, ":")
}

// extractCellReferences extracts cell references from a formula
func extractCellReferences(formula string) []string {
	refs := []string{}

	// Simple regex for cell references (doesn't handle all cases)
	re := regexp.MustCompile(`[A-Z]+[0-9]+`)
	matches := re.FindAllString(formula, -1)

	for _, match := range matches {
		refs = append(refs, match)
	}

	return refs
}

// ExpandRange expands a range to include more context
func (cb *ContextBuilder) ExpandRange(rangeAddr string, expandRows, expandCols int) string {
	rangeInfo, err := parseRange(rangeAddr)
	if err != nil {
		return rangeAddr
	}

	// Expand the range
	startRow := int(math.Max(1, float64(rangeInfo.StartRow-expandRows)))
	startCol := int(math.Max(1, float64(rangeInfo.StartCol-expandCols)))
	endRow := rangeInfo.EndRow + expandRows
	endCol := rangeInfo.EndCol + expandCols

	return fmt.Sprintf("%s:%s", getCellAddress(startRow, startCol), getCellAddress(endRow, endCol))
}

// buildModelStructure builds comprehensive model structure understanding
func (cb *ContextBuilder) buildModelStructure(ctx context.Context, sessionID string, rangeInfo *RangeInfo, context *ai.FinancialContext) error {
	structure := &ai.ModelStructure{
		CellRoles:     make(map[string]string),
		ModelSections: make(map[string]ai.CellRange),
		KeyCells:      make(map[string]string),
		Dependencies:  []ai.CellDependency{},
		PeriodHeaders: []ai.PeriodInfo{},
		PeriodColumns: []string{},
		LabelColumns:  []string{},
	}

	// 1. Detect data direction and time orientation
	structure.DataDirection, structure.TimeOrientation = cb.detectDataDirection(ctx, sessionID, rangeInfo)

	// 2. Identify period columns and headers
	if err := cb.identifyPeriods(ctx, sessionID, rangeInfo, structure); err != nil {
		fmt.Printf("Warning: failed to identify periods: %v\n", err)
	}

	// 3. Detect model sections (assumptions, calculations, outputs)
	if err := cb.detectModelSections(ctx, sessionID, rangeInfo, structure); err != nil {
		fmt.Printf("Warning: failed to detect model sections: %v\n", err)
	}

	// 4. Classify cell roles (input, calculation, output)
	if err := cb.classifyCellRoles(context, structure); err != nil {
		fmt.Printf("Warning: failed to classify cell roles: %v\n", err)
	}

	// 5. Build dependency graph
	if err := cb.buildDependencyGraph(context, structure); err != nil {
		fmt.Printf("Warning: failed to build dependency graph: %v\n", err)
	}

	// 6. Identify key financial cells
	if err := cb.identifyKeyCells(context, structure); err != nil {
		fmt.Printf("Warning: failed to identify key cells: %v\n", err)
	}

	// 7. Set first data cell
	structure.FirstDataCell = cb.findFirstDataCell(rangeInfo, structure)

	context.ModelStructure = structure
	return nil
}

// detectDataDirection analyzes whether data flows horizontally or vertically
func (cb *ContextBuilder) detectDataDirection(ctx context.Context, sessionID string, rangeInfo *RangeInfo) (string, string) {
	// Heuristic: if we have more columns than rows, likely horizontal time flow
	if rangeInfo.ColCount > rangeInfo.RowCount {
		return "horizontal", "columns"
	}
	return "vertical", "rows"
}

// identifyPeriods identifies time periods in the model
func (cb *ContextBuilder) identifyPeriods(ctx context.Context, sessionID string, rangeInfo *RangeInfo, structure *ai.ModelStructure) error {
	// Look for period headers in the row above the selection
	headerRow := rangeInfo.StartRow - 1
	if headerRow < 1 {
		return nil
	}

	headerRange := fmt.Sprintf("%s:%s",
		getCellAddress(headerRow, rangeInfo.StartCol),
		getCellAddress(headerRow, rangeInfo.EndCol))

	data, err := cb.bridge.ReadRange(ctx, sessionID, headerRange, false, false)
	if err != nil {
		return err
	}

	if len(data.Values) == 0 || len(data.Values[0]) == 0 {
		return nil
	}

	// Analyze headers for time patterns
	for colIdx, value := range data.Values[0] {
		if value == nil {
			continue
		}

		header := fmt.Sprintf("%v", value)
		if header == "" {
			continue
		}

		column := getCellAddress(1, rangeInfo.StartCol+colIdx)[0:1] // Get column letter

		periodInfo := ai.PeriodInfo{
			Column: column,
			Header: header,
			Order:  colIdx,
		}

		// Detect period type and historical/projected status
		if cb.isYearHeader(header) {
			periodInfo.PeriodType = "year"
			periodInfo.IsHistorical = cb.isHistoricalYear(header)
			periodInfo.IsProjected = !periodInfo.IsHistorical
		} else if cb.isQuarterHeader(header) {
			periodInfo.PeriodType = "quarter"
			periodInfo.IsHistorical = cb.isHistoricalPeriod(header)
			periodInfo.IsProjected = !periodInfo.IsHistorical
		} else if cb.isMonthHeader(header) {
			periodInfo.PeriodType = "month"
			periodInfo.IsHistorical = cb.isHistoricalPeriod(header)
			periodInfo.IsProjected = !periodInfo.IsHistorical
		}

		structure.PeriodHeaders = append(structure.PeriodHeaders, periodInfo)
		structure.PeriodColumns = append(structure.PeriodColumns, column)
	}

	// Identify label columns (typically column A)
	if rangeInfo.StartCol > 1 {
		structure.LabelColumns = append(structure.LabelColumns, "A")
	}

	return nil
}

// detectModelSections identifies different sections of the financial model
func (cb *ContextBuilder) detectModelSections(ctx context.Context, sessionID string, rangeInfo *RangeInfo, structure *ai.ModelStructure) error {
	// Look for section headers in surrounding areas
	sectionKeywords := map[string][]string{
		"assumptions":  {"assumption", "input", "driver", "growth", "margin", "rate"},
		"calculations": {"calculation", "computed", "derived", "formula"},
		"outputs":      {"output", "result", "total", "subtotal", "summary"},
		"revenue":      {"revenue", "sales", "income", "turnover"},
		"expenses":     {"expense", "cost", "opex", "capex", "operating"},
		"cash_flow":    {"cash flow", "fcf", "free cash", "operating cash"},
		"valuation":    {"valuation", "dcf", "npv", "irr", "wacc", "terminal"},
	}

	// Expand search area to look for section headers
	expandedRange := cb.ExpandRange(rangeInfo.Address, 10, 5)
	expandedInfo, err := parseRange(expandedRange)
	if err != nil {
		return err
	}

	data, err := cb.bridge.ReadRange(ctx, sessionID, expandedRange, false, false)
	if err != nil {
		return err
	}

	// Scan for section keywords
	for row := 0; row < data.RowCount; row++ {
		for col := 0; col < data.ColCount; col++ {
			if row >= len(data.Values) || col >= len(data.Values[row]) {
				continue
			}

			value := data.Values[row][col]
			if value == nil {
				continue
			}

			text := strings.ToLower(fmt.Sprintf("%v", value))

			for sectionName, keywords := range sectionKeywords {
				for _, keyword := range keywords {
					if strings.Contains(text, keyword) {
						// Found a section header - estimate the section range
						sectionRange := cb.estimateSectionRange(expandedInfo, row, col, data)
						structure.ModelSections[sectionName] = sectionRange
						break
					}
				}
			}
		}
	}

	return nil
}

// classifyCellRoles classifies cells as inputs, calculations, or outputs
func (cb *ContextBuilder) classifyCellRoles(context *ai.FinancialContext, structure *ai.ModelStructure) error {
	for cellAddr, value := range context.CellValues {
		role := "input" // Default

		// Check if cell has a formula
		if formula, hasFormula := context.Formulas[cellAddr]; hasFormula {
			if cb.isSimpleCalculation(formula) {
				role = "calculation"
			} else if cb.isComplexCalculation(formula) {
				role = "output"
			} else {
				role = "calculation" // Default for formulas
			}
		} else {
			// No formula - check if it's a number (likely input) or text (likely label)
			if cb.isNumericValue(value) {
				role = "input"
			} else {
				role = "label"
			}
		}

		structure.CellRoles[cellAddr] = role
	}

	return nil
}

// buildDependencyGraph builds a dependency graph of cell relationships
func (cb *ContextBuilder) buildDependencyGraph(context *ai.FinancialContext, structure *ai.ModelStructure) error {
	for cellAddr, formula := range context.Formulas {
		refs := extractCellReferences(formula)
		if len(refs) > 0 {
			relationship := cb.determineRelationship(formula)

			dependency := ai.CellDependency{
				FromCell:     cellAddr,
				ToCells:      refs,
				Relationship: relationship,
			}

			structure.Dependencies = append(structure.Dependencies, dependency)
		}
	}

	return nil
}

// identifyKeyCells identifies important financial metrics and their cell locations
func (cb *ContextBuilder) identifyKeyCells(context *ai.FinancialContext, structure *ai.ModelStructure) error {
	keyTerms := map[string][]string{
		"wacc":           {"wacc", "cost of capital", "discount rate"},
		"terminal_value": {"terminal", "terminal value", "tv"},
		"npv":            {"npv", "net present value"},
		"irr":            {"irr", "internal rate"},
		"revenue":        {"revenue", "sales", "turnover"},
		"ebitda":         {"ebitda", "operating income"},
		"free_cash_flow": {"fcf", "free cash flow", "cash flow"},
		"debt":           {"debt", "borrowing", "loan"},
		"equity":         {"equity", "shareholders"},
	}

	// Look for key terms in nearby label cells
	for cellAddr, value := range context.CellValues {
		if value == nil {
			continue
		}

		text := strings.ToLower(fmt.Sprintf("%v", value))

		for keyName, terms := range keyTerms {
			for _, term := range terms {
				if strings.Contains(text, term) {
					// This cell contains a key term - the data might be in adjacent cells
					dataCell := cb.findAdjacentDataCell(cellAddr, context)
					if dataCell != "" {
						structure.KeyCells[keyName] = dataCell
					}
					break
				}
			}
		}
	}

	return nil
}

// Helper methods for model structure analysis

func (cb *ContextBuilder) isYearHeader(header string) bool {
	// Check if header looks like a year (4 digits between 1900-2100)
	re := regexp.MustCompile(`\b(19|20|21)\d{2}\b`)
	return re.MatchString(header)
}

func (cb *ContextBuilder) isQuarterHeader(header string) bool {
	// Check for quarter patterns like "Q1 2024", "1Q24", etc.
	re := regexp.MustCompile(`\b[Qq][1-4]\b|\b[1-4][Qq]\b`)
	return re.MatchString(header)
}

func (cb *ContextBuilder) isMonthHeader(header string) bool {
	// Check for month names or patterns
	months := []string{"jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"}
	lower := strings.ToLower(header)
	for _, month := range months {
		if strings.Contains(lower, month) {
			return true
		}
	}
	return false
}

func (cb *ContextBuilder) isHistoricalYear(header string) bool {
	// Simple heuristic: years before 2025 are historical
	re := regexp.MustCompile(`\b(19|20|21|22|23|24)\d{2}\b`)
	matches := re.FindStringSubmatch(header)
	if len(matches) > 0 {
		// More sophisticated logic could go here
		return !strings.Contains(header, "25") && !strings.Contains(header, "26") && !strings.Contains(header, "27")
	}
	return false
}

func (cb *ContextBuilder) isHistoricalPeriod(header string) bool {
	// Default heuristic - could be enhanced with actual date comparison
	return !strings.Contains(strings.ToLower(header), "forecast") &&
		!strings.Contains(strings.ToLower(header), "proj")
}

func (cb *ContextBuilder) isSimpleCalculation(formula string) bool {
	// Simple arithmetic operations
	simpleOps := []string{"+", "-", "*", "/"}
	complexFuncs := []string{"SUM", "AVERAGE", "NPV", "IRR", "IF", "VLOOKUP"}

	upper := strings.ToUpper(formula)
	for _, fn := range complexFuncs {
		if strings.Contains(upper, fn+"(") {
			return false
		}
	}

	for _, op := range simpleOps {
		if strings.Contains(formula, op) {
			return true
		}
	}

	return false
}

func (cb *ContextBuilder) isComplexCalculation(formula string) bool {
	// Complex functions that typically represent outputs
	complexFuncs := []string{"SUM", "NPV", "IRR", "XNPV", "XIRR", "SUMPRODUCT", "SUMIF"}
	upper := strings.ToUpper(formula)

	for _, fn := range complexFuncs {
		if strings.Contains(upper, fn+"(") {
			return true
		}
	}

	return false
}

func (cb *ContextBuilder) isNumericValue(value interface{}) bool {
	switch value.(type) {
	case int, int32, int64, float32, float64:
		return true
	case string:
		str := strings.TrimSpace(value.(string))
		_, err := regexp.MatchString(`^-?\d*\.?\d+$`, str)
		return err == nil
	}
	return false
}

func (cb *ContextBuilder) determineRelationship(formula string) string {
	upper := strings.ToUpper(formula)

	if strings.Contains(upper, "SUM(") {
		return "sum"
	}
	if strings.Contains(formula, ")/") && strings.Contains(formula, "-") {
		return "growth"
	}
	if strings.Contains(formula, "/") && !strings.Contains(formula, "-") {
		return "ratio"
	}
	return "direct"
}

func (cb *ContextBuilder) findAdjacentDataCell(labelCell string, context *ai.FinancialContext) string {
	// Parse the label cell address
	row, col, err := parseCellAddress(labelCell)
	if err != nil {
		return ""
	}

	// Check adjacent cells for data (right, then down)
	candidates := []string{
		getCellAddress(row, col+1),   // Right
		getCellAddress(row, col+2),   // Further right
		getCellAddress(row+1, col),   // Down
		getCellAddress(row+1, col+1), // Diagonal
	}

	for _, candidate := range candidates {
		if value, exists := context.CellValues[candidate]; exists {
			if cb.isNumericValue(value) {
				return candidate
			}
		}
	}

	return ""
}

func (cb *ContextBuilder) estimateSectionRange(expandedInfo *RangeInfo, headerRow, headerCol int, data *ai.RangeData) ai.CellRange {
	// Estimate section boundaries based on header position
	startRow := expandedInfo.StartRow + headerRow
	startCol := expandedInfo.StartCol + headerCol

	// Simple heuristic: section extends 10 rows down and 5 columns right
	endRow := startRow + 10
	endCol := startCol + 5

	return ai.CellRange{
		StartCell: getCellAddress(startRow, startCol),
		EndCell:   getCellAddress(endRow, endCol),
		Address:   fmt.Sprintf("%s:%s", getCellAddress(startRow, startCol), getCellAddress(endRow, endCol)),
		Purpose:   "section",
	}
}

func (cb *ContextBuilder) findFirstDataCell(rangeInfo *RangeInfo, structure *ai.ModelStructure) string {
	// Find the first cell that likely contains actual data (not headers)
	if len(structure.PeriodColumns) > 0 {
		// If we have period columns, first data cell is likely in the first period column
		firstCol := structure.PeriodColumns[0]
		// Convert column letter to number for calculation
		col := int(firstCol[0] - 'A' + 1)
		row := rangeInfo.StartRow
		return getCellAddress(row, col)
	}

	// Default to the start of the selected range
	return getCellAddress(rangeInfo.StartRow, rangeInfo.StartCol)
}

// BuildIncrementalContext updates existing context with changes
func (cb *ContextBuilder) BuildIncrementalContext(ctx context.Context, sessionID string, currentContext *ai.FinancialContext, changedCells []string) (*ai.FinancialContext, error) {
	// If no current context, build from scratch
	if currentContext == nil {
		return cb.BuildContext(ctx, sessionID)
	}

	// Clone current context
	newContext := &ai.FinancialContext{
		WorkbookName:      currentContext.WorkbookName,
		WorksheetName:     currentContext.WorksheetName,
		SelectedRange:     currentContext.SelectedRange,
		CellValues:        make(map[string]interface{}),
		Formulas:          make(map[string]string),
		ModelType:         currentContext.ModelType,
		RecentChanges:     make([]ai.CellChange, 0),
		DocumentContext:   currentContext.DocumentContext,
		ModelStructure:    currentContext.ModelStructure,
		PendingOperations: currentContext.PendingOperations,
	}

	// Copy existing values
	for k, v := range currentContext.CellValues {
		newContext.CellValues[k] = v
	}
	for k, v := range currentContext.Formulas {
		newContext.Formulas[k] = v
	}

	// Update changed cells
	for _, cellAddr := range changedCells {
		if err := cb.updateCellInContext(ctx, sessionID, cellAddr, newContext); err != nil {
			fmt.Printf("Warning: failed to update cell %s: %v\n", cellAddr, err)
		}
	}

	// Track changes
	cb.trackCellChanges(newContext, currentContext)

	// Re-analyze if structure changed significantly
	if cb.hasSignificantChanges(newContext.RecentChanges) {
		if rangeInfo, err := parseRange(newContext.SelectedRange); err == nil {
			cb.buildModelStructure(ctx, sessionID, rangeInfo, newContext)
		}
	}

	return newContext, nil
}

// TrackCellChanges records changes between contexts
func (cb *ContextBuilder) TrackCellChanges(newContext, oldContext *ai.FinancialContext) []ai.CellChange {
	cb.trackerMutex.Lock()
	defer cb.trackerMutex.Unlock()

	changes := []ai.CellChange{}
	now := time.Now()

	// Check for value changes
	for cellAddr, newValue := range newContext.CellValues {
		oldValue, existed := oldContext.CellValues[cellAddr]

		if !existed || !valuesEqual(oldValue, newValue) {
			change := ai.CellChange{
				Address:   cellAddr,
				OldValue:  oldValue,
				NewValue:  newValue,
				Timestamp: now,
				Source:    "user",
			}
			changes = append(changes, change)

			// Update tracker
			if info, exists := cb.cellChangeTracker[cellAddr]; exists {
				info.LastValue = newValue
				info.LastModified = now
				info.ModifyCount++
			} else {
				cb.cellChangeTracker[cellAddr] = &CellChangeInfo{
					LastValue:    newValue,
					LastModified: now,
					ModifyCount:  1,
				}
			}
		}
	}

	// Check for formula changes
	for cellAddr, newFormula := range newContext.Formulas {
		oldFormula, existed := oldContext.Formulas[cellAddr]

		if !existed || oldFormula != newFormula {
			change := ai.CellChange{
				Address:   cellAddr,
				OldValue:  oldFormula,
				NewValue:  newFormula,
				Timestamp: now,
				Source:    "formula",
			}
			changes = append(changes, change)

			// Update tracker
			if info, exists := cb.cellChangeTracker[cellAddr]; exists {
				info.LastFormula = newFormula
				info.LastModified = now
				info.ModifyCount++
			} else {
				cb.cellChangeTracker[cellAddr] = &CellChangeInfo{
					LastFormula:  newFormula,
					LastModified: now,
					ModifyCount:  1,
				}
			}
		}
	}

	return changes
}

// GetPendingOperations returns a summary of pending operations
func (cb *ContextBuilder) GetPendingOperations(registry interface{}, sessionID string) interface{} {
	if registry == nil {
		return nil
	}

	// Use type assertion to call GetOperationSummary
	if r, ok := registry.(interface {
		GetOperationSummary(context.Context, string) map[string]interface{}
	}); ok {
		return r.GetOperationSummary(context.Background(), sessionID)
	}

	return nil
}

// Helper methods for incremental context building

func (cb *ContextBuilder) updateCellInContext(ctx context.Context, sessionID string, cellAddr string, context *ai.FinancialContext) error {
	// Read single cell data
	data, err := cb.bridge.ReadRange(ctx, sessionID, cellAddr, true, false)
	if err != nil {
		return err
	}

	if len(data.Values) > 0 && len(data.Values[0]) > 0 {
		context.CellValues[cellAddr] = data.Values[0][0]
	}

	if data.Formulas != nil && len(data.Formulas) > 0 && len(data.Formulas[0]) > 0 {
		if formulaStr, ok := data.Formulas[0][0].(string); ok && formulaStr != "" {
			context.Formulas[cellAddr] = formulaStr
		}
	}

	return nil
}

func (cb *ContextBuilder) trackCellChanges(newContext, oldContext *ai.FinancialContext) {
	changes := cb.TrackCellChanges(newContext, oldContext)

	// Keep only recent changes (last 10)
	newContext.RecentChanges = append(changes, oldContext.RecentChanges...)
	if len(newContext.RecentChanges) > 10 {
		newContext.RecentChanges = newContext.RecentChanges[:10]
	}
}

func (cb *ContextBuilder) hasSignificantChanges(changes []ai.CellChange) bool {
	// Consider changes significant if:
	// - More than 5 cells changed
	// - Any formula structure changed
	// - Key financial cells changed

	if len(changes) > 5 {
		return true
	}

	for _, change := range changes {
		if change.Source == "formula" {
			return true
		}
		// Check if it's a key financial cell (could be enhanced)
		if strings.Contains(strings.ToLower(fmt.Sprintf("%v", change.OldValue)), "total") ||
			strings.Contains(strings.ToLower(fmt.Sprintf("%v", change.NewValue)), "total") {
			return true
		}
	}

	return false
}

func valuesEqual(a, b interface{}) bool {
	// Handle nil cases
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}

	// Convert to strings for comparison
	aStr := fmt.Sprintf("%v", a)
	bStr := fmt.Sprintf("%v", b)

	return aStr == bStr
}
