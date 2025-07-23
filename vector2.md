Perfect. I’ll now create a unified implementation plan for Gridmate that merges Zed-style diagnostic and full-context accuracy with Cline/Roo-Code-inspired vectorized long-term memory. I’ll focus on a shared architecture where it makes sense, mirror the proven engineering patterns from the Zed and Cline repositories, and present a clean development blueprint with milestones, data flow, and integration details grounded in Gridmate’s structure.


# Unified Plan: Persistent Context & Vectorized Long-Term Memory for Gridmate

## Implementation Status

### ✅ Already Implemented
- **Context Merging (Section 1.2)**: `prompt_builder.go` already merges context into single system message
- **Context Refresh (Section 1.4)**: `service.go` refreshes context after tool execution  
- **Correct Message Order (Section 1.3)**: `excel_bridge.go` builds context before adding to history
- **Frontend Infrastructure**: Chat manager and persisted token usage system ready

### 🔧 Needs Implementation
- **Vector Memory System**: Entire Section 2 to be built
- **Memory Search Tool**: New tool for Claude to query vector store
- **Document Ingestion**: PDF parsing and indexing
- **Memory UI**: Document management and source visibility

## Goals and Overview

We propose a comprehensive enhancement to Gridmate's AI memory system that combines **immediate conversation context persistence** with **vectorized long-term knowledge integration**. In essence, the AI (Claude) will:

* **Never “Forget”** – Maintain full conversation history and the evolving spreadsheet state across turns, just as tools like Cline and RooCode ensure an AI always rebuilds its context from a memory source each session.
* **Embed External Knowledge** – Automatically ingest large documents (e.g. PDF financial reports) and background data into a semantic vector store, enabling retrieval of relevant facts on demand (RAG-style). This mirrors the approach of VSCode agents like RooCode, which use local vector databases to give AI “instant recall” of project files.
* **Integrate Seamlessly in Prompts** – Inject both the up-to-date spreadsheet context and any pertinent retrieved knowledge into each prompt, so Claude’s responses are always grounded in the latest data and extended references.
* **User Transparency and Control** – Provide UI elements to visualize context usage (token counts, memory hits) and manage the AI’s memory (view what it “remembers,” refresh or clear it), following best practices from similar AI assistants.

By unifying short-term memory persistence with long-term semantic retrieval, Gridmate’s AI will function as a truly context-aware financial assistant – retaining conversation state like a human colleague, and referencing vast knowledge (documents, prior analyses) like a research analyst.

## 1. Persistent Conversation & Spreadsheet Context (Short-Term Memory)

The first part of the plan fortifies Gridmate’s handling of chat history and spreadsheet state so that **Claude sees the entire relevant context on every turn**. This addresses current limitations where only the first user query got the full sheet context, and later prompts relied on limited memory. Key steps:

**1.1 Always Include Full History in Prompts:** Every time we call Claude, we will supply the complete sequence of the conversation (up to length limits). This is akin to RooCode’s approach of sending all prior messages each turn, and Cline’s “Memory Bank” principle of reloading context on each session reset. In practice, we will modify the prompt-building code to prepend all previous user and assistant messages. The order of messages going into Claude will be: a single System message (with instructions + current sheet context – see next point), then Message1 (User), Message1 (Assistant), Message2 (User), Message2 (Assistant), …, finally the current User query. This ensures Claude is aware of everything that has been discussed or done so far.

* *Implementation:* In `ExcelBridge.ProcessChatMessage`, retrieve the full chat history *before* adding the new user message, convert it to the AI message format, and include it in the request. We will increase or remove the current cap of 100 messages if needed (100 should suffice for now, but we keep the infrastructure flexible). If the conversation grows too large to fit in 200k tokens, strategies like summarizing or dropping the oldest turns can be employed. (We note this for future: Cline addresses this by having the user maintain summaries in memory files, and RooCode could in the future use the vector memory to recall pruned context – with our new long-term memory, we have the option to semantically search old dialogue if omitted from prompt.)

**1.2 Merge System Prompt with Context Snapshot:** Gridmate’s prompt builder currently sent two system-role messages (one for the base instructions, one for “Current Context”), which caused the Anthropic API to ignore the first. We will fix this by **combining the static instructions and dynamic context into a single system message**. That way, Claude receives both the general guidance (e.g. “You are a financial modeling assistant…”) and the spreadsheet’s current state every time.

* *Implementation:* In `PromptBuilder.BuildChatPrompt`, after assembling the base `systemPrompt`, append the formatted `FinancialContext` to it. For example (Go pseudocode):

  ```go
  systemContent := pb.systemPrompt  // base instructions
  if ctx := pb.buildContextPrompt(financialContext); ctx != "" {
      systemContent += "\n\nCurrent Context:\n" + ctx
  }
  messages = []Message{{Role: "system", Content: systemContent}, {Role: "user", Content: userMessage}}
  ```

  This pattern will also be applied in multi-turn flows: in `ai.Service.ProcessChatWithToolsAndHistory`, we will *always prepend* an updated system message with context, not just on the first turn. We remove any conditional that previously skipped context on subsequent calls. Effectively, each prompt to Claude will start with one system message containing the latest context snapshot (sheet name, selection, key values/formulas, recent changes, etc.), followed by the full conversation history. This mirrors RooCode’s habit of always providing the current file state, and Cline’s requirement that the AI read context docs each time.

