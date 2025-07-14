package ai

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// FinancialModelingPreferences represents user preferences for financial modeling
type FinancialModelingPreferences struct {
	UserID                    uuid.UUID                 `db:"user_id"`
	PreferredModelLayouts     map[string]interface{}    `db:"preferred_layouts"`
	FormattingPreferences     map[string]interface{}    `db:"formatting_prefs"`
	CalculationPreferences    map[string]interface{}    `db:"calculation_prefs"`
	ProfessionalStandards     string                    `db:"professional_standards"` // PE, HF, IB, Corp
	DefaultAssumptions        map[string]float64        `db:"default_assumptions"`
	PreferredSectionOrdering  []string                  `db:"section_ordering"`
	StylePreferences          map[string]interface{}    `db:"style_preferences"`
	ValidationPreferences     map[string]bool           `db:"validation_prefs"`
	CreatedAt                 time.Time                 `db:"created_at"`
	UpdatedAt                 time.Time                 `db:"updated_at"`
}

// UserModelingAction represents an action taken by a user that we can learn from
type UserModelingAction struct {
	UserID       uuid.UUID               `json:"user_id"`
	ActionType   string                  `json:"action_type"` // format_change, formula_creation, section_organization, etc.
	Context      map[string]interface{}  `json:"context"`
	Preferences  map[string]interface{}  `json:"preferences"`
	ModelType    string                  `json:"model_type"`
	Timestamp    time.Time               `json:"timestamp"`
}

// FinancialMemoryService manages user preference learning for financial modeling
type FinancialMemoryService struct {
	db   *sql.DB
	repo FinancialMemoryRepository
}

// FinancialMemoryRepository interface for database operations
type FinancialMemoryRepository interface {
	GetPreferences(ctx context.Context, userID uuid.UUID) (*FinancialModelingPreferences, error)
	UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences *FinancialModelingPreferences) error
	CreatePreferences(ctx context.Context, preferences *FinancialModelingPreferences) error
	DeletePreferences(ctx context.Context, userID uuid.UUID) error
}

// NewFinancialMemoryService creates a new financial memory service
func NewFinancialMemoryService(db *sql.DB, repo FinancialMemoryRepository) *FinancialMemoryService {
	return &FinancialMemoryService{
		db:   db,
		repo: repo,
	}
}

// LearnFromUserAction analyzes user actions and updates preferences
func (fms *FinancialMemoryService) LearnFromUserAction(ctx context.Context, userID uuid.UUID, action *UserModelingAction) error {
	log.Info().
		Str("user_id", userID.String()).
		Str("action_type", action.ActionType).
		Str("model_type", action.ModelType).
		Msg("Learning from user modeling action")

	// Get existing preferences
	preferences, err := fms.repo.GetPreferences(ctx, userID)
	if err != nil {
		// Create new preferences if none exist
		preferences = &FinancialModelingPreferences{
			UserID:                   userID,
			PreferredModelLayouts:    make(map[string]interface{}),
			FormattingPreferences:    make(map[string]interface{}),
			CalculationPreferences:   make(map[string]interface{}),
			DefaultAssumptions:       make(map[string]float64),
			PreferredSectionOrdering: []string{},
			StylePreferences:         make(map[string]interface{}),
			ValidationPreferences:    make(map[string]bool),
			CreatedAt:               time.Now(),
		}
	}

	// Extract and update preferences based on action type
	switch action.ActionType {
	case "formatting_change":
		fms.updateFormattingPreferences(preferences, action)
	case "section_organization":
		fms.updateLayoutPreferences(preferences, action)
	case "formula_creation":
		fms.updateCalculationPreferences(preferences, action)
	case "assumption_input":
		fms.updateDefaultAssumptions(preferences, action)
	case "validation_choice":
		fms.updateValidationPreferences(preferences, action)
	case "style_preference":
		fms.updateStylePreferences(preferences, action)
	}

	preferences.UpdatedAt = time.Now()

	// Save updated preferences
	return fms.repo.UpdatePreferences(ctx, userID, preferences)
}

// GetUserPreferences retrieves user preferences for financial modeling
func (fms *FinancialMemoryService) GetUserPreferences(ctx context.Context, userID uuid.UUID) (*FinancialModelingPreferences, error) {
	preferences, err := fms.repo.GetPreferences(ctx, userID)
	if err != nil {
		// Return default preferences if none exist
		return fms.getDefaultPreferences(userID), nil
	}
	return preferences, nil
}

