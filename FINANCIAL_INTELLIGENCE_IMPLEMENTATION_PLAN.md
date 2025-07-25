# GridMate Financial Intelligence Implementation Plan

## Overview
This plan outlines the implementation of advanced financial modeling features for GridMate, building on the existing streaming and diff preview infrastructure to achieve parity with the proposed Cursor-like functionality for financial modeling.

## Timeline: 5-6 weeks (including streaming fixes)

## Phase 0: Fix Streaming Continuation (1 week) - PRIORITY

### 0.1 Streaming Text Output Fix
**Goal**: Ensure AI responses stream text to the UI, not just tool executions

#### Issue Summary (Confirmed from Logs):
- Backend shows: `{"level":"info","message":"Sending tool request via SignalR bridge"}` then nothing
- Frontend shows: `[Log] 📥 Received tool request:` but no text chunks
- AI immediately triggers tools without explanatory text
- Stream ends after tool completion without continuation
- Result: Users see blank chat bubbles despite successful operations

#### Root Cause:
1. AI Service → Immediately sees "make DCF model" and triggers tool
2. No text phase → Skips directly to tool execution  
3. No continuation → After tool completes, stream ends
4. Result → User sees blank message with successful operation

#### Immediate Fix (Day 1):
```go
// backend/internal/services/ai/service.go
func (s *AIService) ProcessChatMessageStreaming(...) {
    // IMMEDIATE FIX: Always send initial acknowledgment
    initialChunk := StreamChunk{
        Type: "text",
        Content: "I'll help you create a DCF model. Let me analyze your spreadsheet first...\n\n",
    }
    if err := streamCallback(initialChunk); err != nil {
        log.Error("Failed to send initial chunk", err)
    }
    
    // Continue with existing logic...
}
```

#### Full Implementation (Days 2-7):

##### New Files:
- `backend/internal/services/ai/streaming_coordinator.go`
  ```go
  type StreamingCoordinator struct {
      phaseManager *PhaseManager
      aiService    *AIService
      bridge       *ExcelBridge
  }

  func (sc *StreamingCoordinator) ProcessChatMessageStreaming(ctx context.Context, req StreamRequest) error {
      // Phase 1: Initial text explanation
      if err := sc.streamInitialExplanation(req); err != nil {
          return err
      }
      
      // Phase 2: Tool execution (if needed)
      tools, err := sc.aiService.DetermineTools(req.Content)
      if err == nil && len(tools) > 0 {
          if err := sc.executeToolsWithExplanation(ctx, tools); err != nil {
              return err
          }
      }
      
      // Phase 3: Continuation/Summary
      if err := sc.streamContinuation(tools); err != nil {
          return err
      }
      
      return nil
  }

  func (sc *StreamingCoordinator) streamInitialExplanation(req StreamRequest) error {
      // Force AI to explain what it's about to do
      explanationPrompt := fmt.Sprintf(
          "User asked: %s\n\n" +
          "First, explain what you're going to do in 1-2 sentences, " +
          "then proceed with any necessary actions.",
          req.Content,
      )
      
      // Stream explanation text
      return sc.aiService.StreamText(explanationPrompt, func(chunk string) {
          sc.bridge.SendChunk("text", chunk)
      })
  }
  ```

##### Backend Modifications:
- `backend/internal/handlers/streaming.go`
  - Use new StreamingCoordinator
  - Add logging for each phase transition
  - Ensure proper error handling

- `backend/internal/services/ai/service.go`
  - Refactor to use StreamingCoordinator
  - Add DetermineTools method
  - Implement StreamText method

- `backend/internal/services/excel_bridge.go`
  - Add SendChunk method for text streaming
  - Implement phase-aware chunk handling

##### Frontend Changes:
- `excel-addin/src/hooks/useMessageHandlers.ts`
  - Add fallback text for empty messages on stream completion
  - Enhance logging for debugging chunk flow
  - Implement phase-aware rendering