**1.3 Fix Conversation Flow for First Message:** We correct the logic so that the **first user message** in a new session properly includes the system+context. Currently, the backend was appending the user message to history too early, tricking the code into thinking it’s not the first turn. We will adjust `ExcelBridge.ProcessChatMessage` to build the prompt *before* adding the new user message to `chatHistory`. If `history` is empty (no prior turns), use the prompt builder directly (which now merges context) for Claude. Only after getting Claude’s response do we append the messages to history. This ensures turn 1 is handled as a special case with context. On turn 2 and beyond, we’ll use the full-history approach described, which now also injects context each time. After each call, we add the user and assistant messages to memory. With this ordering fix, the conversation initialization will be robust, and no context will be missing on the first query.

**1.4 Persist Chat History (Optional):** To further enhance reliability, we plan to **persist the conversation to a database** so that if a session is interrupted or the user refreshes the add-in, we can reload past messages. This is analogous to how one might store chat logs, and was suggested in our earlier phase plans. Implementation would involve a `chat_messages` table and extending the `chat.History` struct to write to/read from it. However, since we will also be persisting the relevant knowledge in the vector memory (next section), database persistence is an extra safety net rather than a necessity for context continuity within a single live session. For now, we ensure that within a continuous session (which can span hours of work), nothing is forgotten in-memory. Optionally, we will implement the DB logging for audit trail and multi-device continuity in the future.

**1.5 Spreadsheet Context on Every Turn:** The Excel workbook is an ever-changing source of truth, so we update Claude’s view of it each time. The `FinancialContext` builder already captures things like the active sheet name, currently selected range values, nearby cells, and a list of recent edits. We will call `BuildContext` on **every user message**, not just the first, and include its output as described. This means if the user or AI has made edits to the sheet, Claude will see those new values or formulas in the next prompt. For example, if the AI inserted a formula in cell B5 in a previous step, the next user question will come with an updated context that includes cell B5’s value and formula. This approach follows RooCode’s practice of always reading the latest file state, and Cline’s instruction that the assistant must re-check the memory files at each step.

* *Recent Changes:* We particularly leverage the `RecentChanges` field in `FinancialContext`. The backend tracks up to the last 10 edits (with old and new values) made by either the AI or user. We will ensure this gets appended to the context snippet (as an XML/markdown section, e.g. `<recent_changes>…</recent_changes>`). This gives Claude a short-term “change log,” which helps it understand what has just been modified. It’s like a mini memory bank of the latest diffs. Cline’s `activeContext.md` serves a similar purpose (recording recent changes and decisions) – we’re automating that by feeding the changes directly each time.

**1.6 Frontend Session Management:** To complement the backend’s memory persistence, the frontend will maintain the chat state so the user also sees the full conversation:

* The Excel add-in will **reuse the same session ID** for the entire workbook session. We’ll store a GUID in the component state or localStorage when the add-in loads, and pass it with each message to the backend. This ensures the backend maps all messages to the same `ExcelSession` and `chatHistory`. (If the add-in is closed and reopened, it will attempt to resume the old session ID; if the backend has expired it, a new one is created, but we could in future fetch the old messages from DB if persisted).
* We will implement a **ChatHistory state** on the frontend (e.g. using Zustand store or React context) to accumulate messages. After each send or receive, we append to this state and also write it to localStorage (so it survives page refresh). On component mount, if stored history exists for that session, we load it. This way, if the user refreshes the task pane or reopens it, the conversation is visually restored. The user will always see what Claude saw. This aligns with user expectations (like reopening a chat in ChatGPT web and seeing old messages). It’s also similar to how RooCode’s UI would show the transcript of the session and how Cline’s webview persists task history.
* The **chat UI** will be updated to display the conversation from this state rather than relying only on live SignalR messages. This means even if connectivity blips, the local copy retains the messages. The UI will clearly differentiate user vs assistant messages (perhaps using styling or alignment differences). Any features planned (like showing formulas or citations in answers) will build on this.
* We’ll remove any restriction that requires selecting a range to ask a question. With full-sheet context always provided, the “Send” button should be enabled even if no cells are actively highlighted. (The context builder will include the whole sheet or relevant parts by default if selection is empty, ensuring the AI isn’t blind.)

**1.7 Testing & Edge Cases:** After implementation, we will test scenarios such as:

