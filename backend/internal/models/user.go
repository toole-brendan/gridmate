package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	Email         string     `json:"email" db:"email"`
	PasswordHash  string     `json:"-" db:"password_hash"`
	FirstName     *string    `json:"first_name" db:"first_name"`
	LastName      *string    `json:"last_name" db:"last_name"`
	Role          string     `json:"role" db:"role"`
	IsActive      bool       `json:"is_active" db:"is_active"`
	EmailVerified bool       `json:"email_verified" db:"email_verified"`
	AzureADID     *string    `json:"azure_ad_id,omitempty" db:"azure_ad_id"`
	AzureTenantID *string    `json:"azure_tenant_id,omitempty" db:"azure_tenant_id"`
	ExternalID    *string    `json:"external_id,omitempty" db:"external_id"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

type CreateUserRequest struct {
	Email         string  `json:"email" validate:"required,email"`
	Password      string  `json:"password" validate:"required,min=8"`
	FirstName     *string `json:"first_name"`
	LastName      *string `json:"last_name"`
	AzureADID     *string `json:"azure_ad_id"`
	AzureTenantID *string `json:"azure_tenant_id"`
}

type UpdateUserRequest struct {
	FirstName     *string `json:"first_name"`
	LastName      *string `json:"last_name"`
	Role          *string `json:"role"`
	IsActive      *bool   `json:"is_active"`
	EmailVerified *bool   `json:"email_verified"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type LoginResponse struct {
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
	User         User      `json:"user"`
	ExpiresAt    time.Time `json:"expires_at"`
}