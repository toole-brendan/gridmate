package ai

import (
	"context"
	"fmt"
	"regexp"
	"strings"
)

// EditValidator validates LLM-proposed edits before execution
type EditValidator struct {
	// Formula validation patterns
	formulaPattern     *regexp.Regexp
	cellRefPattern     *regexp.Regexp
	functionPattern    *regexp.Regexp
	dangerousPattern   *regexp.Regexp
}

// EditValidationResult contains the validation results
type EditValidationResult struct {
	IsValid    bool
	Errors     []ValidationError
	Warnings   []ValidationWarning
	Confidence float64
}

// ValidationError represents a validation error
type ValidationError struct {
	Type    string
	Cell    string
	Message string
}

// ValidationWarning represents a validation warning
type ValidationWarning struct {
	Type    string
	Cell    string
	Message string
}

// ProposedEdit represents an edit proposed by the LLM
type ProposedEdit struct {
	Type      string      // "value", "formula", "format", "structure"
	Target    string      // Cell or range address
	Value     interface{} // New value or formula
	OldValue  interface{} // Previous value for validation
	Metadata  map[string]interface{}
}

// NewEditValidator creates a new edit validator
func NewEditValidator() *EditValidator {
	return &EditValidator{
		formulaPattern:   regexp.MustCompile(`^=.+`),
		cellRefPattern:   regexp.MustCompile(`\$?[A-Z]+\$?\d+`),
		functionPattern:  regexp.MustCompile(`[A-Z]+\s*\(`),
		dangerousPattern: regexp.MustCompile(`(?i)(INDIRECT|OFFSET|EVAL|EXECUTE)`),
	}
}

// ValidateEdit validates a proposed edit
func (ev *EditValidator) ValidateEdit(ctx context.Context, edit ProposedEdit, context *FinancialContext) EditValidationResult {
	result := EditValidationResult{
		IsValid:    true,
		Errors:     []ValidationError{},
		Warnings:   []ValidationWarning{},
		Confidence: 1.0,
	}
	
	switch edit.Type {
	case "formula":
		ev.validateFormula(edit, context, &result)
	case "value":
		ev.validateValue(edit, context, &result)
	case "format":
		ev.validateFormat(edit, context, &result)
	case "structure":
		ev.validateStructure(edit, context, &result)
	default:
		result.Errors = append(result.Errors, ValidationError{
			Type:    "invalid_type",
			Cell:    edit.Target,
			Message: fmt.Sprintf("Unknown edit type: %s", edit.Type),
		})
		result.IsValid = false
	}
	
	// Calculate confidence based on errors and warnings
	if len(result.Errors) > 0 {
		result.IsValid = false
		result.Confidence = 0.0
	} else if len(result.Warnings) > 0 {
		result.Confidence = 1.0 - (0.1 * float64(len(result.Warnings)))
		if result.Confidence < 0.5 {
			result.Confidence = 0.5
		}
	}
	
	return result
}

// validateFormula validates formula edits
func (ev *EditValidator) validateFormula(edit ProposedEdit, context *FinancialContext, result *EditValidationResult) {
	formula, ok := edit.Value.(string)
	if !ok {
		result.Errors = append(result.Errors, ValidationError{
			Type:    "type_error",
			Cell:    edit.Target,
			Message: "Formula must be a string",
		})
		return
	}
	
	// Check if it starts with =
	if !ev.formulaPattern.MatchString(formula) {
		result.Errors = append(result.Errors, ValidationError{
			Type:    "formula_syntax",
			Cell:    edit.Target,
			Message: "Formula must start with =",
		})
		return
	}
	
	// Check for dangerous functions
	if ev.dangerousPattern.MatchString(formula) {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Type:    "dangerous_function",
			Cell:    edit.Target,
			Message: "Formula contains potentially dangerous functions",
		})
	}
	
	// Validate cell references
	ev.validateCellReferences(formula, edit.Target, context, result)
	
	// Check for circular references
	ev.checkCircularReferences(formula, edit.Target, context, result)
	
	// Validate function syntax
	ev.validateFunctionSyntax(formula, result)
}

// validateValue validates value edits
func (ev *EditValidator) validateValue(edit ProposedEdit, context *FinancialContext, result *EditValidationResult) {
	// Check if target is valid
	if !ev.isValidCellAddress(edit.Target) && !ev.isValidRange(edit.Target) {
		result.Errors = append(result.Errors, ValidationError{
			Type:    "invalid_target",
			Cell:    edit.Target,
			Message: "Invalid cell or range address",
		})
		return
	}
	
	// Type checking based on context
	if context != nil && context.ModelStructure != nil {
		// Check if we're changing a formula cell to a value
		if ev.isFormulaCell(edit.Target, context) {
			result.Warnings = append(result.Warnings, ValidationWarning{
				Type:    "formula_override",
				Cell:    edit.Target,
				Message: "Overwriting a formula cell with a value",
			})
		}
	}
}

