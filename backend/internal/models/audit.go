package models

import (
	"encoding/json"
	"net"
	"time"

	"github.com/google/uuid"
)

type AuditLog struct {
	ID         uuid.UUID       `json:"id" db:"id"`
	UserID     *uuid.UUID      `json:"user_id" db:"user_id"`
	Action     string          `json:"action" db:"action"`
	EntityType *string         `json:"entity_type" db:"entity_type"`
	EntityID   *uuid.UUID      `json:"entity_id" db:"entity_id"`
	Changes    json.RawMessage `json:"changes" db:"changes"`
	IPAddress  *net.IP         `json:"ip_address" db:"ip_address"`
	UserAgent  *string         `json:"user_agent" db:"user_agent"`
	CreatedAt  time.Time       `json:"created_at" db:"created_at"`
}

type CreateAuditLogRequest struct {
	UserID     *uuid.UUID      `json:"user_id"`
	Action     string          `json:"action" validate:"required,max=100"`
	EntityType *string         `json:"entity_type" validate:"max=50"`
	EntityID   *uuid.UUID      `json:"entity_id"`
	Changes    json.RawMessage `json:"changes"`
	IPAddress  string          `json:"ip_address"`
	UserAgent  string          `json:"user_agent"`
}

type AuditLogFilter struct {
	UserID     *uuid.UUID `json:"user_id"`
	EntityType *string    `json:"entity_type"`
	EntityID   *uuid.UUID `json:"entity_id"`
	Action     *string    `json:"action"`
	StartDate  *time.Time `json:"start_date"`
	EndDate    *time.Time `json:"end_date"`
	Limit      int        `json:"limit"`
	Offset     int        `json:"offset"`
}