// SuggestToolsBasedOnMemory suggests tools based on learned preferences and current context
func (fms *FinancialMemoryService) SuggestToolsBasedOnMemory(ctx context.Context, userID uuid.UUID, modelContext *FinancialModelContext) ([]string, error) {
	preferences, err := fms.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, err
	}

	var suggestedTools []string

	// Suggest tools based on learned preferences and current context
	if modelContext != nil {
		// If user frequently uses specific formatting styles
		if formatStyle, ok := preferences.FormattingPreferences["preferred_style"].(string); ok {
			if formatStyle == "professional" {
				suggestedTools = append(suggestedTools, "smart_format_cells")
			}
		}

		// If user prefers organized models
		if orgPref, ok := preferences.StylePreferences["organization_level"].(string); ok {
			if orgPref == "highly_organized" && modelContext.Structure == nil {
				suggestedTools = append(suggestedTools, "analyze_model_structure", "organize_financial_model")
			}
		}

		// If user frequently validates models
		if validatePref, ok := preferences.ValidationPreferences["auto_validate"].(bool); ok {
			if validatePref && (modelContext.ValidationStatus == nil || !modelContext.ValidationStatus.IsValid) {
				suggestedTools = append(suggestedTools, "validate_model")
			}
		}

		// Industry-specific suggestions
		switch preferences.ProfessionalStandards {
		case "PE":
			suggestedTools = append(suggestedTools, "build_financial_formula") // PE often needs IRR calculations
		case "IB":
			suggestedTools = append(suggestedTools, "create_chart") // IB often needs presentations
		case "HF":
			suggestedTools = append(suggestedTools, "analyze_data") // HF often needs data analysis
		}
	}

	return fms.generateIntelligentToolSuggestions(preferences, modelContext), nil
}

// generateIntelligentToolSuggestions generates tool suggestions based on preferences and context
func (fms *FinancialMemoryService) generateIntelligentToolSuggestions(preferences *FinancialModelingPreferences, context *FinancialModelContext) []string {
	var suggestions []string

	// Suggest parallel execution for efficiency-focused users
	if efficiencyPref, ok := preferences.StylePreferences["efficiency_focus"].(bool); ok && efficiencyPref {
		suggestions = append(suggestions, "parallel_analysis")
	}

	// Suggest formatting tools for format-conscious users
	if formatFreq, ok := preferences.FormattingPreferences["formatting_frequency"].(float64); ok && formatFreq > 0.7 {
		suggestions = append(suggestions, "smart_format_cells", "format_range")
	}

	// Suggest validation tools for validation-focused users
	if validateFreq, ok := preferences.ValidationPreferences["validation_frequency"].(float64); ok && validateFreq > 0.5 {
		suggestions = append(suggestions, "validate_model")
	}

	return suggestions
}

// Helper methods for updating different types of preferences

func (fms *FinancialMemoryService) updateFormattingPreferences(preferences *FinancialModelingPreferences, action *UserModelingAction) {
	if formatType, ok := action.Context["format_type"].(string); ok {
		// Track preferred format types
		if preferences.FormattingPreferences["preferred_formats"] == nil {
			preferences.FormattingPreferences["preferred_formats"] = make(map[string]int)
		}
		
		formatCounts := preferences.FormattingPreferences["preferred_formats"].(map[string]int)
		formatCounts[formatType]++
		preferences.FormattingPreferences["preferred_formats"] = formatCounts
	}

	if colorScheme, ok := action.Context["color_scheme"].(string); ok {
		preferences.FormattingPreferences["preferred_color_scheme"] = colorScheme
	}
}

func (fms *FinancialMemoryService) updateLayoutPreferences(preferences *FinancialModelingPreferences, action *UserModelingAction) {
	if layout, ok := action.Context["layout_type"].(string); ok {
		preferences.PreferredModelLayouts[action.ModelType] = layout
	}

	if sectionOrder, ok := action.Context["section_order"].([]string); ok {
		preferences.PreferredSectionOrdering = sectionOrder
	}
}

