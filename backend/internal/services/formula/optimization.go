package formula

import (
	"context"
	"fmt"
	"regexp"
	"strings"
)

// OptimizationSuggestion represents a formula optimization suggestion
type OptimizationSuggestion struct {
	Type           string `json:"type"`
	Severity       string `json:"severity"` // "performance", "readability", "best_practice"
	Message        string `json:"message"`
	CurrentFormula string `json:"current_formula,omitempty"`
	SuggestedFormula string `json:"suggested_formula,omitempty"`
	Explanation    string `json:"explanation"`
}

// OptimizationResult contains optimization analysis results
type OptimizationResult struct {
	Formula      string                   `json:"formula"`
	Suggestions  []OptimizationSuggestion `json:"suggestions"`
	Score        int                      `json:"score"` // 0-100
}

// AnalyzeForOptimization analyzes a formula for optimization opportunities
func (fi *FormulaIntelligence) AnalyzeForOptimization(ctx context.Context, formula string) (*OptimizationResult, error) {
	result := &OptimizationResult{
		Formula:     formula,
		Suggestions: []OptimizationSuggestion{},
		Score:       100, // Start with perfect score
	}
	
	formulaBody := strings.TrimPrefix(formula, "=")
	
	// Check various optimization opportunities
	fi.checkVolatileFunctions(formulaBody, result)
	fi.checkArrayFormulas(formulaBody, result)
	fi.checkNestedIFs(formulaBody, result)
	fi.checkVLOOKUPOptimization(formulaBody, result)
	fi.checkSUMIFOptimization(formulaBody, result)
	fi.checkRedundantCalculations(formulaBody, result)
	fi.checkHardcodedValues(formulaBody, result)
	
	// Calculate score based on suggestions
	for _, suggestion := range result.Suggestions {
		switch suggestion.Severity {
		case "performance":
			result.Score -= 15
		case "readability":
			result.Score -= 5
		case "best_practice":
			result.Score -= 10
		}
	}
	
	if result.Score < 0 {
		result.Score = 0
	}
	
	return result, nil
}

// checkVolatileFunctions checks for volatile functions that recalculate frequently
func (fi *FormulaIntelligence) checkVolatileFunctions(formula string, result *OptimizationResult) {
	volatileFunctions := map[string]string{
		"NOW":      "Returns current date and time, recalculates on every change",
		"TODAY":    "Returns current date, recalculates on every change",
		"RAND":     "Returns random number, recalculates on every change",
		"RANDBETWEEN": "Returns random number in range, recalculates on every change",
		"OFFSET":   "Can be volatile depending on usage",
		"INDIRECT": "Always recalculates, consider using INDEX instead",
	}
	
	for funcName, description := range volatileFunctions {
		if strings.Contains(strings.ToUpper(formula), funcName+"(") {
			suggestion := OptimizationSuggestion{
				Type:        "volatile_function",
				Severity:    "performance",
				Message:     fmt.Sprintf("Formula contains volatile function %s", funcName),
				Explanation: description,
			}
			
			// Provide specific alternatives
			switch funcName {
			case "NOW", "TODAY":
				suggestion.SuggestedFormula = "Consider using a static timestamp that updates only when needed"
			case "INDIRECT":
				suggestion.SuggestedFormula = "Consider using INDEX/MATCH instead of INDIRECT for better performance"
			case "OFFSET":
				suggestion.SuggestedFormula = "Consider using INDEX for non-volatile alternative"
			}
			
			result.Suggestions = append(result.Suggestions, suggestion)
		}
	}
}

// checkArrayFormulas checks for array formula opportunities
func (fi *FormulaIntelligence) checkArrayFormulas(formula string, result *OptimizationResult) {
	// Check for multiple similar formulas that could be combined
	sumPattern := regexp.MustCompile(`SUM\([A-Z]+\d+:[A-Z]+\d+\)[\+\-\*/]SUM\([A-Z]+\d+:[A-Z]+\d+\)`)
	if sumPattern.MatchString(formula) {
		result.Suggestions = append(result.Suggestions, OptimizationSuggestion{
			Type:             "array_opportunity",
			Severity:         "performance",
			Message:          "Multiple SUM operations could be combined",
			SuggestedFormula: "Consider using SUMPRODUCT or array formulas",
			Explanation:      "Combining operations can improve calculation speed",
		})
	}
}

