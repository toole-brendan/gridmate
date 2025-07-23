package memory

import (
	"bytes"
	"encoding/gob"
	"fmt"
	"sort"
	"time"

	"github.com/boltdb/bolt"
)

const (
	chunksBucket = "chunks"
	metaBucket   = "metadata"
)

// BoltDBStore provides persistent vector storage using BoltDB
type BoltDBStore struct {
	db   *bolt.DB
	path string
}

// NewBoltDBStore creates a new BoltDB-backed store
func NewBoltDBStore(path string) *BoltDBStore {
	db, err := bolt.Open(path, 0600, &bolt.Options{Timeout: 1 * time.Second})
	if err != nil {
		panic(fmt.Sprintf("Failed to open bolt database: %v", err))
	}

	// Initialize buckets
	err = db.Update(func(tx *bolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(chunksBucket))
		if err != nil {
			return err
		}
		_, err = tx.CreateBucketIfNotExists([]byte(metaBucket))
		return err
	})
	if err != nil {
		panic(fmt.Sprintf("Failed to create buckets: %v", err))
	}

	return &BoltDBStore{
		db:   db,
		path: path,
	}
}

// Add chunks to the store
func (b *BoltDBStore) Add(chunks []Chunk) error {
	return b.db.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte(chunksBucket))

		for _, chunk := range chunks {
			// Serialize chunk
			var buf bytes.Buffer
			enc := gob.NewEncoder(&buf)
			if err := enc.Encode(chunk); err != nil {
				return fmt.Errorf("failed to encode chunk: %w", err)
			}

			// Store with chunk ID as key
			if err := bucket.Put([]byte(chunk.ID), buf.Bytes()); err != nil {
				return fmt.Errorf("failed to store chunk: %w", err)
			}
		}

		// Update stats
		b.updateStats(tx)

		return nil
	})
}

// Search performs vector similarity search
func (b *BoltDBStore) Search(query []float32, topK int, filter FilterFunc) ([]SearchResult, error) {
	var results []SearchResult

	// Normalize query
	queryNorm := vectorNorm(query)
	if queryNorm > 0 {
		for i := range query {
			query[i] /= queryNorm
		}
	}

	err := b.db.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte(chunksBucket))

		// Iterate through all chunks
		return bucket.ForEach(func(k, v []byte) error {
			var chunk Chunk
			dec := gob.NewDecoder(bytes.NewReader(v))
			if err := dec.Decode(&chunk); err != nil {
				return err
			}

			// Apply filter
			if filter != nil && !filter(chunk) {
				return nil
			}

			// Calculate similarity
			similarity := dotProduct(query, chunk.Vector)

			// Only include results above threshold
			if similarity > 0.7 {
				results = append(results, SearchResult{
					Chunk:      chunk,
					Similarity: similarity,
					Score:      similarity,
				})
			}

			return nil
		})
	})

	if err != nil {
		return nil, err
	}

	// Sort by similarity
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
func (b *BoltDBStore) Delete(filter FilterFunc) error {
	return b.db.Update(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte(chunksBucket))

		// Collect keys to delete
		var keysToDelete [][]byte

		err := bucket.ForEach(func(k, v []byte) error {
			var chunk Chunk
			dec := gob.NewDecoder(bytes.NewReader(v))
			if err := dec.Decode(&chunk); err != nil {
				return err
			}

			if filter != nil && filter(chunk) {
				keysToDelete = append(keysToDelete, k)
			}

			return nil
		})

		if err != nil {
			return err
		}

		// Delete collected keys
		for _, key := range keysToDelete {
			if err := bucket.Delete(key); err != nil {
				return err
			}
		}

		// Update stats
		b.updateStats(tx)

		return nil
	})
}

// GetStats returns statistics about the store
func (b *BoltDBStore) GetStats() Stats {
	var stats Stats

	b.db.View(func(tx *bolt.Tx) error {
		metaBucket := tx.Bucket([]byte(metaBucket))
		if metaBucket != nil {
			v := metaBucket.Get([]byte("stats"))
			if v != nil {
				dec := gob.NewDecoder(bytes.NewReader(v))
				dec.Decode(&stats)
			}
		}

		// Get database size
		stats.StorageSize = tx.Size()

		return nil
	})

	return stats
}

// Close closes the database
func (b *BoltDBStore) Close() error {
	return b.db.Close()
}

// GetRecentChunks returns the most recent n chunks
func (b *BoltDBStore) GetRecentChunks(n int) []Chunk {
	var chunks []Chunk

	b.db.View(func(tx *bolt.Tx) error {
		bucket := tx.Bucket([]byte(chunksBucket))

		// Collect all chunks
		bucket.ForEach(func(k, v []byte) error {
			var chunk Chunk
			dec := gob.NewDecoder(bytes.NewReader(v))
			if err := dec.Decode(&chunk); err == nil {
				chunks = append(chunks, chunk)
			}
			return nil
		})

		return nil
	})

	// Sort by timestamp descending
	sort.Slice(chunks, func(i, j int) bool {
		return chunks[i].Timestamp.After(chunks[j].Timestamp)
	})

	if len(chunks) > n {
		return chunks[:n]
	}

	return chunks
}

// updateStats updates the statistics in the metadata bucket
func (b *BoltDBStore) updateStats(tx *bolt.Tx) error {
	chunksBucket := tx.Bucket([]byte(chunksBucket))
	metaBucket := tx.Bucket([]byte(metaBucket))

	stats := Stats{
		LastUpdated: time.Now(),
	}

	// Count chunks by type
	chunksBucket.ForEach(func(k, v []byte) error {
		var chunk Chunk
		dec := gob.NewDecoder(bytes.NewReader(v))
		if err := dec.Decode(&chunk); err == nil {
			stats.TotalChunks++
			switch chunk.Metadata.Source {
			case "spreadsheet":
				stats.SpreadsheetChunks++
			case "document":
				stats.DocumentChunks++
			case "chat":
				stats.ChatChunks++
			}
		}
		return nil
	})

	// Serialize and store stats
	var buf bytes.Buffer
	enc := gob.NewEncoder(&buf)
	if err := enc.Encode(stats); err != nil {
		return err
	}

	return metaBucket.Put([]byte("stats"), buf.Bytes())
}