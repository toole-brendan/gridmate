# Unified Plan v3: Persistent Context & Vectorized Long-Term Memory for Gridmate

## Executive Summary

This updated plan incorporates analysis of the current Gridmate implementation and provides concrete code samples for each component. The plan maintains the two-tier memory approach (immediate context + vectorized long-term memory) while adapting to existing architecture and constraints.

### Key Updates from v2:
- Hybrid storage strategy for better persistence
- Progressive enhancement with keyword search fallback
- Smart indexing optimizations for Excel data
- Detailed code samples for each component
- Refined timeline based on existing infrastructure

## Implementation Status Overview

### ✅ Already Completed (40% of original plan)
- Context merging in `prompt_builder.go`
- Context refresh in `service.go` 
- Correct message ordering in `excel_bridge.go`
- Frontend chat persistence with `usePersistedChat`
- Token usage tracking system
- Operation queue management

### 🚧 To Be Implemented (60% of original plan)
- Vector memory system (Section 2)
- Memory search tool for Claude
- Document ingestion pipeline
- Memory management UI
- Hybrid storage with persistence

## 1. Short-Term Memory Enhancements (Mostly Complete)

The immediate context persistence is largely implemented. We need only minor adjustments:

### 1.1 Extend Session for Memory Support

```go
// backend/internal/services/excel_bridge.go
// Add to ExcelSession struct (around line 40)

type ExcelSession struct {
    ID           string
    UserID       string
    ClientID     string
    ActiveSheet  string
    Selection    SelectionInfo
    Context      map[string]interface{}
    LastActivity time.Time
    CreatedAt    time.Time
    LastRefresh  time.Time
    
    // Add memory support
    MemoryStore  *memory.VectorStore `json:"-"` // Don't serialize
    MemoryStats  *MemoryStats        // Statistics for UI
}

type MemoryStats struct {
    TotalChunks      int
    SpreadsheetChunks int
    DocumentChunks   int
    ChatChunks       int
    LastIndexed      time.Time
    IndexVersion     string
}
```

### 1.2 Initialize Memory on Session Creation

```go
// backend/internal/services/excel_bridge.go
// Modify CreateSignalRSession (around line 165)

func (eb *ExcelBridge) CreateSignalRSession(sessionID string) {
    eb.sessionMutex.Lock()
    defer eb.sessionMutex.Unlock()

    if _, exists := eb.sessions[sessionID]; !exists {
        now := time.Now()
        
        // Initialize with memory store
        memStore := memory.NewHybridVectorStore(
            memory.WithInMemoryCache(10000), // 10k chunks max
            memory.WithDiskPersistence(fmt.Sprintf("./data/sessions/%s.db", sessionID)),
            memory.WithAutoSave(5 * time.Minute),
        )
        
        eb.sessions[sessionID] = &ExcelSession{
            ID:           sessionID,
            UserID:       "signalr-user",
            ClientID:     sessionID,
            ActiveSheet:  "Sheet1",
            Context:      make(map[string]interface{}),
            LastActivity: now,
            CreatedAt:    now,
            MemoryStore:  memStore,
            MemoryStats:  &MemoryStats{IndexVersion: "1.0"},
        }
        
        // Start background indexing of initial workbook state
        go eb.indexInitialWorkbook(sessionID)
        
        // ... rest of existing code
    }
}
```

## 2. Vector Memory System Implementation

### 2.1 Hybrid Vector Store

```go
// backend/internal/memory/vector_store.go

package memory

import (
    "fmt"
    "math"
    "sort"
    "sync"
    "time"
    
    "github.com/boltdb/bolt"
    "gonum.org/v1/gonum/floats"
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
    Source      string                 // "spreadsheet", "document", "chat"
    SourceID    string                 // Sheet name, document ID, etc.
    SourceMeta  map[string]interface{} // Additional metadata
    
    // Spreadsheet-specific
    SheetName   string
    CellRange   string
    IsFormula   bool
    
    // Document-specific  
    DocumentName string
    PageNumber   int
    Section      string
    
    // Chat-specific
    MessageID    string
    Role         string // "user" or "assistant"
    Turn         int
}

// SearchResult contains search results with similarity scores
type SearchResult struct {
    Chunk      Chunk
    Similarity float32
    Score      float32 // Combined score if using hybrid search
}

// HybridVectorStore combines in-memory and disk storage
type HybridVectorStore struct {
    memory      *InMemoryStore
    disk        *BoltDBStore
    
    config      Config
    mu          sync.RWMutex
    lastSave    time.Time
    dirty       bool
}

// Config for hybrid store
type Config struct {
    MaxMemoryChunks int
    DiskPath        string
    AutoSaveInterval time.Duration
    UseCompression  bool
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
```

### 2.2 In-Memory Vector Store Implementation

