package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	
	"github.com/gridmate/backend/internal/models"
)

type documentRepository struct {
	db *sqlx.DB
}

func NewDocumentRepository(db *sqlx.DB) DocumentRepository {
	return &documentRepository{db: db}
}

func (r *documentRepository) Create(ctx context.Context, doc *models.Document) error {
	doc.ID = uuid.New()
	
	query := `
		INSERT INTO documents (
			id, user_id, title, type, source, url, 
			company_name, ticker, filing_date, period_end, metadata
		) VALUES (
			:id, :user_id, :title, :type, :source, :url,
			:company_name, :ticker, :filing_date, :period_end, :metadata
		)`
	
	_, err := r.db.NamedExecContext(ctx, query, doc)
	return err
}

func (r *documentRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Document, error) {
	var doc models.Document
	query := `
		SELECT * FROM documents WHERE id = $1
	`
	
	err := r.db.GetContext(ctx, &doc, query, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("document not found")
	}
	return &doc, err
}

func (r *documentRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]*models.Document, error) {
	var docs []*models.Document
	query := `
		SELECT * FROM documents 
		WHERE user_id = $1 
		ORDER BY created_at DESC 
		LIMIT $2
	`
	
	err := r.db.SelectContext(ctx, &docs, query, userID, limit)
	return docs, err
}

func (r *documentRepository) Update(ctx context.Context, doc *models.Document) error {
	query := `
		UPDATE documents SET
			title = :title,
			type = :type,
			metadata = :metadata,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = :id
	`
	
	result, err := r.db.NamedExecContext(ctx, query, doc)
	if err != nil {
		return err
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rows == 0 {
		return fmt.Errorf("document not found")
	}
	
	return nil
}

func (r *documentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM documents WHERE id = $1`
	
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rows == 0 {
		return fmt.Errorf("document not found")
	}
	
	return nil
}

func (r *documentRepository) Search(ctx context.Context, userID uuid.UUID, query string, limit int) ([]*models.Document, error) {
	var docs []*models.Document
	searchQuery := `
		SELECT * FROM documents 
		WHERE user_id = $1 
		AND (
			to_tsvector('english', title) @@ plainto_tsquery('english', $2)
			OR company_name ILIKE '%' || $2 || '%'
			OR ticker ILIKE '%' || $2 || '%'
		)
		ORDER BY 
			CASE 
				WHEN to_tsvector('english', title) @@ plainto_tsquery('english', $2) THEN 1
				ELSE 2
			END,
			created_at DESC
		LIMIT $3
	`
	
	err := r.db.SelectContext(ctx, &docs, searchQuery, userID, query, limit)
	return docs, err
}