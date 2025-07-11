package formula

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	
	"github.com/sirupsen/logrus"
)

// FormulaIntelligence provides formula validation and improvement suggestions
type FormulaIntelligence struct {
	logger *logrus.Logger
}

// NewFormulaIntelligence creates a new formula intelligence service
func NewFormulaIntelligence(logger *logrus.Logger) *FormulaIntelligence {
	return &FormulaIntelligence{
		logger: logger,
	}
}

// FormulaError represents an error found in a formula
type FormulaError struct {
	Type        string `json:"type"`
	Severity    string `json:"severity"` // "error", "warning", "info"
	Message     string `json:"message"`
	Position    int    `json:"position,omitempty"`
	Suggestion  string `json:"suggestion,omitempty"`
}

// ValidationResult contains the results of formula validation
type ValidationResult struct {
	IsValid bool            `json:"is_valid"`
	Errors  []FormulaError  `json:"errors"`
	Formula string          `json:"formula"`
}

// DetectErrors analyzes a formula for common errors
func (fi *FormulaIntelligence) DetectErrors(ctx context.Context, formula string) (*ValidationResult, error) {
	result := &ValidationResult{
		Formula: formula,
		IsValid: true,
		Errors:  []FormulaError{},
	}
	
	// Trim and check if formula starts with =
	formula = strings.TrimSpace(formula)
	if !strings.HasPrefix(formula, "=") {
		result.Errors = append(result.Errors, FormulaError{
			Type:       "missing_equals",
			Severity:   "error",
			Message:    "Formula must start with '='",
			Suggestion: "Add '=' at the beginning",
		})
		result.IsValid = false
		return result, nil
	}
	
	// Remove the = sign for analysis
	formulaBody := formula[1:]
	
	// Check for common syntax errors
	fi.checkParenthesesBalance(formulaBody, result)
	fi.checkQuotesBalance(formulaBody, result)
	fi.checkFunctionSyntax(formulaBody, result)
	fi.checkCellReferences(formulaBody, result)
	fi.checkOperators(formulaBody, result)
	fi.checkDivisionByZero(formulaBody, result)
	
	// If any errors were found, mark as invalid
	for _, err := range result.Errors {
		if err.Severity == "error" {
			result.IsValid = false
			break
		}
	}
	
	return result, nil
}

// checkParenthesesBalance checks if parentheses are balanced
func (fi *FormulaIntelligence) checkParenthesesBalance(formula string, result *ValidationResult) {
	openCount := 0
	for i, char := range formula {
		if char == '(' {
			openCount++
		} else if char == ')' {
			openCount--
			if openCount < 0 {
				result.Errors = append(result.Errors, FormulaError{
					Type:       "unmatched_parenthesis",
					Severity:   "error",
					Message:    "Closing parenthesis without matching opening parenthesis",
					Position:   i + 1, // +1 for the removed =
					Suggestion: "Check parentheses balance",
				})
				return
			}
		}
	}
	
	if openCount > 0 {
		result.Errors = append(result.Errors, FormulaError{
			Type:       "unmatched_parenthesis",
			Severity:   "error",
			Message:    fmt.Sprintf("Missing %d closing parenthesis(es)", openCount),
			Suggestion: "Add closing parenthesis(es)",
		})
	}
}

// checkQuotesBalance checks if quotes are balanced
func (fi *FormulaIntelligence) checkQuotesBalance(formula string, result *ValidationResult) {
	quoteCount := 0
	inQuotes := false
	
	for i, char := range formula {
		if char == '"' && (i == 0 || formula[i-1] != '\\') {
			quoteCount++
			inQuotes = !inQuotes
		}
	}
	
	if quoteCount%2 != 0 {
		result.Errors = append(result.Errors, FormulaError{
			Type:       "unmatched_quotes",
			Severity:   "error",
			Message:    "Unmatched quotes in formula",
			Suggestion: "Ensure all text strings are properly quoted",
		})
	}
}

// checkFunctionSyntax checks for common function syntax errors
func (fi *FormulaIntelligence) checkFunctionSyntax(formula string, result *ValidationResult) {
	// Common Excel/Sheets functions
	commonFunctions := []string{
		"SUM", "AVERAGE", "COUNT", "MAX", "MIN", "IF", "VLOOKUP", "HLOOKUP",
		"INDEX", "MATCH", "SUMIF", "COUNTIF", "CONCATENATE", "LEFT", "RIGHT",
		"MID", "TRIM", "UPPER", "LOWER", "DATE", "TODAY", "NOW", "ROUND",
		"ABS", "SQRT", "POWER", "EXP", "LN", "LOG", "LOG10", "PI", "RAND",
	}
	
	// Check for typos in function names
	funcPattern := regexp.MustCompile(`\b([A-Z]+)\s*\(`)
	matches := funcPattern.FindAllStringSubmatch(formula, -1)
	
	for _, match := range matches {
		funcName := match[1]
		found := false
		for _, knownFunc := range commonFunctions {
			if strings.EqualFold(funcName, knownFunc) {
				found = true
				break
			}
		}
		
		if !found {
			// Check for common typos
			suggestion := fi.suggestFunction(funcName, commonFunctions)
			result.Errors = append(result.Errors, FormulaError{
				Type:       "unknown_function",
				Severity:   "warning",
				Message:    fmt.Sprintf("Unknown function: %s", funcName),
				Suggestion: suggestion,
			})
		}
	}
	
	// Check for missing arguments
	if strings.Contains(formula, "()") {
		result.Errors = append(result.Errors, FormulaError{
			Type:       "empty_arguments",
			Severity:   "error",
			Message:    "Function called with empty arguments",
			Suggestion: "Add required arguments to the function",
		})
	}
}

