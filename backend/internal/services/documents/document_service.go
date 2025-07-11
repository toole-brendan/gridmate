package documents

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/models"
	"github.com/gridmate/backend/internal/repository"
	"github.com/gridmate/backend/internal/services/ai"
)

// DocumentService handles document processing and storage
type DocumentService struct {
	logger         *logrus.Logger
	edgarProcessor *EDGARProcessor
	aiService      ai.AIProvider
	docRepo        repository.DocumentRepository
	embeddingRepo  repository.EmbeddingRepository
}

// NewDocumentService creates a new document service
func NewDocumentService(
	logger *logrus.Logger,
	aiService ai.AIProvider,
	docRepo repository.DocumentRepository,
	embeddingRepo repository.EmbeddingRepository,
) *DocumentService {
	return &DocumentService{
		logger:         logger,
		edgarProcessor: NewEDGARProcessor(logger),
		aiService:      aiService,
		docRepo:        docRepo,
		embeddingRepo:  embeddingRepo,
	}
}

// ProcessEDGARDocument processes an EDGAR document and stores it with embeddings
func (s *DocumentService) ProcessEDGARDocument(ctx context.Context, userID uuid.UUID, content string, docType DocumentType, url string) (*FinancialDocument, error) {
	// Process the document
	doc, err := s.edgarProcessor.ProcessDocument(ctx, content, docType)
	if err != nil {
		return nil, fmt.Errorf("failed to process document: %w", err)
	}
	
	// Set additional fields
	doc.URL = url
	
	// Store document metadata
	docRecord := &models.Document{
		UserID:      userID,
		Title:       fmt.Sprintf("%s %s (%s)", doc.CompanyName, doc.DocumentType, doc.FilingDate.Format("2006-01-02")),
		Type:        string(doc.DocumentType),
		Source:      "SEC EDGAR",
		URL:         doc.URL,
		CompanyName: doc.CompanyName,
		Ticker:      doc.Ticker,
		FilingDate:  &doc.FilingDate,
		PeriodEnd:   &doc.PeriodEnd,
		Metadata: map[string]interface{}{
			"cik":         doc.CIK,
			"sections":    len(doc.Sections),
			"tables":      len(doc.Tables),
			"key_metrics": doc.KeyMetrics,
		},
	}
	
	if err := s.docRepo.Create(ctx, docRecord); err != nil {
		return nil, fmt.Errorf("failed to store document: %w", err)
	}
	
	// Generate and store embeddings for all chunks
	if err := s.generateAndStoreEmbeddings(ctx, docRecord.ID, doc); err != nil {
		s.logger.WithError(err).Error("Failed to generate embeddings")
		// Continue even if embeddings fail
	}
	
	return doc, nil
}

// generateAndStoreEmbeddings creates embeddings for all document chunks
func (s *DocumentService) generateAndStoreEmbeddings(ctx context.Context, docID uuid.UUID, doc *FinancialDocument) error {
	var embeddings []*models.Embedding
	
	// Process each section
	for _, section := range doc.Sections {
		for _, chunk := range section.Chunks {
			// Generate embedding for chunk
			embedding, err := s.aiService.GetEmbedding(ctx, chunk.Content)
			if err != nil {
				s.logger.WithError(err).WithField("chunk_id", chunk.ID).Warn("Failed to generate embedding")
				continue
			}
			
			// Create embedding record
			embeddingRecord := &models.Embedding{
				DocumentID: docID,
				ChunkID:    chunk.ID,
				Content:    chunk.Content,
				Embedding:  embedding,
				Metadata:   chunk.Metadata,
			}
			
			embeddings = append(embeddings, embeddingRecord)
		}
	}
	
	// Batch store embeddings
	if len(embeddings) > 0 {
		if err := s.embeddingRepo.BatchCreate(ctx, embeddings); err != nil {
			return fmt.Errorf("failed to store embeddings: %w", err)
		}
	}
	
	s.logger.WithFields(logrus.Fields{
		"document_id": docID,
		"embeddings":  len(embeddings),
	}).Info("Generated and stored embeddings")
	
	return nil
}

