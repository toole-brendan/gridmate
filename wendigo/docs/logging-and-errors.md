# Logging and Error Handling Documentation

## Overview

Wendigo implements comprehensive error handling and structured logging to ensure reliability and debuggability in production environments.

## Error Handling

### Error Types

- **AppError**: Base error class with metadata and recovery strategies
- **SpreadsheetError**: Errors related to Excel/Google Sheets operations
- **AIError**: Errors from AI service interactions
- **AuthError**: Authentication and authorization errors
- **ValidationError**: Input validation errors
- **DatabaseError**: Database operation errors

### Error Codes

All errors have standardized codes in `src/main/utils/errors.ts`:
- `SPREADSHEET_CONNECTION_FAILED`
- `AI_RATE_LIMITED`
- `AUTH_TOKEN_EXPIRED`
- etc.

### Recovery Strategies

Each error type has an associated recovery strategy:
- Automatic retry with exponential backoff
- User notification with actionable messages
- Fallback operations where applicable

## Logging

### Log Levels

- **fatal**: Application-breaking errors
- **error**: Recoverable errors
- **warn**: Warning conditions
- **info**: General information
- **debug**: Detailed debugging info
- **trace**: Very detailed trace info

### Log Files

Logs are stored in the user data directory:
- `combined-YYYY-MM-DD.log`: All logs
- `error-YYYY-MM-DD.log`: Error logs only
- `audit-YYYY-MM-DD.log`: Financial operation audit trail

### Structured Logging

All logs include:
- Timestamp
- Level
- Message
- Metadata (user ID, operation, context)

### Performance Logging

Operations are automatically timed and logged:
```typescript
logPerformance('ai_chat', durationMs, { responseLength: 500 })
```

### Audit Logging

Financial operations are specially logged for compliance:
```typescript
logSpreadsheetOperation('setCellValue', { 
  cell: 'A1', 
  oldValue: 100, 
  newValue: 200 
}, userId)
```

## Usage Examples

### In Services

```typescript
try {
  const result = await someOperation()
  logger.info('Operation successful', { result })
  return result
} catch (error) {
  logger.error('Operation failed', error)
  throw new AppError(
    ErrorCode.OPERATION_FAILED,
    'User-friendly message',
    500,
    true,
    error
  )
}
```

### In IPC Handlers

All IPC handlers are wrapped with error handling:
```typescript
ipcMain.handle('some:operation', async (_, args) => {
  return await errorHandler.wrapAsync(async () => {
    // Your operation here
  }, { operation: 'some:operation' })
})
```

## Production Considerations

1. **Log Rotation**: Logs are automatically rotated daily
2. **Log Retention**: 
   - Error logs: 30 days
   - Combined logs: 14 days
   - Audit logs: 90 days
3. **Performance**: Async logging to prevent blocking
4. **Security**: No sensitive data in logs
5. **Privacy**: User data is anonymized