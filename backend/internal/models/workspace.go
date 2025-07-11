package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Workspace struct {
	ID          uuid.UUID       `json:"id" db:"id"`
	Name        string          `json:"name" db:"name"`
	Description *string         `json:"description" db:"description"`
	OwnerID     uuid.UUID       `json:"owner_id" db:"owner_id"`
	Settings    json.RawMessage `json:"settings" db:"settings"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at" db:"updated_at"`
}

type WorkspaceMember struct {
	WorkspaceID uuid.UUID       `json:"workspace_id" db:"workspace_id"`
	UserID      uuid.UUID       `json:"user_id" db:"user_id"`
	Role        string          `json:"role" db:"role"`
	Permissions json.RawMessage `json:"permissions" db:"permissions"`
	JoinedAt    time.Time       `json:"joined_at" db:"joined_at"`
	User        *User           `json:"user,omitempty"`
}

type CreateWorkspaceRequest struct {
	Name        string          `json:"name" validate:"required,min=3,max=255"`
	Description *string         `json:"description"`
	Settings    json.RawMessage `json:"settings"`
}

type UpdateWorkspaceRequest struct {
	Name        *string         `json:"name" validate:"min=3,max=255"`
	Description *string         `json:"description"`
	Settings    json.RawMessage `json:"settings"`
}

type AddWorkspaceMemberRequest struct {
	UserID      uuid.UUID       `json:"user_id" validate:"required"`
	Role        string          `json:"role" validate:"required,oneof=owner admin member viewer"`
	Permissions json.RawMessage `json:"permissions"`
}