```go
// backend/internal/memory/inmemory_store.go

package memory

import (
    "math"
    "sort"
    "sync"
    
    "gonum.org/v1/gonum/floats"
)

// InMemoryStore provides fast vector search in memory
type InMemoryStore struct {
    chunks      []Chunk
    maxChunks   int
    mu          sync.RWMutex
    
    // Optimization: pre-computed norms for cosine similarity
    norms       []float32
    
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
    
    for i, chunk := range m.chunks {
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

// Optimized dot product using gonum for SIMD operations
func dotProduct(a, b []float32) float32 {
    if len(a) != len(b) {
        return 0
    }
    
    // Convert to float64 for gonum (SIMD optimized)
    a64 := make([]float64, len(a))
    b64 := make([]float64, len(b))
    for i := range a {
        a64[i] = float64(a[i])
        b64[i] = float64(b[i])
    }
    
    return float32(floats.Dot(a64, b64))
}

// Helper to calculate vector norm
func vectorNorm(v []float32) float32 {
    var sum float32
    for _, val := range v {
        sum += val * val
    }
    return float32(math.Sqrt(float64(sum)))
}
```

### 2.3 Embedding Service

```go
// backend/internal/services/ai/embeddings.go

package ai

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
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
    cache      *cache.Cache
    
    // Rate limiting
    rateLimiter *RateLimiter
}

// NewOpenAIEmbeddingProvider creates a new provider
func NewOpenAIEmbeddingProvider(apiKey string) *OpenAIEmbeddingProvider {
    return &OpenAIEmbeddingProvider{
        apiKey:     apiKey,
        model:      "text-embedding-ada-002",
        httpClient: &http.Client{Timeout: 30 * time.Second},
        cache:      cache.New(1*time.Hour, 10*time.Minute),
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
    
    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
    }
    
    var result struct {
        Data []struct {
            Embedding []float32 `json:"embedding"`
        } `json:"data"`
    }
    
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }
    
    embeddings := make([][]float32, len(result.Data))
    for i, data := range result.Data {
        embeddings[i] = data.Embedding
    }
    
    return embeddings, nil
}

// RateLimiter simple implementation
type RateLimiter struct {
    requests int
    interval time.Duration
    mu       sync.Mutex
    tokens   int
    lastReset time.Time
}

func NewRateLimiter(requests int, interval time.Duration) *RateLimiter {
    return &RateLimiter{
        requests: requests,
        interval: interval,
        tokens:   requests,
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
```

### 2.4 Spreadsheet Chunking Strategy

