package ai

import (
	"context"
	"strings"
	"regexp"
)

// RepresentationMode defines different ways to represent spreadsheet data
type RepresentationMode string

const (
	RepModeCompact     RepresentationMode = "compact"
	RepModeSpatial     RepresentationMode = "spatial"
	RepModeStructured  RepresentationMode = "structured"
	RepModeSemantic    RepresentationMode = "semantic"
	RepModeDifferential RepresentationMode = "differential"
)

// QueryIntent represents the user's intent
type QueryIntent string

const (
	IntentAnalyze  QueryIntent = "analyze"
	IntentModify   QueryIntent = "modify"
	IntentCreate   QueryIntent = "create"
	IntentValidate QueryIntent = "validate"
	IntentExplain  QueryIntent = "explain"
)

// RepresentationSelector chooses optimal representations for queries
type RepresentationSelector struct {
	// Patterns for query classification
	analyzePatterns  []*regexp.Regexp
	modifyPatterns   []*regexp.Regexp
	createPatterns   []*regexp.Regexp
	validatePatterns []*regexp.Regexp
	explainPatterns  []*regexp.Regexp
}

// NewRepresentationSelector creates a new representation selector
func NewRepresentationSelector() *RepresentationSelector {
	return &RepresentationSelector{
		analyzePatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(analyze|analysis|calculate|compute|sum|average|trend|correlation|forecast)`),
			regexp.MustCompile(`(?i)(what is|what are|how much|how many|show me|find|identify)`),
			regexp.MustCompile(`(?i)(compare|difference|variance|growth|change)`),
		},
		modifyPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(change|update|modify|set|replace|adjust|correct|fix)`),
			regexp.MustCompile(`(?i)(add|insert|append|remove|delete|clear)`),
			regexp.MustCompile(`(?i)(apply|fill|copy|paste|extend)`),
		},
		createPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(create|build|generate|make|construct|design)`),
			regexp.MustCompile(`(?i)(new|template|model|forecast|projection)`),
			regexp.MustCompile(`(?i)(formula|calculation|function)`),
		},
		validatePatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(validate|check|verify|ensure|confirm|test)`),
			regexp.MustCompile(`(?i)(error|mistake|wrong|incorrect|issue|problem)`),
			regexp.MustCompile(`(?i)(circular|reference|dependency|consistency)`),
		},
		explainPatterns: []*regexp.Regexp{
			regexp.MustCompile(`(?i)(explain|describe|understand|why|how does|what does)`),
			regexp.MustCompile(`(?i)(mean|meaning|purpose|logic|reasoning)`),
			regexp.MustCompile(`(?i)(documentation|document|comment)`),
		},
	}
}

// SelectRepresentation chooses the optimal representation modes for a query
func (rs *RepresentationSelector) SelectRepresentation(ctx context.Context, query string, rangeInfo RangeInfo) []RepresentationMode {
	intent := rs.classifyIntent(query)
	complexity := rs.assessComplexity(query, rangeInfo)
	
	// Select modes based on intent and complexity
	modes := []RepresentationMode{}
	
	switch intent {
	case IntentAnalyze:
		modes = append(modes, RepModeStructured, RepModeSemantic)
		if complexity == "complex" {
			modes = append(modes, RepModeSpatial)
		}
		
	case IntentModify:
		modes = append(modes, RepModeSpatial, RepModeStructured)
		if rangeInfo.HasFormulas {
			modes = append(modes, RepModeDifferential)
		}
		
	case IntentCreate:
		modes = append(modes, RepModeSemantic, RepModeCompact)
		if strings.Contains(strings.ToLower(query), "template") {
			modes = append(modes, RepModeStructured)
		}
		
	case IntentValidate:
		modes = append(modes, RepModeStructured, RepModeDifferential)
		if rangeInfo.HasFormulas {
			modes = append(modes, RepModeSpatial)
		}
		
	case IntentExplain:
		modes = append(modes, RepModeSemantic, RepModeStructured)
		if rangeInfo.CellCount < 50 {
			modes = append(modes, RepModeSpatial)
		}
		
	default:
		// Default to a balanced approach
		modes = append(modes, RepModeCompact, RepModeSemantic)
	}
	
	// Always include compact mode if dealing with large ranges
	if rangeInfo.CellCount > 1000 && !contains(modes, RepModeCompact) {
		modes = append([]RepresentationMode{RepModeCompact}, modes...)
	}
	
	return modes
}

// classifyIntent determines the user's intent from the query
func (rs *RepresentationSelector) classifyIntent(query string) QueryIntent {
	queryLower := strings.ToLower(query)
	
	// Check patterns in order of specificity
	if rs.matchesAny(queryLower, rs.validatePatterns) {
		return IntentValidate
	}
	if rs.matchesAny(queryLower, rs.explainPatterns) {
		return IntentExplain
	}
	if rs.matchesAny(queryLower, rs.createPatterns) {
		return IntentCreate
	}
	if rs.matchesAny(queryLower, rs.modifyPatterns) {
		return IntentModify
	}
	if rs.matchesAny(queryLower, rs.analyzePatterns) {
		return IntentAnalyze
	}
	
	// Default to analyze
	return IntentAnalyze
}

// assessComplexity evaluates query and range complexity
func (rs *RepresentationSelector) assessComplexity(query string, rangeInfo RangeInfo) string {
	score := 0
	
	// Query complexity factors
	if len(query) > 200 {
		score++
	}
	if strings.Count(query, ",") > 3 || strings.Count(query, "and") > 2 {
		score++
	}
	if strings.Contains(strings.ToLower(query), "multiple") || strings.Contains(strings.ToLower(query), "all") {
		score++
	}
	
	// Range complexity factors
	if rangeInfo.CellCount > 100 {
		score++
	}
	if rangeInfo.HasFormulas {
		score++
	}
	if rangeInfo.FormulaCount > 20 {
		score++
	}
	if rangeInfo.HasNamedRanges {
		score++
	}
	
	if score >= 4 {
		return "complex"
	} else if score >= 2 {
		return "moderate"
	}
	return "simple"
}

// matchesAny checks if the query matches any of the patterns
func (rs *RepresentationSelector) matchesAny(query string, patterns []*regexp.Regexp) bool {
	for _, pattern := range patterns {
		if pattern.MatchString(query) {
			return true
		}
	}
	return false
}

// EstimateTokenBudget estimates token budget based on intent and complexity
func (rs *RepresentationSelector) EstimateTokenBudget(intent QueryIntent, complexity string) int {
	baseTokens := 2000
	
	// Adjust based on intent
	switch intent {
	case IntentAnalyze:
		baseTokens = 3000
	case IntentModify:
		baseTokens = 2500
	case IntentCreate:
		baseTokens = 2000
	case IntentValidate:
		baseTokens = 2500
	case IntentExplain:
		baseTokens = 3500
	}
	
	// Adjust based on complexity
	switch complexity {
	case "complex":
		baseTokens = int(float64(baseTokens) * 1.5)
	case "moderate":
		baseTokens = int(float64(baseTokens) * 1.2)
	}
	
	// Cap at maximum
	if baseTokens > 8000 {
		baseTokens = 8000
	}
	
	return baseTokens
}

// RangeInfo contains information about a spreadsheet range
type RangeInfo struct {
	CellCount      int
	HasFormulas    bool
	FormulaCount   int
	HasNamedRanges bool
	IsTable        bool
	RowCount       int
	ColCount       int
}

// contains checks if a slice contains a value
func contains(slice []RepresentationMode, item RepresentationMode) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}