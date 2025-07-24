package excel

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gridmate/backend/internal/services/ai"
)

// PatternType represents types of patterns detected in spreadsheets
type PatternType string

const (
	PatternTypeHeader      PatternType = "header"
	PatternTypeData        PatternType = "data"
	PatternTypeTotal       PatternType = "total"
	PatternTypeInput       PatternType = "input"
	PatternTypeCalculation PatternType = "calculation"
	PatternTypeLabel       PatternType = "label"
	PatternTypeEmpty       PatternType = "empty"
	PatternTypeSeries      PatternType = "series"
	PatternTypeGrowth      PatternType = "growth"
)

// PatternDetector analyzes spreadsheet data to detect patterns and structure
type PatternDetector struct {
	maxScanRows int
	maxScanCols int
}

// NewPatternDetector creates a new pattern detector
func NewPatternDetector() *PatternDetector {
	return &PatternDetector{
		maxScanRows: 1000,
		maxScanCols: 100,
	}
}

// SemanticRegion represents a semantically meaningful region in the spreadsheet
type SemanticRegion struct {
	Type          PatternType         `json:"type"`
	Address       string              `json:"address"`
	StartRow      int                 `json:"start_row"`
	StartCol      int                 `json:"start_col"`
	EndRow        int                 `json:"end_row"`
	EndCol        int                 `json:"end_col"`
	Confidence    float64             `json:"confidence"`
	Characteristics map[string]interface{} `json:"characteristics,omitempty"`
}

// FormulaPattern represents a pattern found in formulas
type FormulaPattern struct {
	Type        string   `json:"type"`
	Pattern     string   `json:"pattern"`
	Count       int      `json:"count"`
	Cells       []string `json:"cells"`
	Description string   `json:"description"`
	BaseFormula string   `json:"base_formula,omitempty"`
	Variations  []string `json:"variations,omitempty"`
}

// DataPattern represents patterns found in data values
type DataPattern struct {
	Type       string                 `json:"type"`
	Confidence float64                `json:"confidence"`
	Description string                `json:"description"`
	Parameters map[string]interface{} `json:"parameters,omitempty"`
}

// DetectRegions analyzes range data to detect semantic regions
func (pd *PatternDetector) DetectRegions(data *ai.RangeData) []SemanticRegion {
	if data == nil || len(data.Values) == 0 {
		return []SemanticRegion{}
	}

	regions := []SemanticRegion{}

	// Detect different types of regions
	regions = append(regions, pd.detectHeaders(data)...)
	regions = append(regions, pd.detectTotalRows(data)...)
	regions = append(regions, pd.detectInputVsCalculation(data)...)
	regions = append(regions, pd.detectDataTables(data)...)

	// Merge overlapping regions
	return pd.mergeOverlappingRegions(regions)
}

// detectHeaders identifies header regions
func (pd *PatternDetector) detectHeaders(data *ai.RangeData) []SemanticRegion {
	regions := []SemanticRegion{}
	
	// Check first 10 rows for headers
	maxRows := 10
	if len(data.Values) < maxRows {
		maxRows = len(data.Values)
	}

	for row := 0; row < maxRows; row++ {
		if pd.isLikelyHeader(data.Values[row], row, data.Values) {
			startCol, endCol := pd.findNonEmptyRange(data.Values[row])
			if startCol != -1 {
				regions = append(regions, SemanticRegion{
					Type:       PatternTypeHeader,
					Address:    fmt.Sprintf("%s%d:%s%d", columnToLetter(startCol+1), row+1, columnToLetter(endCol+1), row+1),
					StartRow:   row,
					StartCol:   startCol,
					EndRow:     row,
					EndCol:     endCol,
					Confidence: 0.8,
					Characteristics: map[string]interface{}{
						"has_text":     true,
						"has_formulas": false,
					},
				})
			}
		}
	}

	return regions
}