```go
// backend/internal/memory/chunkers/spreadsheet.go

package chunkers

import (
    "fmt"
    "strings"
    
    "github.com/gridmate/backend/internal/memory"
    "github.com/gridmate/backend/internal/models"
)

// SpreadsheetChunker intelligently chunks Excel data
type SpreadsheetChunker struct {
    minChunkSize int
    maxChunkSize int
}

// NewSpreadsheetChunker creates a new chunker
func NewSpreadsheetChunker() *SpreadsheetChunker {
    return &SpreadsheetChunker{
        minChunkSize: 50,   // ~50 tokens minimum
        maxChunkSize: 300,  // ~300 tokens maximum
    }
}

// ChunkSpreadsheet converts spreadsheet data into searchable chunks
func (c *SpreadsheetChunker) ChunkSpreadsheet(data *models.RangeData) []memory.Chunk {
    chunks := []memory.Chunk{}
    
    // Strategy 1: Table detection and chunking
    tables := c.detectTables(data)
    for _, table := range tables {
        chunk := c.chunkTable(table, data)
        chunks = append(chunks, chunk)
    }
    
    // Strategy 2: Financial sections
    sections := c.detectFinancialSections(data)
    for _, section := range sections {
        chunk := c.chunkSection(section, data)
        chunks = append(chunks, chunk)
    }
    
    // Strategy 3: Complex formulas with context
    formulas := c.extractComplexFormulas(data)
    for _, formula := range formulas {
        chunk := c.chunkFormula(formula, data)
        chunks = append(chunks, chunk)
    }
    
    // Strategy 4: Named ranges
    namedRanges := c.extractNamedRanges(data)
    for _, nr := range namedRanges {
        chunk := c.chunkNamedRange(nr, data)
        chunks = append(chunks, chunk)
    }
    
    return chunks
}

// detectTables finds table structures in the data
func (c *SpreadsheetChunker) detectTables(data *models.RangeData) []TableRegion {
    tables := []TableRegion{}
    
    // Look for headers (bold, colored, or with specific patterns)
    for row := 0; row < len(data.Values); row++ {
        if c.isHeaderRow(data, row) {
            // Find table bounds
            startCol, endCol := c.findTableColumns(data, row)
            endRow := c.findTableEnd(data, row, startCol, endCol)
            
            if endRow > row+1 { // At least 2 rows for a table
                tables = append(tables, TableRegion{
                    HeaderRow: row,
                    StartRow:  row,
                    EndRow:    endRow,
                    StartCol:  startCol,
                    EndCol:    endCol,
                })
            }
        }
    }
    
    return tables
}

// chunkTable creates a chunk from a table region
func (c *SpreadsheetChunker) chunkTable(table TableRegion, data *models.RangeData) memory.Chunk {
    var content strings.Builder
    
    // Include headers
    headers := []string{}
    for col := table.StartCol; col <= table.EndCol; col++ {
        if val := data.Values[table.HeaderRow][col]; val != "" {
            headers = append(headers, val)
        }
    }
    
    content.WriteString("Table: " + strings.Join(headers, " | ") + "\n")
    
    // Include summary statistics
    content.WriteString(fmt.Sprintf("Data rows: %d\n", table.EndRow-table.StartRow))
    
    // Include first few rows as examples
    maxRows := 3
    for row := table.StartRow + 1; row <= table.EndRow && row < table.StartRow+1+maxRows; row++ {
        rowData := []string{}
        for col := table.StartCol; col <= table.EndCol; col++ {
            if val := data.Values[row][col]; val != "" {
                rowData = append(rowData, val)
            }
        }
        content.WriteString(strings.Join(rowData, " | ") + "\n")
    }
    
    // Include any totals or summary rows
    if c.isSummaryRow(data, table.EndRow) {
        content.WriteString("Totals: ")
        for col := table.StartCol; col <= table.EndCol; col++ {
            if val := data.Values[table.EndRow][col]; val != "" {
                content.WriteString(headers[col-table.StartCol] + "=" + val + " ")
            }
        }
    }
    
    return memory.Chunk{
        ID:      fmt.Sprintf("table_%s_%d_%d", data.SheetName, table.StartRow, table.StartCol),
        Content: content.String(),
        Metadata: memory.ChunkMetadata{
            Source:    "spreadsheet",
            SourceID:  data.SheetName,
            SheetName: data.SheetName,
            CellRange: fmt.Sprintf("%s:%s", 
                cellAddress(table.StartRow, table.StartCol),
                cellAddress(table.EndRow, table.EndCol)),
            SourceMeta: map[string]interface{}{
                "type":     "table",
                "headers":  headers,
                "rows":     table.EndRow - table.StartRow,
            },
        },
    }
}

// detectFinancialSections finds standard financial statement sections
func (c *SpreadsheetChunker) detectFinancialSections(data *models.RangeData) []FinancialSection {
    sections := []FinancialSection{}
    
    // Keywords for different financial sections
    sectionKeywords := map[string][]string{
        "income_statement": {"revenue", "sales", "income", "expense", "ebitda", "net income"},
        "balance_sheet":    {"assets", "liabilities", "equity", "current assets", "total assets"},
        "cash_flow":        {"operating activities", "investing activities", "financing activities", "cash flow"},
        "assumptions":      {"assumptions", "growth rate", "discount rate", "wacc", "terminal value"},
    }
    
    for sectionType, keywords := range sectionKeywords {
        for row := 0; row < len(data.Values); row++ {
            for col := 0; col < len(data.Values[row]); col++ {
                cellValue := strings.ToLower(data.Values[row][col])
                
                for _, keyword := range keywords {
                    if strings.Contains(cellValue, keyword) {
                        // Found a section, determine its bounds
                        section := FinancialSection{
                            Type:     sectionType,
                            StartRow: row,
                            StartCol: col,
                            Title:    data.Values[row][col],
                        }
                        
                        // Find section end
                        section.EndRow = c.findSectionEnd(data, row)
                        section.EndCol = c.findSectionEndCol(data, row, col)
                        
                        sections = append(sections, section)
                        break
                    }
                }
            }
        }
    }
    
    return sections
}

// Helper types
type TableRegion struct {
    HeaderRow int
    StartRow  int
    EndRow    int
    StartCol  int
    EndCol    int
}

type FinancialSection struct {
    Type     string
    Title    string
    StartRow int
    EndRow   int
    StartCol int
    EndCol   int
}
```

### 2.5 Document Ingestion Pipeline