// SearchDocuments searches for relevant document chunks based on query
func (s *DocumentService) SearchDocuments(ctx context.Context, userID uuid.UUID, query string, limit int) ([]SearchResult, error) {
	// Generate embedding for query
	queryEmbedding, err := s.aiService.GetEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}
	
	// Search for similar embeddings
	embeddings, err := s.embeddingRepo.SearchSimilar(ctx, userID, queryEmbedding, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search embeddings: %w", err)
	}
	
	// Convert to search results
	var results []SearchResult
	for _, emb := range embeddings {
		// Get document details
		doc, err := s.docRepo.GetByID(ctx, emb.DocumentID)
		if err != nil {
			s.logger.WithError(err).Warn("Failed to get document")
			continue
		}
		
		result := SearchResult{
			DocumentID:   doc.ID.String(),
			ChunkID:      emb.ChunkID,
			Content:      emb.Content,
			Score:        emb.Similarity,
			DocumentInfo: DocumentInfo{
				Title:       doc.Title,
				Type:        doc.Type,
				CompanyName: doc.CompanyName,
				FilingDate:  doc.FilingDate,
				URL:         doc.URL,
			},
			Metadata: emb.Metadata,
		}
		
		results = append(results, result)
	}
	
	return results, nil
}

// GetDocumentContext retrieves relevant context for a financial modeling query
func (s *DocumentService) GetDocumentContext(ctx context.Context, userID uuid.UUID, query string, maxChunks int) (*FinancialContext, error) {
	// Search for relevant chunks
	searchResults, err := s.SearchDocuments(ctx, userID, query, maxChunks)
	if err != nil {
		return nil, err
	}
	
	// Build financial context
	context := &FinancialContext{
		Query:        query,
		RetrievedAt:  time.Now(),
		Documents:    make(map[string]DocumentInfo),
		Chunks:       []ContextChunk{},
		KeyMetrics:   make(map[string]interface{}),
		FinancialData: make(map[string]interface{}),
	}
	
	// Process search results
	for _, result := range searchResults {
		// Add document info if not already present
		if _, exists := context.Documents[result.DocumentID]; !exists {
			context.Documents[result.DocumentID] = result.DocumentInfo
		}
		
		// Add chunk to context
		chunk := ContextChunk{
			DocumentID: result.DocumentID,
			ChunkID:    result.ChunkID,
			Content:    result.Content,
			Relevance:  result.Score,
			Metadata:   result.Metadata,
		}
		context.Chunks = append(context.Chunks, chunk)
		
		// Extract any financial data from metadata
		if metrics, ok := result.Metadata["key_metrics"].(map[string]interface{}); ok {
			for k, v := range metrics {
				context.KeyMetrics[k] = v
			}
		}
	}
	
	return context, nil
}

// Types for search and context

// SearchResult represents a document search result
type SearchResult struct {
	DocumentID   string                 `json:"document_id"`
	ChunkID      string                 `json:"chunk_id"`
	Content      string                 `json:"content"`
	Score        float64                `json:"score"`
	DocumentInfo DocumentInfo           `json:"document_info"`
	Metadata     map[string]interface{} `json:"metadata"`
}

// DocumentInfo contains basic document information
type DocumentInfo struct {
	Title       string     `json:"title"`
	Type        string     `json:"type"`
	CompanyName string     `json:"company_name"`
	FilingDate  *time.Time `json:"filing_date,omitempty"`
	URL         string     `json:"url"`
}

// FinancialContext represents context for financial modeling
type FinancialContext struct {
	Query         string                    `json:"query"`
	RetrievedAt   time.Time                 `json:"retrieved_at"`
	Documents     map[string]DocumentInfo   `json:"documents"`
	Chunks        []ContextChunk            `json:"chunks"`
	KeyMetrics    map[string]interface{}    `json:"key_metrics"`
	FinancialData map[string]interface{}    `json:"financial_data"`
}

// ContextChunk represents a chunk of context
type ContextChunk struct {
	DocumentID string                 `json:"document_id"`
	ChunkID    string                 `json:"chunk_id"`
	Content    string                 `json:"content"`
	Relevance  float64                `json:"relevance"`
	Metadata   map[string]interface{} `json:"metadata"`
}

// GetRecentDocuments retrieves recently processed documents for a user
func (s *DocumentService) GetRecentDocuments(ctx context.Context, userID uuid.UUID, limit int) ([]*models.Document, error) {
	return s.docRepo.GetByUserID(ctx, userID, limit)
}

// DeleteDocument deletes a document and its embeddings
func (s *DocumentService) DeleteDocument(ctx context.Context, userID uuid.UUID, documentID uuid.UUID) error {
	// Verify document belongs to user
	doc, err := s.docRepo.GetByID(ctx, documentID)
	if err != nil {
		return fmt.Errorf("document not found: %w", err)
	}
	
	if doc.UserID != userID {
		return fmt.Errorf("unauthorized")
	}
	
	// Delete embeddings first
	if err := s.embeddingRepo.DeleteByDocumentID(ctx, documentID); err != nil {
		return fmt.Errorf("failed to delete embeddings: %w", err)
	}
	
	// Delete document
	if err := s.docRepo.Delete(ctx, documentID); err != nil {
		return fmt.Errorf("failed to delete document: %w", err)
	}
	
	return nil
}