package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/patrickmn/go-cache"
)

// EmbeddingProvider interface
type EmbeddingProvider interface {
	GetEmbedding(ctx context.Context, text string) ([]float32, error)
	GetEmbeddings(ctx context.Context, texts []string) ([][]float32, error)
}

// OpenAIEmbeddingProvider implements embedding generation using OpenAI
type OpenAIEmbeddingProvider struct {
	apiKey     string
	model      string
	httpClient *http.Client

	// Caching
	cache *cache.Cache

	// Rate limiting
	rateLimiter *RateLimiter
}

// NewOpenAIEmbeddingProvider creates a new provider
func NewOpenAIEmbeddingProvider(apiKey string) *OpenAIEmbeddingProvider {
	return &OpenAIEmbeddingProvider{
		apiKey:      apiKey,
		model:       "text-embedding-ada-002",
		httpClient:  &http.Client{Timeout: 30 * time.Second},
		cache:       cache.New(1*time.Hour, 10*time.Minute),
		rateLimiter: NewRateLimiter(3000, time.Minute), // 3000 requests per minute
	}
}

// GetEmbeddings batch processes multiple texts
func (p *OpenAIEmbeddingProvider) GetEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	// Check cache first
	results := make([][]float32, len(texts))
	uncachedIndices := []int{}
	uncachedTexts := []string{}

	for i, text := range texts {
		if cached, found := p.cache.Get(text); found {
			results[i] = cached.([]float32)
		} else {
			uncachedIndices = append(uncachedIndices, i)
			uncachedTexts = append(uncachedTexts, text)
		}
	}

	// If all cached, return early
	if len(uncachedTexts) == 0 {
		return results, nil
	}

	// Batch API calls (OpenAI supports up to 2048 inputs)
	const batchSize = 2048
	for i := 0; i < len(uncachedTexts); i += batchSize {
		end := i + batchSize
		if end > len(uncachedTexts) {
			end = len(uncachedTexts)
		}

		batch := uncachedTexts[i:end]
		batchIndices := uncachedIndices[i:end]

		// Rate limit
		if err := p.rateLimiter.Wait(ctx); err != nil {
			return nil, err
		}

		// Call API
		embeddings, err := p.callAPI(ctx, batch)
		if err != nil {
			return nil, fmt.Errorf("embedding API error: %w", err)
		}

		// Store results and cache
		for j, embedding := range embeddings {
			idx := batchIndices[j]
			results[idx] = embedding
			p.cache.Set(batch[j], embedding, cache.DefaultExpiration)
		}
	}

	return results, nil
}

// GetEmbedding gets embedding for a single text
func (p *OpenAIEmbeddingProvider) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
	embeddings, err := p.GetEmbeddings(ctx, []string{text})
	if err != nil {
		return nil, err
	}
	if len(embeddings) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}
	return embeddings[0], nil
}

// callAPI makes the actual API request
func (p *OpenAIEmbeddingProvider) callAPI(ctx context.Context, texts []string) ([][]float32, error) {
	request := map[string]interface{}{
		"model": p.model,
		"input": texts,
	}

	body, err := json.Marshal(request)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/embeddings", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+p.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Read response body for error details
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		var errorResp struct {
			Error struct {
				Message string `json:"message"`
				Type    string `json:"type"`
			} `json:"error"`
		}
		if err := json.Unmarshal(respBody, &errorResp); err == nil && errorResp.Error.Message != "" {
			return nil, fmt.Errorf("OpenAI API error (%s): %s", errorResp.Error.Type, errorResp.Error.Message)
		}
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Data []struct {
			Embedding []float32 `json:"embedding"`
			Index     int       `json:"index"`
		} `json:"data"`
		Model string `json:"model"`
		Usage struct {
			PromptTokens int `json:"prompt_tokens"`
			TotalTokens  int `json:"total_tokens"`
		} `json:"usage"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Sort by index to ensure correct order
	embeddings := make([][]float32, len(texts))
	for _, data := range result.Data {
		if data.Index < len(embeddings) {
			// Normalize vector for cosine similarity
			norm := float32(0)
			for _, v := range data.Embedding {
				norm += v * v
			}
			norm = float32(math.Sqrt(float64(norm)))
			
			normalized := make([]float32, len(data.Embedding))
			if norm > 0 {
				for i, v := range data.Embedding {
					normalized[i] = v / norm
				}
			}
			embeddings[data.Index] = normalized
		}
	}

	return embeddings, nil
}

// RateLimiter simple implementation
type RateLimiter struct {
	requests  int
	interval  time.Duration
	mu        sync.Mutex
	tokens    int
	lastReset time.Time
}

func NewRateLimiter(requests int, interval time.Duration) *RateLimiter {
	return &RateLimiter{
		requests:  requests,
		interval:  interval,
		tokens:    requests,
		lastReset: time.Now(),
	}
}

func (r *RateLimiter) Wait(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Reset tokens if interval passed
	if time.Since(r.lastReset) > r.interval {
		r.tokens = r.requests
		r.lastReset = time.Now()
	}

	// If we have tokens, consume one
	if r.tokens > 0 {
		r.tokens--
		return nil
	}

	// Otherwise wait until reset
	waitTime := r.interval - time.Since(r.lastReset)

	select {
	case <-time.After(waitTime):
		r.tokens = r.requests - 1
		r.lastReset = time.Now()
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// LocalEmbeddingProvider provides fallback embeddings using a local model
type LocalEmbeddingProvider struct {
	// This would use something like sentence-transformers or a local ONNX model
	// For now, it's a stub that generates random embeddings
}

// NewLocalEmbeddingProvider creates a new local embedding provider
func NewLocalEmbeddingProvider() *LocalEmbeddingProvider {
	return &LocalEmbeddingProvider{}
}

// GetEmbedding generates a local embedding
func (l *LocalEmbeddingProvider) GetEmbedding(ctx context.Context, text string) ([]float32, error) {
	// In production, this would use a real local model
	// For now, return a deterministic fake embedding based on text length
	embedding := make([]float32, 1536) // Same size as OpenAI ada-002
	
	// Simple hash-based embedding for testing
	hash := 0
	for _, ch := range text {
		hash = (hash*31 + int(ch)) % 1000000
	}
	
	for i := range embedding {
		embedding[i] = float32(hash%100) / 100.0
		hash = (hash * 7) % 1000000
	}
	
	return embedding, nil
}

// GetEmbeddings batch processes multiple texts
func (l *LocalEmbeddingProvider) GetEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
	results := make([][]float32, len(texts))
	
	for i, text := range texts {
		embedding, err := l.GetEmbedding(ctx, text)
		if err != nil {
			return nil, err
		}
		results[i] = embedding
	}
	
	return results, nil
}