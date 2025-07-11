package formula

import (
	"context"
	"fmt"
	"regexp"
	"strings"
)

// CrossReferenceIssue represents an issue found during cross-reference validation
type CrossReferenceIssue struct {
	Type        string   `json:"type"`
	Severity    string   `json:"severity"`
	Message     string   `json:"message"`
	References  []string `json:"references"`
	Suggestion  string   `json:"suggestion,omitempty"`
}

// CrossReferenceResult contains the results of cross-reference validation
type CrossReferenceResult struct {
	Formula    string                 `json:"formula"`
	Issues     []CrossReferenceIssue  `json:"issues"`
	IsValid    bool                   `json:"is_valid"`
	References []CellReference        `json:"references"`
}

// CellReference represents a cell or range reference in a formula
type CellReference struct {
	Reference   string `json:"reference"`
	Type        string `json:"type"` // "cell", "range", "named_range", "sheet_reference"
	Sheet       string `json:"sheet,omitempty"`
	StartCell   string `json:"start_cell,omitempty"`
	EndCell     string `json:"end_cell,omitempty"`
}

// ValidateCrossReferences validates all cell references in a formula
func (fi *FormulaIntelligence) ValidateCrossReferences(ctx context.Context, formula string, sheetContext map[string]interface{}) (*CrossReferenceResult, error) {
	result := &CrossReferenceResult{
		Formula:    formula,
		Issues:     []CrossReferenceIssue{},
		IsValid:    true,
		References: []CellReference{},
	}
	
	formulaBody := strings.TrimPrefix(formula, "=")
	
	// Extract all references
	fi.extractReferences(formulaBody, result)
	
	// Validate references
	fi.validateRangeConsistency(result)
	fi.validateSheetReferences(result, sheetContext)
	fi.checkMixedReferences(formulaBody, result)
	fi.checkCrossSheetReferences(result)
	fi.checkNamedRanges(formulaBody, result, sheetContext)
	
	// Set validity based on issues
	for _, issue := range result.Issues {
		if issue.Severity == "error" {
			result.IsValid = false
			break
		}
	}
	
	return result, nil
}

// extractReferences extracts all cell references from a formula
func (fi *FormulaIntelligence) extractReferences(formula string, result *CrossReferenceResult) {
	// Pattern for sheet references
	sheetRefPattern := regexp.MustCompile(`'?([^'!]+)'?!([A-Z]+\d+(?::[A-Z]+\d+)?)`)
	
	// Pattern for regular cell references
	cellRefPattern := regexp.MustCompile(`\b([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?\b`)
	
	// Extract sheet references first
	sheetMatches := sheetRefPattern.FindAllStringSubmatch(formula, -1)
	for _, match := range sheetMatches {
		sheet := match[1]
		ref := match[2]
		
		if strings.Contains(ref, ":") {
			// Range reference
			parts := strings.Split(ref, ":")
			result.References = append(result.References, CellReference{
				Reference: match[0],
				Type:      "sheet_reference",
				Sheet:     sheet,
				StartCell: parts[0],
				EndCell:   parts[1],
			})
		} else {
			// Single cell reference
			result.References = append(result.References, CellReference{
				Reference: match[0],
				Type:      "sheet_reference",
				Sheet:     sheet,
				StartCell: ref,
			})
		}
	}
	
	// Remove sheet references from formula to avoid double-counting
	cleanFormula := sheetRefPattern.ReplaceAllString(formula, "")
	
	// Extract regular cell references
	cellMatches := cellRefPattern.FindAllStringSubmatch(cleanFormula, -1)
	for _, match := range cellMatches {
		if match[3] != "" {
			// Range reference
			result.References = append(result.References, CellReference{
				Reference: match[0],
				Type:      "range",
				StartCell: match[1] + match[2],
				EndCell:   match[3] + match[4],
			})
		} else {
			// Single cell reference
			result.References = append(result.References, CellReference{
				Reference: match[0],
				Type:      "cell",
				StartCell: match[1] + match[2],
			})
		}
	}
}

// validateRangeConsistency checks if ranges are consistent
func (fi *FormulaIntelligence) validateRangeConsistency(result *CrossReferenceResult) {
	for _, ref := range result.References {
		if ref.Type == "range" || (ref.Type == "sheet_reference" && ref.EndCell != "") {
			// Check if range is valid (start cell should be before or equal to end cell)
			if ref.StartCell != "" && ref.EndCell != "" {
				startCol, startRow := parseCell(ref.StartCell)
				endCol, endRow := parseCell(ref.EndCell)
				
				if startCol > endCol || startRow > endRow {
					result.Issues = append(result.Issues, CrossReferenceIssue{
						Type:       "invalid_range",
						Severity:   "error",
						Message:    fmt.Sprintf("Invalid range: %s (start cell after end cell)", ref.Reference),
						References: []string{ref.Reference},
						Suggestion: "Ensure range starts from top-left to bottom-right",
					})
				}
				
				// Warn about very large ranges
				if (endRow-startRow > 10000) || (endCol-startCol > 100) {
					result.Issues = append(result.Issues, CrossReferenceIssue{
						Type:       "large_range",
						Severity:   "warning",
						Message:    fmt.Sprintf("Very large range detected: %s", ref.Reference),
						References: []string{ref.Reference},
						Suggestion: "Consider if you need all cells in this range",
					})
				}
			}
		}
	}
}

