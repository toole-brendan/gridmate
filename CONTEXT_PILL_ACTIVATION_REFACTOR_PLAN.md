# Refactoring Plan: Context Pill Activation

**Objective:** Modify the context pill feature to activate only when the user explicitly clicks a button in the chat interface, instead of activating automatically on cell selection.

## 1. Understand the Current Implementation

- **State Management:** The `RefactoredChatInterface` component (`excel-addin/src/components/chat/RefactoredChatInterface.tsx`) holds the key state variables:
    - `activeContext`: An array of `ContextItem` objects representing the selected range or other context.
    - `isContextEnabled`: A boolean that controls whether the context is active and sent with messages.
- **Event Handling:** An `onSelectionChanged` event listener is registered in a `useEffect` hook within `RefactoredChatInterface.tsx`.
- **Automatic Activation:** When the selection changes, the `updateAvailableMentions` function is called. This function updates the `activeContext` and, crucially, sets `isContextEnabled` to `true`, which immediately activates the context pill UI.

## 2. Proposed Changes

The goal is to decouple the background tracking of cell selection from the UI's active state. The selection should always be tracked, but the context pill should only appear "enabled" after a user clicks a dedicated button.

### Step 1: Introduce New State for Manual Activation

In `excel-addin/src/components/chat/RefactoredChatInterface.tsx`, we will introduce a new state variable to track whether the user has manually activated the context feature.

```typescript
// excel-addin/src/components/chat/RefactoredChatInterface.tsx

// Add this new state
const [isContextActivatedByUser, setIsContextActivatedByUser] = useState(false);
```

### Step 2: Modify Selection Handling Logic

We will adjust the `updateAvailableMentions` and `initializeContextAndMentions` functions to update the `activeContext` state but *not* automatically enable the context pill.

- **File to Modify:** `excel-addin/src/components/chat/RefactoredChatInterface.tsx`
- **Action:** Remove the line `setIsContextEnabled(true);` from the `updateAvailableMentions` function.

**Current Code (`updateAvailableMentions`):**
```typescript
// ...
      setActiveContext(contextItems);
      // Automatically enable context when a real selection is made
      if (contextItems.length > 0 && contextItems[0].id !== 'no-selection') {
        setIsContextEnabled(true); // <--- THIS LINE WILL BE REMOVED
      }
// ...
```

### Step 3: Create a Dedicated Activation Button/UI

The user needs a clear way to "turn on" the context. We will modify the `ContextPillsContainer` to show a clear "Activate Context" button when the context has been captured but not yet activated by the user.

- **File to Modify:** `excel-addin/src/components/chat/mentions/ContextPill.tsx`
- **Action:** Update `ContextPillsContainer` to accept the `isContextActivatedByUser` state and an activation handler. It will render either the pills or an activation button.

**Proposed `ContextPillsContainer` Logic:**
```typescript
// excel-addin/src/components/chat/mentions/ContextPill.tsx

export const ContextPillsContainer: React.FC<ContextPillsContainerProps> = ({
  items,
  onRemove,
  onContextToggle, // This will now be our activation handler
  isContextEnabled, // This will represent if the user has activated it
  className = ''
}) => {
  if (items.length === 0 || items[0].id === 'no-selection') return null;

  // If context is NOT enabled by the user, show an activation button
  if (!isContextEnabled) {
    return (
      <button onClick={onContextToggle} className="/* styles for activation button */">
        Use Current Selection as Context
      </button>
    );
  }
  
  // If context IS enabled, show the pills as before
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map(item => (
        <ContextPill
          key={item.id}
          item={item}
          onRemove={onRemove}
          // The toggle is now for the container, not individual pills
          onClick={undefined} 
          isEnabled={true} // Pills are only shown when enabled
        />
      ))}
    </div>
  );
}
```

### Step 4: Update the Parent Component Logic

Finally, we'll wire up the new state and handlers in `RefactoredChatInterface.tsx`.

- **File to Modify:** `excel-addin/src/components/chat/RefactoredChatInterface.tsx`
- **Action:**
    1.  The `isContextEnabled` state will now be controlled by the user activation.
    2.  The `handleContextClick` function will be simplified to be the single source of activation.
    3.  Pass the new state down to `EnhancedChatInterface`.

**Updated Logic in `RefactoredChatInterface.tsx`:**
```typescript
// excel-addin/src/components/chat/RefactoredChatInterface.tsx

// ... state declarations
const [isContextEnabled, setIsContextEnabled] = useState(false); // Default to false

// ...

// This function becomes the explicit activation handler
const handleActivateContext = () => {
  setIsContextEnabled(true);
  addDebugLog('Context explicitly activated by user.', 'success');
};

// This function handles sending messages
const handleSendMessage = useCallback(async () => {
    // ...
    // The `isContextEnabled` check remains the same, but its value is now user-controlled
    const excelContext = isContextEnabled ? await ExcelService.getInstance().getSmartContext() : null;
    // ...
}, [/* dependencies */, isContextEnabled]);


// ... in the JSX return
<EnhancedChatInterface
    // ... other props
    isContextEnabled={isContextEnabled}
    onContextToggle={handleActivateContext} // Pass the new handler
    // ... other props
/>
```

## 3. Summary of Files to be Modified

1.  **`excel-addin/src/components/chat/RefactoredChatInterface.tsx`**:
    -   Remove automatic `setIsContextEnabled(true)`.
    -   Add `isContextActivatedByUser` state (or reuse `isContextEnabled` with a new default of `false`).
    -   Create a new handler `handleActivateContext` to set the activation state to `true`.
    -   Pass the new state and handler to `EnhancedChatInterface`.

2.  **`excel-addin/src/components/chat/mentions/ContextPill.tsx`**:
    -   Update `ContextPillsContainer` to display an "Activate" button when context is available but not yet activated by the user.
    -   When activated, it should render the context pills as it does now.

This plan ensures that cell selection is continuously tracked in the background while giving the user explicit control over when to activate and use that context in the chat.