* Multi-turn Q\&A: Ask a question, get answer, then a follow-up referring to that answer (“Can you explain how you got that number?”). Claude should have the prior answer in context to respond correctly.
* Sheet updates: Ask a calculation, then manually change some cell values in Excel, then ask again. The new answer should reflect updated values, proving that context refresh each turn works.
* Session continuity: Close and reopen the add-in mid-conversation (without closing workbook). The chat history should reload on the frontend, and upon a new query, the backend (if still in memory) continues the session. If using DB persistence, even a restarted backend could fetch old messages by session ID. This yields a seamless experience analogous to not losing your place in a chat.

By these steps, we achieve **robust short-term memory**: Claude is always given all relevant information about the conversation and spreadsheet state. We essentially replicate the memory retention mechanisms of Cline (structured files for context) and RooCode (always sending current code) in the financial modeling domain: every turn, the AI is “reminded” of everything it should know so far. This lays the groundwork for adding the longer-term, vector-based memory next.

## 2. Vectorized Long-Term Memory Integration

With the conversation and immediate context solidified, we extend Gridmate’s capability by adding a **semantic long-term memory**. This system will ingest knowledge beyond the current prompt (large text from spreadsheets, lengthy chat history beyond 100 messages, user-provided PDFs or docs, etc.) and allow Claude to recall it via semantic search. The design follows a retrieval-augmented generation (RAG) approach, similar to what RooCode’s development and other IDE assistants are adopting: index everything in a vector store and query it for relevant pieces when needed.

**2.1 Session-Scoped Vector Store:** On opening a workbook (starting a Gridmate session), we initialize a **vector database** dedicated to that session. We'll start with a simple in-memory implementation and evolve as needed:

**Initial Implementation (Recommended):**
```go
// backend/internal/memory/vector_store.go
type InMemoryVectorStore struct {
    chunks []MemoryChunk
    mu     sync.RWMutex
}

func (s *InMemoryVectorStore) Search(query []float32, topK int) []MemoryChunk {
    // Simple brute-force cosine similarity
    // Sufficient for <10k chunks, which covers most Excel use cases
}
```

**Future Optimizations:**
* For larger datasets (>10k chunks), implement HNSW (Hierarchical Navigable Small World) index
* For persistence across sessions, consider LMDB or SQLite with vector extension
* Key insight: Most financial models have <1000 meaningful chunks, so start simple

**Data Structure:**

  ```go
  type MemoryChunk struct {
      Vector []float32
      Content string
      Source  MemorySourceMeta  // metadata about origin
  }
  ```

  The `MemorySourceMeta` can include info like source type (e.g. `"sheet"` or `"pdf"` or `"chat"`), identifiers (sheet name & cell range, document name & page, chat message timestamp or ID), etc. This metadata is crucial for helping the AI and user understand where a retrieved snippet came from.

**Session Lifecycle:**
```go
// Extend ExcelSession to include memory
type ExcelSession struct {
    // ... existing fields ...
    MemoryStore *InMemoryVectorStore // Add this
}

// Initialize on session creation
func (eb *ExcelBridge) CreateSession(sessionID string) {
    session := &ExcelSession{
        // ... existing initialization ...
        MemoryStore: memory.NewInMemoryVectorStore(),
    }
    // Initial indexing of workbook
    go eb.indexWorkbookContent(session)
}
```

For MVP, memory resets when workbook closes. Future optimization: persist index to disk keyed by workbook hash for instant reload.

**2.2 Embedding Model and API:** 

**Implementation:**
```go
// backend/internal/services/ai/embeddings.go
type EmbeddingProvider interface {
    GetEmbedding(ctx context.Context, text string) ([]float32, error)
    GetEmbeddings(ctx context.Context, texts []string) ([][]float32, error) // Batch API
}

type OpenAIEmbeddingProvider struct {
    apiKey     string
    httpClient *http.Client
}

func (p *OpenAIEmbeddingProvider) GetEmbeddings(ctx context.Context, texts []string) ([][]float32, error) {
    // Batch up to 2048 texts per request (OpenAI limit)
    // Normalize vectors to unit length for cosine similarity
    // Cache results to avoid re-embedding unchanged content
}
```

**Why OpenAI text-embedding-ada-002:**
- Proven performance for semantic search
- 1536 dimensions capture nuanced financial concepts
- Low cost (~$0.0001 per 1k tokens)
- Fast response (~100ms for queries)

**2.3 Automated Ingestion Pipeline:** 