- `excel-addin/src/components/chat/messages/StreamingMessage.tsx`
  - Add safeguard for empty messages:
  ```typescript
  useEffect(() => {
      const timeout = setTimeout(() => {
          if (!hasReceivedContent && isStreaming) {
              setContent("Working on your request...");
              setShowToolIndicator(true);
          }
      }, 1000); // 1 second timeout
      
      return () => clearTimeout(timeout);
  }, [hasReceivedContent, isStreaming]);
  ```
  - Show placeholder text during tool execution
  - Display tool completion summaries

##### SignalR Changes:
- `signalr-service/GridmateSignalR/Hubs/GridmateHub.cs`
  - Add debug endpoints for stream testing
  - Enhance chunk relay logging
  - Implement stream health monitoring

### 0.2 Multi-Phase Streaming Implementation
**Goal**: Implement proper Cursor-style phases: initial → tool_execution → continuation → final

#### New Files:
- `backend/internal/services/streaming/phase_manager.go`
  ```go
  type StreamPhase string

  const (
      PhaseInitial      StreamPhase = "initial"
      PhaseToolExecution StreamPhase = "tool_execution"
      PhaseContinuation  StreamPhase = "continuation"
      PhaseFinal        StreamPhase = "final"
  )

  type PhaseManager struct {
      currentPhase StreamPhase
      messageBuffer []string
      toolResults   []ToolResult
  }

  func (pm *PhaseManager) TransitionPhase(from, to StreamPhase) error {
      // Ensure valid transitions
      validTransitions := map[StreamPhase][]StreamPhase{
          PhaseInitial: {PhaseToolExecution, PhaseFinal},
          PhaseToolExecution: {PhaseContinuation},
          PhaseContinuation: {PhaseToolExecution, PhaseFinal},
      }
      
      // Generate transition text if needed
      if to == PhaseContinuation && len(pm.toolResults) > 0 {
          return pm.generateContinuationText()
      }
      
      return nil
  }
  ```

- `excel-addin/src/services/streaming/PhaseManager.ts`
  - Client-side phase tracking
  - UI state coordination
  - Phase-specific rendering logic

#### Implementation Options:

**Option 1: AI-Side Solution**
- Modify prompts to ensure AI continues after tool use
- Add explicit instructions for post-tool explanations
- Example prompt addition:
  ```
  After using any tools, always explain what was done and provide next steps.
  Never end your response immediately after a tool use.
  ```

**Option 2: Backend-Side Solution**
- After tool completion, inject continuation text
- Options:
  1. Call AI again with tool results for summary
  2. Generate templated completion messages
  3. Stream pre-written explanations based on tool type

**Option 3: Hybrid Solution (Recommended)**
- Combine AI continuation with fallback templates
- Ensure user always sees meaningful output
- Progressive enhancement based on AI capabilities
- Template examples:
  ```go
  var toolCompletionTemplates = map[string]string{
      "write_cells": "✅ I've updated the cells with the new values.",
      "create_chart": "📊 I've created a chart based on your data.",
      "apply_formula": "🧮 I've applied the formula to the selected range.",
  }
  ```

### 0.3 Testing and Validation
**Goal**: Ensure streaming works end-to-end

#### Validation Test Cases:
1. **Text-only query**: "What is a DCF model?"
   - Expected: Pure text response, no tools
   - Success: User sees streaming text explanation

2. **Tool-requiring query**: "Create a DCF model"
   - Expected: Initial text → Tool execution → Summary text
   - Success: User sees explanation, then tool results, then summary

3. **Multi-tool query**: "Create a DCF model and analyze the IRR"
   - Expected: Text → Tool 1 → Text → Tool 2 → Final summary
   - Success: Clear phase transitions with text at each step

4. **Tool rejection/error handling**
   - Expected: Explanatory text even when tools fail
   - Success: User understands what went wrong

5. **Large streaming responses**
   - Expected: Smooth streaming without UI freezing
   - Success: Consistent chunk delivery < 100ms

#### Implementation Timeline:
- **Day 1-2**: Add immediate fix (5 lines of code)
- **Day 2-3**: Implement StreamingCoordinator
- **Day 3-4**: Add phase management
- **Day 4-5**: Test all scenarios
- **Day 5-7**: Handle edge cases and polish

#### Debug Tooling:
- Add streaming debug panel to UI
- Create test endpoints for each phase
- Implement stream replay functionality
- Add performance monitoring

