package chunkers

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/memory"
	"github.com/gridmate/backend/internal/models"
)

// SpreadsheetChunker intelligently chunks Excel data
type SpreadsheetChunker struct {
	minChunkSize int
	maxChunkSize int
}

// NewSpreadsheetChunker creates a new chunker
func NewSpreadsheetChunker() *SpreadsheetChunker {
	return &SpreadsheetChunker{
		minChunkSize: 50,  // ~50 tokens minimum
		maxChunkSize: 300, // ~300 tokens maximum
	}
}

// ChunkSpreadsheet converts spreadsheet data into searchable chunks
func (c *SpreadsheetChunker) ChunkSpreadsheet(sheet *models.Sheet) []memory.Chunk {
	if sheet == nil || sheet.Data == nil {
		return []memory.Chunk{}
	}

	data := sheet.Data
	chunks := []memory.Chunk{}

	// Strategy 1: Table detection and chunking
	tables := c.detectTables(data)
	for _, table := range tables {
		chunk := c.chunkTable(table, data)
		chunks = append(chunks, chunk)
	}

	// Strategy 2: Financial sections
	sections := c.detectFinancialSections(data)
	for _, section := range sections {
		chunk := c.chunkSection(section, data)
		chunks = append(chunks, chunk)
	}

	// Strategy 3: Complex formulas with context
	formulas := c.extractComplexFormulas(data)
	for _, formula := range formulas {
		chunk := c.chunkFormula(formula, data)
		chunks = append(chunks, chunk)
	}

	// Strategy 4: Named ranges
	namedRanges := c.extractNamedRanges(data)
	for _, nr := range namedRanges {
		chunk := c.chunkNamedRange(nr, data)
		chunks = append(chunks, chunk)
	}

	// Add overview chunk for the sheet
	overviewChunk := c.createSheetOverview(sheet)
	chunks = append(chunks, overviewChunk)

	return chunks
}

// detectTables finds table structures in the data
func (c *SpreadsheetChunker) detectTables(data *models.RangeData) []TableRegion {
	tables := []TableRegion{}

	// Look for headers (bold, colored, or with specific patterns)
	for row := 0; row < len(data.Values); row++ {
		if c.isHeaderRow(data, row) {
			// Find table bounds
			startCol, endCol := c.findTableColumns(data, row)
			endRow := c.findTableEnd(data, row, startCol, endCol)

			if endRow > row+1 { // At least 2 rows for a table
				tables = append(tables, TableRegion{
					HeaderRow: row,
					StartRow:  row,
					EndRow:    endRow,
					StartCol:  startCol,
					EndCol:    endCol,
				})
			}
		}
	}

	return tables
}

// chunkTable creates a chunk from a table region
func (c *SpreadsheetChunker) chunkTable(table TableRegion, data *models.RangeData) memory.Chunk {
	var content strings.Builder

	// Include headers
	headers := []string{}
	for col := table.StartCol; col <= table.EndCol && col < len(data.Values[table.HeaderRow]); col++ {
		if val := data.Values[table.HeaderRow][col]; val != nil && val != "" {
			headers = append(headers, fmt.Sprintf("%v", val))
		}
	}

	content.WriteString("Table: " + strings.Join(headers, " | ") + "\n")

	// Include summary statistics
	content.WriteString(fmt.Sprintf("Data rows: %d\n", table.EndRow-table.StartRow))

	// Include first few rows as examples
	maxRows := 3
	for row := table.StartRow + 1; row <= table.EndRow && row < table.StartRow+1+maxRows && row < len(data.Values); row++ {
		rowData := []string{}
		for col := table.StartCol; col <= table.EndCol && col < len(data.Values[row]); col++ {
			if val := data.Values[row][col]; val != nil && val != "" {
				rowData = append(rowData, fmt.Sprintf("%v", val))
			}
		}
		content.WriteString(strings.Join(rowData, " | ") + "\n")
	}

	// Include any totals or summary rows
	if table.EndRow < len(data.Values) && c.isSummaryRow(data, table.EndRow) {
		content.WriteString("Totals: ")
		for col := table.StartCol; col <= table.EndCol && col < len(data.Values[table.EndRow]); col++ {
			if val := data.Values[table.EndRow][col]; val != nil && val != "" {
				headerIdx := col - table.StartCol
				if headerIdx < len(headers) {
					content.WriteString(headers[headerIdx] + "=" + fmt.Sprintf("%v", val) + " ")
				}
			}
		}
	}

	return memory.Chunk{
		ID:      fmt.Sprintf("table_%s_%d_%d_%s", data.Sheet, table.StartRow, table.StartCol, uuid.NewString()[:8]),
		Content: content.String(),
		Metadata: memory.ChunkMetadata{
			Source:    "spreadsheet",
			SourceID:  data.Sheet,
			SheetName: data.Sheet,
			CellRange: fmt.Sprintf("%s:%s",
				cellAddress(table.StartRow, table.StartCol),
				cellAddress(table.EndRow, table.EndCol)),
			SourceMeta: map[string]interface{}{
				"type":    "table",
				"headers": headers,
				"rows":    table.EndRow - table.StartRow,
			},
		},
	}
}

