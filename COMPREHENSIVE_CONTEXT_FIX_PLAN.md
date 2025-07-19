# Comprehensive Plan to Fix and Enhance AI Context Handling

This document outlines a comprehensive, multi-part plan to overhaul Gridmate's context management system. The goal is to fix the "stuck context" bug and fundamentally improve the AI's situational awareness, making it more autonomous and intuitive. This plan incorporates insights from an analysis of best practices in AI-powered coding tools.

---

## Part 1: Foundational Context Model Rework (Backend)

This section focuses on fixing the core backend logic to ensure the context provided to the AI is always complete and relevant.

### 1.1. Fix AI Context Lock-in by Merging Edited Ranges

**Problem:** The AI's context is currently being narrowed to only the *last* range it edited, causing it to lose sight of the bigger picture in subsequent turns.

**Solution:** We will modify the backend to compute the **union of all ranges** edited by the AI in a single turn. This bounding box will become the new "selection" context for the next turn.

*   **File to Modify:** `backend/internal/services/excel_bridge.go`
*   **Action Items:**
    1.  **Implement `mergeRanges` Helper:** Add a new helper function to `excel_bridge.go` that takes multiple range strings (e.g., `"A1:B2"`, `"D5"`) and computes a single bounding range string (e.g., `"A1:E5"`).
    2.  **Update `ProcessChatMessage`:** In the `ProcessChatMessage` function, replace the logic that stores the `lastEditedRange`. Instead, collect all edited ranges from the AI's tool calls into a slice.
    3.  Use the new `mergeRanges` function to calculate the union of these ranges and update `session.Selection.SelectedRange` with the result.

### 1.2. Ensure Full Worksheet Visibility

**Problem:** The AI's context is often limited to the user's selection or a fixed range (`A1:Z100`), leaving it blind to other data on the sheet.

**Solution:** The backend context builder will be updated to dynamically use the worksheet's actual `usedRange`, ensuring the AI always sees all populated cells.

*   **File to Modify:** `backend/internal/services/excel/context_builder.go`
*   **Action Items:**
    1.  **Extend the Excel Bridge:** Introduce a new tool or extend the existing `excel.BridgeImpl` to fetch the `usedRange` of a given worksheet. This may require a new message type over SignalR for the frontend to handle.
    2.  **Modify `BuildContext`:** Update the `BuildContext` function. Instead of defaulting to a hardcoded `"A1:Z100"`, it should first call the new tool to get the sheet's `usedRange`.
    3.  Use this dynamic range to fetch all relevant cell values and formulas, up to a reasonable safety limit (e.g., 10,000 cells) to prevent performance issues. This ensures `FinancialContext.CellValues` is always complete.

---

## Part 2: Advanced Context - Detailed Change Tracking

This section focuses on providing the AI with a clear history of recent changes.

### 2.1. Enhance AI Edit Tracking with Old/New Values

**Problem:** The current AI edit tracking in `recentEdits` only logs the range and timestamp, not what actually changed.

**Solution:** We will enhance the tracking to include the "before" and "after" state of the cells.

*   **File to Modify:** `backend/internal/services/excel_bridge.go`
*   **Action Items:**
    1.  **Read Before Writing:** Before executing a `write_range` or similar tool call, the `ToolExecutor` should first issue a `read_range` for the target area to capture the old values.
    2.  **Store Richer Edit Data:** In `ProcessChatMessage`, when an AI tool call is processed, the entry added to `session.Context["recentEdits"]` should be a structured object containing `range`, `oldValues`, `newValues`, `timestamp`, and `source: "ai"`.
    3.  **Update Prompt Builder:** Ensure the prompt builder formats this rich change data clearly for the AI (e.g., `B2 [12:34:56]: 10 -> 15 (ai)`).

### 2.2. Implement User Edit Tracking

**Problem:** User-initiated edits are only detected implicitly by diffing the context between turns, which can be unreliable and lacks clear attribution.

**Solution:** We will introduce explicit tracking for user edits from the frontend.

*   **File to Modify:** `excel-addin/src/services/excel/ExcelService.ts`
*   **Action Items:**
    1.  **Use Office.js Events:** Leverage the `Worksheet.onChanged` event from the Office.js API.
    2.  **Create `trackUserEdit`:** When the `onChanged` event fires, call a new method, `ExcelService.trackUserEdit(event.address, ...event.details)`.
    3.  This method will send a lightweight message to the backend to log the user's change, including the old and new values (which can be derived from the event details or a cached context). This parallels the AI edit tracking and provides immediate, explicit context.

---

## Part 3: Decoupling from Manual UI Selection

This section focuses on making the AI more autonomous by reducing its dependency on the user's manual cell selection.

### 3.1. Make Full-Sheet Context the Default

**Problem:** The application often requires a user to select a range to provide any context at all. This is unnatural and limiting.

**Solution:** The frontend will be modified to always provide a full-sheet context by default, regardless of user selection.

*   **File to Modify:** `excel-addin/src/services/excel/ExcelService.ts`
*   **Action Items:**
    1.  **Modify `getSmartContext`:** Change `getSmartContext` to *always* fetch the active worksheet's `usedRange` and its data, as described in **Part 1.2**.
    2.  The concept of a "selected range" will still exist for user interactions, but the *data sent to the backend* will default to the whole sheet's content. The user's selection will be passed along as a hint or point of focus, not as the sole source of data.

### 3.2. Update UI to Reflect New Context Model

**Problem:** The UI, particularly the "context pill," is tightly coupled to the idea of a manual selection.

**Solution:** The UI will be updated to de-emphasize manual selection and clearly communicate the new, broader context model.

*   **File to Modify:** `excel-addin/src/components/chat/RefactoredChatInterface.tsx`
*   **Action Items:**
    1.  **Remove "NO RANGE SELECTED" State:** Eliminate any UI state that blocks interaction when no range is selected.
    2.  **Change Context Pill:** Instead of showing the selected range, the context pill could show the active sheet name (e.g., `"Context: Sheet1 (full sheet)"`) or be removed entirely in favor of `@`-mentions for sheets.
    3.  The system should feel like it's always "on" and aware of the current sheet, freeing the user from the need to manually provide context for every query.

---

## Part 4: Structural Inference for Blank & Sparse Sheets

This section focuses on making the AI smarter when starting from scratch.

### 4.1. Implement Proactive Header and Structure Detection

**Problem:** The AI doesn't recognize existing headers or table structures on sparsely populated sheets, especially without a user selection.

**Solution:** We will use existing tools to proactively analyze the sheet's structure and feed those hints to the AI.

*   **File to Modify:** `backend/internal/services/excel/context_builder.go`
*   **Action Items:**
    1.  **Run `analyze_data` by Default:** In `BuildContext`, after fetching the `usedRange` data, automatically run a lightweight structural analysis on that data.
    2.  Specifically, check the first row for text values that look like headers.
    3.  **Add Structural Hints to Context:** If headers are detected, add a clear note to the `FinancialContext.DocumentContext` (e.g., `"Detected column headers: 'Year', 'Revenue', 'COGS'"`). The prompt builder will then include this hint in the system prompt, giving the AI a crucial starting point for understanding the data's schema.
    4.  This logic should run regardless of the user's selection.

By implementing this comprehensive plan, we will create a more robust, intuitive, and powerful context-aware system for Gridmate.