**Chunking Strategy for Spreadsheets:**
```go
func (eb *ExcelBridge) chunkSpreadsheet(data RangeData) []ChunkData {
    chunks := []ChunkData{}
    
    // Strategy 1: Headers + Related Data (Keep context together)
    if headers := detectHeaders(data); len(headers) > 0 {
        for _, header := range headers {
            chunk := ChunkData{
                Text: formatHeaderWithData(header, data),
                Meta: ChunkMeta{
                    Type: "table_section",
                    Sheet: data.Sheet,
                    Range: header.DataRange,
                },
            }
            chunks = append(chunks, chunk)
        }
    }
    
    // Strategy 2: Logical Financial Sections
    sections := detectFinancialSections(data) // Income Statement, Balance Sheet, etc.
    for _, section := range sections {
        chunk := formatSection(section)
        chunks = append(chunks, chunk)
    }
    
    // Strategy 3: Individual Formulas with Context
    for addr, formula := range data.Formulas {
        if isComplexFormula(formula) {
            chunk := ChunkData{
                Text: fmt.Sprintf("Cell %s formula: %s\nReferences: %s", 
                    addr, formula, extractReferences(formula)),
                Meta: ChunkMeta{Type: "formula", Cell: addr},
            }
            chunks = append(chunks, chunk)
        }
    }
    
    return chunks
}
```

**Key Principles:**
- Keep headers with their data for context
- Chunk by logical units (financial statements, tables)
- Skip empty cells but preserve structure
- Include formula dependencies

* **Long Text in Cells:** If any cell contains a long text (e.g. a comment or a description paragraph), that single cell text can be a chunk on its own (with metadata pointing to that cell). This way, if the user asks about something mentioned in a note cell, Claude can find it.

* **Conversation History:** We will also embed the conversation messages as they accumulate. Each user or assistant message (especially longer ones) can be a chunk. This provides a fallback if the conversation gets too long to include fully in the prompt: Claude can query the vector memory for older exchanges. For example, if the user references “the assumption we discussed earlier”, and that part of the conversation is no longer in the last 100 messages included, Claude could do a memory search for “assumption discussed” and find it. Initially, since we plan to include full history in prompt, this is more of a future-proofing step. But it has use in summarization: we might choose to only include last N turns in the prompt and rely on vector recall for anything older (much like the dev community’s experiments where they dropped huge conversation contexts in favor of RAG).

**Document Ingestion:**
```go
// backend/internal/services/document/parser.go
type DocumentParser interface {
    Parse(ctx context.Context, file io.Reader, filename string) ([]DocumentChunk, error)
}

type PDFParser struct {
    chunkSize    int // Target ~300 tokens per chunk
    chunkOverlap int // 50 token overlap
}

func (p *PDFParser) Parse(ctx context.Context, file io.Reader, filename string) ([]DocumentChunk, error) {
    // Use pdfcpu or similar Go library
    text := extractTextFromPDF(file)
    
    // Smart chunking by sections
    chunks := []DocumentChunk{}
    sections := detectSections(text) // Look for headers, page breaks
    
    for _, section := range sections {
        if len(section.Text) > p.chunkSize {
            // Split large sections with overlap
            subChunks := splitWithOverlap(section.Text, p.chunkSize, p.chunkOverlap)
            for i, chunk := range subChunks {
                chunks = append(chunks, DocumentChunk{
                    Text: chunk,
                    Meta: DocumentMeta{
                        Filename: filename,
                        Section:  section.Title,
                        Page:     section.StartPage,
                        Part:     i + 1,
                    },
                })
            }
        } else {
            chunks = append(chunks, DocumentChunk{
                Text: section.Text,
                Meta: DocumentMeta{
                    Filename: filename,
                    Section:  section.Title,
                    Page:     section.StartPage,
                },
            })
        }
    }
    
    return chunks, nil
}
```

This enables queries like "What does the 2022 10-K say about revenue growth?" by searching relevant snippets.

* **Index Refreshing:** The ingestion isn’t one-time. If the spreadsheet changes significantly (like the user adds a new sheet or a huge amount of data), we should update the index. We can either automatically detect large changes or provide a manual “Re-index” trigger (see UI section). For external docs, if the user replaces a document or adds a new version, we can index the new one similarly. The system should avoid duplicating old and new – perhaps by segregating by document version or allowing the user to remove an old doc from memory.

All these chunks (sheet data, chats, docs) get embedded and stored in the vector store. This might happen at session start (e.g. index the whole workbook and any already attached docs up front), and then incrementally during the session (embedding new messages or newly added content on the fly). We’ll handle embedding in batches for efficiency: e.g. if a PDF has 50 chunks, batch them into a single API call if using OpenAI (the API supports up to 2048 inputs in one request).

**2.4 Memory Retrieval (Similarity Search):**

**Implementation:**
```go
func (s *InMemoryVectorStore) Search(queryVector []float32, topK int) []SearchResult {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    // Calculate cosine similarity for all chunks
    results := make([]SearchResult, 0, len(s.chunks))
    for _, chunk := range s.chunks {
        similarity := cosineSimilarity(queryVector, chunk.Vector)
        if similarity > 0.7 { // Threshold to filter noise
            results = append(results, SearchResult{
                Chunk:      chunk,
                Similarity: similarity,
            })
        }
    }
    
    // Sort by similarity descending
    sort.Slice(results, func(i, j int) bool {
        return results[i].Similarity > results[j].Similarity
    })
    
    // Return top K
    if len(results) > topK {
        results = results[:topK]
    }
    
    return results
}

// Optimized cosine similarity using SIMD when available
func cosineSimilarity(a, b []float32) float32 {
    // Use gonum.org/v1/gonum/blas for optimized dot product
    // Falls back to simple loop on unsupported platforms
}
```

