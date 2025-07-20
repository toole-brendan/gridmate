# Gridmate Memory & Context Persistence Implementation Plan

## 1. **Review of Current State Management**

**Conversation Memory:** Gridmate’s backend currently uses an in-memory `chat.History` to store recent messages (up to 100 per session). Each chat message has a `Role` (“user”, “assistant”, etc.), content text, and timestamp. However, the initial system instructions (the AI’s role/configuration) are not persisted in this history, and chat history is not yet saved to a database – it exists only in memory for the active session. The frontend likely generates a unique `sessionId` for each Excel session and reuses it for messages so the backend can retrieve the correct history.

**Spreadsheet Context:** The backend defines a rich `FinancialContext` schema capturing spreadsheet state – including workbook/worksheet names, the selected range, cell values, formulas, recent changes, etc. On each user query, Gridmate builds a `FinancialContext` either via a **ContextBuilder** (which reads the sheet using Office.js) or a simpler `buildFinancialContext` helper. This ensures the AI is aware of the current Excel state. For example, `PromptBuilder.buildContextPrompt` formats the context as an XML-like snippet with sheet name, selection, cell data, recent changes, etc.. Currently, the backend injects this context into the prompt **only for the first user message** in a session (as a second system message labeled “Current Context”). Subsequent turns rely on conversation memory and whatever context the AI gleaned previously, but **they do not explicitly re-send updated context** – a limitation we will address.

**AI Prompt Construction:** For a new chat message, Gridmate uses `PromptBuilder.BuildChatPrompt` to create an array of messages. This includes a system message with general instructions (financial modeling guidelines) and, if available, a system message with the current context, followed by the user’s message. These messages are then sent to Anthropic’s Claude API. The current Anthropic integration expects a single combined system prompt – but as implemented, multiple system-role messages cause only the **last** one to be used (the context overrides the base prompt). Also, for subsequent interactions, the code uses a specialized flow (`ProcessChatWithToolsAndHistory`) that appends prior conversation turns and tool outputs. However, due to timing of when the user message is added to history, the very **first** user prompt may be sent without the intended system/context prefix. In summary, the foundation is in place (session-based memory and context objects), but we need to make it more **robust and persistent**.

## 2. **Design for Full Conversation Memory**

We will ensure **full chat history is stored and included** with each prompt to the AI, similar to how Cline and RooCode preserve context across turns. In Cline/RooCode, the AI’s memory is reconstructed each session by reading a “Memory Bank” – here, we’ll mimic that by always prepending all relevant prior messages and context when calling Claude. Concretely:

* **Backend Memory Storage:** Continue using `chat.History` for fast in-memory storage of the conversation. We will modify how messages are added: rather than discarding older turns beyond 100, we can either increase this limit or implement a rolling log (100 is likely fine for now). To **persist** memory beyond a single backend instance or session, introduce an optional database table (e.g. `chat_messages`) with columns for session\_id, role, content, and timestamp. This can be used to log all interactions (as suggested in the Phase 3 plan for “audit logs and context storage”). The implementation can happen in the `chat.History` methods: for example, in `AddMessage`, after appending to the in-memory list, also insert into the DB via a new repository method. This ensures that if the server restarts or the user reconnects later, we could retrieve past conversation. (If immediate persistence is not required, this step can be optional or a future enhancement.)

* **Including History in Prompts:** Modify the prompt-building so **every** Claude API request gets the full conversation history (up to length limits). The `ai.Service.ProcessChatWithToolsAndHistory` already attempts this by taking a `chatHistory []Message` parameter. We will ensure it’s populated with **all prior turns** (except perhaps system prompts, see below) and that Claude receives them. Specifically, in `ExcelBridge.ProcessChatMessage`, we will use `eb.chatHistory.GetHistory(sessionID)` to get all messages, and convert them to the `ai.Message` format for the AI provider. The code already does this conversion for previous messages. We need to adjust logic so that the initial system prompt and context are also included appropriately (see next section).

