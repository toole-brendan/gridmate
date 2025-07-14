package ai

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// FinancialModelAnalyzer performs comprehensive analysis before any financial model changes
type FinancialModelAnalyzer struct {
	executor    *ToolExecutor
	memory      *FinancialMemoryService
	validator   ModelValidator
}

// ModelAnalysisResult represents the result of comprehensive model analysis
type ModelAnalysisResult struct {
	ModelType           string                       `json:"model_type"`
	CurrentStructure    *ModelStructure              `json:"current_structure"`
	ValidationStatus    *ValidationResult            `json:"validation_status"`
	UserIntent          *UserIntent                  `json:"user_intent"`
	UserPreferences     *FinancialModelingPreferences `json:"user_preferences"`
	RecommendedActions  []RecommendedAction          `json:"recommended_actions"`
	RiskAssessment      *RiskAssessment              `json:"risk_assessment"`
	ComprehensiveContext *ComprehensiveContext       `json:"comprehensive_context"`
}

// UserIntent represents the parsed intent from user request
type UserIntent struct {
	ActionType     string                 `json:"action_type"`     // model_creation, formatting, validation, etc.
	TargetRange    string                 `json:"target_range"`
	Priority       string                 `json:"priority"`        // high, medium, low
	Complexity     string                 `json:"complexity"`      // simple, intermediate, complex
	RequiresApproval bool                 `json:"requires_approval"`
	Parameters     map[string]interface{} `json:"parameters"`
}

// RecommendedAction represents an action recommended by the analyzer
type RecommendedAction struct {
	Action      string                 `json:"action"`
	Tools       []string               `json:"tools"`
	Rationale   string                 `json:"rationale"`
	Priority    string                 `json:"priority"`
	Parameters  map[string]interface{} `json:"parameters"`
	Parallel    bool                   `json:"parallel"`
}

// RiskAssessment represents potential risks of the proposed changes
type RiskAssessment struct {
	RiskLevel        string   `json:"risk_level"`      // low, medium, high
	PotentialIssues  []string `json:"potential_issues"`
	Mitigations      []string `json:"mitigations"`
	RequiresBackup   bool     `json:"requires_backup"`
	AffectedRanges   []string `json:"affected_ranges"`
}

// ComprehensiveContext represents all gathered context about the model
type ComprehensiveContext struct {
	Structure    *ModelStructure `json:"structure"`
	Data         *RangeData      `json:"data"`
	Formulas     *RangeData      `json:"formulas"`
	Formatting   *RangeData      `json:"formatting"`
	Validation   *ValidationResult `json:"validation"`
	GatherTime   time.Duration   `json:"gather_time"`
}

// ModelValidator interface for model validation
type ModelValidator interface {
	ValidateModel(context *ComprehensiveContext) (*ValidationResult, error)
	ValidateFormulas(formulas map[string]string) ([]string, error)
	CheckCircularReferences(formulas map[string]string) ([]string, error)
}

// NewFinancialModelAnalyzer creates a new financial model analyzer
func NewFinancialModelAnalyzer(executor *ToolExecutor, memory *FinancialMemoryService, validator ModelValidator) *FinancialModelAnalyzer {
	return &FinancialModelAnalyzer{
		executor:  executor,
		memory:    memory,
		validator: validator,
	}
}