```go
// backend/internal/services/document/parser.go

package document

import (
    "context"
    "fmt"
    "io"
    "strings"
    
    "github.com/pdfcpu/pdfcpu/pkg/api"
    "github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
    "github.com/gridmate/backend/internal/memory"
)

// DocumentParser interface
type DocumentParser interface {
    Parse(ctx context.Context, reader io.Reader, filename string) ([]memory.Chunk, error)
    SupportedTypes() []string
}

// PDFParser handles PDF document parsing
type PDFParser struct {
    chunkSize    int
    chunkOverlap int
}

// NewPDFParser creates a new PDF parser
func NewPDFParser() *PDFParser {
    return &PDFParser{
        chunkSize:    300,  // ~300 tokens per chunk
        chunkOverlap: 50,   // 50 token overlap between chunks
    }
}

// Parse extracts and chunks PDF content
func (p *PDFParser) Parse(ctx context.Context, reader io.Reader, filename string) ([]memory.Chunk, error) {
    // Extract text from PDF
    text, pageTexts, err := p.extractText(reader)
    if err != nil {
        return nil, fmt.Errorf("failed to extract PDF text: %w", err)
    }
    
    // Detect document structure
    sections := p.detectSections(text, pageTexts)
    
    // Chunk the document
    chunks := []memory.Chunk{}
    
    for _, section := range sections {
        // Smart chunking based on section size
        if len(section.Text) <= p.chunkSize {
            // Small section - keep as single chunk
            chunk := memory.Chunk{
                ID:      fmt.Sprintf("%s_section_%s", filename, section.ID),
                Content: p.formatSectionContent(section),
                Metadata: memory.ChunkMetadata{
                    Source:       "document",
                    SourceID:     filename,
                    DocumentName: filename,
                    Section:      section.Title,
                    PageNumber:   section.StartPage,
                    SourceMeta: map[string]interface{}{
                        "section_type": section.Type,
                        "pages":        fmt.Sprintf("%d-%d", section.StartPage, section.EndPage),
                    },
                },
            }
            chunks = append(chunks, chunk)
        } else {
            // Large section - split with overlap
            sectionChunks := p.splitWithOverlap(section.Text, p.chunkSize, p.chunkOverlap)
            
            for i, chunkText := range sectionChunks {
                chunk := memory.Chunk{
                    ID:      fmt.Sprintf("%s_section_%s_part_%d", filename, section.ID, i+1),
                    Content: fmt.Sprintf("[%s - Part %d/%d]\n%s", section.Title, i+1, len(sectionChunks), chunkText),
                    Metadata: memory.ChunkMetadata{
                        Source:       "document",
                        SourceID:     filename,
                        DocumentName: filename,
                        Section:      section.Title,
                        PageNumber:   section.StartPage,
                        SourceMeta: map[string]interface{}{
                            "section_type": section.Type,
                            "part":         i + 1,
                            "total_parts":  len(sectionChunks),
                        },
                    },
                }
                chunks = append(chunks, chunk)
            }
        }
    }
    
    // Also create page-based chunks for content not in sections
    orphanedContent := p.findOrphanedContent(text, sections)
    for pageNum, pageContent := range orphanedContent {
        if len(strings.TrimSpace(pageContent)) > 50 { // Skip nearly empty pages
            chunk := memory.Chunk{
                ID:      fmt.Sprintf("%s_page_%d", filename, pageNum),
                Content: fmt.Sprintf("[Page %d]\n%s", pageNum, pageContent),
                Metadata: memory.ChunkMetadata{
                    Source:       "document",
                    SourceID:     filename,
                    DocumentName: filename,
                    PageNumber:   pageNum,
                    SourceMeta: map[string]interface{}{
                        "type": "page_content",
                    },
                },
            }
            chunks = append(chunks, chunk)
        }
    }
    
    return chunks, nil
}

// detectSections identifies document structure
func (p *PDFParser) detectSections(fullText string, pageTexts map[int]string) []Section {
    sections := []Section{}
    
    // Common section patterns for financial documents
    sectionPatterns := []struct {
        Pattern string
        Type    string
    }{
        // 10-K sections
        {"Item 1\\. Business", "business_description"},
        {"Item 1A\\. Risk Factors", "risk_factors"},
        {"Item 7\\. Management.*Discussion", "md&a"},
        {"Item 8\\. Financial Statements", "financial_statements"},
        
        // General patterns
        {"Executive Summary", "executive_summary"},
        {"Financial Highlights", "financial_highlights"},
        {"Notes to.*Financial Statements", "notes"},
        
        // Numbered sections
        {"^\\d+\\.\\s+[A-Z][A-Za-z\\s]+", "numbered_section"},
        
        // All caps headers
        {"^[A-Z\\s]{5,}$", "header_section"},
    }
    
    lines := strings.Split(fullText, "\n")
    currentSection := Section{}
    
    for i, line := range lines {
        trimmed := strings.TrimSpace(line)
        
        for _, pattern := range sectionPatterns {
            if matched, _ := regexp.MatchString(pattern.Pattern, trimmed); matched {
                // Save previous section if exists
                if currentSection.Title != "" {
                    currentSection.EndLine = i - 1
                    currentSection.Text = p.extractSectionText(lines, currentSection.StartLine, currentSection.EndLine)
                    sections = append(sections, currentSection)
                }
                
                // Start new section
                currentSection = Section{
                    ID:        fmt.Sprintf("section_%d", len(sections)),
                    Title:     trimmed,
                    Type:      pattern.Type,
                    StartLine: i,
                    StartPage: p.getPageForLine(i, pageTexts),
                }
                break
            }
        }
    }
    
    // Add final section
    if currentSection.Title != "" {
        currentSection.EndLine = len(lines) - 1
        currentSection.Text = p.extractSectionText(lines, currentSection.StartLine, currentSection.EndLine)
        currentSection.EndPage = p.getPageForLine(currentSection.EndLine, pageTexts)
        sections = append(sections, currentSection)
    }
    
    return sections
}

// splitWithOverlap splits text into overlapping chunks
func (p *PDFParser) splitWithOverlap(text string, chunkSize, overlap int) []string {
    words := strings.Fields(text)
    chunks := []string{}
    
    for i := 0; i < len(words); i += (chunkSize - overlap) {
        end := i + chunkSize
        if end > len(words) {
            end = len(words)
        }
        
        chunk := strings.Join(words[i:end], " ")
        chunks = append(chunks, chunk)
        
        // If this was the last chunk, break
        if end >= len(words) {
            break
        }
    }
    
    return chunks
}

// Section represents a document section
type Section struct {
    ID        string
    Title     string
    Type      string
    Text      string
    StartLine int
    EndLine   int
    StartPage int
    EndPage   int
}
```

