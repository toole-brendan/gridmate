# WebSocket API Documentation

## Overview

The Gridmate WebSocket API provides real-time bidirectional communication between the Excel/Google Sheets client and the backend server. It handles authentication, chat messages, cell updates, and spreadsheet data synchronization.

## Connection

### WebSocket Endpoint
```
ws://localhost:8080/ws
```

### Connection Flow
1. Client establishes WebSocket connection
2. Server accepts connection and assigns a unique client ID
3. Client must authenticate within 60 seconds
4. After authentication, client can send and receive messages

## Message Format

All messages follow this structure:
```json
{
  "id": "unique_message_id",
  "type": "message_type",
  "timestamp": "2025-07-11T10:00:00Z",
  "data": {
    // Message-specific data
  }
}
```

## Message Types

### Client to Server

#### Authentication
```json
{
  "type": "auth",
  "data": {
    "token": "jwt_token_here"
  }
}
```

#### Chat Message
```json
{
  "type": "chat_message",
  "data": {
    "content": "Can you help me create a SUM formula?",
    "sessionId": "session_123",
    "context": {
      "activeSheet": "Sheet1",
      "selectedRange": "A1:A10"
    }
  }
}
```

#### Cell Update
```json
{
  "type": "cell_update",
  "data": {
    "sheet": "Sheet1",
    "cell": "A1",
    "value": 100,
    "formula": "=SUM(B1:B10)",
    "format": {
      "numberFormat": "#,##0.00",
      "bold": true
    }
  }
}
```

#### Range Data
```json
{
  "type": "range_data",
  "data": {
    "sheet": "Sheet1",
    "range": "A1:C10",
    "values": [[1, 2, 3], [4, 5, 6]],
    "formulas": [["", "=A1+1", "=B1+1"]]
  }
}
```

#### Selection Changed
```json
{
  "type": "selection_changed",
  "data": {
    "sheet": "Sheet1",
    "selectedCell": "B2",
    "selectedRange": "B2:D5"
  }
}
```

#### Subscribe
```json
{
  "type": "subscribe",
  "data": {
    "type": "cell",
    "cells": ["Sheet1!A1", "Sheet1!B2"],
    "ranges": ["Sheet1!A1:C10"]
  }
}
```

### Server to Client

#### Authentication Success
```json
{
  "type": "auth_success",
  "data": {
    "userID": "user_123",
    "sessionID": "client_123456"
  }
}
```

#### Chat Response
```json
{
  "type": "chat_response",
  "data": {
    "content": "I'll help you create a SUM formula. Here's the formula: =SUM(A1:A10)",
    "suggestions": [
      "Add conditional formatting",
      "Create a chart from this data"
    ],
    "actions": [
      {
        "id": "action_123",
        "type": "create_formula",
        "description": "Insert SUM formula in cell A11",
        "parameters": {
          "cell": "A11",
          "formula": "=SUM(A1:A10)"
        }
      }
    ],
    "sessionId": "session_123"
  }
}
```

#### Cell Value Update
```json
{
  "type": "cell_value_update",
  "data": {
    "sheet": "Sheet1",
    "cell": "A1",
    "value": 100,
    "formula": "=B1+C1"
  }
}
```

#### Error
```json
{
  "type": "error",
  "data": {
    "code": "auth_required",
    "message": "Authentication required",
    "details": "Please authenticate before sending messages"
  }
}
```

#### Notification
```json
{
  "type": "notification",
  "data": {
    "level": "info",
    "title": "Connected",
    "message": "Successfully connected to Gridmate",
    "actions": [
      {
        "label": "Get Started",
        "action": "show_help"
      }
    ]
  }
}
```

## Authentication

1. Connect to WebSocket endpoint
2. Send authentication message with JWT token
3. Receive `auth_success` or `auth_error` response
4. If successful, client can send other message types

## Error Handling

### Error Codes
- `auth_required` - Authentication needed
- `invalid_token` - Invalid authentication token
- `unknown_message_type` - Unrecognized message type
- `message_processing_error` - Error processing message
- `rate_limit_exceeded` - Too many requests

### Connection Errors
- WebSocket will automatically close on critical errors
- Client should implement reconnection logic with exponential backoff
- Maximum reconnection attempts: 5

## Rate Limiting

- Maximum 100 messages per minute per client
- Burst limit: 10 messages per second
- Cell updates are throttled to 5 per second

## Testing

Use the provided `test-websocket.html` file to test the WebSocket implementation:

1. Open the file in a web browser
2. Connect to the WebSocket server
3. Authenticate with a token
4. Send various message types
5. Monitor responses in the message panel

## Security Considerations

1. **Authentication**: All clients must authenticate before sending messages
2. **Origin Checking**: Implement proper origin validation in production
3. **Message Validation**: All incoming messages are validated
4. **Rate Limiting**: Prevents abuse and DoS attacks
5. **TLS**: Use wss:// in production for encrypted connections

## Performance

- Supports up to 1000 concurrent connections per server
- Message latency: < 50ms average
- Automatic compression for large messages
- Efficient binary encoding for cell data

## Best Practices

1. **Keep Alive**: Send ping messages every 30 seconds
2. **Batch Updates**: Group multiple cell updates when possible
3. **Subscribe Wisely**: Only subscribe to necessary cells/ranges
4. **Handle Reconnection**: Implement automatic reconnection logic
5. **Message Ordering**: Use message IDs for tracking responses