// AnalyzeBeforeAction performs comprehensive analysis before any financial model action
func (fma *FinancialModelAnalyzer) AnalyzeBeforeAction(ctx context.Context, sessionID string, userRequest string) (*ModelAnalysisResult, error) {
	log.Info().
		Str("session", sessionID).
		Str("request", userRequest).
		Msg("Starting comprehensive financial model analysis")

	startTime := time.Now()

	// Step 1: Gather comprehensive context in parallel
	contextResults, err := fma.gatherParallelContext(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to gather context: %w", err)
	}

	// Step 2: Analyze model type and structure
	modelType := fma.detectModelType(contextResults)

	// Step 3: Validate current model state
	var validationResults *ValidationResult
	if fma.validator != nil {
		validationResults, _ = fma.validator.ValidateModel(contextResults)
	}

	// Step 4: Understand user intent
	userIntent := fma.parseUserIntent(userRequest, modelType)

	// Step 5: Check against user preferences (if memory service available)
	var userPrefs *FinancialModelingPreferences
	if fma.memory != nil {
		// For now, use a default user ID - in real implementation, get from context
		userPrefs, _ = fma.memory.GetUserPreferences(ctx, getDefaultUserID())
	}

	// Step 6: Assess risks of proposed action
	riskAssessment := fma.assessRisks(userIntent, contextResults, validationResults)

	// Step 7: Generate recommended actions
	recommendations := fma.generateRecommendations(userIntent, modelType, validationResults, userPrefs)

	analysisTime := time.Since(startTime)

	result := &ModelAnalysisResult{
		ModelType:           modelType,
		CurrentStructure:    contextResults.Structure,
		ValidationStatus:    validationResults,
		UserIntent:          userIntent,
		UserPreferences:     userPrefs,
		RecommendedActions:  recommendations,
		RiskAssessment:      riskAssessment,
		ComprehensiveContext: contextResults,
	}

	log.Info().
		Str("session", sessionID).
		Str("model_type", modelType).
		Str("user_intent", userIntent.ActionType).
		Str("risk_level", riskAssessment.RiskLevel).
		Dur("analysis_time", analysisTime).
		Int("recommendations", len(recommendations)).
		Msg("Comprehensive financial model analysis completed")

	return result, nil
}

// gatherParallelContext executes multiple context-gathering operations in parallel
func (fma *FinancialModelAnalyzer) gatherParallelContext(ctx context.Context, sessionID string) (*ComprehensiveContext, error) {
	startTime := time.Now()
	
	// Prepare parallel context gathering operations
	contextOperations := map[string]func() (interface{}, error){
		"structure": func() (interface{}, error) {
			return fma.analyzeStructure(ctx, sessionID)
		},
		"formulas": func() (interface{}, error) {
			return fma.analyzeFormulas(ctx, sessionID)
		},
		"formatting": func() (interface{}, error) {
			return fma.analyzeFormatting(ctx, sessionID)
		},
		"data": func() (interface{}, error) {
			return fma.analyzeData(ctx, sessionID)
		},
	}

	// Execute all operations in parallel
	results := make(map[string]interface{})
	errors := make(map[string]error)
	var wg sync.WaitGroup
	var mu sync.Mutex

	for operation, fn := range contextOperations {
		wg.Add(1)
		go func(op string, operation func() (interface{}, error)) {
			defer wg.Done()
			
			result, err := operation()
			
			mu.Lock()
			defer mu.Unlock()
			
			if err != nil {
				errors[op] = err
				log.Warn().
					Str("operation", op).
					Err(err).
					Msg("Context gathering operation failed")
			} else {
				results[op] = result
			}
		}(operation, fn)
	}

	wg.Wait()

	// Combine results into comprehensive context
	context := &ComprehensiveContext{
		GatherTime: time.Since(startTime),
	}

	if structure, ok := results["structure"].(*ModelStructure); ok {
		context.Structure = structure
	}
	if formulas, ok := results["formulas"].(*RangeData); ok {
		context.Formulas = formulas
	}
	if formatting, ok := results["formatting"].(*RangeData); ok {
		context.Formatting = formatting
	}
	if data, ok := results["data"].(*RangeData); ok {
		context.Data = data
	}

	log.Info().
		Str("session", sessionID).
		Dur("gather_time", context.GatherTime).
		Int("successful_operations", len(results)).
		Int("failed_operations", len(errors)).
		Msg("Parallel context gathering completed")

	return context, nil
}

// Individual context gathering methods

func (fma *FinancialModelAnalyzer) analyzeStructure(ctx context.Context, sessionID string) (*ModelStructure, error) {
	// Use the existing analyze_model_structure tool
	_, err := fma.executor.ExecuteTool(ctx, sessionID, ToolCall{
		ID:   "analyze_structure",
		Name: "analyze_model_structure",
		Input: map[string]interface{}{
			"range": "A1:Z100",
			"analysis_type": "structure",
		},
	})
	
	if err != nil {
		return nil, err
	}

	// Convert result to ModelStructure using correct fields
	// This is a simplified conversion - in real implementation, would parse the actual result
	return &ModelStructure{
		DataDirection:   "horizontal",
		TimeOrientation: "columns",
		PeriodColumns:   []string{"B", "C", "D", "E", "F"},
		LabelColumns:    []string{"A"},
		FirstDataCell:   "B3",
		CellRoles:       map[string]string{},
		ModelSections:   map[string]CellRange{},
		KeyCells:        map[string]string{},
		Dependencies:    []CellDependency{},
		PeriodHeaders:   []PeriodInfo{},
	}, nil
}