* **Ensuring Order & Completeness:** The final message list sent to Claude should look like: **\[System: base instructions + context, User: first question, Assistant: first answer, User: second question, Assistant: second answer, …, User: current question]**. This way Claude sees the entire dialogue every time. This aligns with RooCode’s approach where each turn’s prompt includes a recap of prior interactions, and with Cline’s approach of reading the Memory Bank each time (since Claude doesn’t truly remember between requests). We will implement this by always prepending the system/context message(s) and then all prior user/assistant pairs to the `CompletionRequest.Messages`.

* **Memory Limit Management:** Since tokens are finite, we keep using the cap of 100 messages in memory. If a conversation grows long or exceeds token limits, consider summarizing or pruning older turns (Cline’s memory uses user-provided summaries in Memory Bank files – here we could do an automatic summary of earlier turns if needed). For now, 100-message retention should suffice.

## 3. **Persisting Spreadsheet State in AI Prompts**

We want Claude to always be aware of the latest spreadsheet state – formulas, cell values, edits, selections, etc. Gridmate already constructs a `FinancialContext` for each query. We will make the following enhancements so this context is **persisted and updated across turns, similar to how RooCode provides persistent project context**:

* **Always Include Current Context:** We will include an updated snapshot of the spreadsheet in *every* prompt, not just the first. This means on each new user query, we regenerate the `FinancialContext` (via `ContextBuilder.BuildContext` or `buildFinancialContext`) and insert it into the prompt messages. In practice, we’ll do this by merging the context into the system message (explained below). By doing so, even if the user or AI has made changes in previous steps, the AI will see the latest sheet state. This parallels RooCode’s strategy of always supplying the current file/project state with each request so the AI isn’t operating on stale data.

* **Tracking Changes:** The system already tracks recent changes (AI edits are logged to `session.Context["recentEdits"]` and merged into a unified range for context, and the ContextBuilder tracks cell changes across calls). We will leverage this to inform the AI. For example, the `FinancialContext.RecentChanges` field is populated with up to the last 10 edits (with timestamps and old/new values) by the ContextBuilder. The PromptBuilder already formats a “recent changes” section if present. We will ensure this RecentChanges list is updated each turn and included in the context snippet. This means if the AI or user modifies the spreadsheet, the next prompt will contain something like: `<recent_changes><cell>A1 changed from 5 to 10 (by user)</cell> …</recent_changes>` (the exact format is handled in `buildRecentChangesSection`). This gives Claude a memory of what changed recently, enhancing its understanding like an audit trail (akin to how Cline’s memory bank might note recent code changes).

* **Persisting Context Across Sessions:** Typically, the spreadsheet itself is the source of truth for context (we can always read values/formulas from Excel live). Thus, we may not need to persist the entire FinancialContext in a database – we can reconstruct it on demand. However, to be safe, we might store certain context metadata (e.g. the last known model type, or a summary of the sheet) if we want continuity after a complete restart. This could be tied to a user or workbook ID. For now, focusing on per-session context is sufficient, as the user’s Excel file already *is* persistent state.

* **Office.js Frontend Coordination:** We should ensure the frontend is sending all necessary data to build context. The current design sends `selectedData` (values & formulas of the user’s selection), `nearbyData` (surrounding cells), and possibly `fullSheetData` for context. The backend’s `buildFinancialContext` already checks for these keys and merges them into the FinancialContext. We’ll maintain this. In addition, we should use Office.js events (like `Worksheet.onChanged`) to notify the backend of user edits (the **Comprehensive Context Fix Plan** suggests sending user edits to backend explicitly). Implementing that would involve a new endpoint or reuse of `selection-update` to pass changed cell info, which the backend can then record in `session.Context["recentEdits"]` (similar to how AI edits are recorded). This ensures **both** AI-initiated and user-initiated changes are remembered. *Action:* in the Excel add-in’s `ExcelService` (frontend), subscribe to cell change events and send updates with old/new values to the backend (this can be an improvement to implement alongside or after this memory update).

## 4. **Backend Changes (Go)**

We will now integrate the above design into Gridmate’s backend code, file by file:

**a. `backend/internal/services/ai/prompt_builder.go`:**
– *Combine system prompt and context:* Currently, two separate system-role messages are appended – one for the base prompt, one for context. Because the Anthropic API (v1) only accepts a single system message (the code picks up only the last one), we must merge them. Modify the `BuildChatPrompt` function: instead of appending a second `Message{Role: "system", Content: "Current Context:\n..."}`, **concatenate** the context onto the initial system content. For example:

