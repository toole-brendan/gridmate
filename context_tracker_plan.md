# Implementation Plan: Context Token Counter for Gridmate AI (Claude 3.5 Assistant)

## 1. Backend Logic for Counting Tokens

**Goal:** Track how many tokens are sent to and received from Claude 3.5 for each chat session in real time. We will implement logic to count tokens on the **backend** (server) as chat messages are processed.

* **Counting Input Tokens:** Before sending a user’s query (plus any prior conversation context and system prompt) to Claude, compute the number of tokens in the prompt. Ideally, use Anthropic’s official token counting capabilities for accuracy. Anthropic provides a token counting API that accepts the same message format and returns the token count. This endpoint supports Claude 3.5 models, so we can call it with the assembled message list to get the exact **input token count**. If calling an API for this is too slow or complex, we can use a local tokenizer library or an approximation (e.g. Anthropic’s older tokenizer or a heuristic like \~4 characters ≈ 1 token) as a fallback. However, using Anthropic’s provided methods ensures accuracy.

* **Counting Output Tokens:** After Claude returns a response, determine the number of tokens in the assistant’s reply. If the Anthropic API or SDK returns usage metadata (similar to OpenAI’s `usage` field), we can extract the **output token count** directly. Otherwise, we can count the tokens in the returned text using the same method as above (for example, call the token counter on the assistant’s content string, or approximate by splitting words/characters). In streaming mode, we may accumulate output tokens incrementally as chunks arrive; the final count will be computed once the message is complete.

* **Total Tokens:** Compute the **total** tokens used in the conversation context by summing the input and output tokens for the latest turn. This represents how much of the model’s context window is currently occupied. For example, if the prompt was 1,000 tokens and the reply was 600 tokens, total context usage becomes \~1,600 tokens for that session. We will use this to update the progress meter (detailed below).

All the above logic will be encapsulated in the backend. We can implement a helper function (e.g. `countTokens(messages)`) in the AI service module to get the token count for a given set of messages. This function might call Anthropic’s `count_tokens` API or use a library function. The main point is to **invoke it for each chat request** – once for the prompt (before sending to Claude) and once for the result (after receiving Claude’s reply). The resulting counts will be packaged and forwarded to the client.

## 2. Model Configuration for Max Token Limits

**Goal:** The system needs to know the maximum context window for the model (Claude 3.5) in order to display a “X / Y tokens” indicator. We will introduce a configuration mapping for model token limits.

* **Define Max Tokens for Claude 3.5:** According to Anthropic’s specs (and as seen in Cline’s UI), Claude 3.5’s context window is about **200,000 tokens**. We will codify this in the code. For example, in the backend config (perhaps in `internal/config/config.go` or a constants file), add an entry for Claude 3.5:

  ```go
  modelContextLimits := map[string]int{
      "claude-3.5": 200000,
  }
  ```

  If the model name includes version details (e.g. `claude-3-5-sonnet-20241022`), we can match it to a key or parse the name to identify it as a Claude 3.5 family model. This `MaxContextTokens` value (200k) will be used as the denominator in our counter.

* **Extendable Structure:** Although we’re focusing on Claude 3.5 now, we will structure this so it’s easy to add other models in the future. For instance, the config could be generalized (e.g. a `ModelConfig` struct with fields like `MaxContextTokens`) and include entries for other models as needed. For now, we’ll store the Claude 3.5 limit and use that in calculations.

* **Accessing the Config:** Ensure the AI service or provider can retrieve the max token limit for the current model. For example, if the AI provider interface or service knows the model in use (from environment `AI_MODEL` or similar), it can look up the limit from the map. This value (200,000) will be sent to the frontend so the UI can display the “/ 200,000” part of the counter.

## 3. Pipeline Integration in Chat Workflow

**Goal:** Integrate token counting into each chat message cycle so that usage is tracked and sent back with the assistant’s response. The high-level flow will be:

1. **User Message Received:** The Excel add-in sends a `chat_message` over WebSocket with the user’s prompt and a session ID/context. On the backend, the WebSocket handler (e.g. in `internal/services/excel_bridge.go` or similar) invokes the AI service to process this message. We modify this processing flow to include token counting.
2. **Prepare Prompt & Count Input Tokens:** The AI service (e.g. `internal/services/ai/service.go`) will compile the conversation context for Claude. This likely includes the system prompt and the conversation history (previous user queries and Claude’s answers) plus the new user message. Once this prompt is assembled into the format required by Claude’s API, **count the tokens in it** before sending to the model. For example:

   ```go
   inputTokens := countTokens(promptMessages) // promptMessages is the array of messages for Claude
   ```

   This yields the number of input tokens (↑) for this request.
