#!/bin/bash

echo "Testing Backend Acknowledgment Middleware"
echo "========================================"

# Test 1: Send an acknowledged tool response
echo -e "\n1. Testing acknowledged response:"
curl -X POST http://localhost:8080/api/tool-response \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "requestId": "test-request-456",
    "acknowledged": true
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Test 2: Send a normal (non-acknowledged) tool response
echo -e "\n\n2. Testing normal tool response:"
curl -X POST http://localhost:8080/api/tool-response \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-789",
    "requestId": "test-request-012",
    "acknowledged": false,
    "result": {"status": "success", "data": "test data"},
    "error": null
  }' \
  -w "\nHTTP Status: %{http_code}\n"

# Test 3: Send a tool response without acknowledged field
echo -e "\n\n3. Testing tool response without acknowledged field:"
curl -X POST http://localhost:8080/api/tool-response \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-345",
    "requestId": "test-request-678",
    "result": {"status": "success", "data": "test data"},
    "error": null
  }' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\nTest complete!" 