// detectFinancialSections finds standard financial statement sections
func (c *SpreadsheetChunker) detectFinancialSections(data *models.RangeData) []FinancialSection {
	sections := []FinancialSection{}

	// Keywords for different financial sections
	sectionKeywords := map[string][]string{
		"income_statement": {"revenue", "sales", "income", "expense", "ebitda", "net income"},
		"balance_sheet":    {"assets", "liabilities", "equity", "current assets", "total assets"},
		"cash_flow":        {"operating activities", "investing activities", "financing activities", "cash flow"},
		"assumptions":      {"assumptions", "growth rate", "discount rate", "wacc", "terminal value"},
	}

	for sectionType, keywords := range sectionKeywords {
		for row := 0; row < len(data.Values); row++ {
			for col := 0; col < len(data.Values[row]); col++ {
				if cellVal := data.Values[row][col]; cellVal != nil {
					cellValue := strings.ToLower(fmt.Sprintf("%v", cellVal))

					for _, keyword := range keywords {
						if strings.Contains(cellValue, keyword) {
							// Found a section, determine its bounds
							section := FinancialSection{
								Type:     sectionType,
								StartRow: row,
								StartCol: col,
								Title:    fmt.Sprintf("%v", cellVal),
							}

							// Find section end
							section.EndRow = c.findSectionEnd(data, row)
							section.EndCol = c.findSectionEndCol(data, row, col)

							sections = append(sections, section)
							break
						}
					}
				}
			}
		}
	}

	return sections
}

// chunkSection creates a chunk from a financial section
func (c *SpreadsheetChunker) chunkSection(section FinancialSection, data *models.RangeData) memory.Chunk {
	var content strings.Builder

	content.WriteString(fmt.Sprintf("%s Section: %s\n", strings.Title(strings.Replace(section.Type, "_", " ", -1)), section.Title))
	content.WriteString(fmt.Sprintf("Location: %s\n", cellAddress(section.StartRow, section.StartCol)))

	// Extract key values from the section
	keyValues := c.extractKeyValues(data, section.StartRow, section.EndRow, section.StartCol, section.EndCol)
	for _, kv := range keyValues {
		content.WriteString(fmt.Sprintf("- %s: %s\n", kv.Key, kv.Value))
	}

	return memory.Chunk{
		ID:      fmt.Sprintf("section_%s_%s_%d_%s", data.Sheet, section.Type, section.StartRow, uuid.NewString()[:8]),
		Content: content.String(),
		Metadata: memory.ChunkMetadata{
			Source:    "spreadsheet",
			SourceID:  data.Sheet,
			SheetName: data.Sheet,
			CellRange: fmt.Sprintf("%s:%s",
				cellAddress(section.StartRow, section.StartCol),
				cellAddress(section.EndRow, section.EndCol)),
			SourceMeta: map[string]interface{}{
				"type":         "financial_section",
				"section_type": section.Type,
				"title":        section.Title,
			},
		},
	}
}

// extractComplexFormulas finds and extracts complex formulas
func (c *SpreadsheetChunker) extractComplexFormulas(data *models.RangeData) []FormulaRegion {
	formulas := []FormulaRegion{}

	if data.Formulas == nil {
		return formulas
	}

	for row := 0; row < len(data.Formulas); row++ {
		for col := 0; col < len(data.Formulas[row]); col++ {
			formula := data.Formulas[row][col]
			if c.isComplexFormula(formula) {
				formulas = append(formulas, FormulaRegion{
					Row:     row,
					Col:     col,
					Formula: formula,
					Value:   fmt.Sprintf("%v", data.Values[row][col]),
				})
			}
		}
	}

	return formulas
}