// checkNestedIFs checks for deeply nested IF statements
func (fi *FormulaIntelligence) checkNestedIFs(formula string, result *OptimizationResult) {
	// Count IF nesting depth
	ifCount := strings.Count(formula, "IF(")
	if ifCount > 3 {
		result.Suggestions = append(result.Suggestions, OptimizationSuggestion{
			Type:             "nested_ifs",
			Severity:         "readability",
			Message:          fmt.Sprintf("Formula contains %d nested IF statements", ifCount),
			SuggestedFormula: "Consider using IFS, SWITCH, or a lookup table",
			Explanation:      "Deeply nested IFs are hard to read and maintain",
		})
	}
}

// checkVLOOKUPOptimization checks for VLOOKUP optimization opportunities
func (fi *FormulaIntelligence) checkVLOOKUPOptimization(formula string, result *OptimizationResult) {
	vlookupPattern := regexp.MustCompile(`VLOOKUP\([^,]+,[^,]+,[^,]+,\s*(TRUE|FALSE|1|0)\)`)
	matches := vlookupPattern.FindAllStringSubmatch(formula, -1)
	
	for _, match := range matches {
		exactMatch := match[1]
		if exactMatch == "TRUE" || exactMatch == "1" {
			result.Suggestions = append(result.Suggestions, OptimizationSuggestion{
				Type:        "vlookup_approximate",
				Severity:    "best_practice",
				Message:     "VLOOKUP using approximate match",
				Explanation: "Ensure data is sorted for approximate match, or use FALSE for exact match",
			})
		}
	}
	
	// Suggest INDEX/MATCH for leftward lookups
	if strings.Contains(formula, "VLOOKUP") {
		result.Suggestions = append(result.Suggestions, OptimizationSuggestion{
			Type:             "vlookup_alternative",
			Severity:         "performance",
			Message:          "Consider INDEX/MATCH instead of VLOOKUP",
			SuggestedFormula: "INDEX(return_range, MATCH(lookup_value, lookup_range, 0))",
			Explanation:      "INDEX/MATCH is more flexible and can be faster for large datasets",
		})
	}
}

// checkSUMIFOptimization checks for SUMIF optimization
func (fi *FormulaIntelligence) checkSUMIFOptimization(formula string, result *OptimizationResult) {
	// Check for multiple SUMIF on same range
	sumifCount := strings.Count(formula, "SUMIF(")
	if sumifCount > 2 {
		result.Suggestions = append(result.Suggestions, OptimizationSuggestion{
			Type:             "multiple_sumif",
			Severity:         "performance",
			Message:          "Multiple SUMIF functions detected",
			SuggestedFormula: "Consider using SUMIFS or SUMPRODUCT for multiple criteria",
			Explanation:      "Combining criteria can reduce calculation time",
		})
	}
}

// checkRedundantCalculations looks for repeated calculations
func (fi *FormulaIntelligence) checkRedundantCalculations(formula string, result *OptimizationResult) {
	// Simple check for repeated subexpressions
	parts := strings.Split(formula, "+")
	seen := make(map[string]bool)
	
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if len(part) > 5 && seen[part] {
			result.Suggestions = append(result.Suggestions, OptimizationSuggestion{
				Type:        "redundant_calculation",
				Severity:    "performance",
				Message:     "Repeated calculation detected",
				Explanation: "Consider calculating once in a helper cell",
			})
			break
		}
		seen[part] = true
	}
}

// checkHardcodedValues checks for hardcoded values that should be parameters
func (fi *FormulaIntelligence) checkHardcodedValues(formula string, result *OptimizationResult) {
	// Look for common financial hardcoded values
	hardcodedPatterns := map[string]string{
		`0\.2[0-9]`:   "Tax rate (20-29%)",
		`0\.3[0-9]`:   "Tax rate (30-39%)",
		`0\.0[5-9]`:   "Interest/discount rate",
		`0\.1[0-9]`:   "Growth rate or margin",
		`1\.0[5-9]`:   "Growth factor",
		`12\b`:        "Months in year",
		`365\b`:       "Days in year",
		`52\b`:        "Weeks in year",
	}
	
	for pattern, description := range hardcodedPatterns {
		re := regexp.MustCompile(pattern)
		if re.MatchString(formula) {
			result.Suggestions = append(result.Suggestions, OptimizationSuggestion{
				Type:        "hardcoded_value",
				Severity:    "best_practice",
				Message:     fmt.Sprintf("Hardcoded value detected: %s", description),
				Explanation: "Consider using named ranges or input cells for parameters",
			})
		}
	}
}