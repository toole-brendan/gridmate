package excel

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"strings"

	"github.com/gridmate/backend/internal/services/ai"
)

// ContextBuilder builds comprehensive Excel context for AI processing
type ContextBuilder struct {
	bridge    ai.ExcelBridge
	maxCells  int // Maximum cells to include in context
	maxRanges int // Maximum number of ranges to analyze
}

// NewContextBuilder creates a new context builder
func NewContextBuilder(bridge ai.ExcelBridge) *ContextBuilder {
	return &ContextBuilder{
		bridge:    bridge,
		maxCells:  1000, // Default max cells to prevent context overflow
		maxRanges: 10,   // Default max ranges to analyze
	}
}

// BuildContext builds comprehensive context from the current Excel state
func (cb *ContextBuilder) BuildContext(ctx context.Context, sessionID string, selectedRange string) (*ai.FinancialContext, error) {
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

	// 3. Detect headers and structure
	if err := cb.detectStructure(ctx, sessionID, rangeInfo, context); err != nil {
		fmt.Printf("Warning: failed to detect structure: %v\n", err)
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
			
			if data.Formulas != nil && row < len(data.Formulas) && col < len(data.Formulas[row]) && data.Formulas[row][col] != "" {
				context.Formulas[cellAddr] = data.Formulas[row][col]
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
		{"headers_above", -5, 0, 5, rangeInfo.ColCount},       // 5 rows above
		{"labels_left", 0, -3, rangeInfo.RowCount, 3},        // 3 columns to left
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
				
				if data.Formulas != nil && row < len(data.Formulas) && col < len(data.Formulas[row]) && data.Formulas[row][col] != "" {
					context.Formulas[cellAddr] = data.Formulas[row][col]
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
					if len(data.Formulas) > 0 && len(data.Formulas[0]) > 0 && data.Formulas[0][0] != "" {
						context.Formulas[nr.Name] = data.Formulas[0][0]
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
		"SUM":       "Summation",
		"AVERAGE":   "Average calculation",
		"IF":        "Conditional logic",
		"VLOOKUP":   "Vertical lookup",
		"INDEX":     "Index/Match lookup",
		"NPV":       "Net Present Value",
		"IRR":       "Internal Rate of Return",
		"PMT":       "Payment calculation",
		"PV":        "Present Value",
		"FV":        "Future Value",
		"XNPV":      "Net Present Value (irregular)",
		"XIRR":      "Internal Rate of Return (irregular)",
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
		"DCF": {"discount", "dcf", "wacc", "terminal value", "free cash flow", "fcf", "npv", "present value"},
		"LBO": {"lbo", "leveraged", "debt schedule", "irr", "moic", "exit multiple", "sponsor", "management"},
		"M&A": {"merger", "acquisition", "synerg", "accretion", "dilution", "eps", "consideration", "premium"},
		"Comps": {"comparable", "comps", "trading", "multiple", "ev/ebitda", "p/e", "peer", "median"},
		"Financial Statement": {"income statement", "balance sheet", "cash flow", "revenue", "ebitda", "net income"},
		"Budget": {"budget", "forecast", "variance", "actual", "plan", "ytd", "month", "quarter"},
		"Valuation": {"valuation", "value", "worth", "appraisal", "fair value", "market value"},
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
	Address   string
	Sheet     string
	StartRow  int
	StartCol  int
	EndRow    int
	EndCol    int
	RowCount  int
	ColCount  int
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