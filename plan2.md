Great, I’ll prepare a file-by-file implementation plan covering all key areas: dynamic context expansion, consistent key naming, stateful tracking of AI edits, and smart frontend range updates. I’ll include steps for both the Go backend and the React/SignalR frontend (including Zustand if applicable).

This will help bring your smart context system in Gridmate to a level where the AI adapts intelligently across sessions and edits without losing context.


# Implementation Plan: Dynamic Context Expansion in Gridmate

## Backend – Go Service Changes

### File: `backend/internal/services/excel_bridge.go`

* **Function `buildFinancialContext`** – Refine how Excel context data is parsed from incoming SignalR messages:

  * **Context Key Alignment:** Change the parsing to expect the `nearbyData` field (instead of `nearbyRange`) for surrounding cell data. For example, replace usage of `additionalContext["nearbyRange"]` with `additionalContext["nearbyData"]`. Maintain a fallback to handle `nearbyRange` for backward compatibility, but log a warning if `nearbyRange` is present. This ensures the backend correctly finds the nearby cells data that the frontend now sends under the proper key.
  * **Selected Data Parsing:** Ensure the code looks for the `selectedData` object in the provided context map so it can detect when cells are actually populated. Currently, the backend only checks `additionalContext["selectedData"]`. Update this to first check the top-level context (if the SignalR payload nested it differently) then fall back to `additionalContext`. This robust parsing will prevent the “spreadsheet is empty” misdiagnosis by actually loading the selected range’s values and formulas. When `selectedData` is found, mark `hasData = true` after processing values/formulas so that the AI knows the sheet isn’t empty.
  * **Incorporate Recent Edits:** Introduce a mechanism to include recent AI edits in the context. The backend’s `ai.FinancialContext` already has a `RecentChanges` field. After each AI operation that modifies cells, consider updating the session’s context or selection to reflect that change. One approach is to record the edited range as a “recent change” entry. For example, if the AI wrote to `Sheet1!B5:D8`, append an entry to `context.RecentChanges` with that range and perhaps the new values. This will make the AI aware of what cells were just altered. (In practice, the frontend will also handle this by sending updated cell data, but populating `RecentChanges` on the backend is a safe fallback and could be used for AI prompts like “Previously, I filled X range.”)

* **Function `ProcessChatMessage`** – After the AI’s response and tool actions are processed, update the Excel session state to carry forward context:

  * If the AI used a write operation to a new range and the user hasn’t provided a new selection, programmatically promote that range to the session’s active context. This could mean updating `session.Selection.SelectedRange` to the AI-edited range if no new selection came in via the user. By doing this on the backend, the next call to `BuildContext` will treat the AI-edited cells as the “selected” area. For example, if initially the user had selected `A1:A3` and the AI populated `A1:A10`, set `session.Selection.SelectedRange = "A1:A10"` so that subsequent context-building includes the full expanded range. This change fits into the broader system by ensuring the session’s memory grows with AI actions, even if the frontend doesn’t explicitly send an updated selection.

**Rationale:** These backend changes fix the fundamental context mismatches that caused the AI to repeatedly target the same cells. By using the correct keys (`nearbyData` and `selectedData`) and updating session state, the AI will receive an accurate snapshot of the spreadsheet on each request. The backend will no longer assume the sheet is empty when data exists, and it will incorporate new data ranges into the context so the AI can expand its operations beyond previously touched cells.

## Frontend – Excel Add-in (React & Zustand)

### File: `excel-addin/src/components/chat/RefactoredChatInterface.tsx`

* **Message Payload Construction (Send)** – Update the Excel context keys in the payload before sending a chat message. In the `handleSendMessage` logic, replace the incorrect property name for nearby context:

  ```ts
  // OLD
  nearbyRange: excelContext?.nearbyData,
  // NEW
  nearbyData: excelContext?.nearbyData,
  ```

  This change (at the code around building `messagePayload.data.excelContext`) ensures the frontend sends a `nearbyData` field containing the surrounding cells data. The backend will then parse `nearbyData` directly, aligning with the expected key.
