# Context Optimization Implementation Plan

## Executive Summary

After analyzing the logs and code, the context enhancement implementation is **fully deployed** in both frontend and backend. However, the AI's context awareness can be improved through optimization rather than new features.

## Current State Analysis

### What's Working Well ✅

1. **Frontend Implementation**
   - `getComprehensiveContext` is being called with `includeAllSheets: true`
   - All context fields are being sent (visibleRangeData, workbookSummary, etc.)
   - Context is enabled by default
   - Proper fallback to `getSmartContext` if comprehensive context fails

2. **Backend Implementation**
   - `buildFinancialContext` properly processes visibleRangeData
   - workbookSummary is correctly parsed
   - Debug logging is in place

3. **AI Performance**
   - First response created a well-structured DCF model despite minimal visible context
   - This suggests the AI model (Claude 3.5 Sonnet) is leveraging its training on financial models effectively

### Issues Identified 🔍

1. **Context Not Reaching AI System Prompt**
   - Despite backend processing the context, the AI seems to only receive limited information
   - The system prompt in the logs shows minimal context: "Workbook structure: - Sheet1: 1×1 cells"

2. **Context Processing Priority**
   - Backend prioritizes selectedData over visibleRangeData
   - When only A1 is selected, the AI doesn't get the full sheet context

3. **Context Size Limits**
   - visibleRangeData processing is limited to 100 rows (line 922 in excel_bridge.go)
   - For larger sheets, only a summary is added

## Root Cause

The issue is in the **context string building** in `buildFinancialContext`. The function collects data but may not be effectively adding it to the `FinancialContext.DocumentContext` array that gets sent to the AI.

## Implementation Plan

### Phase 1: Fix Context String Building (Priority: HIGH)

**File**: `backend/internal/services/excel_bridge.go`

1. **Verify Context is Added to DocumentContext**
   ```go
   // Around line 926, after processing visibleRangeData
   if hasNonEmptyValues(values) {
       hasData = true
       eb.logger.WithField("address", address).Debug("Processed visible range data")
       
       // ADD: Ensure visible range summary is added
       context.DocumentContext = append(context.DocumentContext, 
           fmt.Sprintf("Visible sheet data (%s): %d×%d cells with data", 
               address, len(values), cols))
   }
   ```

2. **Improve Context Summary Building**
   ```go
   // Add at the end of buildFinancialContext, before returning
   
   // Build a comprehensive summary
   if len(context.CellValues) > 0 || len(context.DocumentContext) > 0 {
       summary := []string{
           fmt.Sprintf("Excel Context for %s:", context.Worksheet),
           fmt.Sprintf("- Selected Range: %s", context.SelectedRange),
       }
       
       if context.ModelType != "" {
           summary = append(summary, fmt.Sprintf("- Detected Model Type: %s", context.ModelType))
       }
       
       if visibleRangeData != nil {
           summary = append(summary, "- Full sheet data is available")
       }
       
       // Prepend summary to DocumentContext
       context.DocumentContext = append(summary, context.DocumentContext...)
   }
   ```

### Phase 2: Enhance AI System Prompt (Priority: HIGH)

**File**: `backend/internal/services/ai_service.go` (or wherever system prompts are built)

1. **Modify System Prompt Generation**
   - Ensure visibleRangeData is prominently mentioned
   - Add context about what the AI can "see" vs what is "selected"

2. **Example Enhancement**
   ```go
   systemPrompt := fmt.Sprintf(`Current Context:
   <context>
     <sheet>%s</sheet>
     <workbook>%s</workbook>
     <visible_data>The full sheet (%s) is visible with %d rows and %d columns</visible_data>
     <selected_range>%s</selected_range>
   %s
   </context>`, 
   worksheet, workbook, visibleRange, rows, cols, selectedRange, additionalContext)
   ```

### Phase 3: Add Context Debugging (Priority: MEDIUM)

**File**: `backend/internal/services/excel_bridge.go`

1. **Add Comprehensive Debug Logging**
   ```go
   // At the end of buildFinancialContext, before returning
   eb.logger.WithFields(logrus.Fields{
       "cell_values_count": len(context.CellValues),
       "formulas_count": len(context.Formulas),
       "document_context_items": len(context.DocumentContext),
       "model_type": context.ModelType,
       "has_visible_range": visibleRangeData != nil,
       "has_workbook_summary": wbSummary != nil,
   }).Debug("Final financial context built")
   
   // Log first few document context items
   for i, doc := range context.DocumentContext {
       if i < 3 {
           eb.logger.WithField("context_item", doc).Debug("Document context item")
       }
   }
   ```

### Phase 4: Optimize Context Presentation (Priority: LOW)

1. **Create Structured Context**
   Instead of appending strings to DocumentContext, create a structured format:
   ```go
   type StructuredContext struct {
       VisibleSheet    SheetSummary
       SelectedData    RangeSummary
       WorkbookInfo    WorkbookSummary
       DetectedPattern string
   }
   ```

2. **Implement Context Prioritization**
   - When context is large, prioritize relevant information
   - For financial models, prioritize: headers, formulas, totals

### Phase 5: Testing & Validation

1. **Add Test Cases**
   - Test with empty sheet → AI should know sheet is empty
   - Test with full DCF model → AI should recognize all components
   - Test with single cell selected in large sheet → AI should see full context

2. **Validation Metrics**
   - Log what context the AI actually receives
   - Compare with what was sent from frontend
   - Measure context loss at each step

## Quick Wins (Implement First)

1. **Add Single Line Fix** in `buildFinancialContext`:
   ```go
   // After processing visibleRangeData
   if visibleRangeData != nil {
       context.DocumentContext = append(context.DocumentContext, 
           fmt.Sprintf("You can see the entire active sheet with data from %s", 
               visibleRangeAddress))
   }
   ```

2. **Log AI System Prompt**: Add logging to see exactly what context the AI receives:
   ```go
   eb.logger.WithField("system_prompt", systemPrompt).Debug("AI system prompt")
   ```

## Expected Outcomes

1. AI will acknowledge seeing the full sheet even when a single cell is selected
2. Context summaries will appear in AI responses ("I can see your DCF model with...")
3. Better awareness of surrounding data when working on specific cells

## Next Steps

1. Implement Phase 1 fixes (est. 30 minutes)
2. Test with the same DCF creation prompt
3. Verify AI acknowledges full sheet context
4. Proceed with remaining phases based on results

The core issue isn't missing implementation but rather ensuring the context reaches the AI in a format it can understand and utilize effectively.