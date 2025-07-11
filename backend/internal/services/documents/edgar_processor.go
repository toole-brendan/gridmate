package documents

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// EDGARProcessor handles SEC EDGAR document processing
type EDGARProcessor struct {
	logger *logrus.Logger
}

// NewEDGARProcessor creates a new EDGAR document processor
func NewEDGARProcessor(logger *logrus.Logger) *EDGARProcessor {
	return &EDGARProcessor{
		logger: logger,
	}
}

// DocumentType represents the type of SEC filing
type DocumentType string

const (
	Form10K  DocumentType = "10-K"
	Form10Q  DocumentType = "10-Q"
	Form8K   DocumentType = "8-K"
	FormDEF14A DocumentType = "DEF 14A"
	Form20F  DocumentType = "20-F"
)

// FinancialDocument represents a processed SEC filing
type FinancialDocument struct {
	ID           string                 `json:"id"`
	CIK          string                 `json:"cik"`
	Ticker       string                 `json:"ticker"`
	CompanyName  string                 `json:"company_name"`
	DocumentType DocumentType           `json:"document_type"`
	FilingDate   time.Time              `json:"filing_date"`
	PeriodEnd    time.Time              `json:"period_end"`
	URL          string                 `json:"url"`
	RawContent   string                 `json:"-"` // Don't include in JSON
	Sections     map[string]Section     `json:"sections"`
	Tables       []FinancialTable       `json:"tables"`
	KeyMetrics   map[string]interface{} `json:"key_metrics"`
	ProcessedAt  time.Time              `json:"processed_at"`
}

// Section represents a section of the document
type Section struct {
	Title    string   `json:"title"`
	Content  string   `json:"content"`
	Position int      `json:"position"`
	Chunks   []Chunk  `json:"chunks"`
}

// Chunk represents a semantic chunk of text
type Chunk struct {
	ID       string                 `json:"id"`
	Content  string                 `json:"content"`
	Metadata map[string]interface{} `json:"metadata"`
	Position int                    `json:"position"`
}

// FinancialTable represents extracted financial data tables
type FinancialTable struct {
	ID      string          `json:"id"`
	Title   string          `json:"title"`
	Headers []string        `json:"headers"`
	Rows    [][]string      `json:"rows"`
	Type    string          `json:"type"` // income_statement, balance_sheet, cash_flow
	Period  string          `json:"period"`
	Units   string          `json:"units"`
}

// ProcessDocument processes a raw EDGAR document
func (p *EDGARProcessor) ProcessDocument(ctx context.Context, rawContent string, docType DocumentType) (*FinancialDocument, error) {
	doc := &FinancialDocument{
		ID:           generateDocumentID(),
		DocumentType: docType,
		RawContent:   rawContent,
		Sections:     make(map[string]Section),
		Tables:       []FinancialTable{},
		KeyMetrics:   make(map[string]interface{}),
		ProcessedAt:  time.Now(),
	}

	// Extract metadata
	if err := p.extractMetadata(doc); err != nil {
		p.logger.WithError(err).Warn("Failed to extract metadata")
	}

	// Extract and parse sections based on document type
	switch docType {
	case Form10K, Form20F:
		p.process10K(doc)
	case Form10Q:
		p.process10Q(doc)
	case Form8K:
		p.process8K(doc)
	default:
		p.processGeneric(doc)
	}

	// Extract financial tables
	p.extractFinancialTables(doc)

	// Extract key metrics
	p.extractKeyMetrics(doc)

	// Create semantic chunks for each section
	p.createSemanticChunks(doc)

	return doc, nil
}

// extractMetadata extracts company info and filing metadata
func (p *EDGARProcessor) extractMetadata(doc *FinancialDocument) error {
	// Extract CIK
	cikPattern := regexp.MustCompile(`CENTRAL INDEX KEY:\s*(\d+)`)
	if matches := cikPattern.FindStringSubmatch(doc.RawContent); len(matches) > 1 {
		doc.CIK = matches[1]
	}

	// Extract company name
	namePattern := regexp.MustCompile(`COMPANY CONFORMED NAME:\s*([^\n]+)`)
	if matches := namePattern.FindStringSubmatch(doc.RawContent); len(matches) > 1 {
		doc.CompanyName = strings.TrimSpace(matches[1])
	}

	// Extract filing date
	datePattern := regexp.MustCompile(`FILED AS OF DATE:\s*(\d{8})`)
	if matches := datePattern.FindStringSubmatch(doc.RawContent); len(matches) > 1 {
		if date, err := time.Parse("20060102", matches[1]); err == nil {
			doc.FilingDate = date
		}
	}

	// Extract period of report
	periodPattern := regexp.MustCompile(`CONFORMED PERIOD OF REPORT:\s*(\d{8})`)
	if matches := periodPattern.FindStringSubmatch(doc.RawContent); len(matches) > 1 {
		if date, err := time.Parse("20060102", matches[1]); err == nil {
			doc.PeriodEnd = date
		}
	}

	return nil
}