```go
messages := []Message{
    {Role: "system", Content: pb.systemPrompt},
}
if context != nil {
    ctxText := pb.buildContextPrompt(context)
    if ctxText != "" {
        messages[0].Content += "\n\nCurrent Context:\n" + ctxText
    }
}
messages = append(messages, Message{Role: "user", Content: userMessage})
```

This ensures the single system message contains both the instructions and the context. Do the same in `BuildAnalysisPrompt` (merge context into the first system message instead of appending). After this change, the Anthropic provider will receive one combined `anthropicReq.System` containing everything, so Claude gets both the financial-modeling guidelines and the spreadsheet state every time.

– *Verify context formatting:* The existing `buildContextPrompt` produces a structured summary of the sheet. Ensure it includes all relevant parts (sheet name, selected range, model type, key cell values, formulas, recent changes, etc.) which it currently does. We might consider adding the workbook name if available (already handled) and any document snippets if relevant. This function is already optimized to keep tokens reasonable (e.g. showing only up to 10 cell values or summarizing large ranges) – we will keep those limits to avoid prompt bloat.

**b. `backend/internal/services/ai/anthropic.go`:**
– *Handle multiple system prompts:* With the above change, we expect only one system message in `CompletionRequest.Messages`. Nonetheless, it’s worth safeguarding the conversion in `convertToAnthropicRequest`. Currently, it simply sets `anthropicReq.System = msg.Content` for each system-role message, overwriting any previous. After our fix, this loop will only encounter one system message, so it’s fine. If in some edge case we end up with multiple system messages, consider concatenating them instead of overwriting. (This is a minor defensive change: e.g., accumulate `systemContent += msg.Content + "\n"` for each system-role message, then assign `anthropicReq.System = systemContent` at the end of the loop.) The main adjustment here is to confirm our prompt builder is supplying the messages correctly to avoid lost information.

**c. `backend/internal/services/excel_bridge.go` (Chat processing logic):**
This is where we tie everything together:

* *First-message handling:* We need to ensure the first user query in a session includes the system prompt and context. In the current flow, `ExcelBridge.ProcessChatMessage` immediately adds the user’s message to history, then builds context and calls `aiService.ProcessChatWithToolsAndHistory` with that history. Because the user message was already in history, the `ProcessChatWithToolsAndHistory` function mistakenly thinks it’s not the first turn (history length is 1, not 0) and thus **skips injecting** the system prompt/context (the check `if context != nil && len(chatHistory)==0` fails). We will fix this by adjusting the order: **do not add the new user message to `eb.chatHistory` until after preparing the AI prompt**. Instead, retrieve the prior history first. Pseudocode for modification in `ProcessChatMessage`:

  ```go
  // Determine if this is a new conversation (no prior messages)
  prevHistory := eb.chatHistory.GetHistory(session.ID)
  firstTurn := len(prevHistory) == 0

  // Build or fetch FinancialContext as done (financialContext := ...)

  var aiResponse *ai.CompletionResponse
  var err error
  if firstTurn {
      // If first turn, use the prompt builder to include system and context
      messages := s.promptBuilder.BuildChatPrompt(message.Content, financialContext)
      // Optionally add tools (s.selectRelevantTools) if any for first query
      req := CompletionRequest{Messages: messages, ...tool settings...}
      aiResponse, err = s.provider.GetCompletion(ctx, req)
  } else {
      // Existing conversation: include history and use ProcessChatWithToolsAndHistory
      aiHistory := ... // convert prevHistory to ai.Message slice (exclude current message)
      aiResponse, err = s.ProcessChatWithToolsAndHistory(ctx, session.ID, message.Content, financialContext, aiHistory, message.AutonomyMode)
  }
  // Now add the user message to history (since it’s been used in prompt)
  eb.chatHistory.AddMessage(session.ID, "user", message.Content)
  // And if we got a response, add assistant message to history
  if aiResponse != nil {
      eb.chatHistory.AddMessage(session.ID, "assistant", aiResponse.Content)
  }
  ```

  The above ensures the first-turn prompt uses `BuildChatPrompt` (with our fixed single system message containing context), and subsequent turns include the full history. This aligns with how an interactive session should start. If implementing this split is too complex, an alternative is to tweak `ProcessChatWithToolsAndHistory`: change the condition to trigger the prompt builder when history length <= 1 (meaning only the current user message is in history) – and ensure the current user message isn’t double-sent. But the explicit firstTurn branch is clearer.