* **Context Data Integrity:** Verify that the `excelContext` object includes all necessary fields each time. The `ExcelService.getSmartContext()` call should provide: `worksheet` name, `workbook` name, the `selectedRange` address, and the actual cell content in `selectedData` and `nearbyData` (with their `values`, `formulas`, `address`, etc.). In the debug logs, confirm that these fields are present and populated (the code logs them at send time). This step is to double-check that no data is being lost between ExcelService and the message payload. If any field (e.g. formulas in `nearbyData`) isn’t appearing, ensure the `ExcelService` is returning it and that we include it in the payload object.
* **Active Context Display:** The component uses `activeContext` state to show what range is in context (e.g., “Context: Sheet1!A1\:A3”). After implementing dynamic context updates, this should reflect the latest range. If we automatically change the selection (see below), the selection change listener will trigger and update this context label. No direct code change is needed here beyond ensuring `updateAvailableMentions()` is called when selection updates (which it already is via the debounced selection effect). Just verify that after an AI edit, the UI’s context indicator updates to the new range, confirming that the context expansion is visible to the user.

### File: `excel-addin/src/services/excel/ExcelService.ts`

* **Add Activity Tracking:** Introduce a mechanism to log recent user or AI actions on the spreadsheet. For example, add a private property to `ExcelService` like:

  ```ts
  private activityLog: { timestamp: number; type: 'edit' | 'select'; range: string }[] = [];
  ```

  and a method `private trackActivity(type: 'edit' | 'select', range: string)`. The `trackActivity` function will push an entry (with current timestamp, type, and range address) onto `activityLog` (while capping the log size, e.g., keep last 50 entries). This log will help determine what the most recent action was. For example, when the AI writes to new cells, we’ll call `trackActivity('edit', 'Sheet1!A1:A10')`. When the user manually changes the selection, we’ll call `trackActivity('select', <newRange>)`. Tracking both allows us to compare timestamps and decide if the next AI request should stick with the AI’s expansion or reset to a user-selected region.
* **Dynamic Context in `getSmartContext()`:** Enhance the `getSmartContext()` method to use the activity information for context size adjustments. After gathering the basic selected range data and before returning the result, add logic like:

  ```ts
  const lastSelect = this.activityLog.filter(a => a.type === 'select').slice(-1)[0];
  const lastEdit = this.activityLog.filter(a => a.type === 'edit').slice(-1)[0];
  if (lastEdit && (!lastSelect || lastEdit.timestamp > lastSelect.timestamp)) {
      // No new selection after the last edit – expand context around lastEdit.range
      const editRange = lastEdit.range;
      // Calculate a slightly larger range around the editRange to include some neighbors
      const expandedRange = this.expandRange(editRange, 5, 5); // e.g., 5 rows/cols padding
      const worksheet = context.workbook.worksheets.getActiveWorksheet();
      const nearbyRange = worksheet.getRange(expandedRange);
      nearbyRange.load(['values','formulas','address','rowCount','columnCount']);
      await context.sync();
      result.selectedRange = editRange;             // promote the edited range as the new selection context
      result.selectedData = {                       // fetch values for the edited range
        values: worksheet.getRange(editRange).load('values').values,
        formulas: worksheet.getRange(editRange).load('formulas').formulas,
        address: editRange,
        rowCount: ..., colCount: ...
      };
      result.nearbyData = {
        values: nearbyRange.values,
        formulas: nearbyRange.formulas,
        address: nearbyRange.address,
        rowCount: nearbyRange.rowCount,
        colCount: nearbyRange.columnCount
      };
  }
  ```

  (The above is conceptual – actual implementation may differ due to Office.js patterns.) The idea is: if the last action was an AI edit and the user hasn’t made a new selection since, we override/augment the context to focus on the area of that edit. We use a helper (like `expandRange`) to slightly pad the edited region so the AI still sees some surrounding cells. This dynamic sizing means each follow-up request’s `excelContext` will naturally grow to include the AI’s previous outputs, rather than staying fixed on the originally selected cells.

  * If the sheet is very large or the AI has made many disjoint edits, consider limiting context size to avoid huge payloads. For instance, if the AI has written in scattered areas, we might include only the most recent region or the union of a few recent regions. A simple strategy is to use the last edit’s range (as above). A more advanced strategy could maintain a running “bounding box” of all edited cells in the session and use that. In this plan, focusing on the last edit should suffice for incremental expansion.
