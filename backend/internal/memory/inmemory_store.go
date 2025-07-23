package memory

import (
	"sort"
	"strings"
	"sync"
	"time"
)

// InMemoryStore provides fast vector search in memory
type InMemoryStore struct {
	chunks    []Chunk
	maxChunks int
	mu        sync.RWMutex

	// Optimization: pre-computed norms for cosine similarity
	norms []float32

	// Index for keyword search fallback
	keywordIndex map[string][]int // word -> chunk indices
}

// NewInMemoryStore creates a new in-memory store
func NewInMemoryStore(maxChunks int) *InMemoryStore {
	return &InMemoryStore{
		chunks:       make([]Chunk, 0, maxChunks),
		maxChunks:    maxChunks,
		norms:        make([]float32, 0, maxChunks),
		keywordIndex: make(map[string][]int),
	}
}

// Add chunks to memory
func (m *InMemoryStore) Add(chunks []Chunk) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, chunk := range chunks {
		// Normalize vector for cosine similarity
		norm := vectorNorm(chunk.Vector)
		if norm > 0 {
			for i := range chunk.Vector {
				chunk.Vector[i] /= norm
			}
		}

		// Add to chunks
		idx := len(m.chunks)
		m.chunks = append(m.chunks, chunk)
		m.norms = append(m.norms, norm)

		// Update keyword index
		m.indexKeywords(chunk.Content, idx)

		// Evict oldest if over capacity
		if len(m.chunks) > m.maxChunks {
			m.evictOldest()
		}
	}

	return nil
}

// Search performs vector similarity search with fallback to keyword search
func (m *InMemoryStore) Search(query []float32, topK int, filter FilterFunc) ([]SearchResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if len(m.chunks) == 0 {
		return nil, nil
	}

	// Normalize query vector
	queryNorm := vectorNorm(query)
	if queryNorm > 0 {
		for i := range query {
			query[i] /= queryNorm
		}
	}

	// Calculate similarities
	results := make([]SearchResult, 0, len(m.chunks))

	for _, chunk := range m.chunks {
		// Apply filter if provided
		if filter != nil && !filter(chunk) {
			continue
		}

		// Calculate cosine similarity using SIMD-optimized dot product
		similarity := dotProduct(query, chunk.Vector)

		// Only include results above threshold
		if similarity > 0.7 {
			results = append(results, SearchResult{
				Chunk:      chunk,
				Similarity: similarity,
				Score:      similarity, // Can be enhanced with BM25 later
			})
		}
	}

	// Sort by similarity descending
	sort.Slice(results, func(i, j int) bool {
		return results[i].Similarity > results[j].Similarity
	})

	// Return top K
	if len(results) > topK {
		return results[:topK], nil
	}

	return results, nil
}

// Delete removes chunks matching the filter
func (m *InMemoryStore) Delete(filter FilterFunc) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	newChunks := make([]Chunk, 0, len(m.chunks))
	newNorms := make([]float32, 0, len(m.norms))

	// Rebuild index
	m.keywordIndex = make(map[string][]int)

	for i, chunk := range m.chunks {
		if filter != nil && filter(chunk) {
			continue // Skip chunks that match the filter
		}

		idx := len(newChunks)
		newChunks = append(newChunks, chunk)
		newNorms = append(newNorms, m.norms[i])
		m.indexKeywords(chunk.Content, idx)
	}

	m.chunks = newChunks
	m.norms = newNorms

	return nil
}

// DeleteByID removes a specific chunk
func (m *InMemoryStore) DeleteByID(id string) {
	m.Delete(func(chunk Chunk) bool {
		return chunk.ID == id
	})
}

// GetStats returns statistics about the store
func (m *InMemoryStore) GetStats() Stats {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := Stats{
		TotalChunks: len(m.chunks),
		LastUpdated: time.Now(),
	}

	// Count by source type
	for _, chunk := range m.chunks {
		switch chunk.Metadata.Source {
		case "spreadsheet":
			stats.SpreadsheetChunks++
		case "document":
			stats.DocumentChunks++
		case "chat":
			stats.ChatChunks++
		}
	}

	// Estimate storage size (rough approximation)
	stats.StorageSize = int64(len(m.chunks)) * 2048 // ~2KB per chunk average

	return stats
}