* *Integrate system prompt in history (optional):* In addition to the above, we can consider logging the system prompt as part of the session’s history so it’s never lost. For instance, when a new session is created (in `CreateSignalRSession` or when first chat arrives), do `eb.chatHistory.AddMessage(sessionID, "system", pb.systemPrompt)` once. This would mean the first user message would see an existing history length of 1 (system), and we could adjust logic to include context. However, since the system prompt is static and our prompt builder always prepends it anew, we might not need to store it in history. It’s acceptable to keep it out of history to avoid repeatedly sending it (we handle it via prompt builder above). The key is just to ensure Claude always gets it in the prompt – which our changes to prompt builder and firstTurn logic accomplish.

* *Ensure context usage every turn:* In the “existing conversation” branch, we pass `financialContext` and `aiHistory` into `ProcessChatWithToolsAndHistory`. Inside that function, we should ensure it doesn’t ignore the context on later turns. The current code only injects the context if `len(chatHistory)==0`. This means on turn 2+, it assumes context from previous turns is still relevant and doesn’t explicitly add a new context message. Given we want to update context every time (sheet might have changed), we should change this logic. We have two options: (1) Always prepend a fresh system message with updated context even in subsequent calls. We can achieve this by inserting one at the start of the `messages` array before sending to Claude. For example, in `ProcessChatWithToolsAndHistory`, after assembling the `messages` list of prior messages and current user, do:

  ```go
  if context != nil {
      // Merge context into a system message
      sysMsg := Message{Role: "system", Content: pb.GetFinancialSystemPrompt()}
      ctxText := pb.buildContextPrompt(context)
      if ctxText != "" {
          sysMsg.Content += "\n\nCurrent Context:\n" + ctxText
      }
      // Prepend sysMsg if not already present
      messages = append([]Message{sysMsg}, messages...)
  }
  ```

  And remove the old `if context != nil && len(chatHistory)==0` block (or adapt it to always prepend system/context regardless of history length). (2) Alternatively, if we logged the initial system+context as a message in history, then it would appear in `chatHistory` for subsequent calls automatically. But that approach complicates updating the context since the sheet can change. So option (1) is preferred: always add a context-infused system message at runtime. This mirrors RooCode’s approach of always giving the AI the current context file; here we’re always giving the current spreadsheet snapshot.

  *Note:* Adding a new system message every turn could lead to many system messages in one conversation, but Anthropic’s API can technically handle it if we supply them as `Messages[]` (though our convertor currently doesn’t support multiple distinct system entries). A safer approach is to have **one** system message that we update or replace. Since we reconstruct `messages` fresh each call, we will always just put one system message at the beginning. So effectively Claude always sees one system message (with the latest context) followed by the chain of user/assistant messages so far.

* *Tool usage and memory:* The rest of `ProcessChatMessage` in `excel_bridge.go` handles AI tool calls and updates session state. Our changes won’t break this; in fact, by keeping conversation memory, the AI can reason with previous tool results as well. We should maintain the logic that after an AI writes to cells, we merge those ranges and set them as the new selection – this ensures the next context build will focus on that area (giving continuity in context). No changes needed there besides confirming it complements our memory update (it does – it’s part of context persistence).

**d. Database Integration (optional):**
If we want **persistent memory beyond in-memory sessions**, implement a simple repository for chat messages. For example, create `ChatRepository` with methods like `SaveMessage(sessionID, role, content)` and `ListMessages(sessionID)` that read/write to a new `chat_messages` table. The table might have columns: id (PK), session\_id (indexed), role, content, created\_at. Hook this in `History.AddMessage`: after adding to `h.sessions` map, call `repo.SaveMessage(...)` in a new goroutine or as a non-blocking operation (since writes could be slightly slower). Similarly, when starting a session, you could pre-load any existing messages from DB (if resuming an old session ID). Given the current architecture doesn’t have user authentication integrated yet (userID is a placeholder “signalr-user”), true cross-session persistence might wait until users are identifiable. So this step can be deferred or used just for logging. The main goal now is to not lose memory during a single continuous session (which our other changes ensure).

