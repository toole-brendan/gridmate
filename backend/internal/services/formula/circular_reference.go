package formula

import (
	"context"
	"fmt"
	"regexp"
	"strings"
)

// CircularReferenceResult contains circular reference detection results
type CircularReferenceResult struct {
	HasCircularReference bool                `json:"has_circular_reference"`
	Cycles               [][]string          `json:"cycles"`
	Warnings             []string            `json:"warnings"`
	DependencyGraph      map[string][]string `json:"dependency_graph"`
}

// DependencyNode represents a cell and its dependencies
type DependencyNode struct {
	Cell         string
	Dependencies []string
	Formula      string
}

// CheckCircularReferences detects circular references in a set of formulas
func (fi *FormulaIntelligence) CheckCircularReferences(ctx context.Context, formulas map[string]string) (*CircularReferenceResult, error) {
	result := &CircularReferenceResult{
		HasCircularReference: false,
		Cycles:               [][]string{},
		Warnings:             []string{},
		DependencyGraph:      make(map[string][]string),
	}
	
	// Build dependency graph
	for cell, formula := range formulas {
		deps := fi.extractDependencies(formula)
		result.DependencyGraph[cell] = deps
	}
	
	// Check for cycles using DFS
	visited := make(map[string]bool)
	recursionStack := make(map[string]bool)
	path := []string{}
	
	for cell := range formulas {
		if !visited[cell] {
			if fi.hasCycleDFS(cell, visited, recursionStack, result.DependencyGraph, &path, result) {
				result.HasCircularReference = true
			}
		}
	}
	
	// Additional checks
	fi.checkIndirectCircularReferences(result)
	fi.checkIterativeCalculations(formulas, result)
	
	return result, nil
}

// extractDependencies extracts cell dependencies from a formula
func (fi *FormulaIntelligence) extractDependencies(formula string) []string {
	deps := []string{}
	seen := make(map[string]bool)
	
	formulaBody := strings.TrimPrefix(formula, "=")
	
	// Extract cell references
	cellRefs := extractAllCellReferences(formulaBody)
	for _, ref := range cellRefs {
		if !seen[ref] {
			deps = append(deps, ref)
			seen[ref] = true
		}
	}
	
	return deps
}

// hasCycleDFS performs depth-first search to detect cycles
func (fi *FormulaIntelligence) hasCycleDFS(
	cell string,
	visited map[string]bool,
	recursionStack map[string]bool,
	graph map[string][]string,
	path *[]string,
	result *CircularReferenceResult,
) bool {
	visited[cell] = true
	recursionStack[cell] = true
	*path = append(*path, cell)
	
	// Check all dependencies
	for _, dep := range graph[cell] {
		if !visited[dep] {
			if fi.hasCycleDFS(dep, visited, recursionStack, graph, path, result) {
				return true
			}
		} else if recursionStack[dep] {
			// Found a cycle
			cycle := fi.extractCycle(*path, dep)
			result.Cycles = append(result.Cycles, cycle)
			return true
		}
	}
	
	// Remove from recursion stack before returning
	recursionStack[cell] = false
	*path = (*path)[:len(*path)-1]
	
	return false
}

// extractCycle extracts the cycle from the path
func (fi *FormulaIntelligence) extractCycle(path []string, startCell string) []string {
	cycle := []string{}
	found := false
	
	for _, cell := range path {
		if cell == startCell {
			found = true
		}
		if found {
			cycle = append(cycle, cell)
		}
	}
	
	// Add the start cell again to show the cycle
	if len(cycle) > 0 && cycle[len(cycle)-1] != startCell {
		cycle = append(cycle, startCell)
	}
	
	return cycle
}

// checkIndirectCircularReferences checks for indirect circular references
func (fi *FormulaIntelligence) checkIndirectCircularReferences(result *CircularReferenceResult) {
	// Check for INDIRECT function usage which can create hidden circular references
	for cell, deps := range result.DependencyGraph {
		for _, dep := range deps {
			if strings.Contains(strings.ToUpper(dep), "INDIRECT") {
				result.Warnings = append(result.Warnings, 
					fmt.Sprintf("Cell %s uses INDIRECT function which may create hidden circular references", cell))
			}
		}
	}
}

