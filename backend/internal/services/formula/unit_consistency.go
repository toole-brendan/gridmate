package formula

import (
	"context"
	"fmt"
	"regexp"
	"strings"
)

// UnitType represents different types of units in financial models
type UnitType string

const (
	UnitCurrency   UnitType = "currency"
	UnitPercentage UnitType = "percentage"
	UnitMultiple   UnitType = "multiple"
	UnitCount      UnitType = "count"
	UnitDays       UnitType = "days"
	UnitYears      UnitType = "years"
	UnitMonths     UnitType = "months"
	UnitUnknown    UnitType = "unknown"
)

// UnitIssue represents a unit consistency issue
type UnitIssue struct {
	Type        string   `json:"type"`
	Severity    string   `json:"severity"`
	Message     string   `json:"message"`
	Location    string   `json:"location,omitempty"`
	Expected    UnitType `json:"expected_unit,omitempty"`
	Found       UnitType `json:"found_unit,omitempty"`
	Suggestion  string   `json:"suggestion"`
}

// UnitConsistencyResult contains unit consistency check results
type UnitConsistencyResult struct {
	Formula string      `json:"formula"`
	Issues  []UnitIssue `json:"issues"`
	IsValid bool        `json:"is_valid"`
}

// CheckUnitConsistency checks for unit consistency in formulas
func (fi *FormulaIntelligence) CheckUnitConsistency(ctx context.Context, formula string, cellContext map[string]interface{}) (*UnitConsistencyResult, error) {
	result := &UnitConsistencyResult{
		Formula: formula,
		Issues:  []UnitIssue{},
		IsValid: true,
	}
	
	formulaBody := strings.TrimPrefix(formula, "=")
	
	// Perform various unit checks
	fi.checkPercentageConsistency(formulaBody, result)
	fi.checkCurrencyOperations(formulaBody, result, cellContext)
	fi.checkTimeUnitConsistency(formulaBody, result)
	fi.checkMultipleConsistency(formulaBody, result)
	fi.checkUnitConversions(formulaBody, result)
	
	// Set validity
	for _, issue := range result.Issues {
		if issue.Severity == "error" {
			result.IsValid = false
			break
		}
	}
	
	return result, nil
}

// checkPercentageConsistency checks for percentage calculation issues
func (fi *FormulaIntelligence) checkPercentageConsistency(formula string, result *UnitConsistencyResult) {
	// Check for percentage calculations
	percentPattern := regexp.MustCompile(`(\d+\.?\d*)\s*%`)
	percentMatches := percentPattern.FindAllString(formula, -1)
	
	if len(percentMatches) > 0 {
		// Check for common percentage errors
		
		// Error 1: Multiplying percentages
		if strings.Count(formula, "%") > 1 && strings.Contains(formula, "*") {
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "percentage_multiplication",
				Severity:   "warning",
				Message:    "Multiplying percentages detected",
				Suggestion: "Ensure percentage calculations are correct (e.g., 10% * 10% = 1%, not 100%)",
			})
		}
		
		// Error 2: Adding percentages to non-percentages without conversion
		if strings.Contains(formula, "%") && strings.Contains(formula, "+") {
			// Simple heuristic - more sophisticated parsing would be needed
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "percentage_addition",
				Severity:   "info",
				Message:    "Adding percentages - verify unit consistency",
				Suggestion: "When adding percentages to values, ensure proper conversion (e.g., Value * (1 + Percentage/100))",
			})
		}
	}
	
	// Check for missing percentage conversions
	if strings.Contains(strings.ToUpper(formula), "RATE") || 
	   strings.Contains(strings.ToUpper(formula), "GROWTH") ||
	   strings.Contains(strings.ToUpper(formula), "MARGIN") {
		if !strings.Contains(formula, "/100") && !strings.Contains(formula, "%") {
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "missing_percentage_conversion",
				Severity:   "warning",
				Message:    "Rate/growth/margin calculation may need percentage conversion",
				Suggestion: "Verify if values need to be divided by 100",
			})
		}
	}
}

// checkCurrencyOperations checks for currency unit consistency
func (fi *FormulaIntelligence) checkCurrencyOperations(formula string, result *UnitConsistencyResult, cellContext map[string]interface{}) {
	// Check for currency indicators
	currencyPattern := regexp.MustCompile(`\$[A-Z]+\d+|\$\d+\.?\d*|USD|EUR|GBP`)
	hasCurrency := currencyPattern.MatchString(formula)
	
	if hasCurrency {
		// Check for division of currency by currency (should result in multiple/ratio)
		divisionPattern := regexp.MustCompile(`\$[A-Z]+\d+\s*/\s*\$[A-Z]+\d+`)
		if divisionPattern.MatchString(formula) {
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "currency_ratio",
				Severity:   "info",
				Message:    "Dividing currency by currency creates a ratio/multiple",
				Expected:   UnitMultiple,
				Found:      UnitCurrency,
				Suggestion: "Result will be a dimensionless ratio, not a currency value",
			})
		}
		
		// Check for multiplying currency by currency (usually wrong)
		multiplyPattern := regexp.MustCompile(`\$[A-Z]+\d+\s*\*\s*\$[A-Z]+\d+`)
		if multiplyPattern.MatchString(formula) {
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "currency_multiplication",
				Severity:   "error",
				Message:    "Multiplying currency by currency is likely an error",
				Suggestion: "Currency should typically be multiplied by counts or percentages, not other currency values",
			})
		}
	}
}