// chunkFormula creates a chunk from a complex formula
func (c *SpreadsheetChunker) chunkFormula(formula FormulaRegion, data *models.RangeData) memory.Chunk {
	var content strings.Builder

	content.WriteString(fmt.Sprintf("Complex Formula at %s\n", cellAddress(formula.Row, formula.Col)))
	content.WriteString(fmt.Sprintf("Formula: %s\n", formula.Formula))
	content.WriteString(fmt.Sprintf("Result: %s\n", formula.Value))

	// Add context from surrounding cells
	context := c.getFormulaContext(data, formula.Row, formula.Col)
	if context != "" {
		content.WriteString(fmt.Sprintf("Context: %s\n", context))
	}

	return memory.Chunk{
		ID:      fmt.Sprintf("formula_%s_%d_%d_%s", data.Sheet, formula.Row, formula.Col, uuid.NewString()[:8]),
		Content: content.String(),
		Metadata: memory.ChunkMetadata{
			Source:    "spreadsheet",
			SourceID:  data.Sheet,
			SheetName: data.Sheet,
			CellRange: cellAddress(formula.Row, formula.Col),
			IsFormula: true,
			SourceMeta: map[string]interface{}{
				"type":    "formula",
				"formula": formula.Formula,
			},
		},
	}
}

// extractNamedRanges extracts named ranges from the spreadsheet
func (c *SpreadsheetChunker) extractNamedRanges(data *models.RangeData) []NamedRange {
	// In a real implementation, this would interface with Excel's named range API
	// For now, we'll return an empty slice
	return []NamedRange{}
}

// chunkNamedRange creates a chunk from a named range
func (c *SpreadsheetChunker) chunkNamedRange(nr NamedRange, data *models.RangeData) memory.Chunk {
	return memory.Chunk{
		ID:      fmt.Sprintf("named_range_%s_%s_%s", data.Sheet, nr.Name, uuid.NewString()[:8]),
		Content: fmt.Sprintf("Named Range: %s\nRange: %s\nDescription: %s", nr.Name, nr.Range, nr.Description),
		Metadata: memory.ChunkMetadata{
			Source:    "spreadsheet",
			SourceID:  data.Sheet,
			SheetName: data.Sheet,
			CellRange: nr.Range,
			SourceMeta: map[string]interface{}{
				"type": "named_range",
				"name": nr.Name,
			},
		},
	}
}

// Helper functions

func (c *SpreadsheetChunker) isHeaderRow(data *models.RangeData, row int) bool {
	if row >= len(data.Values) {
		return false
	}

	// Check if row has multiple non-empty cells
	nonEmptyCount := 0
	for _, cell := range data.Values[row] {
		if cell != nil && cell != "" {
			nonEmptyCount++
		}
	}

	// Simple heuristic: at least 3 non-empty cells
	return nonEmptyCount >= 3
}

func (c *SpreadsheetChunker) findTableColumns(data *models.RangeData, headerRow int) (int, int) {
	startCol := -1
	endCol := -1

	for col := 0; col < len(data.Values[headerRow]); col++ {
		if data.Values[headerRow][col] != nil && data.Values[headerRow][col] != "" {
			if startCol == -1 {
				startCol = col
			}
			endCol = col
		}
	}

	return startCol, endCol
}

func (c *SpreadsheetChunker) findTableEnd(data *models.RangeData, startRow, startCol, endCol int) int {
	emptyRows := 0
	for row := startRow + 1; row < len(data.Values); row++ {
		hasData := false
		for col := startCol; col <= endCol && col < len(data.Values[row]); col++ {
			if data.Values[row][col] != nil && data.Values[row][col] != "" {
				hasData = true
				break
			}
		}

		if !hasData {
			emptyRows++
			if emptyRows >= 2 {
				return row - 2
			}
		} else {
			emptyRows = 0
		}
	}

	return len(data.Values) - 1
}

func (c *SpreadsheetChunker) isSummaryRow(data *models.RangeData, row int) bool {
	if row >= len(data.Values) {
		return false
	}

	// Check for keywords like "Total", "Sum", etc.
	summaryKeywords := []string{"total", "sum", "subtotal", "grand total"}
	for _, cell := range data.Values[row] {
		if cell != nil {
			cellLower := strings.ToLower(fmt.Sprintf("%v", cell))
			for _, keyword := range summaryKeywords {
				if strings.Contains(cellLower, keyword) {
					return true
				}
			}
		}
	}

	return false
}

func (c *SpreadsheetChunker) findSectionEnd(data *models.RangeData, startRow int) int {
	// Simple heuristic: find next major section or empty rows
	for row := startRow + 1; row < len(data.Values); row++ {
		if c.isHeaderRow(data, row) {
			return row - 1
		}
	}
	return len(data.Values) - 1
}

func (c *SpreadsheetChunker) findSectionEndCol(data *models.RangeData, row, startCol int) int {
	maxCol := startCol
	for r := row; r < len(data.Values) && r < row+20; r++ {
		for col := startCol; col < len(data.Values[r]); col++ {
			if data.Values[r][col] != nil && data.Values[r][col] != "" && col > maxCol {
				maxCol = col
			}
		}
	}
	return maxCol
}