// isLikelyHeader checks if a row is likely a header
func (pd *PatternDetector) isLikelyHeader(row []interface{}, rowIndex int, allValues [][]interface{}) bool {
	textCount := 0
	totalNonEmpty := 0
	
	for _, cell := range row {
		if cell != nil && cell != "" {
			totalNonEmpty++
			if _, ok := cell.(string); ok {
				textCount++
			}
		}
	}
	
	if totalNonEmpty == 0 {
		return false
	}
	
	textRatio := float64(textCount) / float64(totalNonEmpty)
	
	// Check if next rows have numeric data
	hasNumericBelow := false
	if rowIndex < len(allValues)-1 {
		nextRow := allValues[rowIndex+1]
		numericCount := 0
		for _, cell := range nextRow {
			if pd.isNumeric(cell) {
				numericCount++
			}
		}
		hasNumericBelow = numericCount > totalNonEmpty/2
	}
	
	// Check for header patterns
	hasHeaderPattern := false
	for _, cell := range row {
		if str, ok := cell.(string); ok {
			if pd.hasHeaderPattern(str) {
				hasHeaderPattern = true
				break
			}
		}
	}
	
	return (textRatio > 0.7 || hasHeaderPattern) && (hasNumericBelow || rowIndex == 0)
}

// hasHeaderPattern checks if text contains common header patterns
func (pd *PatternDetector) hasHeaderPattern(text string) bool {
	headerPatterns := []string{
		// Time periods
		`(?i)(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)`,
		`(?i)(q1|q2|q3|q4|quarter|month|year|date|ytd|mtd)`,
		`(?i)(20\d{2}|19\d{2})`, // Years
		// Financial terms
		`(?i)(revenue|sales|cost|expense|profit|margin|growth|forecast)`,
		`(?i)(ebitda|ebit|net income|gross profit|operating)`,
		`(?i)(assets|liabilities|equity|cash|debt)`,
		// General headers
		`(?i)(total|sum|average|count|name|description|category|type|status)`,
	}
	
	for _, pattern := range headerPatterns {
		if match, _ := regexp.MatchString(pattern, text); match {
			return true
		}
	}
	return false
}

// detectTotalRows identifies rows containing totals or summaries
func (pd *PatternDetector) detectTotalRows(data *ai.RangeData) []SemanticRegion {
	regions := []SemanticRegion{}
	
	for row := 0; row < len(data.Values); row++ {
		hasTotalLabel := false
		hasSumFormulas := false
		
		// Check for total indicators in values
		for col := 0; col < len(data.Values[row]); col++ {
			if str, ok := data.Values[row][col].(string); ok {
				if match, _ := regexp.MatchString(`(?i)(total|sum|subtotal|grand total)`, str); match {
					hasTotalLabel = true
				}
			}
			
			// Check formulas if available
			if data.Formulas != nil && row < len(data.Formulas) && col < len(data.Formulas[row]) {
				if formula, ok := data.Formulas[row][col].(string); ok {
					if strings.Contains(strings.ToUpper(formula), "SUM(") {
						hasSumFormulas = true
					}
				}
			}
		}
		
		if hasTotalLabel || hasSumFormulas {
			startCol, endCol := pd.findNonEmptyRange(data.Values[row])
			if startCol != -1 {
				regions = append(regions, SemanticRegion{
					Type:       PatternTypeTotal,
					Address:    fmt.Sprintf("%s%d:%s%d", columnToLetter(startCol+1), row+1, columnToLetter(endCol+1), row+1),
					StartRow:   row,
					StartCol:   startCol,
					EndRow:     row,
					EndCol:     endCol,
					Confidence: 0.9,
					Characteristics: map[string]interface{}{
						"has_formulas": hasSumFormulas,
						"is_numeric":   true,
					},
				})
			}
		}
	}
	
	return regions
}

// detectInputVsCalculation differentiates input cells from calculation cells
func (pd *PatternDetector) detectInputVsCalculation(data *ai.RangeData) []SemanticRegion {
	regions := []SemanticRegion{}
	
	if data.Formulas == nil {
		return regions
	}
	
	// Map to track visited cells
	visited := make(map[string]bool)
	
	for row := 0; row < len(data.Values) && row < pd.maxScanRows; row++ {
		for col := 0; col < len(data.Values[row]) && col < pd.maxScanCols; col++ {
			key := fmt.Sprintf("%d,%d", row, col)
			if visited[key] {
				continue
			}
			
			hasFormula := false
			hasValue := data.Values[row][col] != nil && data.Values[row][col] != ""
			
			if row < len(data.Formulas) && col < len(data.Formulas[row]) {
				if formula, ok := data.Formulas[row][col].(string); ok && formula != "" {
					hasFormula = true
				}
			}
			
			var regionType PatternType
			if hasValue && !hasFormula {
				regionType = PatternTypeInput
			} else if hasFormula {
				regionType = PatternTypeCalculation
			} else {
				continue
			}
			
			// Expand region
			region := pd.expandRegion(data.Values, data.Formulas, row, col, regionType, visited)
			if region != nil {
				regions = append(regions, *region)
			}
		}
	}
	
	return regions
}

