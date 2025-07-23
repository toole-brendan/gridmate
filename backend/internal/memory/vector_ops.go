package memory

import (
	"math"
	"runtime"
	"sync"
)

// VectorOps provides optimized vector operations
type VectorOps struct {
	numWorkers int
}

// NewVectorOps creates a new vector operations instance
func NewVectorOps() *VectorOps {
	return &VectorOps{
		numWorkers: runtime.NumCPU(),
	}
}

// CosineSimilarity computes the cosine similarity between two normalized vectors
func (v *VectorOps) CosineSimilarity(a, b []float32) float32 {
	if len(a) != len(b) {
		return 0
	}
	
	// For normalized vectors, cosine similarity is just the dot product
	return v.DotProduct(a, b)
}

// DotProduct computes the dot product of two vectors
func (v *VectorOps) DotProduct(a, b []float32) float32 {
	if len(a) != len(b) {
		return 0
	}
	
	// For small vectors, use simple loop
	if len(a) < 128 {
		var sum float32
		for i := range a {
			sum += a[i] * b[i]
		}
		return sum
	}
	
	// For larger vectors, use parallel computation
	return v.parallelDotProduct(a, b)
}

// parallelDotProduct computes dot product using multiple goroutines
func (v *VectorOps) parallelDotProduct(a, b []float32) float32 {
	n := len(a)
	numWorkers := v.numWorkers
	if numWorkers > n/64 { // Don't use more workers than needed
		numWorkers = n / 64
		if numWorkers < 1 {
			numWorkers = 1
		}
	}
	
	chunkSize := n / numWorkers
	results := make([]float32, numWorkers)
	var wg sync.WaitGroup
	
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			
			start := workerID * chunkSize
			end := start + chunkSize
			if workerID == numWorkers-1 {
				end = n
			}
			
			var sum float32
			for j := start; j < end; j++ {
				sum += a[j] * b[j]
			}
			results[workerID] = sum
		}(i)
	}
	
	wg.Wait()
	
	// Sum up results
	var total float32
	for _, r := range results {
		total += r
	}
	
	return total
}

// BatchCosineSimilarity computes cosine similarity between a query and multiple vectors
func (v *VectorOps) BatchCosineSimilarity(query []float32, vectors [][]float32) []float32 {
	results := make([]float32, len(vectors))
	
	// For small batches, use sequential computation
	if len(vectors) < 100 {
		for i, vec := range vectors {
			results[i] = v.CosineSimilarity(query, vec)
		}
		return results
	}
	
	// For large batches, use parallel computation
	var wg sync.WaitGroup
	numWorkers := v.numWorkers
	chunkSize := len(vectors) / numWorkers
	if chunkSize < 10 {
		chunkSize = 10
		numWorkers = len(vectors) / chunkSize
	}
	
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			
			start := workerID * chunkSize
			end := start + chunkSize
			if workerID == numWorkers-1 {
				end = len(vectors)
			}
			
			for j := start; j < end; j++ {
				results[j] = v.CosineSimilarity(query, vectors[j])
			}
		}(i)
	}
	
	wg.Wait()
	
	return results
}

// NormalizeVector normalizes a vector to unit length
func (v *VectorOps) NormalizeVector(vec []float32) []float32 {
	norm := v.VectorNorm(vec)
	if norm == 0 {
		return vec
	}
	
	normalized := make([]float32, len(vec))
	for i, val := range vec {
		normalized[i] = val / norm
	}
	
	return normalized
}

// VectorNorm computes the L2 norm of a vector
func (v *VectorOps) VectorNorm(vec []float32) float32 {
	var sum float32
	for _, val := range vec {
		sum += val * val
	}
	return float32(math.Sqrt(float64(sum)))
}

// EuclideanDistance computes the Euclidean distance between two vectors
func (v *VectorOps) EuclideanDistance(a, b []float32) float32 {
	if len(a) != len(b) {
		return math.MaxFloat32
	}
	
	var sum float32
	for i := range a {
		diff := a[i] - b[i]
		sum += diff * diff
	}
	
	return float32(math.Sqrt(float64(sum)))
}

// Global instance for convenience
var defaultOps = NewVectorOps()

// CosineSimilarity computes cosine similarity using the default ops
func CosineSimilarity(a, b []float32) float32 {
	return defaultOps.CosineSimilarity(a, b)
}

// DotProduct computes dot product using the default ops
func DotProduct(a, b []float32) float32 {
	return defaultOps.DotProduct(a, b)
}

// NormalizeVector normalizes a vector using the default ops
func NormalizeVector(vec []float32) []float32 {
	return defaultOps.NormalizeVector(vec)
}

// VectorNorm computes vector norm using the default ops
func VectorNorm(vec []float32) float32 {
	return defaultOps.VectorNorm(vec)
}