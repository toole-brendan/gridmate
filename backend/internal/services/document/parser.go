package document

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"regexp"
	"strings"

	"github.com/gridmate/backend/internal/memory"
	// "github.com/pdfcpu/pdfcpu/pkg/api"  // TODO: Re-enable when implementing PDF extraction
	// "github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
)

// DocumentParser interface for parsing different document types
type DocumentParser interface {
	Parse(ctx context.Context, reader io.Reader, filename string) ([]memory.Chunk, error)
	SupportedTypes() []string
}

// PDFParser handles PDF document parsing
type PDFParser struct {
	chunkSize    int
	chunkOverlap int
}

// NewPDFParser creates a new PDF parser
func NewPDFParser() *PDFParser {
	return &PDFParser{
		chunkSize:    300, // ~300 tokens per chunk
		chunkOverlap: 50,  // 50 token overlap
	}
}

// SupportedTypes returns the file types this parser supports
func (p *PDFParser) SupportedTypes() []string {
	return []string{".pdf"}
}

// Parse extracts and chunks PDF content
func (p *PDFParser) Parse(ctx context.Context, reader io.Reader, filename string) ([]memory.Chunk, error) {
	// Extract text from PDF
	text, pageTexts, err := p.extractText(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to extract PDF text: %w", err)
	}

	// Detect document structure
	sections := p.detectSections(text, pageTexts)

	// Chunk the document
	chunks := []memory.Chunk{}

	for _, section := range sections {
		// Smart chunking based on section size
		if len(section.Text) <= p.chunkSize*4 { // Rough token estimate
			// Small section - keep as single chunk
			chunk := memory.Chunk{
				ID:      fmt.Sprintf("%s_section_%s", filename, section.ID),
				Content: p.formatSectionContent(section),
				Metadata: memory.ChunkMetadata{
					Source:       "document",
					SourceID:     filename,
					DocumentName: filename,
					Section:      section.Title,
					PageNumber:   section.StartPage,
					SourceMeta: map[string]interface{}{
						"section_type": section.Type,
						"pages":        fmt.Sprintf("%d-%d", section.StartPage, section.EndPage),
					},
				},
			}
			chunks = append(chunks, chunk)
		} else {
			// Large section - split with overlap
			sectionChunks := p.splitWithOverlap(section.Text, p.chunkSize, p.chunkOverlap)

			for i, chunkText := range sectionChunks {
				chunk := memory.Chunk{
					ID:      fmt.Sprintf("%s_section_%s_part_%d", filename, section.ID, i+1),
					Content: fmt.Sprintf("[%s - Part %d/%d]\n%s", section.Title, i+1, len(sectionChunks), chunkText),
					Metadata: memory.ChunkMetadata{
						Source:       "document",
						SourceID:     filename,
						DocumentName: filename,
						Section:      section.Title,
						PageNumber:   section.StartPage + i, // Approximate page
						SourceMeta: map[string]interface{}{
							"section_type": section.Type,
							"part":         i + 1,
							"total_parts":  len(sectionChunks),
						},
					},
				}
				chunks = append(chunks, chunk)
			}
		}
	}

	// Also create page-based chunks for content not in sections
	orphanedContent := p.findOrphanedContent(text, sections, pageTexts)
	for pageNum, pageContent := range orphanedContent {
		if len(strings.TrimSpace(pageContent)) > 50 { // Skip nearly empty pages
			chunk := memory.Chunk{
				ID:      fmt.Sprintf("%s_page_%d", filename, pageNum),
				Content: fmt.Sprintf("[Page %d]\n%s", pageNum, pageContent),
				Metadata: memory.ChunkMetadata{
					Source:       "document",
					SourceID:     filename,
					DocumentName: filename,
					PageNumber:   pageNum,
					SourceMeta: map[string]interface{}{
						"type": "page_content",
					},
				},
			}
			chunks = append(chunks, chunk)
		}
	}

	return chunks, nil
}