func (fms *FinancialMemoryService) updateCalculationPreferences(preferences *FinancialModelingPreferences, action *UserModelingAction) {
	if formulaType, ok := action.Context["formula_type"].(string); ok {
		if preferences.CalculationPreferences["preferred_formulas"] == nil {
			preferences.CalculationPreferences["preferred_formulas"] = make(map[string]int)
		}
		
		formulaCounts := preferences.CalculationPreferences["preferred_formulas"].(map[string]int)
		formulaCounts[formulaType]++
		preferences.CalculationPreferences["preferred_formulas"] = formulaCounts
	}
}

func (fms *FinancialMemoryService) updateDefaultAssumptions(preferences *FinancialModelingPreferences, action *UserModelingAction) {
	if discountRate, ok := action.Context["discount_rate"].(float64); ok {
		preferences.DefaultAssumptions["discount_rate"] = discountRate
	}
	
	if terminalGrowth, ok := action.Context["terminal_growth"].(float64); ok {
		preferences.DefaultAssumptions["terminal_growth"] = terminalGrowth
	}
	
	if taxRate, ok := action.Context["tax_rate"].(float64); ok {
		preferences.DefaultAssumptions["tax_rate"] = taxRate
	}
}

func (fms *FinancialMemoryService) updateValidationPreferences(preferences *FinancialModelingPreferences, action *UserModelingAction) {
	if autoValidate, ok := action.Context["auto_validate"].(bool); ok {
		preferences.ValidationPreferences["auto_validate"] = autoValidate
	}
	
	if strictMode, ok := action.Context["strict_validation"].(bool); ok {
		preferences.ValidationPreferences["strict_mode"] = strictMode
	}
}

func (fms *FinancialMemoryService) updateStylePreferences(preferences *FinancialModelingPreferences, action *UserModelingAction) {
	if style, ok := action.Context["style_preference"].(string); ok {
		preferences.StylePreferences["overall_style"] = style
	}
	
	if industry, ok := action.Context["industry"].(string); ok {
		preferences.ProfessionalStandards = industry
	}
}

// getDefaultPreferences returns default preferences for new users
func (fms *FinancialMemoryService) getDefaultPreferences(userID uuid.UUID) *FinancialModelingPreferences {
	return &FinancialModelingPreferences{
		UserID:                   userID,
		PreferredModelLayouts:    map[string]interface{}{
			"DCF": "horizontal",
			"LBO": "horizontal", 
			"M&A": "vertical",
		},
		FormattingPreferences:    map[string]interface{}{
			"preferred_style": "professional",
			"color_scheme": "blue_black_green",
		},
		CalculationPreferences:   map[string]interface{}{
			"formula_complexity": "intermediate",
		},
		ProfessionalStandards:    "General",
		DefaultAssumptions:       map[string]float64{
			"discount_rate": 0.10,
			"terminal_growth": 0.025,
			"tax_rate": 0.25,
		},
		PreferredSectionOrdering: []string{"assumptions", "calculations", "outputs"},
		StylePreferences:         map[string]interface{}{
			"organization_level": "organized",
			"efficiency_focus": true,
		},
		ValidationPreferences:    map[string]bool{
			"auto_validate": true,
			"strict_mode": false,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// ExtractLearningDataFromInteraction extracts learning data from user interactions
func (fms *FinancialMemoryService) ExtractLearningDataFromInteraction(ctx context.Context, userID uuid.UUID, userRequest string, toolResults []ParallelToolResult) *UserModelingAction {
	action := &UserModelingAction{
		UserID:    userID,
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
	} else if strings.Contains(requestLower, "assumption") || strings.Contains(requestLower, "rate") {
		action.ActionType = "assumption_input"
	} else {
		action.ActionType = "general_modeling"
	}

	// Extract context from tool results
	for _, result := range toolResults {
		if !result.IsError {
			// Store performance preferences
			if result.Duration < time.Millisecond*500 {
				action.Context["prefers_fast_execution"] = true
			}
			
			// Store tool usage patterns
			if action.Context["tools_used"] == nil {
				action.Context["tools_used"] = []string{}
			}
			toolsUsed := action.Context["tools_used"].([]string)
			toolsUsed = append(toolsUsed, result.ToolName)
			action.Context["tools_used"] = toolsUsed
		}
	}

	return action
}