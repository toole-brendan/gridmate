package models

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type APIKey struct {
	ID         uuid.UUID       `json:"id" db:"id"`
	UserID     uuid.UUID       `json:"user_id" db:"user_id"`
	Name       string          `json:"name" db:"name"`
	KeyHash    string          `json:"-" db:"key_hash"`
	KeyPrefix  string          `json:"key_prefix" db:"key_prefix"`
	Permissions json.RawMessage `json:"permissions" db:"permissions"`
	RateLimit  int             `json:"rate_limit" db:"rate_limit"`
	LastUsedAt *time.Time      `json:"last_used_at" db:"last_used_at"`
	ExpiresAt  *time.Time      `json:"expires_at" db:"expires_at"`
	IsActive   bool            `json:"is_active" db:"is_active"`
	CreatedAt  time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at" db:"updated_at"`
}

type Session struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	UserID           uuid.UUID  `json:"user_id" db:"user_id"`
	TokenHash        string     `json:"-" db:"token_hash"`
	RefreshTokenHash string     `json:"-" db:"refresh_token_hash"`
	IPAddress        string     `json:"ip_address" db:"ip_address"`
	UserAgent        string     `json:"user_agent" db:"user_agent"`
	ExpiresAt        time.Time  `json:"expires_at" db:"expires_at"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
}

type OAuthProvider struct {
	ID             uuid.UUID       `json:"id" db:"id"`
	UserID         uuid.UUID       `json:"user_id" db:"user_id"`
	Provider       string          `json:"provider" db:"provider"`
	ProviderUserID string          `json:"provider_user_id" db:"provider_user_id"`
	Email          *string         `json:"email" db:"email"`
	Metadata       json.RawMessage `json:"metadata" db:"metadata"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at" db:"updated_at"`
}

type CreateAPIKeyRequest struct {
	Name        string          `json:"name" validate:"required,min=3,max=255"`
	Permissions json.RawMessage `json:"permissions"`
	ExpiresAt   *time.Time      `json:"expires_at"`
}

type CreateAPIKeyResponse struct {
	APIKey    *APIKey `json:"api_key"`
	PlainKey  string  `json:"plain_key"`
}

func GenerateAPIKey() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return "sk_" + base64.URLEncoding.EncodeToString(b)[:43] // Remove padding
}