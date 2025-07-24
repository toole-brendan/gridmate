package spreadsheet

import (
	"regexp"
	"strings"
)

// SemanticRegion represents a semantically meaningful area in a spreadsheet
type SemanticRegion struct {
	Type         string                 `json:"type"`
	Address      string                 `json:"address"`
	StartRow     int                    `json:"startRow"`
	StartCol     int                    `json:"startCol"`
	EndRow       int                    `json:"endRow"`
	EndCol       int                    `json:"endCol"`
	Confidence   float64                `json:"confidence"`
	Characteristics map[string]interface{} `json:"characteristics,omitempty"`
}

// SemanticAnalyzer provides semantic understanding of spreadsheet structures
type SemanticAnalyzer struct {
	// Patterns for detecting different types of content
	currencyPattern *regexp.Regexp
	percentPattern  *regexp.Regexp
	datePattern     *regexp.Regexp
	formulaPattern  *regexp.Regexp
}

// NewSemanticAnalyzer creates a new semantic analyzer
func NewSemanticAnalyzer() *SemanticAnalyzer {
	return &SemanticAnalyzer{
		currencyPattern: regexp.MustCompile(`^\$?[\d,]+\.?\d*$|^[\d,]+\.?\d*\$$`),
		percentPattern:  regexp.MustCompile(`^\d+\.?\d*%$|^-?\d+\.?\d*%$`),
		datePattern:     regexp.MustCompile(`^\d{1,2}/\d{1,2}/\d{2,4}$|^\d{4}-\d{2}-\d{2}$`),
		formulaPattern:  regexp.MustCompile(`^=`),
	}
}

// AnalyzeRange performs semantic analysis on a range of cells
func (sa *SemanticAnalyzer) AnalyzeRange(values [][]interface{}, formulas [][]string) []SemanticRegion {
	regions := []SemanticRegion{}
	
	// Detect headers
	headerRegions := sa.detectHeaders(values, formulas)
	regions = append(regions, headerRegions...)
	
	// Detect total rows
	totalRegions := sa.detectTotalRows(values, formulas)
	regions = append(regions, totalRegions...)
	
	// Detect input vs calculation areas
	inputCalcRegions := sa.detectInputVsCalculation(values, formulas)
	regions = append(regions, inputCalcRegions...)
	
	// Detect data tables
	tableRegions := sa.detectDataTables(values, formulas)
	regions = append(regions, tableRegions...)
	
	return sa.mergeOverlappingRegions(regions)
}

// detectHeaders identifies header rows in the spreadsheet
func (sa *SemanticAnalyzer) detectHeaders(values [][]interface{}, formulas [][]string) []SemanticRegion {
	regions := []SemanticRegion{}
	
	for row := 0; row < len(values) && row < 10; row++ {
		if sa.isHeaderRow(values[row], formulas[row]) {
			// Find the extent of the header
			startCol := 0
			endCol := len(values[row]) - 1
			
			// Trim empty cells from the ends
			for startCol < len(values[row]) && sa.isEmpty(values[row][startCol]) {
				startCol++
			}
			for endCol >= 0 && sa.isEmpty(values[row][endCol]) {
				endCol--
			}
			
			if startCol <= endCol {
				regions = append(regions, SemanticRegion{
					Type:       "header",
					StartRow:   row,
					StartCol:   startCol,
					EndRow:     row,
					EndCol:     endCol,
					Confidence: 0.8,
					Characteristics: map[string]interface{}{
						"hasText": true,
					},
				})
			}
		}
	}
	
	return regions
}

// detectTotalRows identifies rows that contain totals or summaries
func (sa *SemanticAnalyzer) detectTotalRows(values [][]interface{}, formulas [][]string) []SemanticRegion {
	regions := []SemanticRegion{}
	
	for row := 0; row < len(values); row++ {
		if sa.isTotalRow(values[row], formulas[row]) {
			startCol := 0
			endCol := len(values[row]) - 1
			
			regions = append(regions, SemanticRegion{
				Type:       "total",
				StartRow:   row,
				StartCol:   startCol,
				EndRow:     row,
				EndCol:     endCol,
				Confidence: 0.85,
				Characteristics: map[string]interface{}{
					"hasFormulas": true,
				},
			})
		}
	}
	
	return regions
}