func (fma *FinancialModelAnalyzer) analyzeFormulas(ctx context.Context, sessionID string) (*RangeData, error) {
	return fma.executor.excelBridge.ReadRange(ctx, sessionID, "A1:Z100", true, false)
}

func (fma *FinancialModelAnalyzer) analyzeFormatting(ctx context.Context, sessionID string) (*RangeData, error) {
	return fma.executor.excelBridge.ReadRange(ctx, sessionID, "A1:Z100", false, true)
}

func (fma *FinancialModelAnalyzer) analyzeData(ctx context.Context, sessionID string) (*RangeData, error) {
	return fma.executor.excelBridge.ReadRange(ctx, sessionID, "A1:Z100", false, false)
}

// detectModelType analyzes the comprehensive context to determine model type
func (fma *FinancialModelAnalyzer) detectModelType(context *ComprehensiveContext) string {
	if context == nil || context.Data == nil {
		return "Unknown"
	}

	// Analyze cell values and formulas to detect model type
	contentStr := strings.ToLower(fmt.Sprintf("%v", context.Data.Values))
	
	if context.Formulas != nil {
		formulaStr := strings.ToLower(fmt.Sprintf("%v", context.Formulas.Values))
		contentStr += " " + formulaStr
	}

	// Enhanced model type detection
	if strings.Contains(contentStr, "dcf") || strings.Contains(contentStr, "wacc") || 
	   strings.Contains(contentStr, "terminal value") || strings.Contains(contentStr, "free cash flow") {
		return "DCF"
	}
	if strings.Contains(contentStr, "lbo") || strings.Contains(contentStr, "leverage") || 
	   strings.Contains(contentStr, "irr") || strings.Contains(contentStr, "debt schedule") {
		return "LBO"
	}
	if strings.Contains(contentStr, "merger") || strings.Contains(contentStr, "accretion") || 
	   strings.Contains(contentStr, "dilution") || strings.Contains(contentStr, "synerg") {
		return "M&A"
	}
	if strings.Contains(contentStr, "trading") || strings.Contains(contentStr, "multiple") || 
	   strings.Contains(contentStr, "ev/ebitda") || strings.Contains(contentStr, "peer") {
		return "Trading Comps"
	}
	if strings.Contains(contentStr, "credit") || strings.Contains(contentStr, "coverage") || 
	   strings.Contains(contentStr, "debt capacity") {
		return "Credit Analysis"
	}

	return "General Financial Model"
}

// parseUserIntent analyzes the user request to understand their intent
func (fma *FinancialModelAnalyzer) parseUserIntent(userRequest string, modelType string) *UserIntent {
	requestLower := strings.ToLower(userRequest)
	
	intent := &UserIntent{
		Parameters: make(map[string]interface{}),
	}

	// Determine action type
	if strings.Contains(requestLower, "format") || strings.Contains(requestLower, "style") {
		intent.ActionType = "formatting_enhancement"
		intent.Priority = "medium"
		intent.Complexity = "simple"
	} else if strings.Contains(requestLower, "create") || strings.Contains(requestLower, "build") {
		intent.ActionType = "model_creation"
		intent.Priority = "high"
		intent.Complexity = "complex"
		intent.RequiresApproval = true
	} else if strings.Contains(requestLower, "validate") || strings.Contains(requestLower, "check") {
		intent.ActionType = "validation"
		intent.Priority = "high"
		intent.Complexity = "intermediate"
	} else if strings.Contains(requestLower, "formula") || strings.Contains(requestLower, "calculate") {
		intent.ActionType = "formula_optimization"
		intent.Priority = "medium"
		intent.Complexity = "intermediate"
		intent.RequiresApproval = true
	} else if strings.Contains(requestLower, "organize") || strings.Contains(requestLower, "structure") {
		intent.ActionType = "model_organization"
		intent.Priority = "medium"
		intent.Complexity = "intermediate"
	} else {
		intent.ActionType = "general_analysis"
		intent.Priority = "low"
		intent.Complexity = "simple"
	}

	// Extract target range if mentioned
	if strings.Contains(requestLower, "range") || strings.Contains(requestLower, "cell") {
		// Simple range extraction - in real implementation would use regex
		intent.TargetRange = "A1:Z100" // Default
	}

	return intent
}

