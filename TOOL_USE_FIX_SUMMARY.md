# Tool Use WebSocket Routing Fix Summary

## Issue
Tool requests from Claude were timing out because of a mismatch between session IDs and client IDs:
- Frontend generated session IDs like `session_1752379929045`
- Backend generated client IDs like `client_20250713001159.381972`
- Tool requests were sent to session IDs, but WebSocket hub only knew about client IDs

## Root Cause
The `SendToSession` function in the WebSocket hub was trying to route messages using session IDs, but clients were registered with client IDs. This caused the tool requests to never reach the frontend.

## Fix Implementation

### 1. Backend Changes

#### ExcelSession struct (`excel_bridge.go`)
- Added `ClientID` field to store the WebSocket client ID

#### Session Management (`excel_bridge.go`)
- Updated `getOrCreateSession` to store client ID in the session
- Updates client ID on reconnection to handle client reconnects

#### Tool Request Routing (`excel_bridge_impl.go`)
- Added `getClientID` resolver function to BridgeImpl
- Updated `sendToolRequest` to resolve session ID to client ID before sending
- Tool requests now route to the correct WebSocket client

### 2. Frontend Changes

#### Session ID Persistence (`ChatInterfaceWithBackend.tsx`)
- Added `sessionIdRef` to maintain consistent session ID across connection
- Session ID is generated once and reused for all messages

## Testing Instructions

1. Start the backend: `cd backend && go run cmd/api/main.go`
2. Open Excel with the add-in loaded
3. Send a message like "What are the values in cells A1 to A3?"
4. Check the logs for:
   - Session ID consistency
   - Client ID being used for routing
   - Tool request being sent with correct client ID
   - Frontend receiving the tool request

## Expected Log Output

Backend should show:
```
"Sending tool request via WebSocket" session_id="session_XXX" client_id="client_YYY"
```

Frontend console should show:
```
🔧 Tool request received: {type: "tool_request", data: {...}}
```

## Next Steps

If the fix works:
1. Claude will successfully read Excel data
2. No more 30-second timeouts
3. Tool responses will be properly routed back to Claude

If issues persist:
1. Check that Excel add-in has access to Office.js API
2. Verify WebSocket connection is stable
3. Check for any CORS or security issues