* **Selecting Range Programmatically:** Implement a utility to reselect ranges via Office.js, which can be used to keep the Excel UI and the internal state in sync. Add a method like `public async selectRange(range: string): Promise<void>` that runs an Excel.js command to select the given range in the active worksheet. For example:

  ```ts
  async selectRange(rangeAddress: string): Promise<void> {
      return Excel.run(async context => {
          const worksheet = context.workbook.worksheets.getActiveWorksheet();
          worksheet.getRange(rangeAddress).select();
          await context.sync();
      });
  }
  ```

  This method allows the frontend to highlight the AI-edited cells for the user’s benefit and also triggers the Excel selection change event. When `select()` is called, the `worksheet.onSelectionChanged` listener (registered in `RefactoredChatInterface`) will fire, causing our app to update the `rawSelection`/`activeContext` state. In effect, this ties the dynamic context back into the normal flow: by simulating a user selection of the new area, we let the existing logic update mentions and context state naturally.

**Rationale:** These frontend changes make the context system adaptive and stateful. The `ExcelService.getSmartContext` modifications ensure that each new AI request includes up-to-date data, especially if the AI extended into new cells. Tracking activities allows us to differentiate between user-driven context resets and AI-driven expansions. By reselecting the AI’s output range in Excel (optionally), we align the visible selection with the logical context, which both provides visual feedback to the user and leverages Excel’s event system to keep our app’s context store current. Overall, the spreadsheet data sent to the backend will grow to encompass new edits, preventing the AI from getting “stuck” repeating the same cells.

### File: `excel-addin/src/hooks/useMessageHandlers.ts`

* **After AI Operation – Update Context:** Hook into the workflow right after an AI diff is applied or a tool is executed to update the context for subsequent messages. There are two places to do this: when operations are accepted (user-approved) and when they are executed immediately (no preview).

  * **On Preview Accept:** In the `handlePreviewAccept` callback (which runs when a user clicks the ✅ to apply a previewed operation), add logic to capture the operation’s range and update selection. The `toolRequest` object here contains the tool name and parameters (including the target range). For example, after a successful execution (`await ExcelService.getInstance().executeToolRequest(...)` and sending the final response), do:

    ```ts
    if (WRITE_TOOLS.has(toolRequest.tool) && toolRequest.range) {
        // Log and reselect the edited range
        ExcelService.getInstance().trackActivity('edit', toolRequest.range);
        ExcelService.getInstance().selectRange(toolRequest.range).catch(err => console.error("Selection update failed:", err));
    }
    ```

    This will record the edited range in the activity log and programmatically select it in Excel. The result: the session’s “active context” shifts to what the AI just edited. Next time the user asks the AI to continue, `getSmartContext` will find that the last action was an edit (with no newer selection) and will focus context there (as implemented above).
  * **On Immediate Execution:** The app also supports applying operations without preview (e.g., in full autonomy or for certain read-only tools). In `handleToolRequest`, inside the branch where `shouldPreview` is false for a write tool, similarly invoke the update. After executing the tool (`const result = await ExcelService.getInstance().executeToolRequest(...)`), add:

    ```ts
    if (WRITE_TOOLS.has(toolRequest.tool) && toolRequest.range) {
        ExcelService.getInstance().trackActivity('edit', toolRequest.range);
        ExcelService.getInstance().selectRange(toolRequest.range).catch(...);
    }
    ```

    This ensures even in “one-shot” execution scenarios, we don’t miss the chance to expand the context.