3. **Call Claude API:** Next, send the prompt to the Claude 3.5 model (via Anthropic API). This happens either through the Anthropic SDK or a direct HTTP request. The model will process up to the 200k-token context window, so our prompt should be within that limit (the counter helps ensure this).
4. **Receive Response & Count Output Tokens:** When Claude’s reply is received, gather the complete assistant message content. If streaming, accumulate the text until completion. Then **count the output tokens**. For example:

   ```go
   outputTokens := countTokens([assistantMessage])
   ```

   where `[assistantMessage]` is the content of Claude’s answer. This gives the number of tokens in the AI’s reply (↓).
5. **Calculate Total and Package Usage:** Add the input and output counts to get total tokens used in this round. In many cases, “total context tokens used” will be roughly the prompt tokens plus the latest answer. (If the conversation is multi-turn, the prompt tokens already include previous turns, so this total effectively represents the entire context size in use.) Create a token usage object/struct, for example:

   ```go
   usage := TokenUsage{
       Input:  inputTokens,
       Output: outputTokens,
       Total:  inputTokens + outputTokens,
       Max:    modelContextLimits["claude-3.5"],  // 200000
   }
   ```

   This will later be serialized to JSON.
6. **Attach to Response Message:** Modify the server’s response payload to include this token usage info. The server currently sends a WebSocket message of type `chat_response` with fields like `content` (the assistant’s text), and possibly `suggestions` or `actions`. We will extend this to include the token counts. For example, the `chat_response` JSON could have a section:

   ```json
   "tokenUsage": { "input": 1000, "output": 600, "total": 1600, "max": 200000 }
   ```

   This might be added to the `data` object in the message. (We must adjust the data model on both backend and frontend to handle this new field.)
7. **Maintain Session State (if needed):** If the backend maintains a session context object for the conversation, we might store the latest token counts there as well. However, since we can recalc totals each time from the messages, it may not be necessary to persist it separately. What’s important is to reset or initialize counts when a new session starts (e.g. if the user clears the chat or opens a new sheet, the counter should reset to 0).

**Code Touchpoints:** In code, the above will involve updates to the AI service pipeline. For instance:

* `internal/services/ai/service.go` – in the function that processes a chat message (e.g. `ProcessChatMessage`), add the calls to `countTokens` before and after the Claude API call, and include the results in the returned response structure.
* `internal/services/ai/anthropic.go` – if low-level API call is handled here, ensure we can either get usage info or expose the prompt for counting. We might update the Anthropic client wrapper to facilitate token counting (e.g. a method to count tokens using Anthropic’s API before sending the prompt).
* `internal/services/excel_bridge.go` or wherever the WebSocket response is constructed – include the `tokenUsage` fields when broadcasting the `chat_response` message to the client.

By integrating at these points, every time the user sends a message and gets a reply, the backend will compute the token usage and send it along. This keeps the token counter updated **per session in real time**, as requested.

## 4. Frontend UI Changes for Token Counter

**Goal:** Display a live token counter in the Excel add-in’s UI, similar to Cline/Roo Code’s “Context: 0 / 200,000 tokens” meter. The frontend will be updated to present the input, output, and total token usage to the user, updating with each message.

* **UI Placement:** We will add a **context token meter** to the Gridmate add-in panel. A good spot is near the top of the chat interface, so it’s always visible. For example, we can place it directly beneath the existing Excel context bar (which shows workbook, sheet, and selected range) in the add-in UI. This way, as the user interacts with the chat, they can immediately see how much of Claude’s context window is used.

* **Display Format:** The meter will show something like: **“Context: X / 200,000 tokens (↑A, ↓B)”**, where:

  * **X** is the current total tokens used in context,
  * **200,000** is the max context size for Claude 3.5,
  * **↑A** is the count of input tokens (user prompt + context) and **↓B** is the count of output tokens (Claude’s answer) for the latest exchange.
    For instance, after a reply, it might read: *“Context: 1,600 / 200,000 tokens (↑1,000, ↓600)”*. This mirrors the style of Cline’s progress bar readout.

* **Progress Bar:** In addition to numeric text, we can include a visual progress bar to illustrate usage. The bar would fill proportionally to the percentage of the context window used. For example, at 1,600/200,000 tokens, it would be less than 1% filled. This gives an immediate sense of how close the session is to the limit. We can implement this with a simple `<div>` element with a colored portion based on `X/max`. (Styling: perhaps a grey background bar with a blue or green filled portion for used tokens.)

