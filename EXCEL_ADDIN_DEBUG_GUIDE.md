# Excel Add-in Debug Guide

## Current Issue
Tool requests are being sent from the backend to the correct client ID, but the Excel add-in is not receiving or processing them.

## Debug Steps

### 1. Check Excel Add-in Console
In Excel, open the add-in and:
1. Open Developer Tools (F12 or right-click → Inspect)
2. Look for these console logs:

Expected logs when connecting:
- `🚀 app.tsx loaded`
- `🔍 Office object: Available`
- `✅ Office.onReady fired!`
- `✅ WebSocket connect event fired`
- `📝 Session ID for this connection: session_XXXXX`

Expected logs when sending a message:
- `📮 Sending message to backend:`
- `📨 Received message:`

Expected logs when receiving tool request:
- `🔧 Tool request received:`
- `🔧🔧 Direct tool_request event received:`
- `🔍 Office availability check:`
- `📊 ExcelService instance obtained`

### 2. Check if Office.js is Loaded
In the console, type:
```javascript
typeof Office
typeof Excel
```
Both should return "object" if properly loaded.

### 3. Check WebSocket Connection
In the console, check if messages are being received:
```javascript
// Look for any WebSocket frames in Network tab
// Filter by WS to see WebSocket messages
```

### 4. Common Issues and Solutions

#### Issue: Office.js not available
**Symptoms**: 
- `typeof Office` returns "undefined"
- Error: "Office.js or Excel API is not available"

**Solutions**:
1. Make sure you're testing in Excel (not browser)
2. Ensure the add-in is properly sideloaded
3. Check manifest.xml has correct Office.js reference

#### Issue: WebSocket messages not received
**Symptoms**:
- No "Tool request received" logs
- WebSocket connected but no tool_request messages

**Solutions**:
1. Check Network tab → WS → select connection → Messages
2. Look for tool_request message from server
3. If not present, backend routing issue
4. If present but not logged, frontend event listener issue

#### Issue: Excel API calls fail
**Symptoms**:
- Tool request received but execution fails
- Error in Excel.run

**Solutions**:
1. Check if add-in has proper permissions
2. Try a simple Excel API test:
```javascript
Excel.run(async (context) => {
  const sheet = context.workbook.worksheets.getActiveWorksheet();
  sheet.load("name");
  await context.sync();
  console.log("Sheet name:", sheet.name);
});
```

### 5. Test Tool Execution Manually
In the console, test the tool directly:
```javascript
// Get ExcelService instance
const { ExcelService } = window;
const service = ExcelService.getInstance();

// Test read_range
service.executeToolRequest('read_range', { range: 'A1:A3' })
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

### 6. Check for CORS or Security Issues
- Look for any CORS errors in console
- Check if WebSocket is blocked by security policies
- Ensure localhost certificates are trusted

## Quick Test Commands

Run these in the Excel add-in console:

```javascript
// Check environment
console.log('Office available:', typeof Office !== 'undefined');
console.log('Excel available:', typeof Excel !== 'undefined');
console.log('WebSocket connected:', wsClient?.current?.isConnected?.() || false);

// Test Excel API
Excel.run(async (context) => {
  console.log('Excel.run works!');
  await context.sync();
  console.log('Context sync works!');
}).catch(e => console.error('Excel.run failed:', e));
```

## Next Steps

If the issue persists:
1. Check if the add-in is running in a restricted environment
2. Try loading the add-in in Excel Online vs Desktop
3. Check Windows Event Viewer for any Excel-related errors
4. Try a simpler test without WebSocket (direct Excel API calls)