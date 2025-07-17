package ai

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// ToolOrchestrator manages intelligent tool selection and execution for financial models
type ToolOrchestrator struct {
	executor        *ToolExecutor
	memory          *FinancialMemoryService
	contextAnalyzer *FinancialModelAnalyzer
}

// OrchestrationResult represents the result of tool orchestration
type OrchestrationResult struct {
	Analysis          *ModelAnalysisResult  `json:"analysis"`
	ExecutionPlan     *ToolExecutionPlan    `json:"execution_plan"`
	ToolResults       []ParallelToolResult  `json:"tool_results"`
	LearningData      *UserModelingAction   `json:"learning_data"`
	TotalDuration     time.Duration         `json:"total_duration"`
	Success           bool                  `json:"success"`
	RecommendedNext   []RecommendedAction   `json:"recommended_next"`
}

// ToolExecutionPlan represents a plan for executing tools
type ToolExecutionPlan struct {
	ParallelGroups   [][]ToolCall     `json:"parallel_groups"`
	SequentialSteps  []ToolCall       `json:"sequential_steps"`
	Rationale        string           `json:"rationale"`
	EstimatedTime    time.Duration    `json:"estimated_time"`
	RiskLevel        string           `json:"risk_level"`
}

// ToolCall represents a tool to be executed
type ToolCall struct {
	ID    string                 `json:"id"`
	Name  string                 `json:"name"`
	Input map[string]interface{} `json:"input"`
}

// NewToolOrchestrator creates a new tool orchestrator
func NewToolOrchestrator(executor *ToolExecutor, memory *FinancialMemoryService, contextAnalyzer *FinancialModelAnalyzer) *ToolOrchestrator {
	return &ToolOrchestrator{
		executor:        executor,
		memory:          memory,
		contextAnalyzer: contextAnalyzer,
	}
}

// ExecuteFinancialModelingRequest orchestrates the complete execution of a financial modeling request
func (to *ToolOrchestrator) ExecuteFinancialModelingRequest(ctx context.Context, sessionID string, userRequest string) (*OrchestrationResult, error) {
	startTime := time.Now()
	
	log.Info().
		Str("session", sessionID).
		Str("request", userRequest).
		Msg("Starting financial modeling request orchestration")

	result := &OrchestrationResult{}

	// Step 1: Analyze before action (comprehensive context gathering)
	analysis, err := to.contextAnalyzer.AnalyzeBeforeAction(ctx, sessionID, userRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze context: %w", err)
	}
	result.Analysis = analysis

	// Step 2: Generate intelligent tool execution plan
	executionPlan := to.generateExecutionPlan(analysis)
	result.ExecutionPlan = executionPlan

	// Step 3: Execute tools according to plan
	toolResults, err := to.executeToolPlan(ctx, sessionID, executionPlan)
	if err != nil {
		result.Success = false
		result.ToolResults = toolResults
		return result, fmt.Errorf("failed to execute tool plan: %w", err)
	}
	result.ToolResults = toolResults

	// Step 4: Learn from this interaction
	if to.memory != nil {
		learningData := to.extractLearningData(sessionID, userRequest, toolResults)
		result.LearningData = learningData
		
		// Extract user ID from session (simplified for now)
		userID := getDefaultUserID()
		if err := to.memory.LearnFromUserAction(ctx, userID, learningData); err != nil {
			log.Warn().Err(err).Msg("Failed to update user preferences")
		}
	}

	// Step 5: Generate next recommendations
	result.RecommendedNext = to.generateNextStepRecommendations(analysis, toolResults)

	result.TotalDuration = time.Since(startTime)
	result.Success = true

	log.Info().
		Str("session", sessionID).
		Dur("total_duration", result.TotalDuration).
		Int("tools_executed", len(toolResults)).
		Bool("success", result.Success).
		Msg("Financial modeling request orchestration completed")

	return result, nil
}

