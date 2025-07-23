package indexing

import (
	"context"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/gridmate/backend/internal/memory"
	"github.com/gridmate/backend/internal/memory/chunkers"
	"github.com/gridmate/backend/internal/models"
	"github.com/gridmate/backend/internal/services/ai"
	"github.com/gridmate/backend/internal/services/document"
	"github.com/sirupsen/logrus"
)

// IndexingService manages background indexing of content
type IndexingService struct {
	embeddingProvider  ai.EmbeddingProvider
	spreadsheetChunker *chunkers.SpreadsheetChunker
	documentParser     document.DocumentParser
	
	logger *logrus.Logger
	
	// Track indexing progress
	mu       sync.RWMutex
	progress map[string]*IndexingProgress
}

// IndexingProgress tracks the progress of an indexing operation
type IndexingProgress struct {
	SessionID      string
	Status         string // "pending", "running", "completed", "failed"
	TotalItems     int
	ProcessedItems int
	StartTime      time.Time
	EndTime        time.Time
	Error          error
}

// NewIndexingService creates a new indexing service
func NewIndexingService(embeddingProvider ai.EmbeddingProvider, logger *logrus.Logger) *IndexingService {
	return &IndexingService{
		embeddingProvider:  embeddingProvider,
		spreadsheetChunker: chunkers.NewSpreadsheetChunker(),
		documentParser:     document.NewPDFParser(),
		logger:            logger,
		progress:          make(map[string]*IndexingProgress),
	}
}

// IndexWorkbook indexes an entire workbook
func (s *IndexingService) IndexWorkbook(ctx context.Context, sessionID string, workbook *models.Workbook, store memory.VectorStore) error {
	progress := &IndexingProgress{
		SessionID: sessionID,
		Status:    "running",
		StartTime: time.Now(),
	}
	
	s.setProgress(sessionID, progress)
	
	allChunks := []memory.Chunk{}
	
	// Index each sheet
	for _, sheet := range workbook.Sheets {
		s.logger.WithFields(logrus.Fields{
			"session_id": sessionID,
			"sheet":      sheet.Name,
		}).Info("Indexing sheet")
		
		chunks := s.spreadsheetChunker.ChunkSpreadsheet(sheet)
		allChunks = append(allChunks, chunks...)
		
		progress.ProcessedItems++
		progress.TotalItems = len(workbook.Sheets)
		s.setProgress(sessionID, progress)
	}
	
	// Get embeddings in batches
	texts := make([]string, len(allChunks))
	for i, chunk := range allChunks {
		texts[i] = chunk.Content
	}
	
	embeddings, err := s.embeddingProvider.GetEmbeddings(ctx, texts)
	if err != nil {
		progress.Status = "failed"
		progress.Error = err
		progress.EndTime = time.Now()
		s.setProgress(sessionID, progress)
		return fmt.Errorf("failed to get embeddings: %w", err)
	}
	
	// Assign embeddings to chunks
	for i, embedding := range embeddings {
		allChunks[i].Vector = embedding
		allChunks[i].Timestamp = time.Now()
	}
	
	// Add to vector store
	if err := store.Add(allChunks); err != nil {
		progress.Status = "failed"
		progress.Error = err
		progress.EndTime = time.Now()
		s.setProgress(sessionID, progress)
		return fmt.Errorf("failed to add chunks to store: %w", err)
	}
	
	progress.Status = "completed"
	progress.EndTime = time.Now()
	s.setProgress(sessionID, progress)
	
	s.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"chunks":     len(allChunks),
		"duration":   progress.EndTime.Sub(progress.StartTime),
	}).Info("Workbook indexing completed")
	
	return nil
}

// IndexDocument indexes a document
func (s *IndexingService) IndexDocument(ctx context.Context, sessionID string, reader io.Reader, filename string, store memory.VectorStore) error {
	progress := &IndexingProgress{
		SessionID: sessionID,
		Status:    "running",
		StartTime: time.Now(),
	}
	
	s.setProgress(sessionID, progress)
	
	// Parse document
	chunks, err := s.documentParser.Parse(ctx, reader, filename)
	if err != nil {
		progress.Status = "failed"
		progress.Error = err
		progress.EndTime = time.Now()
		s.setProgress(sessionID, progress)
		return fmt.Errorf("failed to parse document: %w", err)
	}
	
	progress.TotalItems = len(chunks)
	s.setProgress(sessionID, progress)
	
	// Get embeddings in batches
	batchSize := 100 // Process 100 chunks at a time
	for i := 0; i < len(chunks); i += batchSize {
		end := i + batchSize
		if end > len(chunks) {
			end = len(chunks)
		}
		
		batch := chunks[i:end]
		texts := make([]string, len(batch))
		for j, chunk := range batch {
			texts[j] = chunk.Content
		}
		
		// Get embeddings
		embeddings, err := s.embeddingProvider.GetEmbeddings(ctx, texts)
		if err != nil {
			progress.Status = "failed"
			progress.Error = err
			progress.EndTime = time.Now()
			s.setProgress(sessionID, progress)
			return fmt.Errorf("failed to get embeddings: %w", err)
		}
		
		// Assign embeddings to chunks
		for j, embedding := range embeddings {
			batch[j].Vector = embedding
			batch[j].Timestamp = time.Now()
		}
		
		// Add to store
		if err := store.Add(batch); err != nil {
			progress.Status = "failed"
			progress.Error = err
			progress.EndTime = time.Now()
			s.setProgress(sessionID, progress)
			return fmt.Errorf("failed to add chunks to store: %w", err)
		}
		
		progress.ProcessedItems = end
		s.setProgress(sessionID, progress)
	}
	
	progress.Status = "completed"
	progress.EndTime = time.Now()
	s.setProgress(sessionID, progress)
	
	s.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"document":   filename,
		"chunks":     len(chunks),
		"duration":   progress.EndTime.Sub(progress.StartTime),
	}).Info("Document indexing completed")
	
	return nil
}

