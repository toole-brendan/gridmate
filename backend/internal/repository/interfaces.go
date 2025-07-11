package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/models"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByAzureADID(ctx context.Context, azureADID string) (*models.User, error)
	Update(ctx context.Context, id uuid.UUID, updates *models.UpdateUserRequest) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, limit, offset int) ([]*models.User, error)
	Count(ctx context.Context) (int64, error)
}

type WorkspaceRepository interface {
	Create(ctx context.Context, workspace *models.Workspace) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Workspace, error)
	GetByOwnerID(ctx context.Context, ownerID uuid.UUID) ([]*models.Workspace, error)
	Update(ctx context.Context, id uuid.UUID, updates *models.UpdateWorkspaceRequest) error
	Delete(ctx context.Context, id uuid.UUID) error
	
	// Member operations
	AddMember(ctx context.Context, member *models.WorkspaceMember) error
	RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) error
	GetMembers(ctx context.Context, workspaceID uuid.UUID) ([]*models.WorkspaceMember, error)
	GetUserWorkspaces(ctx context.Context, userID uuid.UUID) ([]*models.Workspace, error)
	IsMember(ctx context.Context, workspaceID, userID uuid.UUID) (bool, error)
	GetMemberRole(ctx context.Context, workspaceID, userID uuid.UUID) (string, error)
}

type AuditLogRepository interface {
	Create(ctx context.Context, log *models.AuditLog) error
	List(ctx context.Context, filter *models.AuditLogFilter) ([]*models.AuditLog, error)
	Count(ctx context.Context, filter *models.AuditLogFilter) (int64, error)
}

type SessionRepository interface {
	Create(ctx context.Context, userID uuid.UUID, tokenHash, refreshTokenHash string, expiresAt int64) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*uuid.UUID, error)
	GetByRefreshTokenHash(ctx context.Context, refreshTokenHash string) (*uuid.UUID, error)
	Delete(ctx context.Context, tokenHash string) error
	DeleteByUserID(ctx context.Context, userID uuid.UUID) error
	CleanupExpired(ctx context.Context) error
}

type APIKeyRepository interface {
	Create(ctx context.Context, apiKey *models.APIKey, plainKey string) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.APIKey, error)
	GetByKeyHash(ctx context.Context, keyHash string) (*models.APIKey, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]*models.APIKey, error)
	UpdateLastUsed(ctx context.Context, id uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
	IsActive(ctx context.Context, keyHash string) (bool, error)
	ValidateAPIKey(ctx context.Context, plainKey string) (*models.APIKey, error)
}

type DocumentRepository interface {
	Create(ctx context.Context, doc *models.Document) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]*models.Document, error)
	Update(ctx context.Context, doc *models.Document) error
	Delete(ctx context.Context, id uuid.UUID) error
	Search(ctx context.Context, userID uuid.UUID, query string, limit int) ([]*models.Document, error)
}

type EmbeddingRepository interface {
	Create(ctx context.Context, embedding *models.Embedding) error
	BatchCreate(ctx context.Context, embeddings []*models.Embedding) error
	GetByDocumentID(ctx context.Context, documentID uuid.UUID) ([]*models.Embedding, error)
	SearchSimilar(ctx context.Context, userID uuid.UUID, embedding []float32, limit int) ([]*models.Embedding, error)
	DeleteByDocumentID(ctx context.Context, documentID uuid.UUID) error
}

type Repositories struct {
	Users      UserRepository
	Workspaces WorkspaceRepository
	AuditLogs  AuditLogRepository
	Sessions   SessionRepository
	APIKeys    APIKeyRepository
	Documents  DocumentRepository
	Embeddings EmbeddingRepository
}