// Close is a no-op for in-memory store
func (m *InMemoryStore) Close() error {
	return nil
}

// Size returns the number of chunks
func (m *InMemoryStore) Size() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.chunks)
}

// GetOldestChunks returns the oldest n chunks
func (m *InMemoryStore) GetOldestChunks(n int) []Chunk {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if n > len(m.chunks) {
		n = len(m.chunks)
	}

	// Sort by timestamp
	sorted := make([]Chunk, len(m.chunks))
	copy(sorted, m.chunks)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Timestamp.Before(sorted[j].Timestamp)
	})

	return sorted[:n]
}

// GetRecentChunks returns the most recent n chunks
func (m *InMemoryStore) GetRecentChunks(n int) []Chunk {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if n > len(m.chunks) {
		n = len(m.chunks)
	}

	// Sort by timestamp descending
	sorted := make([]Chunk, len(m.chunks))
	copy(sorted, m.chunks)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Timestamp.After(sorted[j].Timestamp)
	})

	return sorted[:n]
}

// GetAllChunks returns all chunks
func (m *InMemoryStore) GetAllChunks() []Chunk {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]Chunk, len(m.chunks))
	copy(result, m.chunks)
	return result
}

// evictOldest removes the oldest chunks to maintain capacity
func (m *InMemoryStore) evictOldest() {
	// Remove 10% of oldest chunks
	evictCount := m.maxChunks / 10
	if evictCount < 1 {
		evictCount = 1
	}

	// Sort by timestamp
	sort.Slice(m.chunks, func(i, j int) bool {
		return m.chunks[i].Timestamp.After(m.chunks[j].Timestamp)
	})

	// Keep only the newer chunks
	m.chunks = m.chunks[:len(m.chunks)-evictCount]
	m.norms = m.norms[:len(m.norms)-evictCount]

	// Rebuild keyword index
	m.rebuildKeywordIndex()
}

// indexKeywords adds keywords from content to the index
func (m *InMemoryStore) indexKeywords(content string, chunkIdx int) {
	// Simple tokenization - can be improved
	words := strings.Fields(strings.ToLower(content))

	for _, word := range words {
		// Skip very short words
		if len(word) < 3 {
			continue
		}

		// Add to index
		if m.keywordIndex[word] == nil {
			m.keywordIndex[word] = []int{chunkIdx}
		} else {
			m.keywordIndex[word] = append(m.keywordIndex[word], chunkIdx)
		}
	}
}

// rebuildKeywordIndex rebuilds the entire keyword index
func (m *InMemoryStore) rebuildKeywordIndex() {
	m.keywordIndex = make(map[string][]int)

	for idx, chunk := range m.chunks {
		m.indexKeywords(chunk.Content, idx)
	}
}

// KeywordSearch performs fallback keyword search
func (m *InMemoryStore) KeywordSearch(keywords []string, topK int, filter FilterFunc) []SearchResult {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Count keyword matches per chunk
	matchCounts := make(map[int]int)

	for _, keyword := range keywords {
		keyword = strings.ToLower(keyword)
		if indices, ok := m.keywordIndex[keyword]; ok {
			for _, idx := range indices {
				matchCounts[idx]++
			}
		}
	}

	// Convert to results
	results := make([]SearchResult, 0)
	for idx, count := range matchCounts {
		if idx >= len(m.chunks) {
			continue
		}

		chunk := m.chunks[idx]

		// Apply filter
		if filter != nil && !filter(chunk) {
			continue
		}

		// Calculate simple relevance score
		score := float32(count) / float32(len(keywords))

		results = append(results, SearchResult{
			Chunk:      chunk,
			Similarity: score,
			Score:      score,
		})
	}

	// Sort by score
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	if len(results) > topK {
		return results[:topK]
	}

	return results
}

// Use optimized vector operations
var dotProduct = DotProduct
var vectorNorm = VectorNorm