// generateExecutionPlan creates an intelligent execution plan based on analysis
func (to *ToolOrchestrator) generateExecutionPlan(analysis *ModelAnalysisResult) *ToolExecutionPlan {
	plan := &ToolExecutionPlan{
		ParallelGroups:  [][]ToolCall{},
		SequentialSteps: []ToolCall{},
		RiskLevel:       analysis.RiskAssessment.RiskLevel,
	}

	// Based on model type and user intent, create intelligent execution plan
	switch analysis.UserIntent.ActionType {
	case "model_creation":
		plan.Rationale = "Creating financial model with parallel context gathering followed by sequential building"
		
		// Parallel Phase 1: Context gathering
		plan.ParallelGroups = append(plan.ParallelGroups, []ToolCall{
			{
				ID:   "read_existing",
				Name: "read_range",
				Input: map[string]interface{}{
					"range":              "A1:Z100",
					"include_formulas":   true,
					"include_formatting": true,
				},
			},
			{
				ID:   "analyze_structure",
				Name: "analyze_model_structure",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"analysis_type": "comprehensive",
				},
			},
			{
				ID:   "validate_current",
				Name: "validate_model",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"check_circular_refs": true,
					"check_formula_consistency": true,
				},
			},
		})

		// Sequential Phase: Model building
		plan.SequentialSteps = append(plan.SequentialSteps,
			ToolCall{
				ID:   "organize_model",
				Name: "organize_financial_model",
				Input: map[string]interface{}{
					"model_type": analysis.ModelType,
					"layout": "horizontal",
				},
			},
			ToolCall{
				ID:   "apply_formatting",
				Name: "smart_format_cells",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"style": "professional",
				},
			},
		)
		
		plan.EstimatedTime = time.Second * 15

	case "formatting_enhancement":
		plan.Rationale = "Enhancing formatting with parallel analysis and formatting application"
		
		// Parallel: analyze current state
		plan.ParallelGroups = append(plan.ParallelGroups, []ToolCall{
			{
				ID:   "read_formatting",
				Name: "read_range",
				Input: map[string]interface{}{
					"range": analysis.UserIntent.TargetRange,
					"include_formatting": true,
				},
			},
			{
				ID:   "analyze_data",
				Name: "analyze_data",
				Input: map[string]interface{}{
					"range": analysis.UserIntent.TargetRange,
					"include_statistics": true,
				},
			},
		})

		// Apply formatting
		plan.SequentialSteps = append(plan.SequentialSteps,
			ToolCall{
				ID:   "enhance_formatting",
				Name: "smart_format_cells",
				Input: map[string]interface{}{
					"range": analysis.UserIntent.TargetRange,
					"style": getPreferredStyle(analysis.UserPreferences),
				},
			},
		)
		
		plan.EstimatedTime = time.Second * 8

	case "validation":
		plan.Rationale = "Comprehensive validation using parallel analysis"
		
		// Parallel: comprehensive validation
		plan.ParallelGroups = append(plan.ParallelGroups, []ToolCall{
			{
				ID:   "validate_formulas",
				Name: "validate_model",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"check_circular_refs": true,
					"check_formula_consistency": true,
					"check_errors": true,
				},
			},
			{
				ID:   "analyze_structure",
				Name: "analyze_model_structure",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"analysis_type": "validation",
				},
			},
			{
				ID:   "analyze_data_integrity",
				Name: "analyze_data",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"include_statistics": true,
					"detect_headers": true,
				},
			},
		})
		
		plan.EstimatedTime = time.Second * 10

	case "formula_optimization":
		plan.Rationale = "Formula optimization with careful validation"
		
		// Sequential approach for formula changes (higher risk)
		plan.SequentialSteps = append(plan.SequentialSteps,
			ToolCall{
				ID:   "read_current_formulas",
				Name: "read_range",
				Input: map[string]interface{}{
					"range": analysis.UserIntent.TargetRange,
					"include_formulas": true,
				},
			},
			ToolCall{
				ID:   "validate_before_changes",
				Name: "validate_model",
				Input: map[string]interface{}{
					"range": analysis.UserIntent.TargetRange,
					"check_circular_refs": true,
				},
			},
			ToolCall{
				ID:   "build_optimized_formulas",
				Name: "build_financial_formula",
				Input: map[string]interface{}{
					"formula_type": "optimized",
					"target_range": analysis.UserIntent.TargetRange,
				},
			},
		)
		
		plan.EstimatedTime = time.Second * 12

	case "model_organization":
		plan.Rationale = "Model organization with structure analysis and systematic reorganization"
		
		// Parallel: analyze current organization
		plan.ParallelGroups = append(plan.ParallelGroups, []ToolCall{
			{
				ID:   "analyze_current_structure",
				Name: "analyze_model_structure",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"analysis_type": "organization",
				},
			},
			{
				ID:   "read_all_data",
				Name: "read_range",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"include_formulas": true,
					"include_formatting": true,
				},
			},
		})

		// Sequential: reorganize
		plan.SequentialSteps = append(plan.SequentialSteps,
			ToolCall{
				ID:   "reorganize_model",
				Name: "organize_financial_model",
				Input: map[string]interface{}{
					"model_type": analysis.ModelType,
					"sections": getPreferredSections(analysis.UserPreferences),
					"layout": getPreferredLayout(analysis.UserPreferences),
				},
			},
		)
		
		plan.EstimatedTime = time.Second * 18

	default:
		plan.Rationale = "General analysis with parallel context gathering"
		
		// Default: parallel analysis
		plan.ParallelGroups = append(plan.ParallelGroups, []ToolCall{
			{
				ID:   "read_context",
				Name: "read_range",
				Input: map[string]interface{}{
					"range": "A1:Z100",
					"include_formulas": true,
				},
			},
			{
				ID:   "analyze_structure",
				Name: "analyze_model_structure",
				Input: map[string]interface{}{
					"range": "A1:Z100",
				},
			},
		})
		
		plan.EstimatedTime = time.Second * 5
	}

	return plan
}