// validateFormat validates format edits
func (ev *EditValidator) validateFormat(edit ProposedEdit, context *FinancialContext, result *EditValidationResult) {
	// Basic format validation
	formatStr, ok := edit.Value.(string)
	if !ok {
		// Could also be a format object
		if _, ok := edit.Value.(map[string]interface{}); !ok {
			result.Errors = append(result.Errors, ValidationError{
				Type:    "type_error",
				Cell:    edit.Target,
				Message: "Format must be a string or object",
			})
		}
		return
	}
	
	// Validate format string patterns
	validFormats := []string{
		"General", "Number", "Currency", "Accounting", "Date", "Time", 
		"Percentage", "Fraction", "Scientific", "Text",
	}
	
	isValid := false
	for _, vf := range validFormats {
		if strings.Contains(formatStr, vf) {
			isValid = true
			break
		}
	}
	
	if !isValid && !strings.Contains(formatStr, "#") && !strings.Contains(formatStr, "0") {
		result.Warnings = append(result.Warnings, ValidationWarning{
			Type:    "unknown_format",
			Cell:    edit.Target,
			Message: "Unrecognized format pattern",
		})
	}
}

// validateStructure validates structural changes
func (ev *EditValidator) validateStructure(edit ProposedEdit, context *FinancialContext, result *EditValidationResult) {
	// Structural changes are more complex and risky
	structureType, ok := edit.Metadata["structureType"].(string)
	if !ok {
		result.Errors = append(result.Errors, ValidationError{
			Type:    "metadata_error",
			Cell:    edit.Target,
			Message: "Structure type not specified",
		})
		return
	}
	
	switch structureType {
	case "insert_row", "insert_column":
		// Check if this would break references
		result.Warnings = append(result.Warnings, ValidationWarning{
			Type:    "structure_change",
			Cell:    edit.Target,
			Message: "Structural changes may affect formulas",
		})
		
	case "delete_row", "delete_column":
		// More dangerous - check for data loss
		result.Warnings = append(result.Warnings, ValidationWarning{
			Type:    "data_loss",
			Cell:    edit.Target,
			Message: "Deletion may cause data loss",
		})
		
	case "merge_cells":
		// Check if cells contain data
		result.Warnings = append(result.Warnings, ValidationWarning{
			Type:    "merge_warning",
			Cell:    edit.Target,
			Message: "Merging cells may lose data",
		})
	}
}

// Helper methods

func (ev *EditValidator) validateCellReferences(formula, targetCell string, context *FinancialContext, result *EditValidationResult) {
	refs := ev.cellRefPattern.FindAllString(formula, -1)
	
	for _, ref := range refs {
		// Check if reference is within sheet bounds
		if context != nil {
			// Simple validation - can be enhanced
			if !ev.isWithinBounds(ref, context) {
				result.Warnings = append(result.Warnings, ValidationWarning{
					Type:    "out_of_bounds",
					Cell:    targetCell,
					Message: fmt.Sprintf("Reference %s may be out of bounds", ref),
				})
			}
		}
	}
}

func (ev *EditValidator) checkCircularReferences(formula, targetCell string, context *FinancialContext, result *EditValidationResult) {
	// Simple check - see if formula references its own cell
	if strings.Contains(formula, targetCell) {
		result.Errors = append(result.Errors, ValidationError{
			Type:    "circular_reference",
			Cell:    targetCell,
			Message: "Formula creates a circular reference",
		})
		return
	}
	
	// More complex circular reference detection would require
	// building a dependency graph
}

func (ev *EditValidator) validateFunctionSyntax(formula string, result *EditValidationResult) {
	// Count parentheses
	openCount := strings.Count(formula, "(")
	closeCount := strings.Count(formula, ")")
	
	if openCount != closeCount {
		result.Errors = append(result.Errors, ValidationError{
			Type:    "syntax_error",
			Cell:    "",
			Message: "Mismatched parentheses in formula",
		})
	}
	
	// Check for empty function calls
	if strings.Contains(formula, "()") {
		functions := ev.functionPattern.FindAllString(formula, -1)
		for _, fn := range functions {
			if strings.HasSuffix(fn, "(") {
				// Check if this function requires arguments
				fnName := strings.TrimSuffix(fn, "(")
				if ev.requiresArguments(fnName) {
					result.Warnings = append(result.Warnings, ValidationWarning{
						Type:    "missing_arguments",
						Cell:    "",
						Message: fmt.Sprintf("Function %s may require arguments", fnName),
					})
				}
			}
		}
	}
}

func (ev *EditValidator) isValidCellAddress(address string) bool {
	pattern := regexp.MustCompile(`^[A-Z]+\d+$`)
	return pattern.MatchString(address)
}

func (ev *EditValidator) isValidRange(address string) bool {
	pattern := regexp.MustCompile(`^[A-Z]+\d+:[A-Z]+\d+$`)
	return pattern.MatchString(address)
}

func (ev *EditValidator) isFormulaCell(address string, context *FinancialContext) bool {
	// Check if the cell contains a formula in the current context
	// Check if the address has a formula in the context
	if context.Formulas != nil {
		if formula, exists := context.Formulas[address]; exists && formula != "" {
			return true
		}
	}
	return false
}

func (ev *EditValidator) isWithinBounds(cellRef string, context *FinancialContext) bool {
	// Simple bounds checking - can be enhanced
	// For now, just return true if we have an active range
	// For now, always return true as we don't have sheet bounds info
	return true
}

func (ev *EditValidator) requiresArguments(functionName string) bool {
	// List of functions that require arguments
	functionsWithArgs := []string{
		"SUM", "AVERAGE", "COUNT", "MAX", "MIN", "IF", "VLOOKUP",
		"HLOOKUP", "INDEX", "MATCH", "SUMIF", "COUNTIF",
	}
	
	for _, fn := range functionsWithArgs {
		if strings.EqualFold(functionName, fn) {
			return true
		}
	}
	
	return false
}