// expandRegion expands from a starting point to find contiguous cells of the same type
func (pd *PatternDetector) expandRegion(values [][]interface{}, formulas [][]interface{}, startRow, startCol int, regionType PatternType, visited map[string]bool) *SemanticRegion {
	// Use flood fill to find connected cells of the same type
	queue := [][2]int{{startRow, startCol}}
	minRow, maxRow := startRow, startRow
	minCol, maxCol := startCol, startCol
	cellCount := 0
	
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		
		row, col := current[0], current[1]
		key := fmt.Sprintf("%d,%d", row, col)
		
		if visited[key] {
			continue
		}
		
		// Check if this cell matches the region type
		if !pd.cellMatchesType(values, formulas, row, col, regionType) {
			continue
		}
		
		visited[key] = true
		cellCount++
		
		// Update bounds
		if row < minRow {
			minRow = row
		}
		if row > maxRow {
			maxRow = row
		}
		if col < minCol {
			minCol = col
		}
		if col > maxCol {
			maxCol = col
		}
		
		// Add neighbors
		neighbors := [][2]int{
			{row - 1, col}, {row + 1, col},
			{row, col - 1}, {row, col + 1},
		}
		
		for _, neighbor := range neighbors {
			nr, nc := neighbor[0], neighbor[1]
			if nr >= 0 && nr < len(values) && nc >= 0 && nc < len(values[nr]) {
				nkey := fmt.Sprintf("%d,%d", nr, nc)
				if !visited[nkey] {
					queue = append(queue, [2]int{nr, nc})
				}
			}
		}
	}
	
	// Only create region if it's meaningful size
	if cellCount < 2 {
		return nil
	}
	
	return &SemanticRegion{
		Type:       regionType,
		Address:    fmt.Sprintf("%s%d:%s%d", columnToLetter(minCol+1), minRow+1, columnToLetter(maxCol+1), maxRow+1),
		StartRow:   minRow,
		StartCol:   minCol,
		EndRow:     maxRow,
		EndCol:     maxCol,
		Confidence: 0.7,
		Characteristics: map[string]interface{}{
			"has_formulas": regionType == PatternTypeCalculation,
			"cell_count":   cellCount,
		},
	}
}

// cellMatchesType checks if a cell matches the expected region type
func (pd *PatternDetector) cellMatchesType(values [][]interface{}, formulas [][]interface{}, row, col int, regionType PatternType) bool {
	if row >= len(values) || col >= len(values[row]) {
		return false
	}
	
	hasValue := values[row][col] != nil && values[row][col] != ""
	hasFormula := false
	
	if formulas != nil && row < len(formulas) && col < len(formulas[row]) {
		if formula, ok := formulas[row][col].(string); ok && formula != "" {
			hasFormula = true
		}
	}
	
	switch regionType {
	case PatternTypeInput:
		return hasValue && !hasFormula
	case PatternTypeCalculation:
		return hasFormula
	default:
		return false
	}
}

// detectDataTables identifies rectangular data table regions
func (pd *PatternDetector) detectDataTables(data *ai.RangeData) []SemanticRegion {
	regions := []SemanticRegion{}
	visited := make(map[string]bool)
	
	for row := 0; row < len(data.Values) && row < pd.maxScanRows; row++ {
		for col := 0; col < len(data.Values[row]) && col < pd.maxScanCols; col++ {
			key := fmt.Sprintf("%d,%d", row, col)
			if visited[key] {
				continue
			}
			
			tableRegion := pd.detectTableFromPoint(data.Values, row, col, visited)
			if tableRegion != nil {
				regions = append(regions, *tableRegion)
			}
		}
	}
	
	return regions
}

