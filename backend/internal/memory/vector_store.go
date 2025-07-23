package memory

import (
	"sort"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// HybridVectorStore combines in-memory and disk storage
type HybridVectorStore struct {
	memory *InMemoryStore
	disk   *BoltDBStore

	config   Config
	mu       sync.RWMutex
	lastSave time.Time
	dirty    bool
	logger   *logrus.Logger
}

// Config for hybrid store
type Config struct {
	MaxMemoryChunks  int
	DiskPath         string
	AutoSaveInterval time.Duration
	UseCompression   bool
}

// NewHybridVectorStore creates a new hybrid store
func NewHybridVectorStore(opts ...Option) *HybridVectorStore {
	config := Config{
		MaxMemoryChunks:  10000,
		AutoSaveInterval: 5 * time.Minute,
	}

	for _, opt := range opts {
		opt(&config)
	}

	store := &HybridVectorStore{
		memory: NewInMemoryStore(config.MaxMemoryChunks),
		config: config,
		logger: logrus.New(),
	}

	if config.DiskPath != "" {
		store.disk = NewBoltDBStore(config.DiskPath)
		store.loadFromDisk()
	}

	// Start auto-save routine
	if config.AutoSaveInterval > 0 {
		go store.autoSaveRoutine()
	}

	return store
}

// Add chunks to the store
func (h *HybridVectorStore) Add(chunks []Chunk) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Add to memory
	if err := h.memory.Add(chunks); err != nil {
		return err
	}

	h.dirty = true

	// If memory is full, persist older chunks to disk
	if h.memory.Size() > h.config.MaxMemoryChunks {
		h.evictToDisk()
	}

	return nil
}

// Search performs hybrid search
func (h *HybridVectorStore) Search(query []float32, topK int, filter FilterFunc) ([]SearchResult, error) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	// Search in memory first
	memResults, err := h.memory.Search(query, topK, filter)
	if err != nil {
		return nil, err
	}

	// If we have enough results from memory, return them
	if len(memResults) >= topK {
		return memResults[:topK], nil
	}

	// Search disk if needed
	if h.disk != nil {
		diskResults, err := h.disk.Search(query, topK-len(memResults), filter)
		if err != nil {
			return memResults, nil // Return memory results even if disk fails
		}

		// Merge results
		memResults = append(memResults, diskResults...)

		// Re-sort by similarity
		sort.Slice(memResults, func(i, j int) bool {
			return memResults[i].Similarity > memResults[j].Similarity
		})
	}

	if len(memResults) > topK {
		return memResults[:topK], nil
	}

	return memResults, nil
}

// Delete removes chunks matching the filter
func (h *HybridVectorStore) Delete(filter FilterFunc) error {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Delete from memory
	if err := h.memory.Delete(filter); err != nil {
		return err
	}

	// Delete from disk
	if h.disk != nil {
		if err := h.disk.Delete(filter); err != nil {
			h.logger.WithError(err).Error("Failed to delete from disk")
		}
	}

	h.dirty = true
	return nil
}

// GetStats returns statistics about the store
func (h *HybridVectorStore) GetStats() Stats {
	h.mu.RLock()
	defer h.mu.RUnlock()

	stats := h.memory.GetStats()

	// Add disk stats if available
	if h.disk != nil {
		diskStats := h.disk.GetStats()
		stats.TotalChunks += diskStats.TotalChunks
		stats.SpreadsheetChunks += diskStats.SpreadsheetChunks
		stats.DocumentChunks += diskStats.DocumentChunks
		stats.ChatChunks += diskStats.ChatChunks
		stats.StorageSize += diskStats.StorageSize
	}

	return stats
}

// Close closes the store and saves pending changes
func (h *HybridVectorStore) Close() error {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Save any pending changes
	if h.dirty && h.disk != nil {
		h.saveToDisk()
	}

	// Close disk store
	if h.disk != nil {
		if err := h.disk.Close(); err != nil {
			return err
		}
	}

	return nil
}

// evictToDisk moves older chunks from memory to disk
func (h *HybridVectorStore) evictToDisk() {
	if h.disk == nil {
		// No disk store, just remove oldest chunks
		h.memory.evictOldest()
		return
	}

	// Get chunks to evict (oldest 20%)
	evictCount := h.config.MaxMemoryChunks / 5
	chunks := h.memory.GetOldestChunks(evictCount)

	// Add to disk
	if err := h.disk.Add(chunks); err != nil {
		h.logger.WithError(err).Error("Failed to evict chunks to disk")
		return
	}

	// Remove from memory
	for _, chunk := range chunks {
		h.memory.DeleteByID(chunk.ID)
	}
}

// loadFromDisk loads chunks from disk into memory
func (h *HybridVectorStore) loadFromDisk() {
	if h.disk == nil {
		return
	}

	// Load most recent chunks into memory
	chunks := h.disk.GetRecentChunks(h.config.MaxMemoryChunks / 2)
	if err := h.memory.Add(chunks); err != nil {
		h.logger.WithError(err).Error("Failed to load chunks from disk")
	}
}

// saveToDisk saves memory chunks to disk
func (h *HybridVectorStore) saveToDisk() {
	if h.disk == nil || !h.dirty {
		return
	}

	chunks := h.memory.GetAllChunks()
	if err := h.disk.Add(chunks); err != nil {
		h.logger.WithError(err).Error("Failed to save chunks to disk")
		return
	}

	h.dirty = false
	h.lastSave = time.Now()
}

// autoSaveRoutine periodically saves to disk
func (h *HybridVectorStore) autoSaveRoutine() {
	ticker := time.NewTicker(h.config.AutoSaveInterval)
	defer ticker.Stop()

	for range ticker.C {
		h.mu.Lock()
		h.saveToDisk()
		h.mu.Unlock()
	}
}

// Configuration options

func WithInMemoryCache(maxChunks int) Option {
	return func(cfg interface{}) {
		if c, ok := cfg.(*Config); ok {
			c.MaxMemoryChunks = maxChunks
		}
	}
}

func WithDiskPersistence(path string) Option {
	return func(cfg interface{}) {
		if c, ok := cfg.(*Config); ok {
			c.DiskPath = path
		}
	}
}

func WithAutoSave(interval time.Duration) Option {
	return func(cfg interface{}) {
		if c, ok := cfg.(*Config); ok {
			c.AutoSaveInterval = interval
		}
	}
}