## Phase 1: Financial Formula Intelligence (2-3 weeks)

### 1.1 Formula Parser and Dependency Graph
**Goal**: Build a comprehensive understanding of Excel formulas and their relationships

#### New Files:
- `backend/internal/services/formula/parser.go`
  - Parse Excel formulas into AST
  - Extract cell references, named ranges, and functions
  - Support for complex financial functions (NPV, IRR, XIRR, etc.)
  - Performance optimization with caching:
  ```go
  type FormulaCache struct {
      cache *lru.Cache
      mu    sync.RWMutex
  }

  func (fc *FormulaCache) ParseWithCache(formula string) (*FormulaAST, error) {
      fc.mu.RLock()
      if ast, ok := fc.cache.Get(formula); ok {
          fc.mu.RUnlock()
          return ast.(*FormulaAST), nil
      }
      fc.mu.RUnlock()
      
      // Parse formula
      ast, err := parseFormula(formula)
      if err != nil {
          return nil, err
      }
      
      fc.mu.Lock()
      fc.cache.Add(formula, ast)
      fc.mu.Unlock()
      
      return ast, nil
  }
  ```

- `backend/internal/services/formula/dependency_graph.go`
  - Build directed acyclic graph of cell dependencies
  - Detect circular references
  - Calculate impact paths for changes
  - Graph caching for performance

- `excel-addin/src/services/formula/FormulaAnalyzer.ts`
  - Client-side formula analysis
  - Real-time formula validation
  - Suggest formula improvements
  - Local caching of parsed formulas

#### Modifications:
- `backend/internal/services/excel/excel_bridge.go`
  - Add `AnalyzeFormulas` method
  - Integrate formula parser with context extraction

- `excel-addin/src/services/excel/ExcelService.ts`
  - Add `getFormulaDependencies` method
  - Enhance `createWorkbookSnapshot` to include formula metadata

### 1.2 Financial Model Type Detection
**Goal**: Automatically identify and understand different financial model types

#### New Files:
- `backend/internal/services/financial/model_detector.go`
  - Pattern matching for model types (DCF, LBO, M&A, etc.)
  - Heuristic analysis of sheet structure
  - Confidence scoring for model type detection

- `backend/internal/services/financial/model_patterns.go`
  - Define patterns for each model type
  - Common sheet names, structures, and formulas
  - Industry-specific variations
  ```go
  var ModelPatterns = map[ModelType]ModelPattern{
      ModelTypeDCF: {
          RequiredSheets: []string{"assumptions", "income statement", "cash flow"},
          KeyFormulas: []string{"NPV", "XNPV", "IRR", "XIRR"},
          NamedRangePatterns: []string{"WACC", "TerminalGrowth", "DiscountRate"},
      },
      ModelTypeLBO: {
          RequiredSheets: []string{"sources & uses", "debt schedule", "returns"},
          KeyFormulas: []string{"IRR", "MOC", "PPMT", "IPMT"},
          NamedRangePatterns: []string{"EntryMultiple", "ExitMultiple", "DebtStructure"},
      },
      ModelTypeMA: {
          RequiredSheets: []string{"deal summary", "synergies", "pro forma"},
          KeyFormulas: []string{"ACCRETION", "EPS", "PAYBACK"},
          NamedRangePatterns: []string{"PurchasePrice", "Synergies", "CostSavings"},
      },
  }
  ```

- `excel-addin/src/services/financial/ModelTypeDetector.ts`
  - Client-side model detection
  - UI hints based on detected model type
  - Context-aware suggestions

#### Modifications:
- `backend/internal/services/ai/prompts.go`
  - Add financial model-specific system prompts
  - Include detected model type in AI context

- `excel-addin/src/components/chat/EnhancedChatInterface.tsx`
  - Display detected model type
  - Show model-specific quick actions

### 1.3 Named Range and Financial Metrics Management
**Goal**: Understand and manage Excel named ranges and key financial metrics

#### New Files:
- `backend/internal/services/excel/named_ranges.go`
  - Extract and manage named ranges
  - Track range dependencies
  - Suggest naming conventions