* **Icons and Styling:** To clearly distinguish input vs output, we can add small arrow icons or labels next to the numbers A and B. Cline uses an up arrow “↑” for prompt tokens and down arrow “↓” for response tokens. We can use a similar convention. For example, using an icon library (the project already uses Lucide icons in ExcelAddinApp), we might incorporate an `ArrowUp` and `ArrowDown` icon, or simply text arrows, before the A and B values. The styling will be kept subtle (small font, perhaps grey text for the counts) so it doesn’t distract, but still noticeable. We will also ensure the text “Context: X / Y tokens” is easily readable (maybe a medium-weight font in the same style as the context bar text).

* **Updating the UI State:** We’ll extend the React state in the Excel add-in to hold token usage. For example, in `ExcelAddinApp.tsx` (or whichever component manages the chat state), add:

  ```typescript
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0, total: 0, max: 200000 });
  ```

  Initially, all counts are 0 (so it would show “Context: 0 / 200,000 tokens”). When a `chat_response` arrives from the backend, the front-end will parse the `tokenUsage` field. We will update the WebSocket message handler (in the same component) to do:

  ```typescript
  if (data.type === 'chat_response') {
      // ... existing message handling ...
      if (data.tokenUsage) {
          setTokenUsage(data.tokenUsage);
      }
  }
  ```

  This will trigger a re-render of the component with the new counts.

