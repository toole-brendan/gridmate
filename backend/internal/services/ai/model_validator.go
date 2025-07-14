package ai

import (
	"context"
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
		Errors:  []string{},
		Warnings: []string{},
		Score:   100.0,
		Details: make(map[string]interface{}),
	}

	// Check for basic model structure
	if context.Structure == nil {
		result.Errors = append(result.Errors, "Model structure not available")
		result.IsValid = false
		result.Score -= 20
	}

	// Check for formula issues
	if context.Formulas != nil {
		formulaMap := make(map[string]string)
		
		// Convert formulas to map for validation
		for addr, formula := range context.Formulas {
			if formula != nil {
				if formulaStr, ok := formula.(string); ok && formulaStr != "" {
					formulaMap[addr] = formulaStr
				}
			}
		}

		// Validate formulas
		formulaErrors, err := v.ValidateFormulas(formulaMap)
		if err != nil {
			log.Error().Err(err).Msg("Failed to validate formulas")
			result.Warnings = append(result.Warnings, "Formula validation failed")
			result.Score -= 10
		} else if len(formulaErrors) > 0 {
			result.Errors = append(result.Errors, formulaErrors...)
			result.Score -= float64(len(formulaErrors)) * 5
		}

		// Check circular references
		circularErrors, err := v.CheckCircularReferences(formulaMap)
		if err != nil {
			log.Error().Err(err).Msg("Failed to check circular references")
			result.Warnings = append(result.Warnings, "Circular reference check failed")
			result.Score -= 5
		} else if len(circularErrors) > 0 {
			result.Errors = append(result.Errors, circularErrors...)
			result.IsValid = false
			result.Score -= float64(len(circularErrors)) * 15
		}
	}

	// Check data integrity
	if context.Values == nil {
		result.Warnings = append(result.Warnings, "No cell values available for validation")
		result.Score -= 5
	}

	// Set final validity
	if result.Score < 50 {
		result.IsValid = false
	}

	result.Details["formula_count"] = len(context.Formulas)
	result.Details["structure_available"] = context.Structure != nil
	result.Details["validation_timestamp"] = "now"

	log.Info().
		Bool("is_valid", result.IsValid).
		Float64("score", result.Score).
		Int("errors", len(result.Errors)).
		Int("warnings", len(result.Warnings)).
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