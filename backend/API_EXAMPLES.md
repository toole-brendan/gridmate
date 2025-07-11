# Gridmate API Examples

## Authentication

### Register a new user
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "analyst@hedgefund.com",
    "password": "SecurePass123!",
    "first_name": "John",
    "last_name": "Analyst"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "analyst@hedgefund.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "analyst@hedgefund.com",
    "first_name": "John",
    "last_name": "Analyst"
  }
}
```

## Document Management

### Upload SEC EDGAR Document
```bash
curl -X POST http://localhost:8080/api/v1/documents/edgar \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-20230930.htm",
    "document_type": "10-K",
    "content": "UNITED STATES SECURITIES AND EXCHANGE COMMISSION..."
  }'
```

### Search Documents
```bash
curl -X POST http://localhost:8080/api/v1/documents/search \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Apple revenue growth 2023",
    "limit": 5
  }'
```

### Get Document Context
```bash
curl -X GET "http://localhost:8080/api/v1/documents/context?query=iPhone+sales+trend&max_chunks=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## AI Chat with Financial Context

### Basic Chat Request
```bash
curl -X POST http://localhost:8080/api/v1/ai/chat \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What was Apple's revenue in 2023?",
    "session_id": "excel-session-123",
    "include_docs": true
  }'
```

### Chat with Excel Context
```bash
curl -X POST http://localhost:8080/api/v1/ai/chat \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a formula to calculate the 3-year revenue CAGR",
    "session_id": "excel-session-123",
    "excel_context": {
      "workbook": "Apple_Analysis.xlsx",
      "worksheet": "Revenue",
      "selection": {
        "selectedRange": "B2:B5"
      },
      "cell_values": {
        "B2": 394328,
        "B3": 365817,
        "B4": 274515,
        "B5": 260174
      },
      "formulas": {
        "C2": "=B2/B3-1"
      }
    },
    "include_docs": true
  }'
```

Response:
```json
{
  "message": "To calculate the 3-year revenue CAGR from cells B2:B5, you can use this formula:\n\n`=(B2/B5)^(1/3)-1`\n\nThis formula:\n- Takes the ending value (B2: $394,328M) divided by beginning value (B5: $260,174M)\n- Raises it to the power of 1/3 (for 3 years)\n- Subtracts 1 to get the growth rate\n\nThe result will be approximately 14.85% CAGR.",
  "suggestions": [
    "Format as percentage",
    "Create a sensitivity table",
    "Add year labels"
  ],
  "actions": [
    {
      "id": "action_1234",
      "type": "create_formula",
      "description": "Insert CAGR formula in cell C5",
      "parameters": {
        "cell": "C5",
        "formula": "=(B2/B5)^(1/3)-1",
        "format": "percentage"
      }
    }
  ],
  "document_refs": [
    {
      "document_id": "doc_789",
      "title": "Apple Inc. 10-K (2023-09-30)",
      "chunk_id": "revenue_section",
      "excerpt": "Total net sales increased 3% year-over-year to $394.3 billion...",
      "relevance": 0.92
    }
  ],
  "session_id": "excel-session-123"
}
```

## WebSocket Connection

### Connect to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

// Authenticate after connection
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    data: { token: 'YOUR_ACCESS_TOKEN' }
  }));
};

// Send Excel selection change
ws.send(JSON.stringify({
  type: 'selection_changed',
  data: {
    sheet: 'Revenue',
    selectedRange: 'A1:D10'
  }
}));

// Send chat message
ws.send(JSON.stringify({
  type: 'chat_message',
  data: {
    content: 'Explain this formula',
    sessionId: 'excel-session-123',
    context: {
      selectedCell: 'B5',
      formula: '=SUMIF(A:A,">0",B:B)'
    }
  }
}));
```

## API Key Management

### Create API Key
```bash
curl -X POST http://localhost:8080/api/v1/auth/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Excel Plugin",
    "description": "API key for Excel add-in"
  }'
```

### Use API Key
```bash
curl -X GET http://localhost:8080/api/v1/documents \
  -H "X-API-Key: sk_live_..."
```

## Error Handling

All API errors follow this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error