// detectTableFromPoint detects a table starting from a given point
func (pd *PatternDetector) detectTableFromPoint(values [][]interface{}, startRow, startCol int, visited map[string]bool) *SemanticRegion {
	// Check if this looks like the start of a table
	if !pd.looksLikeTableStart(values, startRow, startCol) {
		return nil
	}
	
	// Find table boundaries
	endRow := startRow
	endCol := startCol
	
	// Find right boundary
	for col := startCol; col < len(values[startRow]) && col < startCol+50; col++ {
		if values[startRow][col] == nil || values[startRow][col] == "" {
			break
		}
		endCol = col
	}
	
	// Find bottom boundary
	for row := startRow; row < len(values) && row < startRow+100; row++ {
		hasData := false
		for col := startCol; col <= endCol; col++ {
			if col < len(values[row]) && values[row][col] != nil && values[row][col] != "" {
				hasData = true
				break
			}
		}
		if !hasData {
			break
		}
		endRow = row
	}
	
	// Mark cells as visited
	for r := startRow; r <= endRow; r++ {
		for c := startCol; c <= endCol; c++ {
			visited[fmt.Sprintf("%d,%d", r, c)] = true
		}
	}
	
	// Analyze characteristics
	characteristics := pd.analyzeRegionCharacteristics(values, startRow, startCol, endRow, endCol)
	
	// Only return if it's a meaningful data region
	if characteristics["is_numeric"].(bool) || characteristics["has_dates"].(bool) {
		return &SemanticRegion{
			Type:            PatternTypeData,
			Address:         fmt.Sprintf("%s%d:%s%d", columnToLetter(startCol+1), startRow+1, columnToLetter(endCol+1), endRow+1),
			StartRow:        startRow,
			StartCol:        startCol,
			EndRow:          endRow,
			EndCol:          endCol,
			Confidence:      0.7,
			Characteristics: characteristics,
		}
	}
	
	return nil
}

// looksLikeTableStart checks if a position looks like the start of a table
func (pd *PatternDetector) looksLikeTableStart(values [][]interface{}, row, col int) bool {
	if row >= len(values) || col >= len(values[row]) {
		return false
	}
	
	// Has value at current position
	if values[row][col] == nil || values[row][col] == "" {
		return false
	}
	
	// Has adjacent values (right or down)
	hasRight := col < len(values[row])-1 && values[row][col+1] != nil && values[row][col+1] != ""
	hasDown := row < len(values)-1 && col < len(values[row+1]) && values[row+1][col] != nil && values[row+1][col] != ""
	
	return hasRight || hasDown
}

// analyzeRegionCharacteristics analyzes the characteristics of a region
func (pd *PatternDetector) analyzeRegionCharacteristics(values [][]interface{}, startRow, startCol, endRow, endCol int) map[string]interface{} {
	numericCount := 0
	textCount := 0
	dateCount := 0
	emptyCount := 0
	totalCells := 0
	
	for r := startRow; r <= endRow && r < len(values); r++ {
		for c := startCol; c <= endCol && c < len(values[r]); c++ {
			totalCells++
			value := values[r][c]
			
			if value == nil || value == "" {
				emptyCount++
			} else if pd.isNumeric(value) {
				numericCount++
			} else if pd.isDate(value) {
				dateCount++
			} else {
				textCount++
			}
		}
	}
	
	return map[string]interface{}{
		"is_empty":         emptyCount == totalCells,
		"is_numeric":       float64(numericCount) > float64(totalCells)*0.5,
		"has_text":         float64(textCount) > float64(totalCells)*0.3,
		"has_dates":        float64(dateCount) > float64(totalCells)*0.3,
		"numeric_ratio":    float64(numericCount) / float64(totalCells),
		"text_ratio":       float64(textCount) / float64(totalCells),
		"empty_ratio":      float64(emptyCount) / float64(totalCells),
		"total_cells":      totalCells,
	}
}

