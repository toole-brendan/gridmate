package excel

import (
	"sync"
	"time"
)

// CachedContextProvider provides lightweight context without requiring tool calls
type CachedContextProvider struct {
	mu    sync.RWMutex
	cache map[string]*LightweightContext
	ttl   time.Duration
}

// LightweightContext contains essential context information without requiring Excel reads
type LightweightContext struct {
	SessionID    string
	IsEmpty      bool
	RowCount     int
	ColumnCount  int
	LastModified time.Time
	SheetName    string
	ActiveRange  string
	CachedAt     time.Time
	// Key metrics without requiring tool calls
	HasFormulas  bool
	HasCharts    bool
	ModelType    string // DCF, LBO, etc. if detected
}

// NewCachedContextProvider creates a new cached context provider
func NewCachedContextProvider(ttl time.Duration) *CachedContextProvider {
	return &CachedContextProvider{
		cache: make(map[string]*LightweightContext),
		ttl:   ttl,
	}
}

// GetContext retrieves cached context or returns a default
func (cp *CachedContextProvider) GetContext(sessionID string) *LightweightContext {
	cp.mu.RLock()
	defer cp.mu.RUnlock()
	
	ctx, exists := cp.cache[sessionID]
	if !exists || time.Since(ctx.CachedAt) > cp.ttl {
		return &LightweightContext{
			SessionID:   sessionID,
			IsEmpty:     false, // Assume not empty to avoid unnecessary checks
			SheetName:   "Sheet1",
			ActiveRange: "A1:Z100", // Default range
			CachedAt:    time.Now(),
		}
	}
	return ctx
}

// UpdateFromToolResult updates context based on tool execution results
func (cp *CachedContextProvider) UpdateFromToolResult(sessionID string, tool string, result interface{}) {
	cp.mu.Lock()
	defer cp.mu.Unlock()
	
	ctx, exists := cp.cache[sessionID]
	if !exists {
		ctx = &LightweightContext{SessionID: sessionID}
	}
	
	// Update context based on tool results
	switch tool {
	case "write_range":
		ctx.IsEmpty = false
		ctx.LastModified = time.Now()
		
	case "read_range":
		// Parse result to update row/column counts
		if data, ok := result.(map[string]interface{}); ok {
			if values, ok := data["values"].([][]interface{}); ok {
				ctx.RowCount = len(values)
				if len(values) > 0 {
					ctx.ColumnCount = len(values[0])
				}
				ctx.IsEmpty = len(values) == 0
			}
		}
		
	case "apply_formula":
		ctx.HasFormulas = true
		ctx.LastModified = time.Now()
		
	case "create_chart":
		ctx.HasCharts = true
		ctx.LastModified = time.Now()
	}
	
	ctx.CachedAt = time.Now()
	cp.cache[sessionID] = ctx
}

// UpdateFromContext updates cache from a full financial context
func (cp *CachedContextProvider) UpdateFromContext(sessionID string, fullContext interface{}) {
	cp.mu.Lock()
	defer cp.mu.Unlock()
	
	ctx := &LightweightContext{
		SessionID: sessionID,
		CachedAt:  time.Now(),
	}
	
	// Extract relevant fields from full context
	if fc, ok := fullContext.(map[string]interface{}); ok {
		if selectedRange, ok := fc["selected_range"].(string); ok {
			ctx.ActiveRange = selectedRange
		}
		if modelType, ok := fc["model_type"].(string); ok {
			ctx.ModelType = modelType
		}
		if isEmpty, ok := fc["is_empty"].(bool); ok {
			ctx.IsEmpty = isEmpty
		}
	}
	
	cp.cache[sessionID] = ctx
}

// Clear removes a session from cache
func (cp *CachedContextProvider) Clear(sessionID string) {
	cp.mu.Lock()
	defer cp.mu.Unlock()
	delete(cp.cache, sessionID)
}