// assessRisks evaluates the potential risks of the proposed action
func (fma *FinancialModelAnalyzer) assessRisks(intent *UserIntent, context *ComprehensiveContext, validation *ValidationResult) *RiskAssessment {
	risk := &RiskAssessment{
		PotentialIssues: []string{},
		Mitigations:     []string{},
		AffectedRanges:  []string{},
	}

	// Assess risk based on action type
	switch intent.ActionType {
	case "model_creation":
		risk.RiskLevel = "medium"
		risk.RequiresBackup = true
		risk.PotentialIssues = append(risk.PotentialIssues, "Overwriting existing data", "Complex formula dependencies")
		risk.Mitigations = append(risk.Mitigations, "Create backup before changes", "Validate all formulas before applying")
	
	case "formula_optimization":
		risk.RiskLevel = "high"
		risk.RequiresBackup = true
		risk.PotentialIssues = append(risk.PotentialIssues, "Breaking existing calculations", "Circular references")
		risk.Mitigations = append(risk.Mitigations, "Test formulas in isolated cells first", "Comprehensive validation after changes")
	
	case "formatting_enhancement":
		risk.RiskLevel = "low"
		risk.PotentialIssues = append(risk.PotentialIssues, "Temporary visual inconsistency")
		risk.Mitigations = append(risk.Mitigations, "Apply formatting in batches")
		
	default:
		risk.RiskLevel = "low"
	}

	// Increase risk if validation shows existing issues
	if validation != nil && !validation.IsValid {
		if risk.RiskLevel == "low" {
			risk.RiskLevel = "medium"
		} else if risk.RiskLevel == "medium" {
			risk.RiskLevel = "high"
		}
		risk.PotentialIssues = append(risk.PotentialIssues, "Existing model validation issues")
	}

	return risk
}

// generateRecommendations creates recommended actions based on analysis
func (fma *FinancialModelAnalyzer) generateRecommendations(intent *UserIntent, modelType string, validation *ValidationResult, preferences *FinancialModelingPreferences) []RecommendedAction {
	var recommendations []RecommendedAction

	// Base recommendation based on user intent
	switch intent.ActionType {
	case "model_creation":
		recommendations = append(recommendations, RecommendedAction{
			Action:    "comprehensive_model_analysis",
			Tools:     []string{"analyze_model_structure", "read_range", "validate_model"},
			Rationale: "Gather complete context before creating model",
			Priority:  "high",
			Parallel:  true,
		})
		
		recommendations = append(recommendations, RecommendedAction{
			Action:    "create_financial_model",
			Tools:     []string{"organize_financial_model", "smart_format_cells", "create_audit_trail"},
			Rationale: "Build professional financial model with proper organization",
			Priority:  "high",
			Parallel:  false,
		})

	case "formatting_enhancement":
		recommendations = append(recommendations, RecommendedAction{
			Action:    "parallel_formatting_analysis",
			Tools:     []string{"read_range", "analyze_data", "validate_model"},
			Rationale: "Understand current formatting before enhancement",
			Priority:  "medium",
			Parallel:  true,
		})

	case "validation":
		recommendations = append(recommendations, RecommendedAction{
			Action:    "comprehensive_validation",
			Tools:     []string{"validate_model", "analyze_model_structure", "analyze_data"},
			Rationale: "Run parallel validation across all model aspects",
			Priority:  "high",
			Parallel:  true,
		})
	}

	// Add preference-based recommendations
	if preferences != nil {
		if preferences.ValidationPreferences["auto_validate"] == true {
			recommendations = append(recommendations, RecommendedAction{
				Action:    "auto_validation",
				Tools:     []string{"validate_model"},
				Rationale: "User prefers automatic validation",
				Priority:  "medium",
				Parallel:  false,
			})
		}
	}

	return recommendations
}

// Helper function to get default user ID (in real implementation, extract from context)
func getDefaultUserID() uuid.UUID {
	// This would be extracted from the session context in real implementation
	return uuid.New()
}