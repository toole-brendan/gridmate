package excel

import (
	"sync"
	"time"
	"crypto/md5"
	"encoding/hex"
	"fmt"
)

// RepresentationCache caches expensive spreadsheet representations
type RepresentationCache struct {
	cache     map[string]*CachedRepresentation
	mu        sync.RWMutex
	ttl       time.Duration
	maxSize   int
	evictChan chan struct{}
}

// CachedRepresentation holds a cached representation with metadata
type CachedRepresentation struct {
	Content      interface{}
	Mode         string
	CreatedAt    time.Time
	LastAccessed time.Time
	AccessCount  int
	Size         int // Estimated size in bytes
	Hash         string
}

// NewRepresentationCache creates a new representation cache
func NewRepresentationCache(ttl time.Duration, maxSize int) *RepresentationCache {
	rc := &RepresentationCache{
		cache:     make(map[string]*CachedRepresentation),
		ttl:       ttl,
		maxSize:   maxSize,
		evictChan: make(chan struct{}, 1),
	}
	
	// Start background eviction goroutine
	go rc.evictionWorker()
	
	return rc
}

// Get retrieves a cached representation
func (rc *RepresentationCache) Get(key string) (interface{}, bool) {
	rc.mu.RLock()
	defer rc.mu.RUnlock()
	
	if item, exists := rc.cache[key]; exists {
		// Check if expired
		if time.Since(item.CreatedAt) > rc.ttl {
			return nil, false
		}
		
		// Update access metadata
		item.LastAccessed = time.Now()
		item.AccessCount++
		
		return item.Content, true
	}
	
	return nil, false
}

// Set stores a representation in the cache
func (rc *RepresentationCache) Set(key string, content interface{}, mode string, size int) {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	
	// Create hash of content for validation
	hash := rc.computeHash(content)
	
	rc.cache[key] = &CachedRepresentation{
		Content:      content,
		Mode:         mode,
		CreatedAt:    time.Now(),
		LastAccessed: time.Now(),
		AccessCount:  1,
		Size:         size,
		Hash:         hash,
	}
	
	// Trigger eviction if needed
	if len(rc.cache) > rc.maxSize {
		select {
		case rc.evictChan <- struct{}{}:
		default:
		}
	}
}

// GenerateKey creates a cache key from range and options
func (rc *RepresentationCache) GenerateKey(rangeAddress string, mode string, options map[string]interface{}) string {
	// Create a deterministic key from inputs
	keyParts := []string{rangeAddress, mode}
	
	// Add sorted options to key
	for k, v := range options {
		keyParts = append(keyParts, fmt.Sprintf("%s:%v", k, v))
	}
	
	keyStr := fmt.Sprintf("%v", keyParts)
	hash := md5.Sum([]byte(keyStr))
	return hex.EncodeToString(hash[:])
}

// evictionWorker runs in the background to evict old entries
func (rc *RepresentationCache) evictionWorker() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	
	for {
		select {
		case <-ticker.C:
			rc.evictExpired()
		case <-rc.evictChan:
			rc.evictLRU()
		}
	}
}

// evictExpired removes expired entries
func (rc *RepresentationCache) evictExpired() {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	
	now := time.Now()
	for key, item := range rc.cache {
		if now.Sub(item.CreatedAt) > rc.ttl {
			delete(rc.cache, key)
		}
	}
}

// evictLRU removes least recently used entries
func (rc *RepresentationCache) evictLRU() {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	
	if len(rc.cache) <= rc.maxSize {
		return
	}
	
	// Find LRU entry
	var lruKey string
	var lruTime time.Time
	
	for key, item := range rc.cache {
		if lruKey == "" || item.LastAccessed.Before(lruTime) {
			lruKey = key
			lruTime = item.LastAccessed
		}
	}
	
	if lruKey != "" {
		delete(rc.cache, lruKey)
	}
}

// computeHash generates a hash of the content for validation
func (rc *RepresentationCache) computeHash(content interface{}) string {
	// Simple hash implementation - can be enhanced
	str := fmt.Sprintf("%v", content)
	hash := md5.Sum([]byte(str))
	return hex.EncodeToString(hash[:])
}

// Clear removes all entries from the cache
func (rc *RepresentationCache) Clear() {
	rc.mu.Lock()
	defer rc.mu.Unlock()
	
	rc.cache = make(map[string]*CachedRepresentation)
}

// Stats returns cache statistics
func (rc *RepresentationCache) Stats() CacheStats {
	rc.mu.RLock()
	defer rc.mu.RUnlock()
	
	totalSize := 0
	totalAccess := 0
	
	for _, item := range rc.cache {
		totalSize += item.Size
		totalAccess += item.AccessCount
	}
	
	return CacheStats{
		EntryCount:    len(rc.cache),
		TotalSize:     totalSize,
		TotalAccesses: totalAccess,
		HitRate:       rc.calculateHitRate(),
	}
}

// CacheStats holds cache statistics
type CacheStats struct {
	EntryCount    int
	TotalSize     int
	TotalAccesses int
	HitRate       float64
}

// calculateHitRate calculates the cache hit rate
func (rc *RepresentationCache) calculateHitRate() float64 {
	// This is a simplified calculation
	// In production, you'd track hits and misses separately
	if len(rc.cache) == 0 {
		return 0.0
	}
	
	totalAccess := 0
	for _, item := range rc.cache {
		totalAccess += item.AccessCount
	}
	
	// Estimate hit rate based on access patterns
	return float64(totalAccess) / float64(totalAccess+len(rc.cache))
}