## 5. **Frontend Updates (React Excel Add-in)**

On the client side, we need to support persistent chat UI and coordinate with the backend’s memory:

* **Maintain Session ID:** Ensure that the frontend reuses the same `sessionId` for the entire chat session. The add-in should generate a UUID (if not already doing so) when it loads, store it (e.g. in `localStorage` or a global state), and use that for all `/api/chat` and related requests. This way, the backend’s `ExcelSession` and `chatHistory` continue to be used. If the user closes the task pane or reloads the add-in page, we should attempt to retrieve the existing sessionId from localStorage and continue using it (if the backend session expired, the backend will create a new one, but we can still use the same ID to possibly fetch old messages if we saved them locally or if we implement DB persistence).

* **Store Chat Messages on Frontend:** Use a state store (Zustand, as noted in the project) or React context to keep the list of chat messages (user and assistant turns). Every time a new message is sent or received, push it to this state. To persist across page refresh, also save this conversation to `localStorage` (or indexedDB). For example, after each message append, call `localStorage.setItem("gridmate_chat_"+sessionId, JSON.stringify(chatMessages))`. On app startup (or when the Chat panel component mounts), check for an existing stored chat under the current sessionId and load it into state so the UI shows the full history. This ensures the user sees previous messages instead of a blank chat if the panel was reopened. It also means the chat memory is not just backend – the user can scroll up to see earlier answers, enhancing UX.

* **UI for Chat History:** Update the Chat interface component (likely in `excel-addin/src/components/chat/ChatPanel` or similar) to render the list of messages from state. There may already be a `<MessageList>` and message components (the implementation plan outlines such components). Ensure these components correctly differentiate user vs assistant messages (perhaps styling differently). The design from the MVP plan suggests adding features like formula previews, citations, etc. Those can be gradually integrated, but basic text should work after our changes.

* **No Range Selected State:** After implementing full-sheet context by default (from backend), the frontend should no longer block chat when nothing is selected. Confirm that the UI does not require a selection to enable the “Send” button. If there is logic like “disable send if no range selected,” remove it. The context will always be provided (ContextBuilder finds the used range or treats empty sheet accordingly). Update any UI text that said “No range selected” – either remove it or change it to reflect that the AI considers the whole sheet context. This follows the plan to make the AI *always on*, not requiring manual selection.

* **Conversation Reset/Clear:** Optionally, add a “Clear Chat” button that starts a fresh session (generate new sessionId, or call an endpoint to reset). This would let users begin a new unrelated query without manual context from prior conversation. Implementing this would involve clearing frontend state and possibly informing backend (e.g. don’t reuse old sessionId or call `chatHistory.ClearHistory(session)` if we keep same session). This is not strictly required but is a nice-to-have to manage memory like how one might clear Cline’s context and start over.

* **Autonomy Mode and Memory:** The SignalRChatRequest includes an `autonomyMode` field (“auto” vs “ask”, etc.). Ensure the UI sets this appropriately (e.g. if user chose a mode). The backend will handle it (in `ProcessChatWithToolsAndHistory`, tools are enabled/disabled based on mode). Just make sure this flows through the persisted session – which it does via each request. No direct changes needed here, just keep it in mind testing that memory and autonomy don’t conflict (they shouldn’t; autonomy just affects whether AI can auto-apply changes or must ask).

* **Testing Frontend Behavior:** After making these changes, test that: (1) Sending multiple questions in one session yields better answers that reference earlier dialogue (e.g. ask a question, then a follow-up like “Can you explain that in simpler terms?” – the AI should remember “that” from the prior answer). (2) Edits to the spreadsheet are reflected – e.g. “What is the sum of column A?” then after AI answers, change some values in column A and ask again; the AI’s answer should update. (3) Refresh the Excel add-in page in the middle of a conversation – the prior messages should reload in the UI (from localStorage) and if you ask another question, the AI should still have context (assuming the backend session persisted; if not using DB, the safer approach is not to refresh mid-session, but in development it will likely still work if the same sessionId reconnects). This aligns with the persistence seen in tools like RooCode where context isn’t lost on UI reload.