func (c *SpreadsheetChunker) extractKeyValues(data *models.RangeData, startRow, endRow, startCol, endCol int) []KeyValue {
	kvs := []KeyValue{}

	for row := startRow; row <= endRow && row < len(data.Values); row++ {
		for col := startCol; col <= endCol && col < len(data.Values[row])-1; col++ {
			key := data.Values[row][col]
			if key != nil && key != "" && col+1 < len(data.Values[row]) {
				value := data.Values[row][col+1]
				if value != nil && value != "" && c.looksLikeValue(fmt.Sprintf("%v", value)) {
					kvs = append(kvs, KeyValue{Key: fmt.Sprintf("%v", key), Value: fmt.Sprintf("%v", value)})
				}
			}
		}
	}

	return kvs
}

func (c *SpreadsheetChunker) looksLikeValue(s string) bool {
	// Simple check for numeric values or percentages
	return strings.ContainsAny(s, "0123456789$%")
}

func (c *SpreadsheetChunker) isComplexFormula(formula string) bool {
	if formula == "" {
		return false
	}

	// Complex formulas have multiple functions, references, or are long
	complexIndicators := []string{"IF", "VLOOKUP", "INDEX", "MATCH", "SUMIF", "NPV", "IRR"}
	for _, indicator := range complexIndicators {
		if strings.Contains(strings.ToUpper(formula), indicator) {
			return true
		}
	}

	// Also consider length
	return len(formula) > 50
}

func (c *SpreadsheetChunker) getFormulaContext(data *models.RangeData, row, col int) string {
	context := []string{}

	// Get label from left cell
	if col > 0 && data.Values[row][col-1] != nil && data.Values[row][col-1] != "" {
		context = append(context, fmt.Sprintf("%v", data.Values[row][col-1]))
	}

	// Get header from top
	if row > 0 && col < len(data.Values[0]) && data.Values[0][col] != nil && data.Values[0][col] != "" {
		context = append(context, fmt.Sprintf("%v", data.Values[0][col]))
	}

	return strings.Join(context, " - ")
}

func cellAddress(row, col int) string {
	// Convert to Excel-style address (A1, B2, etc.)
	colName := ""
	for col >= 0 {
		colName = string(rune('A'+col%26)) + colName
		col = col/26 - 1
	}
	return fmt.Sprintf("%s%d", colName, row+1)
}

// Helper types
type TableRegion struct {
	HeaderRow int
	StartRow  int
	EndRow    int
	StartCol  int
	EndCol    int
}

type FinancialSection struct {
	Type     string
	Title    string
	StartRow int
	EndRow   int
	StartCol int
	EndCol   int
}

type FormulaRegion struct {
	Row     int
	Col     int
	Formula string
	Value   string
}

type NamedRange struct {
	Name        string
	Range       string
	Description string
}

type KeyValue struct {
	Key   string
	Value string
}

// createSheetOverview creates an overview chunk for the entire sheet
func (c *SpreadsheetChunker) createSheetOverview(sheet *models.Sheet) memory.Chunk {
	var content strings.Builder
	
	content.WriteString(fmt.Sprintf("Spreadsheet: %s\n", sheet.Name))
	content.WriteString(fmt.Sprintf("Used Range: %s\n", sheet.UsedRange))
	
	// Count non-empty cells and formulas
	nonEmptyCount := 0
	formulaCount := 0
	
	if sheet.Data != nil && sheet.Data.Values != nil {
		for _, row := range sheet.Data.Values {
			for _, cell := range row {
				if cell != nil && cell != "" {
					nonEmptyCount++
				}
			}
		}
	}
	
	if sheet.Data != nil && sheet.Data.Formulas != nil {
		for _, row := range sheet.Data.Formulas {
			for _, formula := range row {
				if formula != "" {
					formulaCount++
				}
			}
		}
	}
	
	content.WriteString(fmt.Sprintf("Non-empty cells: %d\n", nonEmptyCount))
	content.WriteString(fmt.Sprintf("Formulas: %d\n", formulaCount))
	
	if sheet.IsActive {
		content.WriteString("Status: Active Sheet\n")
	}
	
	return memory.Chunk{
		ID:      fmt.Sprintf("overview_%s_%s", sheet.Name, uuid.NewString()[:8]),
		Content: content.String(),
		Metadata: memory.ChunkMetadata{
			Source:    "spreadsheet",
			SourceID:  sheet.Name,
			SheetName: sheet.Name,
			SourceMeta: map[string]interface{}{
				"type": "overview",
			},
		},
	}
}