// checkCellReferences validates cell references
func (fi *FormulaIntelligence) checkCellReferences(formula string, result *ValidationResult) {
	// Basic cell reference pattern
	cellPattern := regexp.MustCompile(`\b([A-Z]+)(\d+)\b`)
	matches := cellPattern.FindAllStringSubmatch(formula, -1)
	
	for _, match := range matches {
		col := match[1]
		row := match[2]
		
		// Check for extremely large row numbers (likely errors)
		if len(row) > 7 { // Excel max is 1048576
			result.Errors = append(result.Errors, FormulaError{
				Type:       "invalid_cell_reference",
				Severity:   "error",
				Message:    fmt.Sprintf("Invalid cell reference: %s%s (row number too large)", col, row),
				Suggestion: "Check the row number",
			})
		}
		
		// Check for extremely wide columns (likely errors)
		if len(col) > 3 { // Excel max is XFD
			result.Errors = append(result.Errors, FormulaError{
				Type:       "invalid_cell_reference",
				Severity:   "warning",
				Message:    fmt.Sprintf("Unusual cell reference: %s%s", col, row),
				Suggestion: "Verify the column reference",
			})
		}
	}
	
	// Check for #REF! errors
	if strings.Contains(formula, "#REF!") {
		result.Errors = append(result.Errors, FormulaError{
			Type:       "ref_error",
			Severity:   "error",
			Message:    "Formula contains #REF! error",
			Suggestion: "Fix broken cell references",
		})
	}
}

// checkOperators checks for operator errors
func (fi *FormulaIntelligence) checkOperators(formula string, result *ValidationResult) {
	// Check for double operators
	doubleOpPattern := regexp.MustCompile(`[\+\-\*/]{2,}`)
	if matches := doubleOpPattern.FindAllString(formula, -1); len(matches) > 0 {
		for _, match := range matches {
			if match != "--" { // -- is valid (double negative)
				result.Errors = append(result.Errors, FormulaError{
					Type:       "double_operator",
					Severity:   "error",
					Message:    fmt.Sprintf("Invalid operator sequence: %s", match),
					Suggestion: "Remove duplicate operators",
				})
			}
		}
	}
	
	// Check for operators at the end
	if strings.HasSuffix(strings.TrimSpace(formula), "+") ||
		strings.HasSuffix(strings.TrimSpace(formula), "-") ||
		strings.HasSuffix(strings.TrimSpace(formula), "*") ||
		strings.HasSuffix(strings.TrimSpace(formula), "/") {
		result.Errors = append(result.Errors, FormulaError{
			Type:       "trailing_operator",
			Severity:   "error",
			Message:    "Formula ends with an operator",
			Suggestion: "Add a value after the operator",
		})
	}
}

// checkDivisionByZero checks for potential division by zero
func (fi *FormulaIntelligence) checkDivisionByZero(formula string, result *ValidationResult) {
	// Simple pattern for division by zero
	divByZeroPattern := regexp.MustCompile(`/\s*0\b`)
	if divByZeroPattern.MatchString(formula) {
		result.Errors = append(result.Errors, FormulaError{
			Type:       "division_by_zero",
			Severity:   "error",
			Message:    "Division by zero detected",
			Suggestion: "Use IF or IFERROR to handle division by zero",
		})
	}
	
	// Check for division by empty cells (common error)
	divByCellPattern := regexp.MustCompile(`/\s*([A-Z]+\d+)`)
	matches := divByCellPattern.FindAllStringSubmatch(formula, -1)
	for _, match := range matches {
		cellRef := match[1]
		result.Errors = append(result.Errors, FormulaError{
			Type:       "potential_division_by_zero",
			Severity:   "warning",
			Message:    fmt.Sprintf("Division by cell %s - ensure it's not zero or empty", cellRef),
			Suggestion: fmt.Sprintf("Consider using =IF(%s=0, 0, formula/%s)", cellRef, cellRef),
		})
	}
}

// suggestFunction suggests corrections for misspelled function names
func (fi *FormulaIntelligence) suggestFunction(input string, functions []string) string {
	input = strings.ToUpper(input)
	
	// Common typos mapping
	typoMap := map[string]string{
		"SUMM":     "SUM",
		"AVARAGE":  "AVERAGE",
		"AVERGE":   "AVERAGE",
		"COUT":     "COUNT",
		"CONUT":    "COUNT",
		"CONCATENE": "CONCATENATE",
		"VLOOPUP":  "VLOOKUP",
		"HLOKUP":   "HLOOKUP",
		"INDX":     "INDEX",
		"MACH":     "MATCH",
		"ROUD":     "ROUND",
		"POWR":     "POWER",
	}
	
	if suggestion, ok := typoMap[input]; ok {
		return fmt.Sprintf("Did you mean %s?", suggestion)
	}
	
	// Find similar function names
	for _, fn := range functions {
		if strings.HasPrefix(fn, input[:1]) && len(input) > 2 {
			if strings.Contains(fn, input[:3]) {
				return fmt.Sprintf("Did you mean %s?", fn)
			}
		}
	}
	
	return "Check function spelling"
}