## 6. **Ensuring Alignment with Cline & RooCode**

With the above changes, Gridmate’s memory and prompt handling will closely mirror best practices from Cline and RooCode:

* **Always Rebuilding Context:** Just as Cline’s “memory bank” requires the assistant to read context files at the start of each session (because the AI’s memory resets), our implementation explicitly feeds Claude all necessary context each turn. The AI does not rely on hidden state – it’s all in the prompt. This makes the behavior predictable and transparent, akin to RooCode’s approach of supplying project files and prior conversation to the model every time.

* **Structured Persistence:** We’re effectively treating the combination of `chatHistory` + `FinancialContext` as our AI’s “Memory Bank.” Every turn, the AI will get: *rules*, *spreadsheet state*, and *conversation history*. This comprehensive prompt construction is exactly how these other tools maintain continuity. If the model suggests an action (tool call) in one turn, in the next turn’s prompt it will see its own past suggestion and the outcome (because we include assistant messages and any results in the history). This feedback loop helps it refine actions, much like RooCode feeding back code execution results in subsequent prompts.

* **Robustness and Autonomy:** By persisting conversation state, we also enable more autonomous behavior. For example, if the AI made a plan in earlier steps, it can refer back to that plan in later messages. This is analogous to RooCode remembering a multi-step coding plan. Our system will now support that: the AI’s responses (which may include a proposed plan or intermediate reasoning) stay in memory and remain in Claude’s context until the conversation ends or is cleared.

* **Future Extensions:** With the groundwork laid, we can extend memory persistence further. For instance, implementing vector-based memory (as hinted by “implement vector search for document context” in the roadmap) could allow the AI to retrieve relevant pieces of large documents or prior chats by semantic search instead of sending the entire history. This could complement our approach by keeping prompts concise even as history grows, similar to advanced memory management some coding assistants use. Additionally, once user authentication is in place, we might maintain a long-lived “user memory” (preferences, common questions, etc.) outside of individual sessions – akin to how Cline can be given project background every time.

In summary, this implementation will make Gridmate’s AI far more stateful and context-aware. Each query will carry the full weight of the user’s prior inputs and the spreadsheet’s state, resulting in more coherent multi-turn dialogues. By following the patterns of Cline and RooCode, we ensure that the AI behaves consistently (no forgetting what was said or done moments ago) and can handle complex tasks that span multiple interactions.

**File-by-File Summary of Changes:**

* *backend/internal/services/ai/prompt\_builder.go:* Merge context into one system message in `BuildChatPrompt` and `BuildAnalysisPrompt`.
* *backend/internal/services/ai/service.go:* In `ProcessChatWithToolsAndHistory`, remove or relax the history-length check so context is not skipped on subsequent turns. Always prepend a fresh system/context message for each request (or ensure the caller does).
* *backend/internal/services/excel\_bridge.go:* In `ProcessChatMessage`, adjust order of operations: build prompt (or call AI service) **before** adding the new user message to history, to allow first-turn context injection. Add user message to history afterward (and assistant response after AI returns) to keep memory. Also, consider adding the static system prompt to history at session init (optional).
* *backend/internal/services/chat/history.go:* (If persisting to DB) Extend `AddMessage` to save to a repository/DB. No changes to in-memory logic except possibly increasing `maxSize` if needed.
* *frontend (Excel Add-in React):* Ensure the chat panel maintains state of past messages. Use localStorage to persist this state across reloads. Load any saved messages on startup to restore the conversation. Continue using the same session ID for all messages until user manually resets. Update UI to not require a cell selection to start chatting (the AI now always has context). Test that the chat scrollback appears and new messages append properly in the UI.

By implementing all of the above, Gridmate will have **robust memory and context persistence**: the AI will remember the entire conversation and the spreadsheet’s evolving state, very much like the memory retention mechanisms in Cline and RooCode. These changes will greatly improve Gridmate’s ability to handle follow-up questions, iterative model-building with the AI, and complex multi-step operations without losing track of context.
