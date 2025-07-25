# Phase 0 Streaming Tests

## Test Environment Setup
1. Start all services:
   ```bash
   ./start-dev.sh
   ```
2. Open Excel with the GridMate add-in
3. Open browser developer console to monitor network traffic

## Test Cases

### 1. Text-only Query
**Objective**: Verify pure text responses stream properly with initial acknowledgment

**Test Input**: "What is a DCF model?"

**Expected Behavior**:
- ✅ Immediate initial acknowledgment: "Let me check that for you..."
- ✅ Streaming text explanation without tools
- ✅ No blank messages
- ✅ Smooth character-by-character streaming
- ✅ Proper completion signal

**Validation**:
- Check console logs for "Sent initial acknowledgment chunk"
- Verify StreamingMessage component receives text chunks
- No tool indicators should appear

### 2. Tool-requiring Query
**Objective**: Verify tool execution includes explanatory text before and after

**Test Input**: "Create a DCF model"

**Expected Behavior**:
- ✅ Initial text: "I'll help you create a DCF model. Let me set up the structure..."
- ✅ Tool execution phase with visual indicators
- ✅ Continuation text after tools: "I've completed the operations..."
- ✅ No blank messages during any phase

**Validation**:
- Check for phase transitions in logs: initial → tool_execution → continuation → final
- Verify tool indicators appear during execution
- Confirm summary text after completion

### 3. Multi-tool Query
**Objective**: Verify complex operations maintain text flow throughout

**Test Input**: "Create a DCF model and analyze the IRR"

**Expected Behavior**:
- ✅ Initial explanation mentioning both tasks
- ✅ First tool execution with progress
- ✅ Intermediate text between tools
- ✅ Second tool execution
- ✅ Final summary covering all operations

**Validation**:
- Multiple phase transitions logged
- Clear text at each transition
- All tools tracked and summarized

### 4. Error Handling
**Objective**: Verify errors still provide user feedback

**Test Input**: "Create a chart from invalid data"

**Expected Behavior**:
- ✅ Initial acknowledgment appears
- ✅ Tool error displayed clearly
- ✅ Explanatory text about the error
- ✅ No blank messages

**Validation**:
- Error logged but user sees helpful text
- Stream completes gracefully

### 5. Empty Spreadsheet Detection
**Objective**: Verify context-aware acknowledgments

**Test Input**: "Create a DCF model" (with empty spreadsheet)

**Expected Behavior**:
- ✅ Special acknowledgment: "I see you're working with an empty spreadsheet..."
- ✅ More detailed explanation of what will be created
- ✅ Tools execute with clear progress

**Validation**:
- Check for context-aware initial text
- Verify empty spreadsheet detection in logs

### 6. Large Response Streaming
**Objective**: Test performance with large responses

**Test Input**: "Explain all the components of a comprehensive LBO model"

**Expected Behavior**:
- ✅ Consistent streaming speed
- ✅ No UI freezing
- ✅ Chunks delivered < 100ms apart
- ✅ Memory usage stable

**Validation**:
- Monitor chunk delivery timestamps
- Check browser performance metrics
- Verify no memory leaks

## Debug Tools

### SignalR Debug Commands
From browser console:
```javascript
// Get streaming health
connection.invoke("GetStreamingHealth", sessionId);

// Enable phase tracing
connection.invoke("TraceStreamingPhases", sessionId, true);

// Simulate phase streaming
connection.invoke("SimulatePhaseStreaming", sessionId, "create a formula");
```

### Backend Logs to Monitor
```bash
# Watch for streaming phases
tail -f logs/app.log | grep -E "(StreamingCoordinator|PhaseManager|initial acknowledgment)"

# Monitor chunk delivery
tail -f logs/app.log | grep "StreamChunk"

# Track phase transitions
tail -f logs/app.log | grep "Phase transition"
```

### Frontend Console Checks
```javascript
// Monitor StreamingMessage component
console.log('[StreamingMessage]');

// Check for empty message timeouts
console.log('No content received after 1s');

// Verify chunk processing
console.log('Processing chunk');
```

## Success Metrics

1. **Response Time**
   - Initial acknowledgment < 500ms
   - First meaningful text < 1s
   - Tool execution feedback immediate

2. **Streaming Quality**
   - Smooth text flow (50ms flush interval)
   - No blank message periods > 1s
   - Clear phase transitions

3. **Error Recovery**
   - All errors show user-friendly text
   - No hanging streams
   - Graceful fallbacks

4. **User Experience**
   - Always see what AI is doing
   - Clear progress indicators
   - Meaningful completion messages

## Common Issues and Solutions

### Issue: Blank messages still appearing
**Check**:
- AI service has immediate acknowledgment code
- Frontend fallback timeout is working
- SignalR relay is not dropping chunks

### Issue: Chunks not streaming smoothly
**Check**:
- ChunkedRenderer flush interval (50ms)
- Network latency
- SignalR connection stability

### Issue: Tool results not explained
**Check**:
- StreamingCoordinator continuation phase
- Tool completion templates
- Phase transition logic

## Test Report Template

```
Date: ___________
Tester: ___________

Test Case | Pass/Fail | Notes
----------|-----------|-------
Text-only query | | 
Tool-requiring query | |
Multi-tool query | |
Error handling | |
Empty spreadsheet | |
Large response | |

Overall Result: _________
Issues Found: ___________
```