// detectInputVsCalculation distinguishes between input and calculation areas
func (sa *SemanticAnalyzer) detectInputVsCalculation(values [][]interface{}, formulas [][]string) []SemanticRegion {
	regions := []SemanticRegion{}
	
	// Simple heuristic: areas with no formulas are likely inputs
	// Areas with many formulas are likely calculations
	const blockSize = 5
	
	for row := 0; row < len(values); row += blockSize {
		for col := 0; col < len(values[0]); col += blockSize {
			endRow := min(row+blockSize-1, len(values)-1)
			endCol := min(col+blockSize-1, len(values[0])-1)
			
			formulaCount := 0
			totalCells := 0
			
			for r := row; r <= endRow; r++ {
				for c := col; c <= endCol && c < len(values[r]); c++ {
					if len(formulas) > r && len(formulas[r]) > c && formulas[r][c] != "" {
						formulaCount++
					}
					if !sa.isEmpty(values[r][c]) {
						totalCells++
					}
				}
			}
			
			if totalCells > 0 {
				formulaRatio := float64(formulaCount) / float64(totalCells)
				
				regionType := "input"
				if formulaRatio > 0.5 {
					regionType = "calculation"
				}
				
				regions = append(regions, SemanticRegion{
					Type:       regionType,
					StartRow:   row,
					StartCol:   col,
					EndRow:     endRow,
					EndCol:     endCol,
					Confidence: 0.7,
					Characteristics: map[string]interface{}{
						"formulaRatio": formulaRatio,
						"hasFormulas":  formulaCount > 0,
					},
				})
			}
		}
	}
	
	return regions
}

// detectDataTables identifies structured data tables
func (sa *SemanticAnalyzer) detectDataTables(values [][]interface{}, formulas [][]string) []SemanticRegion {
	regions := []SemanticRegion{}
	
	// Look for rectangular regions with consistent data types
	for row := 0; row < len(values); row++ {
		for col := 0; col < len(values[0]); col++ {
			if table := sa.findTableAt(values, formulas, row, col); table != nil {
				regions = append(regions, *table)
				// Skip to the end of this table
				row = table.EndRow
				break
			}
		}
	}
	
	return regions
}

// Helper methods

func (sa *SemanticAnalyzer) isHeaderRow(row []interface{}, formulas []string) bool {
	textCount := 0
	nonEmptyCount := 0
	
	for i, cell := range row {
		if !sa.isEmpty(cell) {
			nonEmptyCount++
			if _, ok := cell.(string); ok {
				// Check if it's not a formula
				if len(formulas) <= i || formulas[i] == "" {
					textCount++
				}
			}
		}
	}
	
	// Header heuristic: mostly text, no formulas
	return nonEmptyCount > 0 && float64(textCount)/float64(nonEmptyCount) > 0.7
}

func (sa *SemanticAnalyzer) isTotalRow(row []interface{}, formulas []string) bool {
	// Look for keywords like "Total", "Sum", etc.
	hasKeyword := false
	hasSumFormula := false
	
	for i, cell := range row {
		if str, ok := cell.(string); ok {
			lowerStr := strings.ToLower(str)
			if strings.Contains(lowerStr, "total") || 
			   strings.Contains(lowerStr, "sum") ||
			   strings.Contains(lowerStr, "subtotal") {
				hasKeyword = true
			}
		}
		
		if len(formulas) > i && formulas[i] != "" {
			formulaLower := strings.ToLower(formulas[i])
			if strings.Contains(formulaLower, "sum(") {
				hasSumFormula = true
			}
		}
	}
	
	return hasKeyword && hasSumFormula
}

func (sa *SemanticAnalyzer) findTableAt(values [][]interface{}, formulas [][]string, startRow, startCol int) *SemanticRegion {
	// Simple table detection: look for a header row followed by consistent data
	if startRow >= len(values)-1 || startCol >= len(values[0]) {
		return nil
	}
	
	// Check if this could be a header row
	if !sa.isHeaderRow(values[startRow], formulas[startRow]) {
		return nil
	}
	
	// Find the extent of the table
	endRow := startRow + 1
	endCol := startCol
	
	// Find column extent
	for c := startCol; c < len(values[startRow]); c++ {
		if sa.isEmpty(values[startRow][c]) {
			break
		}
		endCol = c
	}
	
	// Find row extent
	for r := startRow + 1; r < len(values); r++ {
		emptyRow := true
		for c := startCol; c <= endCol && c < len(values[r]); c++ {
			if !sa.isEmpty(values[r][c]) {
				emptyRow = false
				break
			}
		}
		if emptyRow {
			break
		}
		endRow = r
	}
	
	if endRow > startRow+1 && endCol > startCol {
		return &SemanticRegion{
			Type:       "data",
			StartRow:   startRow,
			StartCol:   startCol,
			EndRow:     endRow,
			EndCol:     endCol,
			Confidence: 0.75,
			Characteristics: map[string]interface{}{
				"hasHeaders": true,
				"rowCount":   endRow - startRow + 1,
				"colCount":   endCol - startCol + 1,
			},
		}
	}
	
	return nil
}

func (sa *SemanticAnalyzer) isEmpty(cell interface{}) bool {
	if cell == nil {
		return true
	}
	if str, ok := cell.(string); ok {
		return strings.TrimSpace(str) == ""
	}
	return false
}

func (sa *SemanticAnalyzer) mergeOverlappingRegions(regions []SemanticRegion) []SemanticRegion {
	// Simple implementation - can be enhanced
	// For now, just return all regions
	return regions
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}