// validateSheetReferences validates sheet references
func (fi *FormulaIntelligence) validateSheetReferences(result *CrossReferenceResult, sheetContext map[string]interface{}) {
	if sheetContext == nil {
		return
	}
	
	availableSheets, ok := sheetContext["available_sheets"].([]string)
	if !ok {
		return
	}
	
	for _, ref := range result.References {
		if ref.Type == "sheet_reference" && ref.Sheet != "" {
			found := false
			for _, sheet := range availableSheets {
				if strings.EqualFold(sheet, ref.Sheet) {
					found = true
					break
				}
			}
			
			if !found {
				result.Issues = append(result.Issues, CrossReferenceIssue{
					Type:       "unknown_sheet",
					Severity:   "error",
					Message:    fmt.Sprintf("Reference to unknown sheet: %s", ref.Sheet),
					References: []string{ref.Reference},
					Suggestion: "Check sheet name spelling",
				})
			}
		}
	}
}

// checkMixedReferences checks for mixed absolute/relative references
func (fi *FormulaIntelligence) checkMixedReferences(formula string, result *CrossReferenceResult) {
	// Pattern for absolute references
	absolutePattern := regexp.MustCompile(`\$[A-Z]+\$\d+`)
	mixedPattern1 := regexp.MustCompile(`\$[A-Z]+\d+`)
	mixedPattern2 := regexp.MustCompile(`[A-Z]+\$\d+`)
	
	hasAbsolute := absolutePattern.MatchString(formula)
	hasMixed1 := mixedPattern1.MatchString(formula)
	hasMixed2 := mixedPattern2.MatchString(formula)
	
	if (hasAbsolute || hasMixed1 || hasMixed2) && len(result.References) > 0 {
		// Check if mixing absolute and relative references
		hasRelative := false
		for _, ref := range result.References {
			if !strings.Contains(ref.Reference, "$") {
				hasRelative = true
				break
			}
		}
		
		if hasRelative && (hasAbsolute || hasMixed1 || hasMixed2) {
			result.Issues = append(result.Issues, CrossReferenceIssue{
				Type:       "mixed_reference_style",
				Severity:   "info",
				Message:    "Formula mixes absolute and relative references",
				Suggestion: "Consider consistent reference style for clarity",
			})
		}
	}
}

// checkCrossSheetReferences checks for excessive cross-sheet references
func (fi *FormulaIntelligence) checkCrossSheetReferences(result *CrossReferenceResult) {
	sheetRefs := 0
	uniqueSheets := make(map[string]bool)
	
	for _, ref := range result.References {
		if ref.Type == "sheet_reference" {
			sheetRefs++
			uniqueSheets[ref.Sheet] = true
		}
	}
	
	if sheetRefs > 10 {
		result.Issues = append(result.Issues, CrossReferenceIssue{
			Type:       "excessive_cross_sheet",
			Severity:   "warning",
			Message:    fmt.Sprintf("Formula references %d cells across %d sheets", sheetRefs, len(uniqueSheets)),
			Suggestion: "Consider consolidating data or using helper cells",
		})
	}
}

// checkNamedRanges checks for named range usage
func (fi *FormulaIntelligence) checkNamedRanges(formula string, result *CrossReferenceResult, sheetContext map[string]interface{}) {
	// Look for potential named ranges (uppercase words not followed by parentheses)
	namedRangePattern := regexp.MustCompile(`\b([A-Z_][A-Z0-9_]+)\b(?!\s*\()`)
	matches := namedRangePattern.FindAllStringSubmatch(formula, -1)
	
	for _, match := range matches {
		potentialName := match[1]
		// Skip if it's a cell reference
		if isCellReference(potentialName) {
			continue
		}
		
		// Check if it's a known named range
		if sheetContext != nil {
			if namedRanges, ok := sheetContext["named_ranges"].([]string); ok {
				found := false
				for _, name := range namedRanges {
					if name == potentialName {
						found = true
						result.References = append(result.References, CellReference{
							Reference: potentialName,
							Type:      "named_range",
						})
						break
					}
				}
				
				if !found {
					result.Issues = append(result.Issues, CrossReferenceIssue{
						Type:       "unknown_named_range",
						Severity:   "warning",
						Message:    fmt.Sprintf("Possible unknown named range: %s", potentialName),
						References: []string{potentialName},
						Suggestion: "Verify this is a valid named range",
					})
				}
			}
		}
	}
}

// Helper functions

func parseCell(cell string) (col int, row int) {
	re := regexp.MustCompile(`([A-Z]+)(\d+)`)
	matches := re.FindStringSubmatch(cell)
	if len(matches) != 3 {
		return 0, 0
	}
	
	// Convert column letters to number
	colStr := matches[1]
	col = 0
	for i := 0; i < len(colStr); i++ {
		col = col*26 + int(colStr[i]-'A'+1)
	}
	
	// Parse row number
	fmt.Sscanf(matches[2], "%d", &row)
	return col, row
}

func isCellReference(str string) bool {
	cellPattern := regexp.MustCompile(`^[A-Z]+\d+$`)
	return cellPattern.MatchString(str)
}