* **Rendering the Meter:** We will create a small UI element for the token counter. This could be a new React component, e.g. `<TokenCounter>` or simply JSX inside `ExcelAddinApp`. For clarity, a separate component (in say `excel-addin/src/components/TokenCounter.tsx`) could be created. It would take `tokenUsage` as props and render the text and progress bar. For example:

  ```jsx
  <div className="context-meter">
    <span>Context: {tokenUsage.total} / {tokenUsage.max} tokens</span>
    <span className="token-breakdown">(&uarr; {tokenUsage.input}, &darr; {tokenUsage.output})</span>
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${(tokenUsage.total / tokenUsage.max) * 100}%` }} />
    </div>
  </div>
  ```

  Here `&uarr;` and `&darr;` are up/down arrows (or we replace those with icon components). We’ll apply CSS (or Tailwind classes if available) to style the meter: maybe a small font for the breakdown, and a thin progress bar line. The progress bar could be just a few pixels tall, spanning the width of the add-in pane.

* **Frontend Files to Update:** Primarily, **`ExcelAddinApp.tsx`** (or the main chat interface component) will be updated to include the token counter. The existing UI is a flex column with the header and chat; we will insert our meter in the layout. Also, if there is a dedicated ChatInterface component (e.g. `ChatInterface.tsx` or similar), we might place the meter at the top of the chat area there. We should ensure the meter remains fixed (not scrolling away with chat messages). Since the ExcelAddinApp wraps the ChatInterface, adding it in ExcelAddinApp above the chat message list is a good approach. We may also add a new CSS entry in the add-in’s stylesheet for the progress bar styling if needed.

With these changes, the user will see a live-updating token count. Each time they send a message and get a response, the counter animates or updates to show the latest usage. This mirrors the behavior in tools like Cline, where the progress bar makes the **“invisible limit visible”**, allowing users to monitor context usage and avoid hitting the 200k limit unexpectedly.

## 5. Code Architecture and File Modifications

To summarize, here are the key code changes and files involved in implementing the context token counter:

* **Backend – Token Counting Implementation:**

  * *File:* `internal/services/ai/anthropic.go` (Anthropic Claude provider) – Enhance this to support token counting. If using the Anthropic SDK, utilize any available function or API call for counting tokens. Otherwise, prepare a function to send a count request to Anthropic’s API (e.g., `POST /v1/claude/tokens` with the message content) and parse the response for `input_tokens`. This file will also be responsible for calling the count before `Complete` requests and possibly storing the result.
  * *File:* `internal/services/ai/service.go` (AI service orchestration) – Integrate counting into the chat pipeline. In the method that handles an incoming user message (e.g. `ProcessChatMessage` or similar), do:

    1. Assemble the conversation context messages.
    2. Call a token count helper (which might be a method of the AI provider or a utility) to get `inputTokens`.
    3. Invoke the Claude completion API to get the assistant’s reply.
    4. Count tokens in the reply (`outputTokens`).
    5. Construct a `TokenUsage` struct (input, output, total, max) and attach it to the response.
    6. Return or pass this info along with the assistant’s content.
  * *File:* `internal/services/excel_bridge.go` (WebSocket bridge between AI service and Excel add-in) – When forming the `chat_response` message to send back to the client, include the token usage. For example, if currently it does:

    ```go
    respMsg := map[string]interface{}{
        "type": "chat_response",
        "data": { "content": response.Content, ... }
    }
    ```

    we will add `"tokenUsage": usage` inside the data. This ensures the JSON sent over WS contains the token counts. (If the backend uses a typed struct for responses, then extend that struct to have a `TokenUsage` field).
  * *File:* `internal/config/config.go` – Add configuration for model token limits. This could be a constant or map as discussed. For instance, define `const ClaudeMaxTokens = 200000` or `var ModelMaxContext = map[string]int{ "claude-3.5": 200000 }`. This will be referenced when populating the `max` field of `TokenUsage`. Optionally, make it configurable via an environment variable if needed (but a constant is fine for now since Claude’s limit is known).

* **Frontend – UI and State Updates:**

  * *File:* `excel-addin/src/components/ExcelAddinApp.tsx` (main React component for the Excel taskpane) – Modify this to handle the token counter:

    * Import or define a new `TokenCounter` component if creating one.
    * Add a state hook for token usage (e.g. `useState` as shown above).
    * In the WebSocket message handler (`ws.onmessage` or the `handleServerMessage` function), capture the incoming `data.tokenUsage` and call `setTokenUsage` with it.
    * Insert the `<TokenCounter>` (or equivalent JSX) into the JSX return. Likely, add a new `<div>` above the chat messages list. This `<div>` will contain the text “Context: ...” and the progress bar. Use appropriate styling (perhaps classes like `bg-gray-100 text-xs p-2` to match the context bar style). For example:

      ```jsx
      <div className="bg-gray-100 px-3 py-2 text-xs border-b flex justify-between">
        <div>Context: <strong>{tokenUsage.total}</strong> / {tokenUsage.max} tokens</div>
        <div>(↑ {tokenUsage.input}, ↓ {tokenUsage.output})</div>
      </div>
      ```

      This would produce a bar similar to Cline’s, with the numeric usage and arrows. If implementing a graphical progress bar, include that inside this div as well (perhaps underneath or as part of the background of the text).
  * *File:* `excel-addin/src/components/TokenCounter.tsx` (new, optional) – If we choose to create a dedicated component for clarity, we implement it here. It would accept props for input, output, total, max and render the JSX as described. This helps keep `ExcelAddinApp.tsx` cleaner. We would then use `<TokenCounter {...tokenUsage} />` in the app component’s render.
  * *File:* `excel-addin/src/components/chat/ChatInterface.tsx` (or similar chat UI component) – We might not need to modify the chat interface logic itself, but ensure that adding the meter does not disrupt the layout. If the chat interface component is responsible for the input box and message list only, then adding the meter in the parent (ExcelAddinApp) is sufficient. We just need to ensure styling (maybe the chat messages container gets an adjusted height so that it doesn’t overflow when the new bar appears).
  * *Styles:* If there is a CSS or Tailwind config, add styles for the progress bar (e.g. a specific height, background color, etc.). For simplicity, we can use inline styles or existing utility classes.

By touching these files, we connect the entire flow: when a user types a message, the backend counts tokens and sends the counts back, and the frontend state updates to display the new **context usage meter**.

Throughout implementation, we’ll test this by simulating conversations and verifying that:

* The counter starts at 0 and increases appropriately with each interaction.
* The “max tokens” value displays correctly as 200,000 for Claude 3.5.
* Input and output counts (↑ and ↓) match the size of prompts and responses. (We can cross-check small examples – e.g., a short user prompt \~10 tokens and a short answer \~15 tokens should reflect as such.)
* The progress bar fills only slightly for small token counts and approaches full as we near the limit. This gives users a visual warning as they approach \~200k. In line with best practices, users might start a new session if the bar gets close to full to avoid hitting the limit.

In conclusion, this plan adds a **visible token counter** to Gridmate’s Claude assistant, closely mirroring the functionality seen in Cline and Roo Code. Users will see a “Context: X / 200,000 tokens” indicator with separate input/output token counts, updated in real time after each message. This enhances transparency and helps users manage Claude’s large context window proactively, preventing context overflow and improving the overall user experience.

**Sources:** The design is informed by Cline’s context window progress bar announcement (showing input/output token counts and a 200k limit for Claude 3.5) and Anthropic’s documentation on token counting for Claude models, which we will leverage for implementation.