- `backend/internal/services/financial/metrics_extractor.go`
  - Identify key financial metrics (EBITDA, Revenue, etc.)
  - Track metric calculations
  - Validate metric formulas

- `excel-addin/src/services/excel/NamedRangeManager.ts`
  - Client-side named range operations
  - Visual named range browser
  - Quick navigation to ranges

#### Database Schema:
```sql
-- migrations/add_financial_context_tables.sql
CREATE TABLE model_analyses (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    model_type VARCHAR(50),
    confidence FLOAT,
    detected_metrics JSONB,
    formula_graph JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE named_ranges (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    name VARCHAR(255),
    range_address VARCHAR(255),
    sheet_name VARCHAR(255),
    formula TEXT,
    dependencies JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Phase 2: Transaction and Rollback System (1 week)

### 2.1 Transaction Manager
**Goal**: Implement atomic operations with full rollback capability

#### New Files:
- `backend/internal/services/transactions/manager.go`
  - Begin/commit/rollback transaction logic
  - Transaction state management
  - Nested transaction support

- `excel-addin/src/services/transactions/TransactionManager.ts`
  - Client-side transaction coordination
  - Optimistic UI updates with rollback
  - Transaction status tracking

#### Modifications:
- `backend/internal/services/excel_bridge.go`
  - Wrap tool executions in transactions
  - Add transaction ID to all operations

- `excel-addin/src/hooks/useDiffPreview.ts`
  - Integrate transaction manager
  - Support for atomic batch operations
  - Enhanced error recovery

### 2.2 Workbook State Management
**Goal**: Efficiently capture and restore complete workbook states

#### New Files:
- `backend/internal/services/excel/state_manager.go`
  - Compress and store workbook snapshots
  - Efficient diff-based state storage
  - Fast state restoration

- `excel-addin/src/services/excel/WorkbookStateManager.ts`
  - Client-side state caching
  - Incremental state updates
  - Memory-efficient snapshot storage

#### Database Schema:
```sql
-- migrations/add_transaction_tables.sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    status VARCHAR(20), -- 'pending', 'committed', 'rolled_back'
    operations JSONB,
    snapshot_before JSONB,
    snapshot_after JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE transaction_operations (
    id UUID PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id),
    operation_order INT,
    tool_name VARCHAR(100),
    input_params JSONB,
    result JSONB,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Phase 3: Audit Trail System (1 week)

### 3.1 Comprehensive Change Tracking
**Goal**: SOX-compliant audit trail for all AI-assisted changes

#### New Files:
- `backend/internal/services/audit/trail.go`
  - Record all changes with full context
  - Immutable audit log storage
  - Compliance report generation
  - Batch writing for performance:
  ```go
  type AuditBatcher struct {
      entries chan AuditEntry
      batch   []AuditEntry
      ticker  *time.Ticker
  }

  func (ab *AuditBatcher) Start() {
      go func() {
          for {
              select {
              case entry := <-ab.entries:
                  ab.batch = append(ab.batch, entry)
                  if len(ab.batch) >= 100 {
                      ab.flush()
                  }
              case <-ab.ticker.C:
                  if len(ab.batch) > 0 {
                      ab.flush()
                  }
              }
          }
      }()
  }
  ```

- `backend/internal/services/audit/compliance.go`
  - SOX compliance checks
  - Change authorization workflow
  - Audit report templates

- `excel-addin/src/services/audit/AuditTrailService.ts`
  - Client-side audit event capture
  - Change attribution
  - Local audit cache

#### Modifications:
- `backend/internal/handlers/tools.go`
  - Add audit logging to all tool executions
  - Capture user context and reasoning

- `excel-addin/src/services/excel/ExcelService.ts`
  - Track all Excel operations
  - Add change metadata

### 3.2 Audit UI Components
**Goal**: User-friendly audit trail visualization

#### New Files:
- `excel-addin/src/components/audit/AuditTrailPanel.tsx`
  - Searchable change history
  - Filter by date, user, cell range
  - Export audit reports

- `excel-addin/src/components/audit/ChangeDetails.tsx`
  - Detailed view of individual changes
  - Before/after comparison
  - Reasoning and context display