// IndexChatHistory indexes chat messages
func (s *IndexingService) IndexChatHistory(ctx context.Context, sessionID string, messages []ChatMessage, store memory.VectorStore) error {
	progress := &IndexingProgress{
		SessionID:  sessionID,
		Status:     "running",
		StartTime:  time.Now(),
		TotalItems: len(messages),
	}
	
	s.setProgress(sessionID, progress)
	
	chunks := make([]memory.Chunk, 0, len(messages))
	texts := make([]string, 0, len(messages))
	
	// Convert messages to chunks
	for i, msg := range messages {
		content := fmt.Sprintf("Role: %s\n%s", msg.Role, msg.Content)
		
		chunk := memory.Chunk{
			ID:      fmt.Sprintf("chat_%s_%d_%d", sessionID, msg.Turn, time.Now().UnixNano()),
			Content: content,
			Metadata: memory.ChunkMetadata{
				Source:    "chat",
				SourceID:  sessionID,
				MessageID: msg.ID,
				Role:      msg.Role,
				Turn:      msg.Turn,
			},
			Timestamp: msg.Timestamp,
		}
		
		chunks = append(chunks, chunk)
		texts = append(texts, content)
		
		progress.ProcessedItems = i + 1
		s.setProgress(sessionID, progress)
	}
	
	// Get embeddings
	embeddings, err := s.embeddingProvider.GetEmbeddings(ctx, texts)
	if err != nil {
		progress.Status = "failed"
		progress.Error = err
		progress.EndTime = time.Now()
		s.setProgress(sessionID, progress)
		return fmt.Errorf("failed to get embeddings: %w", err)
	}
	
	// Assign embeddings
	for i, embedding := range embeddings {
		chunks[i].Vector = embedding
	}
	
	// Add to store
	if err := store.Add(chunks); err != nil {
		progress.Status = "failed"
		progress.Error = err
		progress.EndTime = time.Now()
		s.setProgress(sessionID, progress)
		return fmt.Errorf("failed to add chunks to store: %w", err)
	}
	
	progress.Status = "completed"
	progress.EndTime = time.Now()
	s.setProgress(sessionID, progress)
	
	return nil
}

// GetProgress returns the indexing progress for a session
func (s *IndexingService) GetProgress(sessionID string) *IndexingProgress {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.progress[sessionID]
}

func (s *IndexingService) setProgress(sessionID string, progress *IndexingProgress) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.progress[sessionID] = progress
}

// IndexChatMessages indexes chat messages directly
func (s *IndexingService) IndexChatMessages(ctx context.Context, sessionID string, userMessage, assistantResponse string, turn int, store memory.VectorStore) error {
	// Create memory chunks for the messages
	chunks := []memory.Chunk{
		{
			ID:      fmt.Sprintf("chat_%s_user_%d_%d", sessionID, turn, time.Now().Unix()),
			Content: fmt.Sprintf("User question (turn %d): %s", turn+1, userMessage),
			Metadata: memory.ChunkMetadata{
				Source:    "chat",
				SourceID:  sessionID,
				MessageID: fmt.Sprintf("%s_user_%d", sessionID, turn),
				Role:      "user",
				Turn:      turn,
				SourceMeta: map[string]interface{}{
					"timestamp": time.Now().Format(time.RFC3339),
				},
			},
		},
		{
			ID:      fmt.Sprintf("chat_%s_assistant_%d_%d", sessionID, turn, time.Now().Unix()),
			Content: fmt.Sprintf("Assistant response (turn %d): %s", turn+1, assistantResponse),
			Metadata: memory.ChunkMetadata{
				Source:    "chat",
				SourceID:  sessionID,
				MessageID: fmt.Sprintf("%s_assistant_%d", sessionID, turn),
				Role:      "assistant",
				Turn:      turn,
				SourceMeta: map[string]interface{}{
					"timestamp": time.Now().Format(time.RFC3339),
				},
			},
		},
	}

	// Get embeddings
	texts := []string{chunks[0].Content, chunks[1].Content}
	embeddings, err := s.embeddingProvider.GetEmbeddings(ctx, texts)
	if err != nil {
		return fmt.Errorf("failed to get embeddings for chat messages: %w", err)
	}

	// Assign embeddings to chunks
	for i, embedding := range embeddings {
		if i < len(chunks) {
			chunks[i].Vector = embedding
		}
	}

	// Add to store
	if err := store.Add(chunks); err != nil {
		return fmt.Errorf("failed to add chat messages to store: %w", err)
	}

	s.logger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"turn":       turn,
	}).Debug("Successfully indexed chat exchange")

	return nil
}

// ChatMessage represents a chat message for indexing
type ChatMessage struct {
	ID        string
	Role      string
	Content   string
	Turn      int
	Timestamp time.Time
}