// executeToolPlan executes the tool execution plan
func (to *ToolOrchestrator) executeToolPlan(ctx context.Context, sessionID string, plan *ToolExecutionPlan) ([]ParallelToolResult, error) {
	var allResults []ParallelToolResult

	// Execute parallel groups
	for i, parallelGroup := range plan.ParallelGroups {
		log.Info().
			Str("session", sessionID).
			Int("group_index", i).
			Int("tools_in_group", len(parallelGroup)).
			Msg("Executing parallel tool group")

		results, err := to.executor.ExecuteParallelTools(ctx, sessionID, parallelGroup)
		if err != nil {
			return allResults, fmt.Errorf("failed to execute parallel group %d: %w", i, err)
		}
		allResults = append(allResults, results...)
	}

	// Execute sequential steps
	for i, step := range plan.SequentialSteps {
		log.Info().
			Str("session", sessionID).
			Int("step_index", i).
			Str("tool", step.Name).
			Msg("Executing sequential tool step")

		result, err := to.executor.ExecuteTool(ctx, sessionID, step, "")
		if err != nil {
			return allResults, fmt.Errorf("failed to execute sequential step %d (%s): %w", i, step.Name, err)
		}

		// Convert to ParallelToolResult format
		parallelResult := ParallelToolResult{
			ToolName: step.Name,
			ToolID:   step.ID,
			IsError:  result.IsError,
		}

		if result.IsError {
			parallelResult.Error = fmt.Errorf("tool execution failed")
		} else if result.Content != nil {
			if contentMap, ok := result.Content.(map[string]interface{}); ok {
				parallelResult.Result = contentMap
			}
		}

		allResults = append(allResults, parallelResult)
	}

	return allResults, nil
}