#### Database Schema:
```sql
-- migrations/add_audit_tables.sql
CREATE TABLE audit_trail (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id),
    user_id UUID REFERENCES users(id),
    message_id UUID REFERENCES messages(id),
    transaction_id UUID REFERENCES transactions(id),
    timestamp TIMESTAMP DEFAULT NOW(),
    action_type VARCHAR(50),
    cell_range VARCHAR(255),
    sheet_name VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    old_formula TEXT,
    new_formula TEXT,
    reasoning TEXT,
    ai_confidence FLOAT,
    user_approved BOOLEAN,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_trail_session ON audit_trail(session_id);
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX idx_audit_trail_cell_range ON audit_trail(cell_range);
```

## Phase 4: Integration and Testing (1 week)

### 4.1 Feature Integration
- Integrate formula intelligence with AI prompts
- Connect transaction system with diff preview
- Link audit trail to all operations

### 4.2 Performance Optimization
- Optimize formula parsing for large models
- Implement caching for dependency graphs
- Batch audit log writes

### 4.3 Testing Suite
#### New Files:
- `backend/internal/services/formula/parser_test.go`
- `backend/internal/services/financial/model_detector_test.go`
- `backend/internal/services/transactions/manager_test.go`
- `backend/internal/services/audit/trail_test.go`
- `excel-addin/src/services/formula/__tests__/FormulaAnalyzer.test.ts`
- `excel-addin/src/services/transactions/__tests__/TransactionManager.test.ts`

## Implementation Order

### Week 1: Streaming Fixes (PRIORITY)
1. Implement streaming text output fixes
2. Add multi-phase streaming support
3. Test and validate streaming pipeline
4. Deploy fixes to ensure UI receives content

### Week 2-3: Formula Parser and Dependency Graph
1. Implement Excel formula parser
2. Build dependency graph system
3. Create formula analyzer UI
4. Test with complex financial models

### Week 3-4: Financial Model Detection
1. Implement pattern matching for model types
2. Build metrics extraction system
3. Integrate with AI context
4. Add model-specific UI hints

### Week 4-5: Transaction System
1. Implement transaction manager
2. Build state management system
3. Integrate with existing diff preview
4. Test rollback scenarios

### Week 5-6: Audit Trail
1. Implement audit logging backend
2. Build audit UI components
3. Add compliance reporting
4. Integration testing

## Success Metrics

### Phase 0 Metrics (Streaming)
- Text chunks received by UI = 100% of responses
- Average time to first token < 500ms
- Stream completion rate = 100%
- User-visible response for all tool executions

### Technical Metrics
- Formula parsing accuracy > 99%
- Model type detection accuracy > 90%
- Transaction rollback success rate = 100%
- Audit trail completeness = 100%

### Performance Metrics
- Formula analysis < 500ms for 10,000 cells
- Model detection < 2s for typical models
- Transaction commit < 1s for 100 operations
- Audit query response < 200ms
- Streaming latency < 100ms per chunk

### User Experience Metrics
- Reduced model building time by 50%
- Zero data loss from failed operations
- Complete audit trail for compliance
- Improved formula accuracy
- No blank chat responses

## Risks and Mitigation

### Risk 0: Streaming Implementation Issues (IMMEDIATE)
- **Risk**: Users see blank responses despite successful operations
- **Impact**: Critical UX issue affecting all interactions
- **Mitigation**: 
  - Implement Phase 0 fixes immediately
  - Add comprehensive logging at each streaming stage
  - Create fallback text generation for all scenarios
  - Test with multiple AI providers (Anthropic, Azure)

### Risk 1: Formula Parser Complexity
- **Risk**: Excel formulas are complex with many edge cases
- **Mitigation**: Use existing libraries, extensive testing, gradual rollout

### Risk 2: Performance with Large Models
- **Risk**: Dependency graphs may be slow for 100k+ cell models
- **Mitigation**: Implement caching, lazy loading, background processing

### Risk 3: Transaction Conflicts
- **Risk**: Concurrent edits may cause conflicts
- **Mitigation**: Implement optimistic locking, clear conflict resolution

