package repository

import (
	"context"
	"fmt"
	"net"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/database"
	"github.com/gridmate/backend/internal/models"
)

type auditLogRepository struct {
	db *database.DB
}

func NewAuditLogRepository(db *database.DB) AuditLogRepository {
	return &auditLogRepository{db: db}
}

func (r *auditLogRepository) Create(ctx context.Context, log *models.AuditLog) error {
	query := `
		INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at`

	err := r.db.QueryRowContext(ctx, query,
		log.UserID,
		log.Action,
		log.EntityType,
		log.EntityID,
		log.Changes,
		log.IPAddress,
		log.UserAgent,
	).Scan(&log.ID, &log.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

func (r *auditLogRepository) List(ctx context.Context, filter *models.AuditLogFilter) ([]*models.AuditLog, error) {
	query := `
		SELECT id, user_id, action, entity_type, entity_id, changes, ip_address, user_agent, created_at
		FROM audit_logs
		WHERE 1=1`
	
	args := []interface{}{}
	argIndex := 1

	// Apply filters
	if filter.UserID != nil {
		query += fmt.Sprintf(" AND user_id = $%d", argIndex)
		args = append(args, *filter.UserID)
		argIndex++
	}
	if filter.EntityType != nil {
		query += fmt.Sprintf(" AND entity_type = $%d", argIndex)
		args = append(args, *filter.EntityType)
		argIndex++
	}
	if filter.EntityID != nil {
		query += fmt.Sprintf(" AND entity_id = $%d", argIndex)
		args = append(args, *filter.EntityID)
		argIndex++
	}
	if filter.Action != nil {
		query += fmt.Sprintf(" AND action = $%d", argIndex)
		args = append(args, *filter.Action)
		argIndex++
	}
	if filter.StartDate != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", argIndex)
		args = append(args, *filter.StartDate)
		argIndex++
	}
	if filter.EndDate != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", argIndex)
		args = append(args, *filter.EndDate)
		argIndex++
	}

	// Add ordering and pagination
	query += " ORDER BY created_at DESC"
	
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argIndex)
		args = append(args, filter.Limit)
		argIndex++
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argIndex)
		args = append(args, filter.Offset)
		argIndex++
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list audit logs: %w", err)
	}
	defer rows.Close()

	var logs []*models.AuditLog
	for rows.Next() {
		log := &models.AuditLog{}
		var ipStr *string
		
		err := rows.Scan(
			&log.ID,
			&log.UserID,
			&log.Action,
			&log.EntityType,
			&log.EntityID,
			&log.Changes,
			&ipStr,
			&log.UserAgent,
			&log.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit log: %w", err)
		}
		
		// Convert IP string to net.IP
		if ipStr != nil && *ipStr != "" {
			ip := net.ParseIP(*ipStr)
			log.IPAddress = &ip
		}
		
		logs = append(logs, log)
	}

	return logs, nil
}

func (r *auditLogRepository) Count(ctx context.Context, filter *models.AuditLogFilter) (int64, error) {
	query := `SELECT COUNT(*) FROM audit_logs WHERE 1=1`
	
	args := []interface{}{}
	argIndex := 1

	// Apply same filters as List method
	if filter.UserID != nil {
		query += fmt.Sprintf(" AND user_id = $%d", argIndex)
		args = append(args, *filter.UserID)
		argIndex++
	}
	if filter.EntityType != nil {
		query += fmt.Sprintf(" AND entity_type = $%d", argIndex)
		args = append(args, *filter.EntityType)
		argIndex++
	}
	if filter.EntityID != nil {
		query += fmt.Sprintf(" AND entity_id = $%d", argIndex)
		args = append(args, *filter.EntityID)
		argIndex++
	}
	if filter.Action != nil {
		query += fmt.Sprintf(" AND action = $%d", argIndex)
		args = append(args, *filter.Action)
		argIndex++
	}
	if filter.StartDate != nil {
		query += fmt.Sprintf(" AND created_at >= $%d", argIndex)
		args = append(args, *filter.StartDate)
		argIndex++
	}
	if filter.EndDate != nil {
		query += fmt.Sprintf(" AND created_at <= $%d", argIndex)
		args = append(args, *filter.EndDate)
		argIndex++
	}

	var count int64
	err := r.db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count audit logs: %w", err)
	}

	return count, nil
}

// Helper function to create audit logs from request context
func CreateAuditLog(ctx context.Context, repo AuditLogRepository, action, entityType string, entityID *uuid.UUID, changes interface{}) error {
	// Extract user ID from context (set by auth middleware)
	userID, _ := ctx.Value("user_id").(uuid.UUID)
	
	// Extract IP and user agent from context (should be set by middleware)
	ipStr, _ := ctx.Value("client_ip").(string)
	userAgent, _ := ctx.Value("user_agent").(string)
	
	var ip *net.IP
	if ipStr != "" {
		parsedIP := net.ParseIP(ipStr)
		ip = &parsedIP
	}
	
	// Convert changes to JSON
	var changesJSON []byte
	if changes != nil {
		// In production, properly marshal the changes
		changesJSON = []byte("{}")
	}
	
	log := &models.AuditLog{
		UserID:     &userID,
		Action:     action,
		EntityType: &entityType,
		EntityID:   entityID,
		Changes:    changesJSON,
		IPAddress:  ip,
		UserAgent:  &userAgent,
	}
	
	return repo.Create(ctx, log)
}