// AnalyzeFormulaPatterns analyzes patterns in formulas
func (pd *PatternDetector) AnalyzeFormulaPatterns(data *ai.RangeData) []FormulaPattern {
	if data.Formulas == nil {
		return []FormulaPattern{}
	}
	
	patterns := []FormulaPattern{}
	
	// Group formulas by normalized pattern
	formulaGroups := pd.groupSimilarFormulas(data.Formulas)
	
	// Analyze each group
	for pattern, cells := range formulaGroups {
		if len(cells) < 2 {
			continue // Skip single instances
		}
		
		fp := FormulaPattern{
			Pattern: pattern,
			Count:   len(cells),
			Cells:   cells,
		}
		
		// Determine pattern type and description
		pd.classifyFormulaPattern(&fp, data.Formulas)
		patterns = append(patterns, fp)
	}
	
	// Detect sequential patterns
	patterns = append(patterns, pd.detectSequentialFormulas(data.Formulas)...)
	
	return patterns
}

// groupSimilarFormulas groups formulas by their normalized pattern
func (pd *PatternDetector) groupSimilarFormulas(formulas [][]interface{}) map[string][]string {
	groups := make(map[string][]string)
	
	for row := 0; row < len(formulas); row++ {
		for col := 0; col < len(formulas[row]); col++ {
			if formula, ok := formulas[row][col].(string); ok && formula != "" {
				normalized := pd.normalizeFormula(formula)
				cellAddr := fmt.Sprintf("%s%d", columnToLetter(col+1), row+1)
				groups[normalized] = append(groups[normalized], cellAddr)
			}
		}
	}
	
	return groups
}

// normalizeFormula normalizes a formula to identify patterns
func (pd *PatternDetector) normalizeFormula(formula string) string {
	// Remove leading =
	if strings.HasPrefix(formula, "=") {
		formula = formula[1:]
	}
	
	// Replace cell references with placeholders
	// Absolute references
	formula = regexp.MustCompile(`\$[A-Z]+\$\d+`).ReplaceAllString(formula, "ABS_REF")
	// Relative references
	formula = regexp.MustCompile(`[A-Z]+\d+`).ReplaceAllString(formula, "REL_REF")
	// Ranges
	formula = strings.ReplaceAll(formula, "REL_REF:REL_REF", "RANGE")
	formula = strings.ReplaceAll(formula, "ABS_REF:ABS_REF", "ABS_RANGE")
	
	return formula
}

// classifyFormulaPattern classifies the type of formula pattern
func (pd *PatternDetector) classifyFormulaPattern(fp *FormulaPattern, formulas [][]interface{}) {
	pattern := fp.Pattern
	
	// Identify pattern type based on normalized formula
	if strings.Contains(pattern, "SUM") || strings.Contains(pattern, "AVERAGE") || 
	   strings.Contains(pattern, "COUNT") || strings.Contains(pattern, "MAX") || 
	   strings.Contains(pattern, "MIN") {
		fp.Type = "aggregation"
		fp.Description = "Aggregation formulas calculating summary statistics"
	} else if strings.Contains(pattern, "VLOOKUP") || strings.Contains(pattern, "HLOOKUP") ||
	          strings.Contains(pattern, "INDEX") || strings.Contains(pattern, "MATCH") {
		fp.Type = "lookup"
		fp.Description = "Lookup formulas retrieving data from other ranges"
	} else if strings.Contains(pattern, "IF") || strings.Contains(pattern, "IFS") ||
	          strings.Contains(pattern, "SWITCH") {
		fp.Type = "conditional"
		fp.Description = "Conditional formulas with logic branches"
	} else if pd.areSequentialCells(fp.Cells) {
		fp.Type = "sequential"
		fp.Description = "Sequential formulas in adjacent cells"
	} else {
		fp.Type = "repeated"
		fp.Description = "Repeated formula pattern across multiple cells"
	}
	
	// Get base formula example
	if len(fp.Cells) > 0 {
		// Parse first cell to get row/col
		firstCell := fp.Cells[0]
		if row, col, err := parseCellAddress(firstCell); err == nil {
			if row-1 < len(formulas) && col-1 < len(formulas[row-1]) {
				if formula, ok := formulas[row-1][col-1].(string); ok {
					fp.BaseFormula = formula
				}
			}
		}
	}
}