// process10K extracts sections specific to 10-K filings
func (p *EDGARProcessor) process10K(doc *FinancialDocument) {
	// Standard 10-K sections
	sections := map[string][]string{
		"business": {"Item 1", "Business", "ITEM 1"},
		"risk_factors": {"Item 1A", "Risk Factors", "ITEM 1A"},
		"properties": {"Item 2", "Properties", "ITEM 2"},
		"legal_proceedings": {"Item 3", "Legal Proceedings", "ITEM 3"},
		"market_for_registrant": {"Item 5", "Market for Registrant", "ITEM 5"},
		"selected_financial_data": {"Item 6", "Selected Financial Data", "ITEM 6"},
		"mda": {"Item 7", "Management's Discussion and Analysis", "MD&A", "ITEM 7"},
		"financial_statements": {"Item 8", "Financial Statements", "ITEM 8"},
		"controls_procedures": {"Item 9A", "Controls and Procedures", "ITEM 9A"},
	}

	for sectionKey, patterns := range sections {
		content := p.extractSection(doc.RawContent, patterns)
		if content != "" {
			doc.Sections[sectionKey] = Section{
				Title:    sectionKey,
				Content:  content,
				Position: len(doc.Sections),
			}
		}
	}
}

// process10Q extracts sections specific to 10-Q filings
func (p *EDGARProcessor) process10Q(doc *FinancialDocument) {
	sections := map[string][]string{
		"financial_statements": {"Part I", "Financial Statements", "PART I"},
		"mda": {"Item 2", "Management's Discussion and Analysis", "MD&A"},
		"controls_procedures": {"Item 4", "Controls and Procedures"},
		"legal_proceedings": {"Item 1", "Legal Proceedings"},
		"risk_factors": {"Item 1A", "Risk Factors"},
	}

	for sectionKey, patterns := range sections {
		content := p.extractSection(doc.RawContent, patterns)
		if content != "" {
			doc.Sections[sectionKey] = Section{
				Title:    sectionKey,
				Content:  content,
				Position: len(doc.Sections),
			}
		}
	}
}

// process8K extracts sections specific to 8-K filings
func (p *EDGARProcessor) process8K(doc *FinancialDocument) {
	// 8-K items are event-driven
	content := p.extractSection(doc.RawContent, []string{"Item", "ITEM"})
	if content != "" {
		doc.Sections["events"] = Section{
			Title:    "Reported Events",
			Content:  content,
			Position: 0,
		}
	}
}

// processGeneric handles other document types
func (p *EDGARProcessor) processGeneric(doc *FinancialDocument) {
	// Just create one section with the main content
	doc.Sections["content"] = Section{
		Title:    "Document Content",
		Content:  doc.RawContent,
		Position: 0,
	}
}

// extractSection finds and extracts a section based on patterns
func (p *EDGARProcessor) extractSection(content string, patterns []string) string {
	for _, pattern := range patterns {
		// Create regex to find section start
		startPattern := regexp.MustCompile(`(?i)(^|\n)\s*` + regexp.QuoteMeta(pattern) + `[^\n]*`)
		matches := startPattern.FindStringIndex(content)
		if matches != nil {
			// Find the next item or end of document
			endPattern := regexp.MustCompile(`(?i)\n\s*(Item|ITEM|Part|PART)\s+\d+`)
			remainingContent := content[matches[1]:]
			endMatches := endPattern.FindStringIndex(remainingContent)
			
			if endMatches != nil {
				return remainingContent[:endMatches[0]]
			}
			// If no next section found, take reasonable amount of content
			maxLength := 50000
			if len(remainingContent) > maxLength {
				return remainingContent[:maxLength]
			}
			return remainingContent
		}
	}
	return ""
}

