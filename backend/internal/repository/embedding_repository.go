package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/lib/pq"
	
	"github.com/gridmate/backend/internal/database"
	"github.com/gridmate/backend/internal/models"
)

type embeddingRepository struct {
	db *database.DB
}

func NewEmbeddingRepository(db *database.DB) EmbeddingRepository {
	return &embeddingRepository{db: db}
}

func (r *embeddingRepository) Create(ctx context.Context, embedding *models.Embedding) error {
	embedding.ID = uuid.New()
	
	query := `
		INSERT INTO embeddings (
			id, document_id, chunk_id, content, embedding, metadata
		) VALUES (
			:id, :document_id, :chunk_id, :content, :embedding, :metadata
		)`
	
	_, err := r.db.NamedExecContext(ctx, query, embedding)
	return err
}

func (r *embeddingRepository) BatchCreate(ctx context.Context, embeddings []*models.Embedding) error {
	if len(embeddings) == 0 {
		return nil
	}
	
	// Prepare batch insert
	valueStrings := make([]string, 0, len(embeddings))
	valueArgs := make([]interface{}, 0, len(embeddings)*6)
	
	for i, emb := range embeddings {
		emb.ID = uuid.New()
		valueStrings = append(valueStrings, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d)",
			i*6+1, i*6+2, i*6+3, i*6+4, i*6+5, i*6+6,
		))
		valueArgs = append(valueArgs, 
			emb.ID, 
			emb.DocumentID, 
			emb.ChunkID, 
			emb.Content, 
			pq.Array(emb.Embedding), 
			emb.Metadata,
		)
	}
	
	query := fmt.Sprintf(`
		INSERT INTO embeddings (
			id, document_id, chunk_id, content, embedding, metadata
		) VALUES %s
		ON CONFLICT (document_id, chunk_id) DO UPDATE SET
			content = EXCLUDED.content,
			embedding = EXCLUDED.embedding,
			metadata = EXCLUDED.metadata
	`, strings.Join(valueStrings, ","))
	
	_, err := r.db.ExecContext(ctx, query, valueArgs...)
	return err
}

func (r *embeddingRepository) GetByDocumentID(ctx context.Context, documentID uuid.UUID) ([]*models.Embedding, error) {
	var embeddings []*models.Embedding
	query := `
		SELECT * FROM embeddings 
		WHERE document_id = $1 
		ORDER BY chunk_id
	`
	
	err := r.db.SelectContext(ctx, &embeddings, query, documentID)
	return embeddings, err
}

func (r *embeddingRepository) SearchSimilar(ctx context.Context, userID uuid.UUID, embedding []float32, limit int) ([]*models.Embedding, error) {
	// Convert embedding to PostgreSQL array format
	embeddingStr := arrayToString(embedding)
	
	query := `
		SELECT 
			e.*,
			1 - (e.embedding <=> $2::vector) as similarity
		FROM embeddings e
		JOIN documents d ON e.document_id = d.id
		WHERE d.user_id = $1
		ORDER BY e.embedding <=> $2::vector
		LIMIT $3
	`
	
	rows, err := r.db.QueryContext(ctx, query, userID, embeddingStr, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var embeddings []*models.Embedding
	for rows.Next() {
		var emb models.Embedding
		var similarity float64
		
		err := rows.Scan(
			&emb.ID,
			&emb.DocumentID,
			&emb.ChunkID,
			&emb.Content,
			&emb.Embedding,
			&emb.Metadata,
			&emb.CreatedAt,
			&similarity,
		)
		if err != nil {
			return nil, err
		}
		
		emb.Similarity = similarity
		embeddings = append(embeddings, &emb)
	}
	
	return embeddings, rows.Err()
}

func (r *embeddingRepository) DeleteByDocumentID(ctx context.Context, documentID uuid.UUID) error {
	query := `DELETE FROM embeddings WHERE document_id = $1`
	_, err := r.db.ExecContext(ctx, query, documentID)
	return err
}

// Helper function to convert float32 slice to PostgreSQL array string
func arrayToString(arr []float32) string {
	if len(arr) == 0 {
		return "{}"
	}
	
	parts := make([]string, len(arr))
	for i, v := range arr {
		parts[i] = fmt.Sprintf("%f", v)
	}
	
	return "[" + strings.Join(parts, ",") + "]"
}