// areSequentialCells checks if cells are in sequence
func (pd *PatternDetector) areSequentialCells(cells []string) bool {
	if len(cells) < 2 {
		return false
	}
	
	// Check if all in same column
	cols := make(map[int]bool)
	rows := []int{}
	
	for _, cell := range cells {
		if row, col, err := parseCellAddress(cell); err == nil {
			cols[col] = true
			rows = append(rows, row)
		}
	}
	
	// If all in same column and rows are sequential
	if len(cols) == 1 {
		// Check if rows are sequential
		for i := 1; i < len(rows); i++ {
			if rows[i] != rows[i-1]+1 {
				return false
			}
		}
		return true
	}
	
	return false
}

// detectSequentialFormulas detects sequential formula patterns
func (pd *PatternDetector) detectSequentialFormulas(formulas [][]interface{}) []FormulaPattern {
	patterns := []FormulaPattern{}
	
	// Check rows for sequential patterns
	for row := 0; row < len(formulas); row++ {
		sequenceStart := -1
		sequenceCells := []string{}
		
		for col := 0; col < len(formulas[row]); col++ {
			if formula, ok := formulas[row][col].(string); ok && formula != "" {
				cellAddr := fmt.Sprintf("%s%d", columnToLetter(col+1), row+1)
				
				if sequenceStart == -1 {
					sequenceStart = col
					sequenceCells = []string{cellAddr}
				} else {
					// Check if formula follows pattern
					if pd.isSequentialFormula(formulas[row][sequenceStart].(string), formula, col-sequenceStart) {
						sequenceCells = append(sequenceCells, cellAddr)
					} else {
						// End of sequence
						if len(sequenceCells) >= 3 {
							patterns = append(patterns, FormulaPattern{
								Type:        "sequential",
								Pattern:     "Row-wise sequential formulas",
								Count:       len(sequenceCells),
								Cells:       sequenceCells,
								Description: "Formulas that increment references across rows",
								BaseFormula: formulas[row][sequenceStart].(string),
							})
						}
						sequenceStart = col
						sequenceCells = []string{cellAddr}
					}
				}
			} else {
				// Check if we have a sequence to save
				if len(sequenceCells) >= 3 {
					patterns = append(patterns, FormulaPattern{
						Type:        "sequential",
						Pattern:     "Row-wise sequential formulas",
						Count:       len(sequenceCells),
						Cells:       sequenceCells,
						Description: "Formulas that increment references across rows",
						BaseFormula: formulas[row][sequenceStart].(string),
					})
				}
				sequenceStart = -1
				sequenceCells = []string{}
			}
		}
	}
	
	return patterns
}

// isSequentialFormula checks if two formulas are sequential
func (pd *PatternDetector) isSequentialFormula(baseFormula, testFormula string, offset int) bool {
	// Simple check - formulas should have same structure with offset references
	baseRefs := regexp.MustCompile(`[A-Z]+\d+`).FindAllString(baseFormula, -1)
	testRefs := regexp.MustCompile(`[A-Z]+\d+`).FindAllString(testFormula, -1)
	
	if len(baseRefs) != len(testRefs) {
		return false
	}
	
	// Check if references are offset correctly
	for i := 0; i < len(baseRefs); i++ {
		baseRow, baseCol, _ := parseCellAddress(baseRefs[i])
		testRow, testCol, _ := parseCellAddress(testRefs[i])
		
		// For row-wise sequence, columns should increment
		if testCol != baseCol+offset || testRow != baseRow {
			// Check for absolute references
			if strings.Contains(baseFormula, "$"+baseRefs[i]) {
				if baseRefs[i] != testRefs[i] {
					return false
				}
			}
		}
	}
	
	return true
}

// AnalyzeDataPatterns analyzes patterns in data values
func (pd *PatternDetector) AnalyzeDataPatterns(data *ai.RangeData) []DataPattern {
	patterns := []DataPattern{}
	
	// Analyze by columns
	for col := 0; col < data.ColCount && col < pd.maxScanCols; col++ {
		columnData := pd.extractColumn(data.Values, col)
		if pattern := pd.analyzeColumnPattern(columnData); pattern != nil {
			patterns = append(patterns, *pattern)
		}
	}
	
	// Analyze by rows (limited to first 20 rows for performance)
	maxRows := 20
	if data.RowCount < maxRows {
		maxRows = data.RowCount
	}
	
	for row := 0; row < maxRows; row++ {
		if row < len(data.Values) {
			if pattern := pd.analyzeRowPattern(data.Values[row]); pattern != nil {
				patterns = append(patterns, *pattern)
			}
		}
	}
	
	return patterns
}