// extractFinancialTables extracts structured financial data
func (p *EDGARProcessor) extractFinancialTables(doc *FinancialDocument) {
	// Look for financial statements in the document
	if financialSection, ok := doc.Sections["financial_statements"]; ok {
		// Extract income statement
		if table := p.extractIncomeStatement(financialSection.Content); table != nil {
			doc.Tables = append(doc.Tables, *table)
		}

		// Extract balance sheet
		if table := p.extractBalanceSheet(financialSection.Content); table != nil {
			doc.Tables = append(doc.Tables, *table)
		}

		// Extract cash flow statement
		if table := p.extractCashFlowStatement(financialSection.Content); table != nil {
			doc.Tables = append(doc.Tables, *table)
		}
	}
}

// extractIncomeStatement extracts income statement data
func (p *EDGARProcessor) extractIncomeStatement(content string) *FinancialTable {
	// Look for income statement indicators
	patterns := []string{
		"INCOME STATEMENT",
		"STATEMENT OF INCOME",
		"STATEMENT OF OPERATIONS",
		"CONSOLIDATED STATEMENTS OF INCOME",
	}

	for _, pattern := range patterns {
		if idx := strings.Index(strings.ToUpper(content), pattern); idx != -1 {
			// Extract table data after the pattern
			tableContent := content[idx:]
			table := p.parseFinancialTable(tableContent, "income_statement")
			if table != nil {
				table.Title = "Income Statement"
				return table
			}
		}
	}
	return nil
}

// extractBalanceSheet extracts balance sheet data
func (p *EDGARProcessor) extractBalanceSheet(content string) *FinancialTable {
	patterns := []string{
		"BALANCE SHEET",
		"STATEMENT OF FINANCIAL POSITION",
		"CONSOLIDATED BALANCE SHEETS",
	}

	for _, pattern := range patterns {
		if idx := strings.Index(strings.ToUpper(content), pattern); idx != -1 {
			tableContent := content[idx:]
			table := p.parseFinancialTable(tableContent, "balance_sheet")
			if table != nil {
				table.Title = "Balance Sheet"
				return table
			}
		}
	}
	return nil
}

// extractCashFlowStatement extracts cash flow statement
func (p *EDGARProcessor) extractCashFlowStatement(content string) *FinancialTable {
	patterns := []string{
		"CASH FLOW",
		"STATEMENT OF CASH FLOWS",
		"CONSOLIDATED STATEMENTS OF CASH FLOWS",
	}

	for _, pattern := range patterns {
		if idx := strings.Index(strings.ToUpper(content), pattern); idx != -1 {
			tableContent := content[idx:]
			table := p.parseFinancialTable(tableContent, "cash_flow")
			if table != nil {
				table.Title = "Cash Flow Statement"
				return table
			}
		}
	}
	return nil
}

// parseFinancialTable attempts to parse tabular financial data
func (p *EDGARProcessor) parseFinancialTable(content string, tableType string) *FinancialTable {
	// This is a simplified parser - in production you'd want more sophisticated table extraction
	table := &FinancialTable{
		ID:   generateTableID(),
		Type: tableType,
	}

	// Look for units (millions, thousands, etc.)
	unitsPattern := regexp.MustCompile(`(?i)\(in\s+(thousands|millions|billions)`)
	if matches := unitsPattern.FindStringSubmatch(content); len(matches) > 1 {
		table.Units = matches[1]
	}

	// Extract lines that look like financial data
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		// Skip empty lines
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Look for year headers (e.g., "2023  2022  2021")
		yearPattern := regexp.MustCompile(`\b(19|20)\d{2}\b`)
		if years := yearPattern.FindAllString(line, -1); len(years) >= 2 {
			table.Headers = append([]string{"Item"}, years...)
			continue
		}

		// Look for financial line items with numbers
		if containsFinancialLineItem(line) && containsNumbers(line) {
			row := parseFinancialRow(line)
			if len(row) > 0 {
				table.Rows = append(table.Rows, row)
			}
		}

		// Stop after reasonable number of rows
		if len(table.Rows) > 50 || i > 200 {
			break
		}
	}

	// Only return table if we found meaningful data
	if len(table.Headers) > 0 && len(table.Rows) > 3 {
		return table
	}
	return nil
}