// extractText extracts text from PDF using pdfcpu
func (p *PDFParser) extractText(reader io.Reader) (string, map[int]string, error) {
	// TODO: Implement actual PDF text extraction
	// pdfcpu requires file-based operations for text extraction
	// For now, return a placeholder
	
	placeholderText := "PDF content extraction not yet implemented"
	pageTexts := map[int]string{
		1: placeholderText,
	}

	return placeholderText, pageTexts, nil
}

// detectSections identifies document structure
func (p *PDFParser) detectSections(fullText string, pageTexts map[int]string) []Section {
	sections := []Section{}

	// Common section patterns for financial documents
	sectionPatterns := []struct {
		Pattern string
		Type    string
	}{
		// 10-K sections
		{"(?i)Item\\s+1\\.\\s+Business", "business_description"},
		{"(?i)Item\\s+1A\\.\\s+Risk\\s+Factors", "risk_factors"},
		{"(?i)Item\\s+7\\.\\s+Management.*Discussion", "md&a"},
		{"(?i)Item\\s+8\\.\\s+Financial\\s+Statements", "financial_statements"},

		// General patterns
		{"(?i)Executive\\s+Summary", "executive_summary"},
		{"(?i)Financial\\s+Highlights", "financial_highlights"},
		{"(?i)Notes\\s+to.*Financial\\s+Statements", "notes"},

		// Numbered sections
		{"^\\d+\\.\\s+[A-Z][A-Za-z\\s]+", "numbered_section"},

		// All caps headers
		{"^[A-Z\\s]{5,}$", "header_section"},
	}

	lines := strings.Split(fullText, "\n")
	currentSection := Section{}
	sectionID := 0

	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		for _, pattern := range sectionPatterns {
			matched, _ := regexp.MatchString(pattern.Pattern, trimmed)
			if matched {
				// Save previous section if exists
				if currentSection.Title != "" {
					currentSection.EndLine = i - 1
					currentSection.Text = p.extractSectionText(lines, currentSection.StartLine, currentSection.EndLine)
					currentSection.EndPage = p.getPageForLine(currentSection.EndLine, len(lines), pageTexts)
					sections = append(sections, currentSection)
				}

				// Start new section
				sectionID++
				currentSection = Section{
					ID:        fmt.Sprintf("section_%d", sectionID),
					Title:     trimmed,
					Type:      pattern.Type,
					StartLine: i,
					StartPage: p.getPageForLine(i, len(lines), pageTexts),
				}
				break
			}
		}
	}

	// Add final section
	if currentSection.Title != "" {
		currentSection.EndLine = len(lines) - 1
		currentSection.Text = p.extractSectionText(lines, currentSection.StartLine, currentSection.EndLine)
		currentSection.EndPage = p.getPageForLine(currentSection.EndLine, len(lines), pageTexts)
		sections = append(sections, currentSection)
	}

	// If no sections detected, create one big section
	if len(sections) == 0 && len(fullText) > 0 {
		sections = append(sections, Section{
			ID:        "section_1",
			Title:     "Document Content",
			Type:      "full_document",
			Text:      fullText,
			StartLine: 0,
			EndLine:   len(lines) - 1,
			StartPage: 1,
			EndPage:   len(pageTexts),
		})
	}

	return sections
}

// splitWithOverlap splits text into overlapping chunks
func (p *PDFParser) splitWithOverlap(text string, chunkSize, overlap int) []string {
	words := strings.Fields(text)
	chunks := []string{}

	// Estimate words per chunk (rough approximation: 1.5 words per token)
	wordsPerChunk := chunkSize * 3 / 2
	overlapWords := overlap * 3 / 2

	for i := 0; i < len(words); i += (wordsPerChunk - overlapWords) {
		end := i + wordsPerChunk
		if end > len(words) {
			end = len(words)
		}

		chunk := strings.Join(words[i:end], " ")
		chunks = append(chunks, chunk)

		// If this was the last chunk, break
		if end >= len(words) {
			break
		}
	}

	return chunks
}