// extractColumn extracts column data
func (pd *PatternDetector) extractColumn(values [][]interface{}, col int) []interface{} {
	columnData := []interface{}{}
	
	for row := 0; row < len(values); row++ {
		if col < len(values[row]) && values[row][col] != nil && values[row][col] != "" {
			columnData = append(columnData, values[row][col])
		}
	}
	
	return columnData
}

// analyzeColumnPattern analyzes a column for patterns
func (pd *PatternDetector) analyzeColumnPattern(data []interface{}) *DataPattern {
	if len(data) < 3 {
		return nil
	}
	
	// Extract numeric data
	numericData := []float64{}
	for _, val := range data {
		if num := pd.toFloat64(val); num != nil {
			numericData = append(numericData, *num)
		}
	}
	
	if len(numericData) < 3 {
		return nil
	}
	
	// Check for arithmetic series
	if pattern := pd.checkArithmeticSeries(numericData); pattern != nil {
		return pattern
	}
	
	// Check for geometric series
	if pattern := pd.checkGeometricSeries(numericData); pattern != nil {
		return pattern
	}
	
	// Check for repeating pattern
	if pattern := pd.checkRepeatingPattern(numericData); pattern != nil {
		return pattern
	}
	
	return nil
}

// analyzeRowPattern analyzes a row for patterns
func (pd *PatternDetector) analyzeRowPattern(data []interface{}) *DataPattern {
	// Convert to numeric data
	numericData := []float64{}
	for _, val := range data {
		if num := pd.toFloat64(val); num != nil {
			numericData = append(numericData, *num)
		}
	}
	
	if len(numericData) < 3 {
		return nil
	}
	
	// Reuse column analysis logic
	return pd.analyzeColumnPattern(data)
}

// checkArithmeticSeries checks for arithmetic progression
func (pd *PatternDetector) checkArithmeticSeries(data []float64) *DataPattern {
	differences := []float64{}
	for i := 1; i < len(data); i++ {
		differences = append(differences, data[i]-data[i-1])
	}
	
	// Calculate average difference and variance
	avgDiff := 0.0
	for _, diff := range differences {
		avgDiff += diff
	}
	avgDiff /= float64(len(differences))
	
	variance := 0.0
	for _, diff := range differences {
		variance += math.Pow(diff-avgDiff, 2)
	}
	variance /= float64(len(differences))
	
	// If variance is small, it's likely an arithmetic series
	if variance < 0.01 {
		return &DataPattern{
			Type:        "series",
			Confidence:  0.9,
			Description: "Arithmetic series with constant increment",
			Parameters: map[string]interface{}{
				"increment": avgDiff,
				"start":     data[0],
			},
		}
	}
	
	return nil
}

// checkGeometricSeries checks for geometric progression
func (pd *PatternDetector) checkGeometricSeries(data []float64) *DataPattern {
	ratios := []float64{}
	for i := 1; i < len(data); i++ {
		if data[i-1] != 0 {
			ratios = append(ratios, data[i]/data[i-1])
		}
	}
	
	if len(ratios) == 0 {
		return nil
	}
	
	// Calculate average ratio and variance
	avgRatio := 0.0
	for _, ratio := range ratios {
		avgRatio += ratio
	}
	avgRatio /= float64(len(ratios))
	
	variance := 0.0
	for _, ratio := range ratios {
		variance += math.Pow(ratio-avgRatio, 2)
	}
	variance /= float64(len(ratios))
	
	// If variance is small and ratio is not 1, it's likely a geometric series
	if variance < 0.01 && math.Abs(avgRatio-1) > 0.01 {
		return &DataPattern{
			Type:        "growth",
			Confidence:  0.85,
			Description: "Geometric series with constant growth rate",
			Parameters: map[string]interface{}{
				"growth_rate": (avgRatio - 1) * 100,
				"multiplier":  avgRatio,
				"start":       data[0],
			},
		}
	}
	
	return nil
}

