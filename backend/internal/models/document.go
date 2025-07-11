package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Document represents a stored financial document
type Document struct {
	ID          uuid.UUID              `json:"id" db:"id"`
	UserID      uuid.UUID              `json:"user_id" db:"user_id"`
	Title       string                 `json:"title" db:"title"`
	Type        string                 `json:"type" db:"type"` // 10-K, 10-Q, 8-K, etc
	Source      string                 `json:"source" db:"source"` // SEC EDGAR, Manual Upload, etc
	URL         string                 `json:"url,omitempty" db:"url"`
	CompanyName string                 `json:"company_name,omitempty" db:"company_name"`
	Ticker      string                 `json:"ticker,omitempty" db:"ticker"`
	FilingDate  *time.Time             `json:"filing_date,omitempty" db:"filing_date"`
	PeriodEnd   *time.Time             `json:"period_end,omitempty" db:"period_end"`
	Metadata    map[string]interface{} `json:"metadata,omitempty" db:"metadata"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at" db:"updated_at"`
}

// Embedding represents a vector embedding for a document chunk
type Embedding struct {
	ID         uuid.UUID              `json:"id" db:"id"`
	DocumentID uuid.UUID              `json:"document_id" db:"document_id"`
	ChunkID    string                 `json:"chunk_id" db:"chunk_id"`
	Content    string                 `json:"content" db:"content"`
	Embedding  pq.Float32Array        `json:"-" db:"embedding"` // pgvector type
	Metadata   map[string]interface{} `json:"metadata,omitempty" db:"metadata"`
	Similarity float64                `json:"similarity,omitempty" db:"-"` // Used in search results
	CreatedAt  time.Time              `json:"created_at" db:"created_at"`
}