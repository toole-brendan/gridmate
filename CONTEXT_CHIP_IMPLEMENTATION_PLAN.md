# Implementation Plan: Context-Aware Suggestion Chips & UI Enhancements

## 1. Ultimate Goal

The goal is to transform the static suggestion "chips" in the chat interface into dynamic, interactive components that reflect the user's real-time selection in Excel. When a user sends a message, this selection context (worksheet and range) will be automatically included in the prompt sent to the AI, enabling more precise and context-aware responses. If no cells are selected, the chips will be blank, and no context will be added.

Additionally, we will improve the Autonomy Selector dropdown to ensure it is always fully visible regardless of its position in the viewport.

---

## 2. Frontend Implementation (`excel-addin`)

### Step 2.1: Enable Real-time Context Updates

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
*   **Objective:** Modify the component to listen for live selection changes from Excel instead of relying on a timed interval.
*   **Actions:**
    1.  Implement a `useEffect` hook to register an event handler for `Office.EventType.DocumentSelectionChanged`.
    2.  The handler will call the existing `updateAvailableMentions` function on every selection change.
    3.  Remove the current 30-second `setInterval` to prevent redundant updates.

### Step 2.2: Create a Reusable `ContextChip` Component

*   **File:** Create a new file at `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/common/ContextChip.tsx`.
*   **Objective:** Build a dedicated component for displaying context information.
*   **Actions:**
    1.  Define a new React component named `ContextChip`.
    2.  The component will accept `label` (e.g., "Sheet") and `value` (e.g., "Sheet1") as props.
    3.  It will render a styled `div` to display the label and value.
    4.  The component will render nothing if the `value` prop is empty, gracefully handling cases with no selection.

### Step 2.3: Update the Main Chat UI

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterface.tsx`
*   **Objective:** Integrate the new context chips and make the initial suggestions interactive.
*   **Actions:**
    1.  Import the new `ContextChip` component.
    2.  Pass the `activeContext` state from the parent `EnhancedChatInterfaceWithSignalR` component down as props.
    3.  In the JSX block that renders when `messages.length === 0` (the welcome screen):
        *   Replace the static "Try asking:" text with two instances of the `ContextChip` component to display the live sheet and selection range.
        *   Convert the plain text suggestions (e.g., `"What's the formula in this cell?"`) into interactive `<button>` elements.
        *   Add an `onClick` handler to each button that calls the `handleSendMessage` function, passing the suggestion text as the message.

### Step 2.4: Fix Autonomy Selector Dropdown Position

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedAutonomySelector.tsx`
*   **Objective:** Make the dropdown menu auto-adjust its position to remain fully visible within the viewport.
*   **Actions:**
    1.  Add logic to the component to detect its position relative to the viewport when it opens.
    2.  Based on the available space, dynamically apply CSS classes to make the menu open upwards (`bottom-full`) or downwards (`top-full`).
    3.  This will likely involve using the `useRef` hook to get the element's dimensions and position, and a `useState` and `useEffect` to calculate and apply the correct positioning class.

---

## 3. Backend Implementation (`backend`)

### Step 3.1: Enhance the AI Prompt Builder

*   **File:** `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`
*   **Objective:** Ensure the Excel selection context is always included in the AI prompt when available.
*   **Actions:**
    1.  Locate the `buildContextPrompt` function.
    2.  Modify the conditional logic for including the `selected_range`.
    3.  Instead of checking if the range contains values (`len(context.CellValues) > 0`), the new logic will check if the `SelectedRange` string itself is not empty.
    4.  When a selection exists, format the context and prepend it to the system prompt as follows:
        ```xml
        <context>
          <sheet>{sheetName}</sheet>
          <selection>{rangeAddress}</selection>
        </context>
        ```