// checkRepeatingPattern checks for repeating patterns
func (pd *PatternDetector) checkRepeatingPattern(data []float64) *DataPattern {
	// Try different period lengths
	for period := 2; period <= len(data)/2 && period <= 10; period++ {
		isRepeating := true
		
		for i := period; i < len(data); i++ {
			if math.Abs(data[i]-data[i%period]) > 0.01 {
				isRepeating = false
				break
			}
		}
		
		if isRepeating {
			return &DataPattern{
				Type:        "repeating",
				Confidence:  0.8,
				Description: fmt.Sprintf("Repeating pattern with period %d", period),
				Parameters: map[string]interface{}{
					"period": period,
					"values": data[:period],
				},
			}
		}
	}
	
	return nil
}

// Helper methods

// findNonEmptyRange finds the start and end of non-empty cells in a row
func (pd *PatternDetector) findNonEmptyRange(row []interface{}) (int, int) {
	start := -1
	end := -1
	
	for i := 0; i < len(row); i++ {
		if row[i] != nil && row[i] != "" {
			if start == -1 {
				start = i
			}
			end = i
		}
	}
	
	return start, end
}

// mergeOverlappingRegions merges regions that overlap
func (pd *PatternDetector) mergeOverlappingRegions(regions []SemanticRegion) []SemanticRegion {
	if len(regions) <= 1 {
		return regions
	}
	
	// Sort by area (larger first)
	for i := 0; i < len(regions); i++ {
		for j := i + 1; j < len(regions); j++ {
			areaI := (regions[i].EndRow - regions[i].StartRow + 1) * (regions[i].EndCol - regions[i].StartCol + 1)
			areaJ := (regions[j].EndRow - regions[j].StartRow + 1) * (regions[j].EndCol - regions[j].StartCol + 1)
			if areaJ > areaI {
				regions[i], regions[j] = regions[j], regions[i]
			}
		}
	}
	
	merged := []SemanticRegion{}
	used := make(map[int]bool)
	
	for i := 0; i < len(regions); i++ {
		if used[i] {
			continue
		}
		
		current := regions[i]
		merged = append(merged, current)
		used[i] = true
		
		// Don't merge regions of different types
		for j := i + 1; j < len(regions); j++ {
			if used[j] {
				continue
			}
			
			other := regions[j]
			
			// Check if other is completely contained within current
			if current.StartRow <= other.StartRow &&
				current.EndRow >= other.EndRow &&
				current.StartCol <= other.StartCol &&
				current.EndCol >= other.EndCol {
				used[j] = true
			}
		}
	}
	
	return merged
}

// isNumeric checks if a value is numeric
func (pd *PatternDetector) isNumeric(val interface{}) bool {
	switch v := val.(type) {
	case int, int8, int16, int32, int64:
		return true
	case uint, uint8, uint16, uint32, uint64:
		return true
	case float32, float64:
		return true
	case string:
		_, err := strconv.ParseFloat(v, 64)
		return err == nil
	default:
		return false
	}
}

// toFloat64 converts a value to float64
func (pd *PatternDetector) toFloat64(val interface{}) *float64 {
	switch v := val.(type) {
	case int:
		f := float64(v)
		return &f
	case int64:
		f := float64(v)
		return &f
	case float32:
		f := float64(v)
		return &f
	case float64:
		return &v
	case string:
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return &f
		}
	}
	return nil
}

// isDate checks if a value looks like a date
func (pd *PatternDetector) isDate(val interface{}) bool {
	switch v := val.(type) {
	case time.Time:
		return true
	case string:
		// Check for common date patterns
		datePatterns := []string{
			`\d{1,2}/\d{1,2}/\d{2,4}`,
			`\d{4}-\d{2}-\d{2}`,
			`\d{1,2}-[A-Za-z]{3}-\d{2,4}`,
		}
		for _, pattern := range datePatterns {
			if match, _ := regexp.MatchString(pattern, v); match {
				return true
			}
		}
	}
	return false
}

// columnToLetter converts a column number to Excel column letter
func columnToLetter(col int) string {
	letter := ""
	for col > 0 {
		col--
		letter = string(rune('A'+col%26)) + letter
		col /= 26
	}
	return letter
}