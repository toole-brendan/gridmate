package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/gridmate/backend/internal/services/ai"
)

// financialMemoryRepository implements the FinancialMemoryRepository interface
type financialMemoryRepository struct {
	db *sql.DB
}

// NewFinancialMemoryRepository creates a new financial memory repository
func NewFinancialMemoryRepository(db *sql.DB) ai.FinancialMemoryRepository {
	return &financialMemoryRepository{
		db: db,
	}
}

// GetPreferences retrieves user financial modeling preferences
func (r *financialMemoryRepository) GetPreferences(ctx context.Context, userID uuid.UUID) (*ai.FinancialModelingPreferences, error) {
	query := `
		SELECT user_id, preferred_layouts, formatting_prefs, calculation_prefs, 
		       professional_standards, default_assumptions, section_ordering, 
		       style_preferences, validation_prefs, created_at, updated_at
		FROM financial_modeling_preferences 
		WHERE user_id = $1`

	var prefs ai.FinancialModelingPreferences
	var preferredLayoutsJSON, formattingPrefsJSON, calculationPrefsJSON string
	var defaultAssumptionsJSON, sectionOrderingJSON, stylePrefsJSON, validationPrefsJSON string

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&prefs.UserID,
		&preferredLayoutsJSON,
		&formattingPrefsJSON,
		&calculationPrefsJSON,
		&prefs.ProfessionalStandards,
		&defaultAssumptionsJSON,
		&sectionOrderingJSON,
		&stylePrefsJSON,
		&validationPrefsJSON,
		&prefs.CreatedAt,
		&prefs.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			log.Debug().
				Str("user_id", userID.String()).
				Msg("No financial preferences found for user")
			return nil, nil // No preferences found
		}
		return nil, fmt.Errorf("failed to get financial preferences: %w", err)
	}

	// Parse JSON fields
	if err := json.Unmarshal([]byte(preferredLayoutsJSON), &prefs.PreferredModelLayouts); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal preferred layouts")
		prefs.PreferredModelLayouts = make(map[string]interface{})
	}

	if err := json.Unmarshal([]byte(formattingPrefsJSON), &prefs.FormattingPreferences); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal formatting preferences")
		prefs.FormattingPreferences = make(map[string]interface{})
	}

	if err := json.Unmarshal([]byte(calculationPrefsJSON), &prefs.CalculationPreferences); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal calculation preferences")
		prefs.CalculationPreferences = make(map[string]interface{})
	}

	if err := json.Unmarshal([]byte(defaultAssumptionsJSON), &prefs.DefaultAssumptions); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal default assumptions")
		prefs.DefaultAssumptions = make(map[string]float64)
	}

	if err := json.Unmarshal([]byte(sectionOrderingJSON), &prefs.PreferredSectionOrdering); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal section ordering")
		prefs.PreferredSectionOrdering = []string{"assumptions", "calculations", "outputs", "summary"}
	}

	if err := json.Unmarshal([]byte(stylePrefsJSON), &prefs.StylePreferences); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal style preferences")
		prefs.StylePreferences = make(map[string]interface{})
	}

	if err := json.Unmarshal([]byte(validationPrefsJSON), &prefs.ValidationPreferences); err != nil {
		log.Error().Err(err).Msg("Failed to unmarshal validation preferences")
		prefs.ValidationPreferences = make(map[string]bool)
	}

	log.Debug().
		Str("user_id", userID.String()).
		Str("standards", prefs.ProfessionalStandards).
		Msg("Retrieved financial modeling preferences")

	return &prefs, nil
}

// CreatePreferences creates new financial modeling preferences
func (r *financialMemoryRepository) CreatePreferences(ctx context.Context, preferences *ai.FinancialModelingPreferences) error {
	// Marshal JSON fields
	preferredLayoutsJSON, _ := json.Marshal(preferences.PreferredModelLayouts)
	formattingPrefsJSON, _ := json.Marshal(preferences.FormattingPreferences)
	calculationPrefsJSON, _ := json.Marshal(preferences.CalculationPreferences)
	defaultAssumptionsJSON, _ := json.Marshal(preferences.DefaultAssumptions)
	sectionOrderingJSON, _ := json.Marshal(preferences.PreferredSectionOrdering)
	stylePrefsJSON, _ := json.Marshal(preferences.StylePreferences)
	validationPrefsJSON, _ := json.Marshal(preferences.ValidationPreferences)

	query := `
		INSERT INTO financial_modeling_preferences 
		(user_id, preferred_layouts, formatting_prefs, calculation_prefs, 
		 professional_standards, default_assumptions, section_ordering, 
		 style_preferences, validation_prefs)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err := r.db.ExecContext(ctx, query,
		preferences.UserID,
		preferredLayoutsJSON,
		formattingPrefsJSON,
		calculationPrefsJSON,
		preferences.ProfessionalStandards,
		defaultAssumptionsJSON,
		sectionOrderingJSON,
		stylePrefsJSON,
		validationPrefsJSON,
	)

	if err != nil {
		return fmt.Errorf("failed to create financial preferences: %w", err)
	}

	log.Info().
		Str("user_id", preferences.UserID.String()).
		Str("standards", preferences.ProfessionalStandards).
		Msg("Created financial modeling preferences")

	return nil
}

// UpdatePreferences updates existing financial modeling preferences
func (r *financialMemoryRepository) UpdatePreferences(ctx context.Context, userID uuid.UUID, preferences *ai.FinancialModelingPreferences) error {
	// Marshal JSON fields
	preferredLayoutsJSON, _ := json.Marshal(preferences.PreferredModelLayouts)
	formattingPrefsJSON, _ := json.Marshal(preferences.FormattingPreferences)
	calculationPrefsJSON, _ := json.Marshal(preferences.CalculationPreferences)
	defaultAssumptionsJSON, _ := json.Marshal(preferences.DefaultAssumptions)
	sectionOrderingJSON, _ := json.Marshal(preferences.PreferredSectionOrdering)
	stylePrefsJSON, _ := json.Marshal(preferences.StylePreferences)
	validationPrefsJSON, _ := json.Marshal(preferences.ValidationPreferences)

	query := `
		UPDATE financial_modeling_preferences 
		SET preferred_layouts = $2, 
		    formatting_prefs = $3,
		    calculation_prefs = $4,
		    professional_standards = $5,
		    default_assumptions = $6,
		    section_ordering = $7,
		    style_preferences = $8,
		    validation_prefs = $9,
		    updated_at = NOW()
		WHERE user_id = $1`

	result, err := r.db.ExecContext(ctx, query,
		userID,
		preferredLayoutsJSON,
		formattingPrefsJSON,
		calculationPrefsJSON,
		preferences.ProfessionalStandards,
		defaultAssumptionsJSON,
		sectionOrderingJSON,
		stylePrefsJSON,
		validationPrefsJSON,
	)

	if err != nil {
		return fmt.Errorf("failed to update financial preferences: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no preferences found for user %s", userID.String())
	}

	log.Info().
		Str("user_id", userID.String()).
		Str("standards", preferences.ProfessionalStandards).
		Msg("Updated financial modeling preferences")

	return nil
}

// DeletePreferences deletes financial modeling preferences
func (r *financialMemoryRepository) DeletePreferences(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM financial_modeling_preferences WHERE user_id = $1`

	result, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete financial preferences: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("no preferences found for user %s", userID.String())
	}

	log.Info().
		Str("user_id", userID.String()).
		Msg("Deleted financial modeling preferences")

	return nil
}