**Performance Notes:**
- Brute-force search is fine for <10k chunks (~10ms on modern CPU)
- Cosine similarity threshold (0.7) filters irrelevant results
- Top 3-5 results usually sufficient for context

**Memory Search Tool for Claude:**
```go
// backend/internal/services/ai/tools.go
var memorySearchTool = ExcelTool{
    Name:        "memory_search",
    Description: "Search long-term memory for relevant information from spreadsheets, documents, or past conversations",
    InputSchema: json.RawMessage(`{
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Natural language search query"
            },
            "source_filter": {
                "type": "string",
                "enum": ["all", "sheets", "documents", "chat"],
                "description": "Optional: filter by source type"
            }
        },
        "required": ["query"]
    }`),
}

// Tool execution
func (te *ToolExecutor) executeMemorySearch(ctx context.Context, sessionID string, input map[string]interface{}) (*ToolResult, error) {
    query := input["query"].(string)
    filter := "all"
    if f, ok := input["source_filter"].(string); ok {
        filter = f
    }
    
    // Get session and search memory
    session := te.bridge.GetSession(sessionID)
    if session.MemoryStore == nil {
        return &ToolResult{Content: "No memory available for this session"}, nil
    }
    
    // Get query embedding
    queryVector, err := te.embeddingProvider.GetEmbedding(ctx, query)
    if err != nil {
        return nil, err
    }
    
    // Search
    results := session.MemoryStore.Search(queryVector, 5)
    
    // Format results
    var formatted strings.Builder
    formatted.WriteString("Found relevant information:\n\n")
    
    for i, result := range results {
        source := formatSource(result.Chunk.Source)
        formatted.WriteString(fmt.Sprintf("%d. [%s] %s\n", i+1, source, result.Chunk.Content))
        formatted.WriteString(fmt.Sprintf("   Relevance: %.0f%%\n\n", result.Similarity*100))
    }
    
    return &ToolResult{
        Content: formatted.String(),
        Metadata: map[string]interface{}{
            "result_count": len(results),
            "sources": extractSources(results),
        },
    }, nil
}
```

* *Automatic Retrieval:* In addition to explicit tool use, we implement **backend auto-retrieval** for user questions. That is, when a new user query comes in, the backend can preemptively search the memory and attach the top relevant snippets to the prompt (similar to how the “related information” was discussed in Plan 2). This would be done if we detect the query likely needs external info. For instance, if the user question mentions a term that appears in an indexed PDF, we fetch that snippet and include it in Claude’s system message (perhaps in a section like `<retrieved_info>...</retrieved_info>`). This automatic injection should be used judiciously – only when the confidence is high – to avoid cluttering the prompt with unrelated info. We will fine-tune a similarity threshold or use keywords to trigger it (e.g. if user explicitly asks “According to \[DocumentName]…” we certainly inject from that doc).

Combining these, Claude has two pathways to access the long-term memory: passively via backend-injected context and actively via the `MemorySearch` tool. This two-pronged approach is exactly how many RAG systems are built (the agent can ask if needed, but often the system provides obvious context proactively). We saw RooCode’s agent uses a tool call (via MCP) to query its journal index when it recognizes a question about past info. We’ll encode similar instructions to Claude that if a question refers to something not in current prompt, it should use the MemorySearch tool.

**2.5 Prompt and Tool Integration:**

**Update System Prompt:**
```go
// Addition to getFinancialModelingSystemPrompt()
const memoryInstructions = `
<memory_capabilities>
You have access to a long-term memory system containing:
- Full spreadsheet data from all sheets
- Previously uploaded documents (PDFs, reports, etc.)
- Earlier conversation history
- Complex formulas and their dependencies

When information is not in the immediate context, use the memory_search tool:
- For questions about specific values not visible
- When users reference "the document" or "the report"
- To find earlier discussions or decisions
- To locate complex formulas or calculations

Always cite sources when using retrieved information (e.g., "According to the Q4 report...")
</memory_capabilities>
`
```

**Context Injection for Retrieved Info:**
```go
func (pb *PromptBuilder) BuildPromptWithMemory(userMessage string, context *FinancialContext, history []Message, retrievedChunks []MemoryChunk) []Message {
    // Build base prompt
    messages := pb.BuildPromptWithHistory(userMessage, context, history)
    
    // If we have retrieved chunks, add them to system message
    if len(retrievedChunks) > 0 && len(messages) > 0 {
        systemMsg := &messages[0]
        
        var retrieved strings.Builder
        retrieved.WriteString("\n\n<retrieved_context>\n")
        for _, chunk := range retrievedChunks {
            source := formatSource(chunk.Source)
            retrieved.WriteString(fmt.Sprintf("[%s]: %s\n\n", source, chunk.Content))
        }
        retrieved.WriteString("</retrieved_context>")
        
        systemMsg.Content += retrieved.String()
    }
    
    return messages
}
```