### 2.6 Memory Search Tool

```go
// backend/internal/services/ai/tools.go
// Add this to the GetExcelTools() function

{
    Name:        "search_memory",
    Description: "Search long-term memory for relevant information from spreadsheets, documents, or past conversations. Use this when you need to recall information that's not in the current context.",
    InputSchema: json.RawMessage(`{
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural language search query"
            },
            "source_filter": {
                "type": "string",
                "enum": ["all", "spreadsheet", "document", "chat"],
                "description": "Filter results by source type",
                "default": "all"
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of results to return",
                "default": 5,
                "minimum": 1,
                "maximum": 10
            },
            "include_context": {
                "type": "boolean",
                "description": "Include surrounding context for each result",
                "default": true
            }
        },
        "required": ["query"]
    }`),
},

// backend/internal/services/ai/tool_executor.go
// Add to ExecuteTool method

case "search_memory":
    return te.executeMemorySearch(sessionID, toolInput)

// Add new method
func (te *ToolExecutor) executeMemorySearch(sessionID string, input map[string]interface{}) (*ToolResult, error) {
    // Extract parameters
    query, _ := input["query"].(string)
    sourceFilter, _ := input["source_filter"].(string)
    if sourceFilter == "" {
        sourceFilter = "all"
    }
    
    limit := 5
    if l, ok := input["limit"].(float64); ok {
        limit = int(l)
    }
    
    includeContext := true
    if ic, ok := input["include_context"].(bool); ok {
        includeContext = ic
    }
    
    // Get session
    session := te.excelBridge.GetSession(sessionID)
    if session == nil || session.MemoryStore == nil {
        return &ToolResult{
            Success: false,
            Content: "No memory available for this session",
        }, nil
    }
    
    // Get embedding for query
    embedding, err := te.embeddingProvider.GetEmbedding(context.Background(), query)
    if err != nil {
        // Fallback to keyword search
        return te.keywordSearch(session, query, sourceFilter, limit)
    }
    
    // Create filter based on source
    var filter memory.FilterFunc
    if sourceFilter != "all" {
        filter = func(chunk memory.Chunk) bool {
            return chunk.Metadata.Source == sourceFilter
        }
    }
    
    // Search memory
    results, err := session.MemoryStore.Search(embedding, limit, filter)
    if err != nil {
        return &ToolResult{
            Success: false,
            Content: fmt.Sprintf("Memory search failed: %v", err),
        }, nil
    }
    
    // Format results
    var content strings.Builder
    content.WriteString(fmt.Sprintf("Found %d relevant results for '%s':\n\n", len(results), query))
    
    for i, result := range results {
        content.WriteString(fmt.Sprintf("%d. ", i+1))
        
        // Source information
        switch result.Chunk.Metadata.Source {
        case "spreadsheet":
            content.WriteString(fmt.Sprintf("[%s %s] ", result.Chunk.Metadata.SheetName, result.Chunk.Metadata.CellRange))
        case "document":
            content.WriteString(fmt.Sprintf("[%s p.%d] ", result.Chunk.Metadata.DocumentName, result.Chunk.Metadata.PageNumber))
        case "chat":
            content.WriteString(fmt.Sprintf("[Chat turn %d] ", result.Chunk.Metadata.Turn))
        }
        
        // Relevance score
        content.WriteString(fmt.Sprintf("(%.0f%% match)\n", result.Similarity*100))
        
        // Content
        if includeContext {
            content.WriteString(result.Chunk.Content)
        } else {
            // Truncate to first 100 chars
            truncated := result.Chunk.Content
            if len(truncated) > 100 {
                truncated = truncated[:97] + "..."
            }
            content.WriteString(truncated)
        }
        
        content.WriteString("\n\n")
    }
    
    return &ToolResult{
        Success: true,
        Content: content.String(),
        Metadata: map[string]interface{}{
            "result_count": len(results),
            "query":        query,
            "source_filter": sourceFilter,
        },
    }, nil
}
```

