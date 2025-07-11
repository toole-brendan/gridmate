package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/database"
	"github.com/gridmate/backend/internal/models"
)

type userRepository struct {
	db *database.DB
}

func NewUserRepository(db *database.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (email, password_hash, first_name, last_name, role, 
			is_active, email_verified, azure_ad_id, azure_tenant_id, external_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query,
		user.Email,
		user.PasswordHash,
		user.FirstName,
		user.LastName,
		user.Role,
		user.IsActive,
		user.EmailVerified,
		user.AzureADID,
		user.AzureTenantID,
		user.ExternalID,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, 
			is_active, email_verified, azure_ad_id, azure_tenant_id, 
			external_id, created_at, updated_at
		FROM users
		WHERE id = $1`

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerified,
		&user.AzureADID,
		&user.AzureTenantID,
		&user.ExternalID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, 
			is_active, email_verified, azure_ad_id, azure_tenant_id, 
			external_id, created_at, updated_at
		FROM users
		WHERE email = $1`

	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerified,
		&user.AzureADID,
		&user.AzureTenantID,
		&user.ExternalID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *userRepository) GetByAzureADID(ctx context.Context, azureADID string) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, 
			is_active, email_verified, azure_ad_id, azure_tenant_id, 
			external_id, created_at, updated_at
		FROM users
		WHERE azure_ad_id = $1`

	err := r.db.QueryRowContext(ctx, query, azureADID).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.IsActive,
		&user.EmailVerified,
		&user.AzureADID,
		&user.AzureTenantID,
		&user.ExternalID,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("user not found")
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (r *userRepository) Update(ctx context.Context, id uuid.UUID, updates *models.UpdateUserRequest) error {
	query := `UPDATE users SET `
	args := []interface{}{}
	argIndex := 1

	if updates.FirstName != nil {
		query += fmt.Sprintf("first_name = $%d, ", argIndex)
		args = append(args, *updates.FirstName)
		argIndex++
	}
	if updates.LastName != nil {
		query += fmt.Sprintf("last_name = $%d, ", argIndex)
		args = append(args, *updates.LastName)
		argIndex++
	}
	if updates.Role != nil {
		query += fmt.Sprintf("role = $%d, ", argIndex)
		args = append(args, *updates.Role)
		argIndex++
	}
	if updates.IsActive != nil {
		query += fmt.Sprintf("is_active = $%d, ", argIndex)
		args = append(args, *updates.IsActive)
		argIndex++
	}
	if updates.EmailVerified != nil {
		query += fmt.Sprintf("email_verified = $%d, ", argIndex)
		args = append(args, *updates.EmailVerified)
		argIndex++
	}

	// Remove trailing comma and space
	query = query[:len(query)-2]
	
	query += fmt.Sprintf(" WHERE id = $%d", argIndex)
	args = append(args, id)

	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func (r *userRepository) List(ctx context.Context, limit, offset int) ([]*models.User, error) {
	query := `
		SELECT id, email, password_hash, first_name, last_name, role, 
			is_active, email_verified, azure_ad_id, azure_tenant_id, 
			external_id, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		user := &models.User{}
		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.PasswordHash,
			&user.FirstName,
			&user.LastName,
			&user.Role,
			&user.IsActive,
			&user.EmailVerified,
			&user.AzureADID,
			&user.AzureTenantID,
			&user.ExternalID,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	return users, nil
}

func (r *userRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	query := `SELECT COUNT(*) FROM users`
	
	err := r.db.QueryRowContext(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count users: %w", err)
	}

	return count, nil
}