// extractLearningData extracts learning data from the orchestration results
func (to *ToolOrchestrator) extractLearningData(sessionID string, userRequest string, toolResults []ParallelToolResult) *UserModelingAction {
	action := &UserModelingAction{
		UserID:    getDefaultUserID(),
		Context:   make(map[string]interface{}),
		Timestamp: time.Now(),
	}

	// Analyze user request to determine action type
	requestLower := strings.ToLower(userRequest)
	
	if strings.Contains(requestLower, "format") || strings.Contains(requestLower, "style") {
		action.ActionType = "formatting_change"
	} else if strings.Contains(requestLower, "organize") || strings.Contains(requestLower, "section") {
		action.ActionType = "section_organization"
	} else if strings.Contains(requestLower, "formula") || strings.Contains(requestLower, "calculate") {
		action.ActionType = "formula_creation"
	} else if strings.Contains(requestLower, "create") || strings.Contains(requestLower, "build") {
		action.ActionType = "model_creation"
	} else {
		action.ActionType = "general_modeling"
	}

	// Extract performance preferences
	totalDuration := time.Duration(0)
	successfulTools := 0
	
	for _, result := range toolResults {
		totalDuration += result.Duration
		if !result.IsError {
			successfulTools++
		}
	}

	action.Context["total_duration"] = totalDuration
	action.Context["successful_tools"] = successfulTools
	action.Context["total_tools"] = len(toolResults)
	action.Context["success_rate"] = float64(successfulTools) / float64(len(toolResults))

	// If user achieved good performance, they might prefer parallel execution
	if totalDuration < time.Second*10 && successfulTools > 2 {
		action.Context["prefers_parallel_execution"] = true
	}

	// Extract tool usage patterns
	toolsUsed := make([]string, len(toolResults))
	for i, result := range toolResults {
		toolsUsed[i] = result.ToolName
	}
	action.Context["tools_used"] = toolsUsed

	return action
}

// generateNextStepRecommendations generates recommendations for next steps
func (to *ToolOrchestrator) generateNextStepRecommendations(analysis *ModelAnalysisResult, results []ParallelToolResult) []RecommendedAction {
	var recommendations []RecommendedAction

	// Check if validation revealed issues
	hasValidationIssues := false
	for _, result := range results {
		if result.ToolName == "validate_model" && !result.IsError {
			if validationResult, ok := result.Result["is_valid"].(bool); ok && !validationResult {
				hasValidationIssues = true
			}
		}
	}

	if hasValidationIssues {
		recommendations = append(recommendations, RecommendedAction{
			Action:    "fix_validation_issues",
			Tools:     []string{"validate_model", "build_financial_formula"},
			Rationale: "Validation identified issues that should be addressed",
			Priority:  "high",
		})
	}

	// Suggest audit trail if significant changes were made
	if analysis.UserIntent.ActionType == "model_creation" || analysis.UserIntent.ActionType == "formula_optimization" {
		recommendations = append(recommendations, RecommendedAction{
			Action:    "create_documentation",
			Tools:     []string{"create_audit_trail"},
			Rationale: "Document changes for audit trail",
			Priority:  "medium",
		})
	}

	// Suggest formatting enhancement if model was created but not formatted
	if analysis.UserIntent.ActionType == "model_creation" {
		recommendations = append(recommendations, RecommendedAction{
			Action:    "enhance_presentation",
			Tools:     []string{"smart_format_cells", "create_chart"},
			Rationale: "Improve model presentation with professional formatting",
			Priority:  "medium",
		})
	}

	return recommendations
}

// Helper functions

func getPreferredStyle(preferences *FinancialModelingPreferences) string {
	if preferences != nil {
		if style, ok := preferences.FormattingPreferences["preferred_style"].(string); ok {
			return style
		}
	}
	return "professional"
}

func getPreferredSections(preferences *FinancialModelingPreferences) []string {
	if preferences != nil && len(preferences.PreferredSectionOrdering) > 0 {
		return preferences.PreferredSectionOrdering
	}
	return []string{"assumptions", "calculations", "outputs"}
}

func getPreferredLayout(preferences *FinancialModelingPreferences) string {
	if preferences != nil {
		if layouts, ok := preferences.PreferredModelLayouts["default"].(string); ok {
			return layouts
		}
	}
	return "horizontal"
}