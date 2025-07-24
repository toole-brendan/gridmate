package spreadsheet

import (
	"fmt"
	"regexp"
	"strings"
)

// RepresentationMode defines different ways to represent spreadsheet data
type RepresentationMode string

const (
	ModeCompact     RepresentationMode = "compact"
	ModeSpatial     RepresentationMode = "spatial"
	ModeStructured  RepresentationMode = "structured"
	ModeSemantic    RepresentationMode = "semantic"
	ModeDifferential RepresentationMode = "differential"
)

// SpreadsheetRepresentation contains multiple representations of spreadsheet data
type SpreadsheetRepresentation struct {
	Mode           RepresentationMode     `json:"mode"`
	Content        string                 `json:"content"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	TokenEstimate  int                    `json:"tokenEstimate"`
}

// RepresentationBuilder builds various representations of spreadsheet data
type RepresentationBuilder struct {
	semanticAnalyzer *SemanticAnalyzer
	cellClassifier   *CellClassifier
}

// NewRepresentationBuilder creates a new representation builder
func NewRepresentationBuilder() *RepresentationBuilder {
	return &RepresentationBuilder{
		semanticAnalyzer: NewSemanticAnalyzer(),
		cellClassifier:   NewCellClassifier(),
	}
}

// BuildRepresentation creates a representation in the specified mode
func (rb *RepresentationBuilder) BuildRepresentation(
	values [][]interface{},
	formulas [][]string,
	mode RepresentationMode,
	options map[string]interface{},
) (*SpreadsheetRepresentation, error) {
	switch mode {
	case ModeCompact:
		return rb.buildCompactRepresentation(values, formulas, options)
	case ModeSpatial:
		return rb.buildSpatialRepresentation(values, formulas, options)
	case ModeStructured:
		return rb.buildStructuredRepresentation(values, formulas, options)
	case ModeSemantic:
		return rb.buildSemanticRepresentation(values, formulas, options)
	case ModeDifferential:
		return rb.buildDifferentialRepresentation(values, formulas, options)
	default:
		return nil, fmt.Errorf("unsupported representation mode: %s", mode)
	}
}

// buildCompactRepresentation creates a token-efficient representation
func (rb *RepresentationBuilder) buildCompactRepresentation(
	values [][]interface{},
	formulas [][]string,
	options map[string]interface{},
) (*SpreadsheetRepresentation, error) {
	var builder strings.Builder
	
	// Find non-empty bounds
	minRow, maxRow, minCol, maxCol := rb.findDataBounds(values)
	if minRow == -1 {
		return &SpreadsheetRepresentation{
			Mode:          ModeCompact,
			Content:       "Empty spreadsheet",
			TokenEstimate: 2,
		}, nil
	}
	
	// Build compact representation
	builder.WriteString(fmt.Sprintf("Data Range: %s:%s\n", 
		rb.cellAddress(minRow, minCol), 
		rb.cellAddress(maxRow, maxCol)))
	
	// Sample data if too large
	maxRows := 20
	if opt, ok := options["maxRows"].(int); ok {
		maxRows = opt
	}
	
	rowStep := 1
	if maxRow-minRow+1 > maxRows {
		rowStep = (maxRow - minRow + 1) / maxRows
	}
	
	for row := minRow; row <= maxRow; row += rowStep {
		builder.WriteString(fmt.Sprintf("Row %d: ", row+1))
		
		for col := minCol; col <= maxCol && col < len(values[row]); col++ {
			if col > minCol {
				builder.WriteString(" | ")
			}
			
			// Show formula or value
			if len(formulas) > row && len(formulas[row]) > col && formulas[row][col] != "" {
				builder.WriteString(formulas[row][col])
			} else {
				builder.WriteString(rb.formatValue(values[row][col]))
			}
		}
		builder.WriteString("\n")
	}
	
	// Estimate tokens (rough approximation)
	content := builder.String()
	tokenEstimate := len(strings.Fields(content)) + len(content)/4
	
	return &SpreadsheetRepresentation{
		Mode:          ModeCompact,
		Content:       content,
		TokenEstimate: tokenEstimate,
		Metadata: map[string]interface{}{
			"rows":    maxRow - minRow + 1,
			"cols":    maxCol - minCol + 1,
			"sampled": rowStep > 1,
		},
	}, nil
}

// buildSpatialRepresentation creates an ASCII art-like spatial view
func (rb *RepresentationBuilder) buildSpatialRepresentation(
	values [][]interface{},
	formulas [][]string,
	options map[string]interface{},
) (*SpreadsheetRepresentation, error) {
	var builder strings.Builder
	
	// Find bounds
	minRow, maxRow, minCol, maxCol := rb.findDataBounds(values)
	if minRow == -1 {
		return &SpreadsheetRepresentation{
			Mode:          ModeSpatial,
			Content:       "Empty spreadsheet",
			TokenEstimate: 2,
		}, nil
	}
	
	// Determine column widths
	colWidths := rb.calculateColumnWidths(values, formulas, minRow, maxRow, minCol, maxCol)
	
	// Build header row
	builder.WriteString("   ")
	for col := minCol; col <= maxCol; col++ {
		builder.WriteString(fmt.Sprintf(" %*s", colWidths[col], rb.columnLetter(col)))
	}
	builder.WriteString("\n")
	
	// Build separator
	builder.WriteString("   ")
	for col := minCol; col <= maxCol; col++ {
		builder.WriteString(fmt.Sprintf(" %s", strings.Repeat("-", colWidths[col])))
	}
	builder.WriteString("\n")
	
	// Build data rows
	for row := minRow; row <= maxRow && row < len(values); row++ {
		builder.WriteString(fmt.Sprintf("%3d", row+1))
		
		for col := minCol; col <= maxCol && col < len(values[row]); col++ {
			cellContent := ""
			if len(formulas) > row && len(formulas[row]) > col && formulas[row][col] != "" {
				cellContent = "="
			} else {
				cellContent = rb.formatValue(values[row][col])
			}
			
			builder.WriteString(fmt.Sprintf(" %*s", colWidths[col], rb.truncate(cellContent, colWidths[col])))
		}
		builder.WriteString("\n")
	}
	
	content := builder.String()
	tokenEstimate := len(strings.Fields(content)) + len(content)/4
	
	return &SpreadsheetRepresentation{
		Mode:          ModeSpatial,
		Content:       content,
		TokenEstimate: tokenEstimate,
		Metadata: map[string]interface{}{
			"rows": maxRow - minRow + 1,
			"cols": maxCol - minCol + 1,
		},
	}, nil
}

// buildStructuredRepresentation creates a structured JSON-like representation
func (rb *RepresentationBuilder) buildStructuredRepresentation(
	values [][]interface{},
	formulas [][]string,
	options map[string]interface{},
) (*SpreadsheetRepresentation, error) {
	// Analyze regions
	regions := rb.semanticAnalyzer.AnalyzeRange(values, formulas)
	
	var builder strings.Builder
	builder.WriteString("Spreadsheet Structure:\n\n")
	
	// Group regions by type
	regionsByType := make(map[string][]SemanticRegion)
	for _, region := range regions {
		regionsByType[region.Type] = append(regionsByType[region.Type], region)
	}
	
	// Output structured view
	for regionType, typeRegions := range regionsByType {
		builder.WriteString(fmt.Sprintf("%s Regions (%d):\n", strings.Title(regionType), len(typeRegions)))
		
		for i, region := range typeRegions {
			builder.WriteString(fmt.Sprintf("  %d. %s:%s", 
				i+1,
				rb.cellAddress(region.StartRow, region.StartCol),
				rb.cellAddress(region.EndRow, region.EndCol)))
			
			// Add sample data for small regions
			if region.EndRow-region.StartRow < 3 && region.EndCol-region.StartCol < 5 {
				builder.WriteString(" [")
				for r := region.StartRow; r <= region.EndRow && r < len(values); r++ {
					if r > region.StartRow {
						builder.WriteString("; ")
					}
					for c := region.StartCol; c <= region.EndCol && c < len(values[r]); c++ {
						if c > region.StartCol {
							builder.WriteString(", ")
						}
						builder.WriteString(rb.formatValue(values[r][c]))
					}
				}
				builder.WriteString("]")
			}
			
			builder.WriteString("\n")
		}
		builder.WriteString("\n")
	}
	
	content := builder.String()
	tokenEstimate := len(strings.Fields(content)) + len(content)/4
	
	return &SpreadsheetRepresentation{
		Mode:          ModeStructured,
		Content:       content,
		TokenEstimate: tokenEstimate,
		Metadata: map[string]interface{}{
			"regionCount": len(regions),
			"regionTypes": len(regionsByType),
		},
	}, nil
}

// buildSemanticRepresentation creates a natural language description
func (rb *RepresentationBuilder) buildSemanticRepresentation(
	values [][]interface{},
	formulas [][]string,
	options map[string]interface{},
) (*SpreadsheetRepresentation, error) {
	var builder strings.Builder
	
	// Analyze the spreadsheet
	regions := rb.semanticAnalyzer.AnalyzeRange(values, formulas)
	minRow, maxRow, minCol, maxCol := rb.findDataBounds(values)
	
	// Generate semantic description
	builder.WriteString("This spreadsheet contains:\n\n")
	
	// Describe overall structure
	if minRow != -1 {
		builder.WriteString(fmt.Sprintf("- Data spanning %d rows and %d columns (%s:%s)\n",
			maxRow-minRow+1, maxCol-minCol+1,
			rb.cellAddress(minRow, minCol),
			rb.cellAddress(maxRow, maxCol)))
	}
	
	// Count formulas
	formulaCount := 0
	for _, row := range formulas {
		for _, formula := range row {
			if formula != "" {
				formulaCount++
			}
		}
	}
	
	if formulaCount > 0 {
		builder.WriteString(fmt.Sprintf("- %d formulas for calculations\n", formulaCount))
	}
	
	// Describe regions
	regionCounts := make(map[string]int)
	for _, region := range regions {
		regionCounts[region.Type]++
	}
	
	for regionType, count := range regionCounts {
		builder.WriteString(fmt.Sprintf("- %d %s region(s)\n", count, regionType))
	}
	
	// Describe key patterns
	builder.WriteString("\nKey patterns detected:\n")
	
	// Look for time series
	if rb.hasTimeSeries(values, regions) {
		builder.WriteString("- Time series data (likely financial periods)\n")
	}
	
	// Look for calculations
	if rb.hasCalculations(regions) {
		builder.WriteString("- Calculation areas with formulas\n")
	}
	
	// Look for summaries
	if rb.hasSummaries(regions) {
		builder.WriteString("- Summary/total rows\n")
	}
	
	content := builder.String()
	tokenEstimate := len(strings.Fields(content)) + len(content)/4
	
	return &SpreadsheetRepresentation{
		Mode:          ModeSemantic,
		Content:       content,
		TokenEstimate: tokenEstimate,
		Metadata: map[string]interface{}{
			"regionCount": len(regions),
		},
	}, nil
}

// buildDifferentialRepresentation creates a change-focused representation
func (rb *RepresentationBuilder) buildDifferentialRepresentation(
	values [][]interface{},
	formulas [][]string,
	options map[string]interface{},
) (*SpreadsheetRepresentation, error) {
	// This would compare against a previous state
	// For now, return a placeholder
	return &SpreadsheetRepresentation{
		Mode:          ModeDifferential,
		Content:       "Differential representation requires previous state",
		TokenEstimate: 10,
	}, nil
}

// Helper methods

func (rb *RepresentationBuilder) findDataBounds(values [][]interface{}) (minRow, maxRow, minCol, maxCol int) {
	minRow, minCol = -1, -1
	maxRow, maxCol = -1, -1
	
	for row := 0; row < len(values); row++ {
		for col := 0; col < len(values[row]); col++ {
			if !rb.isEmpty(values[row][col]) {
				if minRow == -1 || row < minRow {
					minRow = row
				}
				if maxRow == -1 || row > maxRow {
					maxRow = row
				}
				if minCol == -1 || col < minCol {
					minCol = col
				}
				if maxCol == -1 || col > maxCol {
					maxCol = col
				}
			}
		}
	}
	
	return
}

func (rb *RepresentationBuilder) calculateColumnWidths(
	values [][]interface{},
	formulas [][]string,
	minRow, maxRow, minCol, maxCol int,
) map[int]int {
	widths := make(map[int]int)
	
	for col := minCol; col <= maxCol; col++ {
		maxWidth := 3 // Minimum width
		
		for row := minRow; row <= maxRow && row < len(values); row++ {
			if col < len(values[row]) {
				var cellLen int
				if len(formulas) > row && len(formulas[row]) > col && formulas[row][col] != "" {
					cellLen = 1 // Just show "=" for formulas
				} else {
					cellLen = len(rb.formatValue(values[row][col]))
				}
				
				if cellLen > maxWidth {
					maxWidth = cellLen
				}
			}
		}
		
		// Cap at reasonable width
		if maxWidth > 15 {
			maxWidth = 15
		}
		
		widths[col] = maxWidth
	}
	
	return widths
}

func (rb *RepresentationBuilder) cellAddress(row, col int) string {
	return fmt.Sprintf("%s%d", rb.columnLetter(col), row+1)
}

func (rb *RepresentationBuilder) columnLetter(col int) string {
	letter := ""
	col++ // Convert to 1-based
	
	for col > 0 {
		col--
		letter = string(rune('A'+col%26)) + letter
		col /= 26
	}
	
	return letter
}

func (rb *RepresentationBuilder) formatValue(value interface{}) string {
	if value == nil {
		return ""
	}
	
	switch v := value.(type) {
	case float64:
		if v == float64(int(v)) {
			return fmt.Sprintf("%d", int(v))
		}
		return fmt.Sprintf("%.2f", v)
	case string:
		return v
	default:
		return fmt.Sprintf("%v", v)
	}
}

func (rb *RepresentationBuilder) truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}

func (rb *RepresentationBuilder) isEmpty(value interface{}) bool {
	if value == nil {
		return true
	}
	if str, ok := value.(string); ok {
		return strings.TrimSpace(str) == ""
	}
	return false
}

func (rb *RepresentationBuilder) hasTimeSeries(values [][]interface{}, regions []SemanticRegion) bool {
	// Simple check for year/quarter patterns in headers
	for _, region := range regions {
		if region.Type == "header" {
			for col := region.StartCol; col <= region.EndCol && region.StartRow < len(values); col++ {
				if col < len(values[region.StartRow]) {
					if str, ok := values[region.StartRow][col].(string); ok {
						if rb.isTimePattern(str) {
							return true
						}
					}
				}
			}
		}
	}
	return false
}

func (rb *RepresentationBuilder) isTimePattern(s string) bool {
	// Simple patterns for years and quarters
	yearPattern := regexp.MustCompile(`^(19|20)\d{2}$`)
	quarterPattern := regexp.MustCompile(`(?i)^Q[1-4]`)
	monthPattern := regexp.MustCompile(`(?i)^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)`)
	
	return yearPattern.MatchString(s) || quarterPattern.MatchString(s) || monthPattern.MatchString(s)
}

func (rb *RepresentationBuilder) hasCalculations(regions []SemanticRegion) bool {
	for _, region := range regions {
		if region.Type == "calculation" {
			return true
		}
	}
	return false
}

func (rb *RepresentationBuilder) hasSummaries(regions []SemanticRegion) bool {
	for _, region := range regions {
		if region.Type == "total" {
			return true
		}
	}
	return false
}