* **Track User Selections:** The selection change listener in `RefactoredChatInterface` is already in place, but we can tie it into our new tracking system. When `onSelectionChanged` fires (setting a new `rawSelection`), after debouncing we call `updateAvailableMentions()` which in turn calls `ExcelService.getInstance().getSmartContext()`. We should also log this event: for instance, inside `updateAvailableMentions` (after fetching context), call `ExcelService.getInstance().trackActivity('select', context.selectedRange)` to record the user’s new selection. This way, manual context changes are noted with a timestamp. By comparing it to the last edit timestamp, the logic in `getSmartContext()` can decide whether to stick with AI’s context or use the user’s. (If the user manually selects a new area, that should take precedence over previous AI expansions.)
* **Persist Growing Context:** If needed, maintain a broader notion of the session’s covered range. For example, you might store in Zustand or a ref the “cumulative range” of all AI edits. However, a simpler approach (which we implement here) is to rely on the last edited range as the active context, because typically the user’s follow-up requests pertain to whatever was last added or changed. In edge cases where the AI populates non-contiguous areas over multiple turns, we might refine this by merging ranges. A possible enhancement is to compute the bounding rectangle encompassing the initial selection and all AI-edited cells, and use that as the context window (clamped to a reasonable size). For now, the plan updates context incrementally, turn by turn, which should handle the common use-case of the AI gradually expanding a table or model.

**Rationale:** These hook modifications tie the context expansion into the actual workflow of applying AI suggestions. By updating immediately when an edit is applied, we ensure no turn is missed – the very next message the user sends will already consider the newly written cells. Logging the selection vs edit events lets us implement the logic in `ExcelService` that knows when to expand the context versus when to respect a fresh user selection. Overall, this creates a smooth experience: the user sees the AI’s output selected in Excel, and any follow-up request will naturally include that output in context. The session context “grows” over time because each AI action extends the selection or context range being sent to the backend on the next iteration.

## SignalR Integration Considerations

* **Ensure Context Payload Consistency:** After these changes, the `.NET` SignalR hub (`GridmateHub.SendChatMessage`) will receive an `excelContext` object with the keys and structure the Go backend expects. We must verify that the JSON serialization from the frontend preserves the nested data. Because we pass `selectedData` and `nearbyData` as objects (containing arrays of values/formulas), the hub’s JSON payload will include those nested fields. The Go `SignalRHandler` decodes this into `SignalRChatRequest.ExcelContext` (a `map[string]interface{}`). Our backend parsing fixes will then correctly find `excelContext["selectedData"]` and `excelContext["nearbyData"]` in that map. We should test an end-to-end scenario: select a range with data, send a request, and confirm via backend logs that `context_keys` include both `"selectedData"` and `"nearbyData"` and that the `CellValues` in FinancialContext are populated (no "Spreadsheet is empty" message).
* **Session ID and Context Carry-over:** The SignalR session mechanism already keeps a session ID constant across messages, which the backend uses to map to an `ExcelSession`. Our plan updates the `ExcelSession.Context/Selection` on the backend when appropriate. Because the session persists, those changes will apply to subsequent messages from the same session. In other words, if the backend’s `session.Selection.SelectedRange` is changed to "Sheet1!A1\:A10" after message 1, then message 2 (with the same sessionId) will use that as default if the frontend doesn’t override it. This complements the frontend always sending fresh context – even if the front were to omit data, the backend has a memory of what was last active.
* **No Additional Hub Methods Needed (Optional):** We considered adding a dedicated SignalR call to update the backend session selection after an AI edit. However, by choosing to have the frontend simply reselect the range (triggering the normal context send on next message) and by the backend updating context internally during processing, we avoid extra network chatter. The existing `chat_message` flow is sufficient. Just be aware that if the Office selection change event doesn’t fire (for example, in an automated “full autonomy” mode where we might not call `selectRange`), the backend’s context update via session might be the only line of defense. Thus, our dual approach (frontend reselect + backend session memory) is designed to be robust.

---

**Conclusion:** This file-by-file plan addresses the issue of the AI only editing previously touched cells by enabling **adaptive context expansion**. On the **frontend**, we capture where the AI has made changes and proactively include those cells in the next request’s context (both by logical data inclusion and by visually selecting them in Excel). On the **backend**, we fix any data flow disconnects (like mismatched keys) so that the AI always receives an accurate picture of the sheet, and we adjust session state so the context isn’t reset between turns. Together, these changes ensure that if a user says *“Great, now extend this to the next column”* in a follow-up, the AI sees the newly filled cells and can naturally continue into adjacent empty cells, rather than being blind to its own last output. The session’s context will grow turn by turn, allowing Gridmate’s AI assistant to progressively build out larger sections of the spreadsheet as instructed by the user.
