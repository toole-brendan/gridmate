package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/database"
	"github.com/gridmate/backend/internal/models"
)

type workspaceRepository struct {
	db *database.DB
}

func NewWorkspaceRepository(db *database.DB) WorkspaceRepository {
	return &workspaceRepository{db: db}
}

func (r *workspaceRepository) Create(ctx context.Context, workspace *models.Workspace) error {
	query := `
		INSERT INTO workspaces (name, description, owner_id, settings)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		workspace.Name,
		workspace.Description,
		workspace.OwnerID,
		workspace.Settings,
	).Scan(&workspace.ID, &workspace.CreatedAt, &workspace.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create workspace: %w", err)
	}

	// Add owner as a member
	member := &models.WorkspaceMember{
		WorkspaceID: workspace.ID,
		UserID:      workspace.OwnerID,
		Role:        "owner",
		Permissions: []byte("{}"),
	}
	
	return r.AddMember(ctx, member)
}

func (r *workspaceRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Workspace, error) {
	workspace := &models.Workspace{}
	query := `
		SELECT id, name, description, owner_id, settings, created_at, updated_at
		FROM workspaces
		WHERE id = $1`

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&workspace.ID,
		&workspace.Name,
		&workspace.Description,
		&workspace.OwnerID,
		&workspace.Settings,
		&workspace.CreatedAt,
		&workspace.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("workspace not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace: %w", err)
	}

	return workspace, nil
}

func (r *workspaceRepository) GetByOwnerID(ctx context.Context, ownerID uuid.UUID) ([]*models.Workspace, error) {
	query := `
		SELECT id, name, description, owner_id, settings, created_at, updated_at
		FROM workspaces
		WHERE owner_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, ownerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspaces: %w", err)
	}
	defer rows.Close()

	var workspaces []*models.Workspace
	for rows.Next() {
		workspace := &models.Workspace{}
		err := rows.Scan(
			&workspace.ID,
			&workspace.Name,
			&workspace.Description,
			&workspace.OwnerID,
			&workspace.Settings,
			&workspace.CreatedAt,
			&workspace.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workspace: %w", err)
		}
		workspaces = append(workspaces, workspace)
	}

	return workspaces, nil
}

func (r *workspaceRepository) Update(ctx context.Context, id uuid.UUID, updates *models.UpdateWorkspaceRequest) error {
	query := `UPDATE workspaces SET `
	args := []interface{}{}
	argIndex := 1

	if updates.Name != nil {
		query += fmt.Sprintf("name = $%d, ", argIndex)
		args = append(args, *updates.Name)
		argIndex++
	}
	if updates.Description != nil {
		query += fmt.Sprintf("description = $%d, ", argIndex)
		args = append(args, *updates.Description)
		argIndex++
	}
	if updates.Settings != nil {
		query += fmt.Sprintf("settings = $%d, ", argIndex)
		args = append(args, updates.Settings)
		argIndex++
	}

	// Remove trailing comma and space
	query = query[:len(query)-2]
	
	query += fmt.Sprintf(" WHERE id = $%d", argIndex)
	args = append(args, id)

	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update workspace: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("workspace not found")
	}

	return nil
}

func (r *workspaceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM workspaces WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete workspace: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("workspace not found")
	}

	return nil
}

func (r *workspaceRepository) AddMember(ctx context.Context, member *models.WorkspaceMember) error {
	query := `
		INSERT INTO workspace_members (workspace_id, user_id, role, permissions)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (workspace_id, user_id) DO UPDATE
		SET role = EXCLUDED.role, permissions = EXCLUDED.permissions
		RETURNING joined_at`

	err := r.db.QueryRowContext(ctx, query,
		member.WorkspaceID,
		member.UserID,
		member.Role,
		member.Permissions,
	).Scan(&member.JoinedAt)

	if err != nil {
		return fmt.Errorf("failed to add workspace member: %w", err)
	}

	return nil
}

func (r *workspaceRepository) RemoveMember(ctx context.Context, workspaceID, userID uuid.UUID) error {
	query := `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`
	
	result, err := r.db.ExecContext(ctx, query, workspaceID, userID)
	if err != nil {
		return fmt.Errorf("failed to remove workspace member: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("member not found")
	}

	return nil
}

func (r *workspaceRepository) GetMembers(ctx context.Context, workspaceID uuid.UUID) ([]*models.WorkspaceMember, error) {
	query := `
		SELECT wm.workspace_id, wm.user_id, wm.role, wm.permissions, wm.joined_at,
			   u.id, u.email, u.first_name, u.last_name, u.role as user_role, u.is_active
		FROM workspace_members wm
		JOIN users u ON wm.user_id = u.id
		WHERE wm.workspace_id = $1
		ORDER BY wm.joined_at DESC`

	rows, err := r.db.QueryContext(ctx, query, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace members: %w", err)
	}
	defer rows.Close()

	var members []*models.WorkspaceMember
	for rows.Next() {
		member := &models.WorkspaceMember{
			User: &models.User{},
		}
		err := rows.Scan(
			&member.WorkspaceID,
			&member.UserID,
			&member.Role,
			&member.Permissions,
			&member.JoinedAt,
			&member.User.ID,
			&member.User.Email,
			&member.User.FirstName,
			&member.User.LastName,
			&member.User.Role,
			&member.User.IsActive,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workspace member: %w", err)
		}
		members = append(members, member)
	}

	return members, nil
}

func (r *workspaceRepository) GetUserWorkspaces(ctx context.Context, userID uuid.UUID) ([]*models.Workspace, error) {
	query := `
		SELECT w.id, w.name, w.description, w.owner_id, w.settings, w.created_at, w.updated_at
		FROM workspaces w
		JOIN workspace_members wm ON w.id = wm.workspace_id
		WHERE wm.user_id = $1
		ORDER BY w.created_at DESC`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user workspaces: %w", err)
	}
	defer rows.Close()

	var workspaces []*models.Workspace
	for rows.Next() {
		workspace := &models.Workspace{}
		err := rows.Scan(
			&workspace.ID,
			&workspace.Name,
			&workspace.Description,
			&workspace.OwnerID,
			&workspace.Settings,
			&workspace.CreatedAt,
			&workspace.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan workspace: %w", err)
		}
		workspaces = append(workspaces, workspace)
	}

	return workspaces, nil
}

func (r *workspaceRepository) IsMember(ctx context.Context, workspaceID, userID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2)`
	
	var exists bool
	err := r.db.QueryRowContext(ctx, query, workspaceID, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check workspace membership: %w", err)
	}

	return exists, nil
}

func (r *workspaceRepository) GetMemberRole(ctx context.Context, workspaceID, userID uuid.UUID) (string, error) {
	query := `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`
	
	var role string
	err := r.db.QueryRowContext(ctx, query, workspaceID, userID).Scan(&role)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("member not found")
	}
	if err != nil {
		return "", fmt.Errorf("failed to get member role: %w", err)
	}

	return role, nil
}