**2.6 User Interface for Memory:** We will add UI elements to make the vector memory feature transparent and user-friendly:

* **Document Management:** In the Gridmate sidebar, there could be a section for “Reference Documents” where users can add/remove files. For instance, an upload button to add a PDF, and a list of currently added docs. Each listed doc could show status (e.g. “Indexed” or “Click to re-index if updated”). If a document is no longer needed, the user can remove it; the system will then clear those vectors from memory.

* **Memory Results Visibility:** When the AI uses memory, we can show it. For example, if Claude answered using some snippets, we might include an expandable panel in the chat UI like “**Sources consulted**” and list the snippet origins (sheet name or doc page). This is similar to how Bing Chat or other assistants show their sources. It builds user trust in the answers. Since our environment is Excel, perhaps the user will appreciate seeing that an answer came from “Sheet X” vs “PDF Y”. (We have to ensure not to overwhelm the user; maybe just show document names or a tooltip with the snippet.)

* **Memory Control:** We will implement a “Memory” panel where the user can:

  * View a summary of how many items are indexed (e.g. “Sheet1: 5 ranges indexed, Doc: AnnualReport.pdf: 20 pages indexed, Chat: 15 messages indexed”).
  * Remove specific items or clear the memory entirely (like a “Reset memory” button, which would wipe the vector index for the session – effectively forgetting all but the live sheet and chat).
  * Manually trigger re-indexing of the workbook (in case the user made bulk edits outside of Gridmate’s knowledge).
  * Possibly see the raw text of stored chunks (for advanced users who want to verify what the AI will see). This is somewhat like showing the content of Cline’s memory files – though those are curated by the user, while our chunks are auto-extracted. We might not expose all raw chunks (could be too technical), but a simple summary or the ability to search your own memory could be a debug feature.

* **Token Usage Indicator:** *(If including the token counter feature)* We can also display how much of the 200k context window is currently used, which indirectly tells the user how much context (including retrieved memory) is being sent. A small bar with “Context: 50,000 / 200,000 tokens (↑40k prompt, ↓10k response)” can be shown at the top of the chat panel. This was planned in the token counter implementation and complements memory features by giving feedback on prompt size. Tools like Cline and RooCode show similar counters for transparency.

**2.7 Alignment with Proven Patterns:** This vector memory system draws from known successful implementations:

* *RooCode’s RAG Workflow:* As described in a developer’s journal, RooCode uses a local service to embed and index files, and the AI agent queries it via a tool. Our `MemorySearch` tool and backend search is an analogue to Roo’s `query_journal`. The use of ChromaDB in that example guided our decision to allow local vector DB usage for privacy and speed.
* *Zed’s Semantic Code Index:* The Zed editor indexes code files into an LMDB-backed vector store and allows semantic search. We mimic their approach of initializing a DB and continuous indexing of project files. While Zed’s code is in Rust, the concept transfers: use a high-performance store (LMDB) and handle updates as files change. Our chunking of sheet data is akin to their chunking of code by lines; our use of OpenAI embeddings is exactly how they started (they even normalize vectors for cosine similarity, which we will do as well).
* *Cline’s Memory Philosophy:* Cline relies on structured memory files created by the user. Our system instead constructs the memory automatically, but the end goal is similar: persist important context so the AI can reference it even if it’s not in the immediate working set. We also borrow the idea of keeping a **“progress” or “recent changes”** log (our RecentChanges in context serves this purpose) and ensuring the AI updates/consults it regularly. The difference is Cline needs user to manually write those files, whereas Gridmate will generate and maintain the memory index behind the scenes.

By following these patterns, we ensure we’re not reinventing the wheel but applying known solutions in our domain.

## 3. Synergy of Short-Term and Long-Term Memory

With both systems in place, Gridmate’s AI assistant will operate with a layered memory model:

* The **short-term memory** (prompt history + live context) gives Claude an exact, detailed view of the immediate situation: what the user asked, what Claude answered, and what the spreadsheet contains *right now*. This guarantees coherence and continuity on a turn-by-turn basis.
* The **long-term vector memory** provides breadth of knowledge: anything not in the prompt can be pulled in as needed. It acts as an external knowledge base that Claude can query. This means even if some information was mentioned much earlier or is in a document that would overflow the prompt if fully included, Claude can still access it quickly when relevant.

These two are complementary. For example, suppose the user asks: *“Recalculate the growth rate using the assumptions from the Q1 report and update the model.”* The current sheet context and recent chat will tell Claude where in the model to update and the current values. The vector memory will allow it to retrieve the “assumptions from the Q1 report” if that report was provided earlier. Claude might call `MemorySearch("Q1 report assumptions growth rate")` and get the snippet from the report (which was too large to put entirely in the prompt) that contains the assumption value. It then uses that in its calculation and informs the user, possibly even citing “as per Q1 report”. Without the long-term memory, the assistant might have guessed or asked the user to provide the assumption again.