// extractKeyMetrics extracts important financial metrics
func (p *EDGARProcessor) extractKeyMetrics(doc *FinancialDocument) {
	metrics := make(map[string]interface{})

	// Extract revenue
	revenuePattern := regexp.MustCompile(`(?i)(revenue|net sales|total sales)[^\d]*\$?\s*([\d,]+)`)
	if matches := revenuePattern.FindStringSubmatch(doc.RawContent); len(matches) > 2 {
		metrics["revenue"] = cleanNumber(matches[2])
	}

	// Extract net income
	netIncomePattern := regexp.MustCompile(`(?i)net income[^\d]*\$?\s*([\d,]+)`)
	if matches := netIncomePattern.FindStringSubmatch(doc.RawContent); len(matches) > 1 {
		metrics["net_income"] = cleanNumber(matches[1])
	}

	// Extract EPS
	epsPattern := regexp.MustCompile(`(?i)earnings per share[^\d]*\$?\s*([\d.]+)`)
	if matches := epsPattern.FindStringSubmatch(doc.RawContent); len(matches) > 1 {
		metrics["eps"] = matches[1]
	}

	// Extract total assets
	assetsPattern := regexp.MustCompile(`(?i)total assets[^\d]*\$?\s*([\d,]+)`)
	if matches := assetsPattern.FindStringSubmatch(doc.RawContent); len(matches) > 1 {
		metrics["total_assets"] = cleanNumber(matches[1])
	}

	// Extract total liabilities
	liabilitiesPattern := regexp.MustCompile(`(?i)total liabilities[^\d]*\$?\s*([\d,]+)`)
	if matches := liabilitiesPattern.FindStringSubmatch(doc.RawContent); len(matches) > 1 {
		metrics["total_liabilities"] = cleanNumber(matches[1])
	}

	doc.KeyMetrics = metrics
}

// createSemanticChunks creates semantic chunks for vector storage
func (p *EDGARProcessor) createSemanticChunks(doc *FinancialDocument) {
	for sectionKey, section := range doc.Sections {
		chunks := p.chunkSection(section.Content, 1000) // 1000 chars per chunk
		
		for i, chunkContent := range chunks {
			chunk := Chunk{
				ID:       fmt.Sprintf("%s_%s_%d", doc.ID, sectionKey, i),
				Content:  chunkContent,
				Position: i,
				Metadata: map[string]interface{}{
					"document_id":   doc.ID,
					"document_type": doc.DocumentType,
					"section":       sectionKey,
					"company":       doc.CompanyName,
					"filing_date":   doc.FilingDate,
					"period_end":    doc.PeriodEnd,
				},
			}
			section.Chunks = append(section.Chunks, chunk)
		}
		
		doc.Sections[sectionKey] = section
	}
}

// chunkSection splits content into semantic chunks
func (p *EDGARProcessor) chunkSection(content string, maxChunkSize int) []string {
	var chunks []string
	
	// Split by paragraphs first
	paragraphs := strings.Split(content, "\n\n")
	
	currentChunk := ""
	for _, para := range paragraphs {
		para = strings.TrimSpace(para)
		if para == "" {
			continue
		}
		
		// If adding this paragraph would exceed max size, start new chunk
		if len(currentChunk)+len(para)+2 > maxChunkSize && currentChunk != "" {
			chunks = append(chunks, currentChunk)
			currentChunk = para
		} else {
			if currentChunk != "" {
				currentChunk += "\n\n"
			}
			currentChunk += para
		}
	}
	
	// Add remaining content
	if currentChunk != "" {
		chunks = append(chunks, currentChunk)
	}
	
	return chunks
}

// Helper functions

func generateDocumentID() string {
	return fmt.Sprintf("doc_%d", time.Now().UnixNano())
}

func generateTableID() string {
	return fmt.Sprintf("table_%d", time.Now().UnixNano())
}

func cleanNumber(s string) string {
	return strings.ReplaceAll(s, ",", "")
}

func containsFinancialLineItem(line string) bool {
	lineItems := []string{
		"revenue", "sales", "income", "expense", "cost", "asset", "liability",
		"equity", "cash", "debt", "ebitda", "depreciation", "amortization",
		"interest", "tax", "earnings", "margin", "working capital",
	}
	
	lowerLine := strings.ToLower(line)
	for _, item := range lineItems {
		if strings.Contains(lowerLine, item) {
			return true
		}
	}
	return false
}

func containsNumbers(line string) bool {
	return regexp.MustCompile(`\d`).MatchString(line)
}

func parseFinancialRow(line string) []string {
	// Simple parsing - split by multiple spaces or tabs
	fields := regexp.MustCompile(`\s{2,}|\t+`).Split(line, -1)
	
	var row []string
	for _, field := range fields {
		field = strings.TrimSpace(field)
		if field != "" {
			row = append(row, field)
		}
	}
	
	return row
}