// checkTimeUnitConsistency checks for time unit consistency
func (fi *FormulaIntelligence) checkTimeUnitConsistency(formula string, result *UnitConsistencyResult) {
	// Common time unit patterns
	yearPattern := regexp.MustCompile(`\b(years?|annual|yyyy)\b`)
	monthPattern := regexp.MustCompile(`\b(months?|monthly|mm)\b`)
	dayPattern := regexp.MustCompile(`\b(days?|daily|dd)\b`)
	
	hasYears := yearPattern.MatchString(strings.ToLower(formula))
	hasMonths := monthPattern.MatchString(strings.ToLower(formula))
	hasDays := dayPattern.MatchString(strings.ToLower(formula))
	
	// Check for mixed time units
	unitCount := 0
	if hasYears {
		unitCount++
	}
	if hasMonths {
		unitCount++
	}
	if hasDays {
		unitCount++
	}
	
	if unitCount > 1 {
		result.Issues = append(result.Issues, UnitIssue{
			Type:       "mixed_time_units",
			Severity:   "warning",
			Message:    "Formula contains mixed time units (years/months/days)",
			Suggestion: "Ensure proper conversion factors are applied (e.g., *12 for years to months)",
		})
	}
	
	// Check for common conversion factors
	if hasYears && hasMonths && !strings.Contains(formula, "12") {
		result.Issues = append(result.Issues, UnitIssue{
			Type:       "missing_time_conversion",
			Severity:   "warning",
			Message:    "Years and months present but no 12x conversion factor found",
			Suggestion: "Add *12 or /12 for year-month conversion",
		})
	}
	
	if hasYears && hasDays && !strings.Contains(formula, "365") && !strings.Contains(formula, "360") {
		result.Issues = append(result.Issues, UnitIssue{
			Type:       "missing_time_conversion",
			Severity:   "warning",
			Message:    "Years and days present but no 365/360 conversion factor found",
			Suggestion: "Add *365 (or *360 for financial year) for year-day conversion",
		})
	}
}

// checkMultipleConsistency checks for multiple/ratio consistency
func (fi *FormulaIntelligence) checkMultipleConsistency(formula string, result *UnitConsistencyResult) {
	// Check for EV/EBITDA, P/E type multiples
	multiplePattern := regexp.MustCompile(`(EV|P|Price|Value)\s*/\s*(EBITDA|Earnings|Sales|Revenue)`)
	if multiplePattern.MatchString(formula) {
		// Check if result is being added to currency values
		if strings.Contains(formula, "+") || strings.Contains(formula, "-") {
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "multiple_arithmetic",
				Severity:   "warning",
				Message:    "Adding/subtracting multiples with other values",
				Expected:   UnitMultiple,
				Suggestion: "Multiples (ratios) should not be directly added to currency or count values",
			})
		}
	}
}

// checkUnitConversions checks for proper unit conversions
func (fi *FormulaIntelligence) checkUnitConversions(formula string, result *UnitConsistencyResult) {
	// Check for thousands/millions/billions conversions
	if strings.Contains(strings.ToLower(formula), "thousand") || strings.Contains(formula, "000") {
		if !strings.Contains(formula, "/1000") && !strings.Contains(formula, "*1000") {
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "scale_conversion",
				Severity:   "info",
				Message:    "Reference to thousands but no explicit conversion",
				Suggestion: "Consider adding /1000 or *1000 for clear scale conversion",
			})
		}
	}
	
	if strings.Contains(strings.ToLower(formula), "million") {
		if !strings.Contains(formula, "/1000000") && !strings.Contains(formula, "*1000000") &&
		   !strings.Contains(formula, "/1e6") && !strings.Contains(formula, "*1e6") {
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "scale_conversion",
				Severity:   "info",
				Message:    "Reference to millions but no explicit conversion",
				Suggestion: "Consider adding /1000000 or /1e6 for clear scale conversion",
			})
		}
	}
	
	// Check for basis points
	if strings.Contains(strings.ToLower(formula), "bps") || strings.Contains(strings.ToLower(formula), "basis") {
		if !strings.Contains(formula, "/10000") && !strings.Contains(formula, "*0.0001") {
			result.Issues = append(result.Issues, UnitIssue{
				Type:       "basis_points_conversion",
				Severity:   "warning",
				Message:    "Basis points reference without proper conversion",
				Suggestion: "Basis points need /10000 or *0.0001 for percentage conversion",
			})
		}
	}
}

// InferUnitType attempts to infer the unit type of a cell or expression
func InferUnitType(expression string, context map[string]interface{}) UnitType {
	expr := strings.ToLower(expression)
	
	// Check for percentage
	if strings.Contains(expr, "%") || strings.Contains(expr, "rate") || 
	   strings.Contains(expr, "margin") || strings.Contains(expr, "growth") {
		return UnitPercentage
	}
	
	// Check for currency
	if strings.Contains(expr, "$") || strings.Contains(expr, "revenue") ||
	   strings.Contains(expr, "cost") || strings.Contains(expr, "price") ||
	   strings.Contains(expr, "value") {
		return UnitCurrency
	}
	
	// Check for time units
	if strings.Contains(expr, "days") || strings.Contains(expr, "daily") {
		return UnitDays
	}
	if strings.Contains(expr, "months") || strings.Contains(expr, "monthly") {
		return UnitMonths
	}
	if strings.Contains(expr, "years") || strings.Contains(expr, "annual") {
		return UnitYears
	}
	
	// Check for multiples
	if strings.Contains(expr, "multiple") || strings.Contains(expr, "ratio") ||
	   strings.Contains(expr, "times") || regexp.MustCompile(`\d+x`).MatchString(expr) {
		return UnitMultiple
	}
	
	// Check for counts
	if strings.Contains(expr, "count") || strings.Contains(expr, "number") ||
	   strings.Contains(expr, "quantity") || strings.Contains(expr, "units") {
		return UnitCount
	}
	
	return UnitUnknown
}