// checkIterativeCalculations checks for intentional iterative calculations
func (fi *FormulaIntelligence) checkIterativeCalculations(formulas map[string]string, result *CircularReferenceResult) {
	// Common patterns for intentional circular references
	iterativePatterns := []struct {
		pattern     string
		description string
	}{
		{"GOAL SEEK", "Goal Seek calculation detected"},
		{"SOLVER", "Solver calculation detected"},
		{"ITERATION", "Iterative calculation pattern detected"},
		{"CIRCULAR", "Possible intentional circular calculation"},
	}
	
	for cell, formula := range formulas {
		upperFormula := strings.ToUpper(formula)
		for _, pattern := range iterativePatterns {
			if strings.Contains(upperFormula, pattern.pattern) {
				result.Warnings = append(result.Warnings,
					fmt.Sprintf("%s in cell %s - ensure iterative calculation is enabled", pattern.description, cell))
			}
		}
	}
	
	// Check for self-referencing formulas (common in iterative calculations)
	for cell, deps := range result.DependencyGraph {
		for _, dep := range deps {
			if cell == dep {
				result.Warnings = append(result.Warnings,
					fmt.Sprintf("Cell %s references itself - this requires iterative calculation", cell))
			}
		}
	}
}

// BreakCircularReference suggests ways to break a circular reference
func (fi *FormulaIntelligence) BreakCircularReference(cycle []string, formulas map[string]string) []string {
	suggestions := []string{}
	
	if len(cycle) < 2 {
		return suggestions
	}
	
	// Analyze the cycle
	if len(cycle) == 2 {
		// Simple two-cell circular reference
		suggestions = append(suggestions, fmt.Sprintf(
			"Break the circular reference between %s and %s by:",
			cycle[0], cycle[1]))
		suggestions = append(suggestions, "1. Use a helper cell to store intermediate values")
		suggestions = append(suggestions, "2. Use iterative calculation if the circular reference is intentional")
		suggestions = append(suggestions, "3. Restructure the calculation logic")
	} else {
		// Complex circular reference
		suggestions = append(suggestions, fmt.Sprintf(
			"Complex circular reference detected through %d cells: %s",
			len(cycle)-1, strings.Join(cycle, " → ")))
		
		// Find the weakest link (cell with most dependencies)
		maxDeps := 0
		weakestLink := ""
		for _, cell := range cycle[:len(cycle)-1] {
			if formula, ok := formulas[cell]; ok {
				deps := len(fi.extractDependencies(formula))
				if deps > maxDeps {
					maxDeps = deps
					weakestLink = cell
				}
			}
		}
		
		if weakestLink != "" {
			suggestions = append(suggestions, fmt.Sprintf(
				"Consider breaking the cycle at cell %s which has the most dependencies", weakestLink))
		}
		
		suggestions = append(suggestions, "Possible solutions:")
		suggestions = append(suggestions, "1. Use a macro or VBA to calculate in sequence")
		suggestions = append(suggestions, "2. Split the calculation into multiple steps")
		suggestions = append(suggestions, "3. Use Goal Seek or Solver for iterative solutions")
	}
	
	return suggestions
}

// Helper function to extract all cell references from a formula
func extractAllCellReferences(formula string) []string {
	refs := []string{}
	
	// Remove strings to avoid false positives
	cleanFormula := removeQuotedStrings(formula)
	
	// Pattern for sheet references
	sheetRefPattern := `'?([^'!]+)'?!([A-Z]+\d+(?::[A-Z]+\d+)?)`
	// Pattern for regular cell references
	cellRefPattern := `\b([A-Z]+\d+)(?::([A-Z]+\d+))?\b`
	
	// Extract sheet references
	sheetRefs := regexp.MustCompile(sheetRefPattern).FindAllStringSubmatch(cleanFormula, -1)
	for _, match := range sheetRefs {
		refs = append(refs, match[0]) // Full reference including sheet
	}
	
	// Remove sheet references from formula
	cleanFormula = regexp.MustCompile(sheetRefPattern).ReplaceAllString(cleanFormula, "")
	
	// Extract regular cell references
	cellRefs := regexp.MustCompile(cellRefPattern).FindAllStringSubmatch(cleanFormula, -1)
	for _, match := range cellRefs {
		if match[2] != "" {
			// Range reference - add both start and end
			refs = append(refs, match[1])
			refs = append(refs, match[2])
		} else {
			// Single cell reference
			refs = append(refs, match[1])
		}
	}
	
	return refs
}

// removeQuotedStrings removes quoted strings from formula to avoid false positives
func removeQuotedStrings(formula string) string {
	// Remove double-quoted strings
	quotedPattern := regexp.MustCompile(`"[^"]*"`)
	return quotedPattern.ReplaceAllString(formula, "")
}