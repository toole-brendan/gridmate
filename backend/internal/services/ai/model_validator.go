package ai

import (
	"fmt"
	"strings"

	"github.com/rs/zerolog/log"
)

// DefaultModelValidator implements the ModelValidator interface
type DefaultModelValidator struct {
	toolExecutor *ToolExecutor
}

// NewDefaultModelValidator creates a new default model validator
func NewDefaultModelValidator(toolExecutor *ToolExecutor) ModelValidator {
	return &DefaultModelValidator{
		toolExecutor: toolExecutor,
	}
}

// ValidateModel validates a comprehensive financial model context
func (v *DefaultModelValidator) ValidateModel(context *ComprehensiveContext) (*ValidationResult, error) {
	log.Info().Msg("Validating financial model")

	result := &ValidationResult{
		IsValid: true,
		Errors:  []CellError{},
		CircularRefs: []string{},
		InconsistentFormulas: []string{},
	}

	// Check for basic model structure
	if context.Structure == nil {
		result.Errors = append(result.Errors, CellError{
			Cell: "Model",
			ErrorType: "structure",
			Message: "Model structure not available",
		})
		result.IsValid = false
	}

	// Check for formula issues
	if context.Formulas != nil {
		formulaMap := make(map[string]string)
		
		// Convert formulas to map for validation
		if context.Formulas.Formulas != nil {
			for i, row := range context.Formulas.Formulas {
				for j, formula := range row {
					if formula != nil {
						if formulaStr, ok := formula.(string); ok && formulaStr != "" {
							cellAddr := fmt.Sprintf("%s%d", string(rune('A'+j)), i+1)
							formulaMap[cellAddr] = formulaStr
						}
					}
				}
			}
		}

		// Validate formulas
		formulaErrors, err := v.ValidateFormulas(formulaMap)
		if err != nil {
			log.Error().Err(err).Msg("Failed to validate formulas")
		} else if len(formulaErrors) > 0 {
			for _, errMsg := range formulaErrors {
				result.Errors = append(result.Errors, CellError{
					Cell: "Formula",
					ErrorType: "formula_error",
					Message: errMsg,
				})
			}
		}

		// Check circular references
		circularErrors, err := v.CheckCircularReferences(formulaMap)
		if err != nil {
			log.Error().Err(err).Msg("Failed to check circular references")
		} else if len(circularErrors) > 0 {
			result.CircularRefs = circularErrors
			result.IsValid = false
		}
	}

	// Set final validity based on errors
	if len(result.Errors) > 0 || len(result.CircularRefs) > 0 {
		result.IsValid = false
	}

	log.Info().
		Bool("is_valid", result.IsValid).
		Int("errors", len(result.Errors)).
		Int("circular_refs", len(result.CircularRefs)).
		Msg("Model validation completed")

	return result, nil
}

// ValidateFormulas validates financial formulas for common issues
func (v *DefaultModelValidator) ValidateFormulas(formulas map[string]string) ([]string, error) {
	var errors []string

	for cellAddr, formula := range formulas {
		// Skip empty formulas
		if formula == "" {
			continue
		}

		// Check for common formula errors
		if strings.Contains(formula, "#DIV/0!") {
			errors = append(errors, "Division by zero error in "+cellAddr)
		}

		if strings.Contains(formula, "#VALUE!") {
			errors = append(errors, "Value error in "+cellAddr)
		}

		if strings.Contains(formula, "#REF!") {
			errors = append(errors, "Reference error in "+cellAddr)
		}

		if strings.Contains(formula, "#NAME?") {
			errors = append(errors, "Name error in "+cellAddr)
		}

		if strings.Contains(formula, "#N/A") {
			errors = append(errors, "Not available error in "+cellAddr)
		}

		// Check for potential division by zero
		if strings.Contains(formula, "/0") || strings.Contains(formula, "/(0)") {
			errors = append(errors, "Potential division by zero in "+cellAddr)
		}

		// Check for unmatched parentheses
		openParens := strings.Count(formula, "(")
		closeParens := strings.Count(formula, ")")
		if openParens != closeParens {
			errors = append(errors, "Unmatched parentheses in "+cellAddr)
		}

		// Financial modeling specific checks
		if strings.Contains(strings.ToUpper(formula), "IRR") && !strings.Contains(formula, "IF") {
			// IRR without proper error checking
			errors = append(errors, "IRR formula without error checking in "+cellAddr)
		}

		if strings.Contains(strings.ToUpper(formula), "NPV") && !strings.Contains(formula, "IF") {
			// NPV without proper error checking
			errors = append(errors, "NPV formula without error checking in "+cellAddr)
		}
	}

	log.Debug().
		Int("formula_count", len(formulas)).
		Int("errors_found", len(errors)).
		Msg("Formula validation completed")

	return errors, nil
}

// CheckCircularReferences checks for circular references in formulas
func (v *DefaultModelValidator) CheckCircularReferences(formulas map[string]string) ([]string, error) {
	var errors []string
	
	// Build dependency graph
	dependencies := make(map[string][]string)
	
	for cellAddr, formula := range formulas {
		dependencies[cellAddr] = v.extractCellReferences(formula)
	}

	// Check each cell for circular references using DFS
	for cellAddr := range formulas {
		if v.hasCircularReference(cellAddr, dependencies, make(map[string]bool), []string{}) {
			errors = append(errors, "Circular reference detected involving "+cellAddr)
		}
	}

	log.Debug().
		Int("formula_count", len(formulas)).
		Int("circular_refs", len(errors)).
		Msg("Circular reference check completed")

	return errors, nil
}

// extractCellReferences extracts cell references from a formula (simplified implementation)
func (v *DefaultModelValidator) extractCellReferences(formula string) []string {
	var refs []string
	
	// Simple regex-like extraction for basic cell references (A1, B2, etc.)
	// This is a simplified implementation - in production, would use a proper formula parser
	words := strings.FieldsFunc(formula, func(c rune) bool {
		return c == '+' || c == '-' || c == '*' || c == '/' || c == '(' || c == ')' || c == ',' || c == ' '
	})
	
	for _, word := range words {
		word = strings.TrimSpace(word)
		if len(word) >= 2 && isColumnLetter(word[0]) && isDigit(word[1:]) {
			refs = append(refs, strings.ToUpper(word))
		}
	}
	
	return refs
}

// hasCircularReference checks if a cell has circular references using DFS
func (v *DefaultModelValidator) hasCircularReference(cellAddr string, dependencies map[string][]string, visited map[string]bool, path []string) bool {
	// Check if we've seen this cell in the current path (circular reference)
	for _, pathCell := range path {
		if pathCell == cellAddr {
			return true
		}
	}
	
	// Check if already visited
	if visited[cellAddr] {
		return false
	}
	
	visited[cellAddr] = true
	newPath := append(path, cellAddr)
	
	// Check all dependencies
	for _, dep := range dependencies[cellAddr] {
		if v.hasCircularReference(dep, dependencies, visited, newPath) {
			return true
		}
	}
	
	return false
}

// Helper functions
func isColumnLetter(c byte) bool {
	return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')
}

func isDigit(s string) bool {
	if s == "" {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}