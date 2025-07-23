package memory

import (
	"time"
)

// VectorStore interface for different implementations
type VectorStore interface {
	Add(chunks []Chunk) error
	Search(query []float32, topK int, filter FilterFunc) ([]SearchResult, error)
	Delete(filter FilterFunc) error
	GetStats() Stats
	Close() error
}

// Chunk represents a piece of indexed content
type Chunk struct {
	ID        string
	Vector    []float32
	Content   string
	Metadata  ChunkMetadata
	Timestamp time.Time
}

// ChunkMetadata contains source information
type ChunkMetadata struct {
	Source     string                 // "spreadsheet", "document", "chat"
	SourceID   string                 // Sheet name, document ID, etc.
	SourceMeta map[string]interface{} // Additional metadata

	// Spreadsheet-specific
	SheetName string
	CellRange string
	IsFormula bool

	// Document-specific
	DocumentName string
	PageNumber   int
	Section      string

	// Chat-specific
	MessageID string
	Role      string // "user" or "assistant"
	Turn      int
}

// SearchResult contains search results with similarity scores
type SearchResult struct {
	Chunk      Chunk
	Similarity float32
	Score      float32 // Combined score if using hybrid search
}

// FilterFunc is used to filter chunks during search
type FilterFunc func(chunk Chunk) bool

// Stats contains statistics about the vector store
type Stats struct {
	TotalChunks       int
	SpreadsheetChunks int
	DocumentChunks    int
	ChatChunks        int
	StorageSize       int64
	LastUpdated       time.Time
}

// Option is a configuration option for vector stores
type Option func(interface{})