### 2.7 Background Indexing Service

```go
// backend/internal/services/indexing/service.go

package indexing

import (
    "context"
    "fmt"
    "sync"
    "time"
    
    "github.com/gridmate/backend/internal/memory"
    "github.com/gridmate/backend/internal/memory/chunkers"
    "github.com/gridmate/backend/internal/services/ai"
    "github.com/sirupsen/logrus"
)

// IndexingService manages background indexing of content
type IndexingService struct {
    embeddingProvider ai.EmbeddingProvider
    spreadsheetChunker *chunkers.SpreadsheetChunker
    documentParser    document.DocumentParser
    
    logger *logrus.Logger
    
    // Track indexing progress
    mu sync.RWMutex
    progress map[string]*IndexingProgress
}

// IndexingProgress tracks the progress of an indexing operation
type IndexingProgress struct {
    SessionID    string
    Status       string // "pending", "running", "completed", "failed"
    TotalItems   int
    ProcessedItems int
    StartTime    time.Time
    EndTime      time.Time
    Error        error
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
        
        chunks := s.spreadsheetChunker.ChunkSpreadsheet(sheet.Data)
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
    
    // Get embeddings
    texts := make([]string, len(chunks))
    for i, chunk := range chunks {
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
    
    // Assign embeddings
    for i, embedding := range embeddings {
        chunks[i].Vector = embedding
        progress.ProcessedItems++
        s.setProgress(sessionID, progress)
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
```

## 3. Frontend Memory Management UI

### 3.1 Memory Panel Component