// formatSectionContent formats a section for storage
func (p *PDFParser) formatSectionContent(section Section) string {
	return fmt.Sprintf("%s\n\n%s", section.Title, section.Text)
}

// extractSectionText extracts text for a section
func (p *PDFParser) extractSectionText(lines []string, startLine, endLine int) string {
	if startLine < 0 || endLine >= len(lines) || startLine > endLine {
		return ""
	}

	sectionLines := lines[startLine : endLine+1]
	return strings.Join(sectionLines, "\n")
}

// getPageForLine estimates which page a line is on
func (p *PDFParser) getPageForLine(lineNum, totalLines int, pageTexts map[int]string) int {
	if len(pageTexts) == 1 {
		return 1
	}

	// Simple estimation based on line position
	// In a real implementation, we'd track actual page boundaries
	pagesCount := len(pageTexts)
	linesPerPage := totalLines / pagesCount
	if linesPerPage == 0 {
		linesPerPage = 1
	}

	page := (lineNum / linesPerPage) + 1
	if page > pagesCount {
		page = pagesCount
	}

	return page
}

// findOrphanedContent finds content not included in any section
func (p *PDFParser) findOrphanedContent(fullText string, sections []Section, pageTexts map[int]string) map[int]string {
	orphaned := make(map[int]string)

	// For simplicity, if we have sections, we assume all content is covered
	// In a real implementation, we'd check for gaps between sections
	if len(sections) > 0 {
		return orphaned
	}

	// If no sections, return page texts as orphaned
	return pageTexts
}

// Section represents a document section
type Section struct {
	ID        string
	Title     string
	Type      string
	Text      string
	StartLine int
	EndLine   int
	StartPage int
	EndPage   int
}

// TextDocumentParser handles plain text documents
type TextDocumentParser struct {
	chunkSize    int
	chunkOverlap int
}

// NewTextDocumentParser creates a new text document parser
func NewTextDocumentParser() *TextDocumentParser {
	return &TextDocumentParser{
		chunkSize:    300,
		chunkOverlap: 50,
	}
}

// SupportedTypes returns the file types this parser supports
func (t *TextDocumentParser) SupportedTypes() []string {
	return []string{".txt", ".md", ".text"}
}

// Parse extracts and chunks text document content
func (t *TextDocumentParser) Parse(ctx context.Context, reader io.Reader, filename string) ([]memory.Chunk, error) {
	// Read all text
	scanner := bufio.NewScanner(reader)
	var lines []string
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("failed to read text document: %w", err)
	}

	fullText := strings.Join(lines, "\n")

	// Simple chunking for text documents
	chunks := []memory.Chunk{}
	textChunks := t.splitWithOverlap(fullText, t.chunkSize, t.chunkOverlap)

	for i, chunkText := range textChunks {
		chunk := memory.Chunk{
			ID:      fmt.Sprintf("%s_chunk_%d", filename, i+1),
			Content: chunkText,
			Metadata: memory.ChunkMetadata{
				Source:       "document",
				SourceID:     filename,
				DocumentName: filename,
				SourceMeta: map[string]interface{}{
					"type":        "text_chunk",
					"chunk_index": i + 1,
					"total_chunks": len(textChunks),
				},
			},
		}
		chunks = append(chunks, chunk)
	}

	return chunks, nil
}

// splitWithOverlap splits text into overlapping chunks
func (t *TextDocumentParser) splitWithOverlap(text string, chunkSize, overlap int) []string {
	// Same implementation as PDFParser
	words := strings.Fields(text)
	chunks := []string{}

	wordsPerChunk := chunkSize * 3 / 2
	overlapWords := overlap * 3 / 2

	for i := 0; i < len(words); i += (wordsPerChunk - overlapWords) {
		end := i + wordsPerChunk
		if end > len(words) {
			end = len(words)
		}

		chunk := strings.Join(words[i:end], " ")
		chunks = append(chunks, chunk)

		if end >= len(words) {
			break
		}
	}

	return chunks
}