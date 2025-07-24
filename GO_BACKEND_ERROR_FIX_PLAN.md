# Go Backend Compilation Error Fix Plan

## Overview
This plan addresses all compilation errors encountered after implementing the Anthropic tool enhancements. The errors are categorized by type and priority.

## Error Categories

### 1. Import Cycle Errors (FIXED)
**Issue**: `tool_executor.go` importing parent `services` package creates circular dependency
**Solution**: Created local `Session` type instead of importing from services

### 2. Missing Type Fields
**Issue**: `NamedRange` struct missing `Address` and `Scope` fields
**Solution**: Updated `NamedRange` struct in `models.go` to include these fields

### 3. Interface Implementation Errors

#### 3.1 BridgeImpl Missing GetSession Method (FIXED)
**File**: `internal/services/excel/excel_bridge_impl.go`
**Error**: `*excel.BridgeImpl does not implement ai.ExcelBridge (missing method GetSession)`
**Solution**: Added GetSession method to BridgeImpl

#### 3.2 ExcelBridge trackMessage Method
**File**: `internal/services/excel_bridge.go:325`
**Error**: `eb.trackMessage undefined`
**Solution**: Need to add trackMessage method or remove the call

#### 3.3 Undefined msgContext
**File**: `internal/services/excel_bridge.go` (lines 510, 517, 518, 521)
**Error**: `undefined: msgContext`
**Solution**: Define msgContext variable or fix the reference

### 4. Memory Store Issues

#### 4.1 NewInMemoryStore Arguments
**File**: `internal/services/excel_bridge.go:665`
**Error**: `not enough arguments in call to memory.NewInMemoryStore`
**Solution**: Add required maxChunks parameter: `memory.NewInMemoryStore(1000)`

#### 4.2 Type Mismatch for MemoryStore
**File**: `internal/services/excel_bridge.go:666`
**Error**: `cannot use &inMemStore as *memory.VectorStore`
**Solution**: Fix type assignment - VectorStore is an interface, not a pointer to interface

### 5. SessionManager Methods

#### 5.1 Missing CreateSession Method
**File**: `internal/services/excel_bridge.go:679`
**Error**: `eb.sessionManager.CreateSession undefined`
**Solution**: Add CreateSession method to SessionManager or use existing method

### 6. Duplicate Method Declaration

#### 6.1 GetSession Declared Twice
**File**: `internal/services/excel_bridge.go`
**Error**: `method ExcelBridge.GetSession already declared at line 686`
**Solution**: Remove duplicate GetSession method declaration

### 7. Model Field Errors

#### 7.1 Workbook Missing SessionID Field
**File**: `internal/services/excel_bridge.go:1785`
**Error**: `unknown field SessionID in struct literal of type models.Workbook`
**Solution**: Add SessionID field to Workbook model or remove from initialization

## Implementation Steps

### Phase 1: Critical Compilation Fixes
1. Fix memory store initialization (add maxChunks parameter)
2. Fix memory store type assignment
3. Remove duplicate GetSession method
4. Fix undefined msgContext references

### Phase 2: Missing Methods
1. Add trackMessage method to ExcelBridge
2. Add CreateSession method to SessionManager or fix the call
3. Add SessionID field to Workbook model

### Phase 3: Code Cleanup
1. Review and fix any remaining type mismatches
2. Ensure all interfaces are properly implemented
3. Add proper error handling where needed

## Detailed Fixes

### Fix 1: Memory Store Initialization
```go
// Change from:
inMemStore := memory.NewInMemoryStore()

// To:
inMemStore := memory.NewInMemoryStore(1000) // or appropriate max chunks
```

### Fix 2: Memory Store Type Assignment
```go
// Change from:
session.MemoryStore = &inMemStore

// To:
var memStore memory.VectorStore = inMemStore
session.MemoryStore = &memStore
```

### Fix 3: msgContext Definition
```go
// Add before usage:
msgContext := map[string]interface{}{
    "sessionID": sessionID,
    // other context fields
}
```

### Fix 4: trackMessage Method
```go
func (eb *ExcelBridge) trackMessage(level, message string, context map[string]interface{}) {
    // Implementation for message tracking
    eb.logger.Info().Fields(context).Msg(message)
}
```

### Fix 5: SessionManager CreateSession
```go
func (sm *SessionManager) CreateSession(sessionInfo *SessionInfo) error {
    sm.RegisterSession(sessionInfo)
    return nil
}
```

## Testing Strategy
1. Fix compilation errors in order of dependency
2. Run `go build` after each major fix
3. Run unit tests for affected packages
4. Run integration tests to ensure functionality

## Notes
- These errors appear to be from incomplete implementation of the Anthropic tool enhancements
- Some errors may be due to recent refactoring or interface changes
- Priority is to get the service compiling first, then optimize implementation