package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/database"
	"github.com/gridmate/backend/internal/models"
)

type apiKeyRepository struct {
	db *database.DB
}

func NewAPIKeyRepository(db *database.DB) APIKeyRepository {
	return &apiKeyRepository{db: db}
}

func (r *apiKeyRepository) Create(ctx context.Context, userID uuid.UUID, name, keyHash, keyPrefix string) (*uuid.UUID, error) {
	var id uuid.UUID
	query := `
		INSERT INTO api_keys (user_id, name, key_hash, key_prefix, permissions, rate_limit, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

	err := r.db.QueryRowContext(ctx, query,
		userID,
		name,
		keyHash,
		keyPrefix,
		[]byte("{}"), // Default empty permissions
		1000,         // Default rate limit
		true,         // Active by default
	).Scan(&id)

	if err != nil {
		return nil, fmt.Errorf("failed to create API key: %w", err)
	}

	return &id, nil
}

func (r *apiKeyRepository) GetByKeyHash(ctx context.Context, keyHash string) (*models.APIKey, error) {
	key := &models.APIKey{}
	query := `
		SELECT id, user_id, name, key_hash, key_prefix, permissions, rate_limit, 
			   last_used_at, expires_at, is_active, created_at, updated_at
		FROM api_keys
		WHERE key_hash = $1`

	err := r.db.QueryRowContext(ctx, query, keyHash).Scan(
		&key.ID,
		&key.UserID,
		&key.Name,
		&key.KeyHash,
		&key.KeyPrefix,
		&key.Permissions,
		&key.RateLimit,
		&key.LastUsedAt,
		&key.ExpiresAt,
		&key.IsActive,
		&key.CreatedAt,
		&key.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("API key not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get API key: %w", err)
	}

	// Check if key is expired
	if key.ExpiresAt != nil && time.Now().After(*key.ExpiresAt) {
		return nil, fmt.Errorf("API key expired")
	}

	return key, nil
}

func (r *apiKeyRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.APIKey, error) {
	query := `
		SELECT id, user_id, name, key_hash, key_prefix, permissions, rate_limit, 
			   last_used_at, expires_at, is_active, created_at, updated_at
		FROM api_keys
		WHERE user_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get API keys: %w", err)
	}
	defer rows.Close()

	var keys []*models.APIKey
	for rows.Next() {
		key := &models.APIKey{}
		err := rows.Scan(
			&key.ID,
			&key.UserID,
			&key.Name,
			&key.KeyHash,
			&key.KeyPrefix,
			&key.Permissions,
			&key.RateLimit,
			&key.LastUsedAt,
			&key.ExpiresAt,
			&key.IsActive,
			&key.CreatedAt,
			&key.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan API key: %w", err)
		}
		keys = append(keys, key)
	}

	return keys, nil
}

func (r *apiKeyRepository) UpdateLastUsed(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE api_keys SET last_used_at = $1 WHERE id = $2`
	
	_, err := r.db.ExecContext(ctx, query, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update API key last used: %w", err)
	}

	return nil
}

func (r *apiKeyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM api_keys WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete API key: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("API key not found")
	}

	return nil
}

func (r *apiKeyRepository) IsActive(ctx context.Context, keyHash string) (bool, error) {
	var isActive bool
	var expiresAt sql.NullTime
	
	query := `SELECT is_active, expires_at FROM api_keys WHERE key_hash = $1`
	
	err := r.db.QueryRowContext(ctx, query, keyHash).Scan(&isActive, &expiresAt)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check API key status: %w", err)
	}

	// Check if expired
	if expiresAt.Valid && time.Now().After(expiresAt.Time) {
		return false, nil
	}

	return isActive, nil
}