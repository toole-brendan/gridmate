package repository

import (
	"github.com/gridmate/backend/internal/database"
)

// NewRepositories creates and returns all repository instances
func NewRepositories(db *database.DB) *Repositories {
	return &Repositories{
		Users:      NewUserRepository(db),
		Workspaces: NewWorkspaceRepository(db),
		AuditLogs:  NewAuditLogRepository(db),
		Sessions:   NewSessionRepository(db),
		APIKeys:    NewAPIKeyRepository(db),
		Documents:  NewDocumentRepository(db),
		Embeddings: NewEmbeddingRepository(db),
	}
}