From a user’s perspective, the AI will feel **much more intelligent and attentive**:

* It won’t ask repetitive questions for info already given; it can recall context the user provided even 30 minutes ago.
* It can incorporate external knowledge (like industry benchmarks from a PDF) into its analysis, saving the user from manually copying those figures into the sheet.
* It can maintain consistency: if an earlier decision was made (“use 5% discount rate because that’s company policy”), it will remember that and not propose a conflicting value later.

Technically, our approach ensures we maximize the use of Anthropic’s 200k token window in an efficient way: fill it with current relevant info and just-in-time retrieved facts, rather than always stuffing it with everything. This is in line with modern best practices in AI system design. As one developer noted, *“In an ideal world, the AI would always have the full history… but current tech has limits… RAG offers a pragmatic compromise”*. We embrace that compromise: using retrieval augmented generation to appear as if the AI has an expansive memory, while actually only providing it what it needs when it needs it.

## 4. Phased Implementation Strategy

### Phase 1: Foundation (Week 1)
**Goal:** Basic vector memory infrastructure

1. **Create Memory Package**
   - `backend/internal/memory/vector_store.go` - In-memory vector store
   - `backend/internal/memory/chunk.go` - Data structures
   - `backend/internal/memory/manager.go` - Session memory management

2. **Add Embedding Service**
   - `backend/internal/services/ai/embeddings.go` - OpenAI embedding provider
   - Add caching layer for embeddings

3. **Integrate with Sessions**
   - Extend `ExcelSession` to include `MemoryStore`
   - Initialize memory on session creation

### Phase 2: Memory Search Tool (Week 2)
**Goal:** Enable Claude to search memory

1. **Add Memory Search Tool**
   - Add to `tools.go` with proper schema
   - Implement in `tool_executor.go`
   - Update tool selection logic

2. **Test Tool Usage**
   - Verify Claude uses the tool appropriately
   - Fine-tune prompts if needed

### Phase 3: Spreadsheet Indexing (Week 3)
**Goal:** Index Excel data automatically

1. **Implement Chunking**
   - Smart chunking for spreadsheet data
   - Formula dependency tracking
   - Named range handling

2. **Background Indexing**
   - Index on session start
   - Incremental updates on changes

### Phase 4: Document Support (Week 4)
**Goal:** Enable PDF/document upload and indexing

1. **Document Parser**
   - `backend/internal/services/document/parser.go`
   - PDF text extraction
   - Smart section-based chunking

2. **Upload Endpoint**
   - Add document upload API
   - Store and index documents

### Phase 5: Frontend Integration (Week 5)
**Goal:** User-friendly memory management

1. **Memory Panel Component**
   - Document list with status
   - Upload interface
   - Memory usage stats

2. **Source Attribution**
   - Show sources in chat responses
   - Clickable references

## 5. Implementation Details (File-by-File)

* **`backend/internal/services/ai/prompt_builder.go`:** ✅ Already implemented - merges context into single system message

* **`backend/internal/services/ai/service.go`:** ✅ Mostly complete - just need to add MemorySearch tool registration

* **`backend/internal/services/excel_bridge.go`:** ✅ Already implemented - builds context before adding to history

* **`backend/internal/services/ai/context_builder.go`:** ✅ Already handles full context building

* **`backend/internal/memory/`** (new package or part of `ai/`): Implement the **MemoryIndex manager**. This includes:

  * Structs for MemoryChunk and metadata.
  * Initializing the vector store (choosing in-memory vs persistent – maybe start with in-memory using a simple slice of MemoryChunk and a mutex for concurrency).
  * Functions to add data to the index (`IndexChunks(chunks []MemoryChunk)`) – which in turn uses an embedding provider to get vectors and stores them.
  * The search function (`Search(query, topK)`) returning top matches.
  * Possibly a helper to remove entries related to a document if user removes it.
  * If using an external library (FAISS via cgo, or a Go implementation of HNSW or an RPC to a Python service), integrate it here.

* **Embedding provider integration:** Possibly in `backend/internal/services/ai/anthropic.go` or a new file for embeddings. If using OpenAI, we might create a small function to call their embedding API. We should batch requests to avoid rate limits (OpenAI allows 2048 inputs per request; we might chunk our chunk-list accordingly).

* **`backend/internal/handlers/signalr_handler.go`:** Extend the payload sent to the client. For instance, include any `sources` or memory info if we decide to send that for UI display. Also ensure the full history is not duplicated in each message to the UI (since the frontend will maintain it).