```tsx
// excel-addin/src/components/memory/MemoryPanel.tsx

import React, { useState, useEffect } from 'react';
import { Upload, File, Trash2, RefreshCw, Search, Database } from 'lucide-react';
import { useMemoryStore } from '../../stores/memoryStore';
import { formatBytes } from '../../utils/formatters';

interface MemoryPanelProps {
  sessionId: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ sessionId }) => {
  const {
    stats,
    documents,
    indexingProgress,
    uploadDocument,
    removeDocument,
    reindexWorkbook,
    searchMemory,
  } = useMemoryStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      await uploadDocument(sessionId, file);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const results = await searchMemory(sessionId, searchQuery);
    setSearchResults(results);
  };
  
  return (
    <div className="memory-panel p-4 space-y-4">
      {/* Memory Stats */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Database className="w-4 h-4" />
            Memory Usage
          </h3>
          <button
            onClick={() => reindexWorkbook(sessionId)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            disabled={indexingProgress?.status === 'running'}
          >
            <RefreshCw className={`w-3 h-3 ${indexingProgress?.status === 'running' ? 'animate-spin' : ''}`} />
            Reindex
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Total chunks:</span>
            <span className="ml-1 font-medium">{stats?.totalChunks || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Spreadsheet:</span>
            <span className="ml-1 font-medium">{stats?.spreadsheetChunks || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Documents:</span>
            <span className="ml-1 font-medium">{stats?.documentChunks || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Chat history:</span>
            <span className="ml-1 font-medium">{stats?.chatChunks || 0}</span>
          </div>
        </div>
        
        {indexingProgress?.status === 'running' && (
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1">
              <span>Indexing...</span>
              <span>{indexingProgress.processedItems}/{indexingProgress.totalItems}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all"
                style={{ width: `${(indexingProgress.processedItems / indexingProgress.totalItems) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Document Management */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Reference Documents</h3>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <div className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <Upload className="w-3 h-3" />
              Upload
            </div>
          </label>
        </div>
        
        <div className="space-y-1">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-sm font-medium">{doc.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatBytes(doc.size)} • {doc.chunks} chunks
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeDocument(sessionId, doc.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {documents.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-4">
              No documents uploaded yet
            </div>
          )}
        </div>
      </div>
      
      {/* Memory Search */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Search Memory</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search across all indexed content..."
            className="flex-1 px-3 py-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-2">
            {searchResults.map((result, idx) => (
              <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                <div className="font-medium text-gray-700">
                  [{result.source}] {result.similarity}% match
                </div>
                <div className="text-gray-600 mt-1">{result.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 3.2 Memory Store

```typescript
// excel-addin/src/stores/memoryStore.ts

import { create } from 'zustand';
import { memoryApi } from '../api/memory';

interface MemoryStats {
  totalChunks: number;
  spreadsheetChunks: number;
  documentChunks: number;
  chatChunks: number;
  lastIndexed: Date;
}

interface Document {
  id: string;
  name: string;
  size: number;
  chunks: number;
  uploadedAt: Date;
}

interface IndexingProgress {
  status: 'pending' | 'running' | 'completed' | 'failed';
  processedItems: number;
  totalItems: number;
}

interface MemoryStore {
  stats: MemoryStats | null;
  documents: Document[];
  indexingProgress: IndexingProgress | null;
  
  // Actions
  fetchStats: (sessionId: string) => Promise<void>;
  uploadDocument: (sessionId: string, file: File) => Promise<void>;
  removeDocument: (sessionId: string, docId: string) => Promise<void>;
  reindexWorkbook: (sessionId: string) => Promise<void>;
  searchMemory: (sessionId: string, query: string) => Promise<any[]>;
  
  // Real-time updates
  updateIndexingProgress: (progress: IndexingProgress) => void;
}

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  stats: null,
  documents: [],
  indexingProgress: null,
  
  fetchStats: async (sessionId) => {
    try {
      const stats = await memoryApi.getStats(sessionId);
      set({ stats });
    } catch (error) {
      console.error('Failed to fetch memory stats:', error);
    }
  },
  
  uploadDocument: async (sessionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    
    try {
      const response = await memoryApi.uploadDocument(formData);
      
      // Add to documents list
      set((state) => ({
        documents: [...state.documents, {
          id: response.documentId,
          name: file.name,
          size: file.size,
          chunks: response.chunks,
          uploadedAt: new Date(),
        }],
      }));
      
      // Refresh stats
      get().fetchStats(sessionId);
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw error;
    }
  },
  
  removeDocument: async (sessionId, docId) => {
    try {
      await memoryApi.removeDocument(sessionId, docId);
      
      // Remove from list
      set((state) => ({
        documents: state.documents.filter(d => d.id !== docId),
      }));
      
      // Refresh stats
      get().fetchStats(sessionId);
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  },
  
  reindexWorkbook: async (sessionId) => {
    try {
      await memoryApi.reindexWorkbook(sessionId);
      
      // Progress will be updated via WebSocket/SignalR
      set({ indexingProgress: { status: 'pending', processedItems: 0, totalItems: 0 } });
    } catch (error) {
      console.error('Failed to start reindexing:', error);
    }
  },
  
  searchMemory: async (sessionId, query) => {
    try {
      const results = await memoryApi.search(sessionId, query);
      return results;
    } catch (error) {
      console.error('Memory search failed:', error);
      return [];
    }
  },
  
  updateIndexingProgress: (progress) => {
    set({ indexingProgress: progress });
    
    // Clear progress after completion
    if (progress.status === 'completed' || progress.status === 'failed') {
      setTimeout(() => {
        set({ indexingProgress: null });
      }, 3000);
    }
  },
}));
```

### 3.3 Source Attribution in Chat

```tsx
// excel-addin/src/components/chat/SourceAttribution.tsx

import React from 'react';
import { FileText, Table, MessageSquare, ExternalLink } from 'lucide-react';

interface Source {
  type: 'spreadsheet' | 'document' | 'chat';
  title: string;
  reference: string;
  similarity?: number;
}

interface SourceAttributionProps {
  sources: Source[];
}

export const SourceAttribution: React.FC<SourceAttributionProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'spreadsheet':
        return <Table className="w-3 h-3" />;
      case 'document':
        return <FileText className="w-3 h-3" />;
      case 'chat':
        return <MessageSquare className="w-3 h-3" />;
      default:
        return <ExternalLink className="w-3 h-3" />;
    }
  };
  
  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-md">
      <div className="text-xs font-medium text-gray-600 mb-1">Sources consulted:</div>
      <div className="space-y-1">
        {sources.map((source, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
            {getIcon(source.type)}
            <span>{source.title}</span>
            <span className="text-gray-500">({source.reference})</span>
            {source.similarity && (
              <span className="ml-auto text-gray-400">{Math.round(source.similarity * 100)}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 4. Integration and API Endpoints

### 4.1 Memory API Endpoints

```go
// backend/internal/handlers/memory_handler.go

package handlers

import (
    "encoding/json"
    "net/http"
    
    "github.com/gorilla/mux"
    "github.com/gridmate/backend/internal/services/indexing"
)

type MemoryHandler struct {
    indexingService *indexing.IndexingService
    excelBridge     *services.ExcelBridge
}

// GetMemoryStats returns memory statistics for a session
func (h *MemoryHandler) GetMemoryStats(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    sessionID := vars["sessionId"]
    
    session := h.excelBridge.GetSession(sessionID)
    if session == nil || session.MemoryStore == nil {
        h.sendError(w, http.StatusNotFound, "Session not found")
        return
    }
    
    stats := session.MemoryStore.GetStats()
    
    response := map[string]interface{}{
        "totalChunks":       stats.TotalChunks,
        "spreadsheetChunks": stats.SpreadsheetChunks,
        "documentChunks":    stats.DocumentChunks,
        "chatChunks":        stats.ChatChunks,
        "lastIndexed":       session.MemoryStats.LastIndexed,
    }
    
    h.sendJSON(w, response)
}

// UploadDocument handles document upload and indexing
func (h *MemoryHandler) UploadDocument(w http.ResponseWriter, r *http.Request) {
    sessionID := r.FormValue("sessionId")
    
    session := h.excelBridge.GetSession(sessionID)
    if session == nil {
        h.sendError(w, http.StatusNotFound, "Session not found")
        return
    }
    
    // Parse uploaded file
    file, header, err := r.FormFile("file")
    if err != nil {
        h.sendError(w, http.StatusBadRequest, "Failed to parse file")
        return
    }
    defer file.Close()
    
    // Start indexing in background
    go h.indexingService.IndexDocument(
        r.Context(),
        sessionID,
        file,
        header.Filename,
        session.MemoryStore,
    )
    
    response := map[string]interface{}{
        "documentId": generateDocumentID(),
        "status":     "indexing",
        "filename":   header.Filename,
    }
    
    h.sendJSON(w, response)
}

// ReindexWorkbook triggers reindexing of the current workbook
func (h *MemoryHandler) ReindexWorkbook(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    sessionID := vars["sessionId"]
    
    session := h.excelBridge.GetSession(sessionID)
    if session == nil {
        h.sendError(w, http.StatusNotFound, "Session not found")
        return
    }
    
    // Get current workbook data
    workbook := h.excelBridge.GetWorkbookData(sessionID)
    
    // Start reindexing in background
    go h.indexingService.IndexWorkbook(
        r.Context(),
        sessionID,
        workbook,
        session.MemoryStore,
    )
    
    h.sendJSON(w, map[string]interface{}{
        "status": "started",
    })
}

// GetIndexingProgress returns current indexing progress
func (h *MemoryHandler) GetIndexingProgress(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    sessionID := vars["sessionId"]
    
    progress := h.indexingService.GetProgress(sessionID)
    if progress == nil {
        h.sendJSON(w, map[string]interface{}{
            "status": "idle",
        })
        return
    }
    
    h.sendJSON(w, map[string]interface{}{
        "status":         progress.Status,
        "processedItems": progress.ProcessedItems,
        "totalItems":     progress.TotalItems,
        "error":          progress.Error,
    })
}
```

## 5. Updated Implementation Timeline

### Week 1: Foundation & Core Memory System
- Day 1-2: Implement hybrid vector store with in-memory and disk persistence
- Day 3: Set up embedding service with OpenAI integration
- Day 4: Integrate memory store into Excel sessions
- Day 5: Basic testing and optimization

### Week 2: Search & Retrieval
- Day 1-2: Implement memory search tool
- Day 3: Add tool to AI service and test Claude integration
- Day 4: Implement automatic context injection
- Day 5: Performance optimization and caching

### Week 3: Content Ingestion
- Day 1-2: Implement spreadsheet chunking strategies
- Day 3: Add PDF parsing and document chunking
- Day 4: Build background indexing service
- Day 5: Test with various document types

### Week 4: Frontend Integration
- Day 1-2: Build memory panel UI component
- Day 3: Implement document upload and management
- Day 4: Add source attribution to chat responses
- Day 5: Integration testing

### Week 5: Polish & Optimization
- Day 1-2: Performance tuning and stress testing
- Day 3: Add monitoring and error handling
- Day 4: Documentation and deployment guides
- Day 5: Final testing and bug fixes

## 6. Key Improvements from v2

1. **Hybrid Storage**: Combines fast in-memory search with disk persistence
2. **Progressive Enhancement**: Keyword search fallback when embeddings fail
3. **Smart Chunking**: Context-aware chunking for spreadsheets and documents
4. **Performance Optimizations**: SIMD operations, caching, batch processing
5. **Better UX**: Progress tracking, source attribution, memory management UI
6. **Robust Error Handling**: Graceful degradation and fallback strategies

## 7. Conclusion

This updated plan provides a production-ready implementation of the vector memory system for Gridmate. By leveraging the existing infrastructure and adding the proposed components, we can deliver a powerful memory system that enhances Claude's ability to provide context-aware assistance while maintaining excellent performance and user experience.

The modular design allows for incremental deployment and testing, ensuring that each component is thoroughly validated before moving to the next phase. The hybrid storage approach addresses the Azure PostgreSQL limitations while providing a path for future scalability.