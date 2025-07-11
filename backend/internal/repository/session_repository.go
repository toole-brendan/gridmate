package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/database"
)

type sessionRepository struct {
	db *database.DB
}

func NewSessionRepository(db *database.DB) SessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) Create(ctx context.Context, userID uuid.UUID, tokenHash, refreshTokenHash string, expiresAt int64) error {
	query := `
		INSERT INTO sessions (user_id, token_hash, refresh_token_hash, expires_at)
		VALUES ($1, $2, $3, $4)`

	expiry := time.Unix(expiresAt, 0)
	_, err := r.db.ExecContext(ctx, query, userID, tokenHash, refreshTokenHash, expiry)
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	return nil
}

func (r *sessionRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*uuid.UUID, error) {
	var userID uuid.UUID
	var expiresAt time.Time
	
	query := `
		SELECT user_id, expires_at 
		FROM sessions 
		WHERE token_hash = $1`

	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(&userID, &expiresAt)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Check if session is expired
	if time.Now().After(expiresAt) {
		// Clean up expired session
		go r.Delete(context.Background(), tokenHash)
		return nil, fmt.Errorf("session expired")
	}

	return &userID, nil
}

func (r *sessionRepository) GetByRefreshTokenHash(ctx context.Context, refreshTokenHash string) (*uuid.UUID, error) {
	var userID uuid.UUID
	var expiresAt time.Time
	
	query := `
		SELECT user_id, expires_at 
		FROM sessions 
		WHERE refresh_token_hash = $1`

	err := r.db.QueryRowContext(ctx, query, refreshTokenHash).Scan(&userID, &expiresAt)
	if err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Refresh tokens have longer expiry, but still check
	if time.Now().After(expiresAt.Add(7 * 24 * time.Hour)) {
		go r.Delete(context.Background(), refreshTokenHash)
		return nil, fmt.Errorf("refresh token expired")
	}

	return &userID, nil
}

func (r *sessionRepository) Delete(ctx context.Context, tokenHash string) error {
	query := `DELETE FROM sessions WHERE token_hash = $1 OR refresh_token_hash = $1`
	
	_, err := r.db.ExecContext(ctx, query, tokenHash)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	return nil
}

func (r *sessionRepository) DeleteByUserID(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM sessions WHERE user_id = $1`
	
	_, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete user sessions: %w", err)
	}

	return nil
}

func (r *sessionRepository) CleanupExpired(ctx context.Context) error {
	query := `DELETE FROM sessions WHERE expires_at < $1`
	
	_, err := r.db.ExecContext(ctx, query, time.Now())
	if err != nil {
		return fmt.Errorf("failed to cleanup expired sessions: %w", err)
	}

	return nil
}