* **`frontend/excel-addin/`**:

  * Update types (SignalR response type) to include optional tokenUsage and possibly a memory result list. (For token counter feature, we saw adding `tokenUsage` field).
  * Create a **TokenCounter component** (if not already done from prior plan) and include it in the chat UI header.
  * Create UI for memory management: perhaps a **MemoryPanel component** or integrate into an existing settings menu. This could be a simple list of docs and a couple of buttons (index, clear). Initially, even a minimal UI (just an “Add Document” button and automatic indexing message) is fine.
  * Ensure the Chat interface component uses a stateful list of messages and on mount loads any saved history (as per 1.6). This likely involves a custom hook (like `usePersistedChat` similar to the token one) to sync with localStorage. We might have already partially implemented this in earlier steps.
  * Chat message rendering: possibly highlight or style any parts of the assistant answer that came from memory. For example, if the assistant cites a document, maybe show an icon or different color for that text. This is a nice-to-have and can be refined later.
  * Testing UI: We must ensure that adding a large document doesn’t freeze the UI. We might show a spinner “Indexing document…” and do the upload/index asynchronously (the backend could chunk and embed on a separate goroutine, sending progress via SignalR or simply notify when done).

* **Telemetry/Logging:** It’s wise to log memory usage and searches on the backend for monitoring. For instance, log when a PDF is indexed (how many chunks, how long it took), and log each MemorySearch query and whether results were found. This can help debug and also measure usefulness (if we see many memory searches returning nothing, maybe we need to ingest more data, etc.).

## 6. Key Implementation Insights

### Why This Approach Works

1. **Start Simple**: In-memory vector store is sufficient for MVP
   - Most financial models have <1000 meaningful chunks
   - Brute-force search is fast enough (<10ms)
   - Complexity can be added later if needed

2. **Leverage Existing Infrastructure**: 
   - Context system already handles immediate memory well
   - Session management provides natural scoping
   - Tool system makes memory search integration clean

3. **Focus on User Value**:
   - Automatic spreadsheet indexing (no manual setup)
   - Natural language search ("find revenue assumptions")
   - Source attribution builds trust

### Critical Success Factors

1. **Smart Chunking**: Keep related data together (headers + values)
2. **Efficient Embeddings**: Batch API calls, cache aggressively  
3. **Relevant Retrieval**: Use similarity threshold to filter noise
4. **Clear Attribution**: Always show where information came from

## 7. Conclusion

By merging immediate context persistence with a vectorized long-term memory, Gridmate's AI will achieve a new level of competency and user-friendliness. It will combine the **reliable context recall of Cline** (which never forgets what's in its Memory Bank) with the **vast knowledge reach of RooCode's RAG system** (which can draw on an entire codebase or knowledge base on the fly). In practical terms for our users, this means:

* **Fluid Multi-Turn Dialogue:** The AI will remember your earlier questions, answers, and instructions without needing repetition. You can have a conversation that builds step by step, just like working with a human analyst who takes notes.
* **Always Context-Aware:** No matter where you navigate in your Excel model, the AI is aware of the numbers, formulas, and changes. If you switch sheets or update values, the AI’s answers adjust accordingly on the next turn. This eliminates the “please select the range” friction – the assistant feels omniscient within the workbook.
* **Knowledge-Enhanced Answers:** When you bring in external data (financial reports, guidelines, prior meeting notes), the AI can seamlessly incorporate that into its analysis. It can quote the 10-K, use assumptions from a slide deck, or check a regulatory ratio from an online source – all without you manually feeding that every time. It’s like having a research assistant who instantly reads and recalls any document you give them.
* **Transparency and Trust:** The system will show you what context it used (via source attributions or token counters). This way, you can trust but verify the AI’s work. If it says “According to the Q4 report, X is Y,” you’ll know that it actually retrieved that info from the report (and you could double-check it).
* **Performance Considerations:** We leverage the 200k token Claude window wisely – only truly relevant info is sent, keeping responses fast and focused. By not always sending *all* documents blindly and instead retrieving snippets, we save tokens and reduce latency. The heavy-lifting (vector search) is done locally, which is fast (embedding a query + cosine similarity on a few thousand vectors is sub-second). OpenAI embedding calls for queries are also very fast (\~50-100ms). The overall chat loop remains snappy.

In summary, these enhancements will make Gridmate far more than a Q\&A bot – it becomes a contextually aware financial modeling partner. It remembers the model’s history, it learns from the documents you provide, and it can cite the facts backing its advice. We have drawn on proven techniques from state-of-the-art AI coding assistants and adapted them to our financial domain. The result is a robust, modern AI system that should significantly improve user experience and trust in Gridmate’s recommendations.

**Sources:**

* Cline AI “Memory Bank” documentation – illustrating the importance of re-reading context each session.
* Zed Editor’s semantic index example – demonstrating use of a local vector DB and OpenAI embeddings for project search.
* Developer journal on RooCode’s RAG integration – confirming the effectiveness of local embedding+search for AI recall.
* Gridmate internal design notes – existing context building and memory structures, which we’re extending in this plan.