### Risk 4: Storage Requirements
- **Risk**: Audit trails and snapshots may require significant storage
- **Mitigation**: Implement compression, archival policies, efficient diff storage

### Risk 5: AI Provider Latency
- **Risk**: Multiple providers could have different streaming behaviors
- **Impact**: Inconsistent user experience across providers
- **Mitigation**: 
  - Provider-specific adapters with normalized output
  - Local caching of provider capabilities
  - Automatic fallback to faster providers
  - Client-side buffering for smooth streaming

### Risk 6: Excel API Limitations
- **Risk**: Some operations might be slow or unsupported
- **Impact**: Performance degradation with large models
- **Mitigation**: 
  - Batch operations where possible
  - Fallback to direct file manipulation (OpenXML)
  - Progressive loading for large datasets
  - Background processing for complex operations

## Dependencies

### External Libraries
- Formula parser: Consider `formulajs` or custom implementation
- Graph algorithms: `graphlib` or custom implementation
- Compression: `zlib` for snapshot compression

### Internal Dependencies
- Existing streaming infrastructure
- Current diff preview system
- Excel integration layer
- SignalR communication

## Additional Implementation Considerations

### Caching Strategy
1. **Formula AST Cache**
   - LRU cache for parsed formulas
   - Persistent cache for common financial formulas
   - Cache invalidation on formula changes

2. **Dependency Graph Cache**
   - Cache computed graphs per sheet
   - Incremental updates on cell changes
   - Background graph recomputation

3. **Model Detection Cache**
   - Cache model type per workbook
   - Re-evaluate on significant structural changes
   - User override capability

### Error Recovery
1. **Streaming Disconnection**
   - Automatic reconnection with exponential backoff
   - Resume from last received chunk
   - Offline queue for pending operations

2. **Partial Transaction Handling**
   - Savepoints for rollback to specific states
   - Conflict resolution UI for concurrent edits
   - Automatic retry with backoff

3. **Formula Parsing Failures**
   - Graceful degradation to basic analysis
   - User-friendly error messages
   - Fallback to Excel's native parser

### Security Considerations
1. **Formula Parser Security**
   - Sandbox formula execution
   - Whitelist allowed functions
   - Prevent code injection via formulas

2. **Excel Operation Validation**
   - Validate all ranges before execution
   - Check permissions for protected sheets
   - Rate limiting for expensive operations

3. **Audit Trail Security**
   - Cryptographic signing of audit entries
   - Immutable storage with checksums
   - Role-based access to audit logs

## Future Enhancements

### Phase 5: Advanced Features (Future)
- AI-powered formula suggestions with financial context
- Automated error detection and correction
- Model templates and wizards
- Collaborative editing support
- Advanced visualization of dependencies
- Real-time model validation
- Integration with external data sources (Bloomberg, Reuters)
- Custom financial function library
- Monte Carlo simulation support
- Sensitivity analysis automation

## Key Success Indicators

### Phase 0 (Streaming Fix)
- ✅ No more blank chat responses
- ✅ Users see immediate feedback for all queries
- ✅ Clear explanations before and after tool execution
- ✅ Graceful handling of all edge cases

### Overall Project
- ✅ 50% reduction in model building time
- ✅ Zero data loss with transaction rollback
- ✅ Complete SOX-compliant audit trail
- ✅ Sub-second response times for all operations

## Conclusion

This implementation plan builds on GridMate's strong existing infrastructure to add sophisticated financial modeling capabilities. The critical Phase 0 streaming fix ensures users always receive visible feedback, addressing the immediate UX issue. The subsequent phases add deep financial intelligence while maintaining the responsive, transparent experience users expect.

The phased approach ensures each component is properly tested before moving to the next, while maintaining backward compatibility with existing features. The immediate fix (Day 1) provides instant relief while the comprehensive solution is implemented.

The end result will be a powerful AI assistant that:
1. **Always communicates** what it's doing (Phase 0)
2. **Understands** financial models at a deep level (Phase 1)
3. **Protects** users with transactions and rollback (Phase 2)
4. **Maintains** complete audit trails for compliance (Phase 3)

By prioritizing the streaming fix, we ensure that all the sophisticated features built on top will be properly visible and useful to end users.