# Context Pill Performance Fix Implementation Plan

## 1. Problem Statement

The application experiences significant performance degradation, becoming slow and unresponsive, when the user rapidly changes cell selections in Excel or toggles the "Context" pill on and off. This can lead to the application crashing. The root cause is excessive and inefficient handling of the `DocumentSelectionChanged` event provided by the Office.js API within the `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx` file.

## 2. Root Cause Analysis

The current implementation in `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx` attaches an event handler directly to the `Office.EventType.DocumentSelectionChanged` event. This event can fire at a very high frequency, especially when a user is dragging to select a range of cells.

Each time the event fires, the handler executes the following sequence:
1.  Calls `ExcelService.getInstance().getSmartContext()`, which is an `async` method that interacts with the Excel host application.
2.  Processes the result.
3.  Calls the `setActiveContext` state setter from React.

This leads to a cascade of problems:
-   **API Overload**: Numerous `async` calls are made to the Office.js API in a short period, overwhelming the single-threaded JavaScript environment.
-   **Excessive Re-renders**: The component's state is updated repeatedly, triggering frequent and expensive re-renders of the `EnhancedChatInterface` and its children.
-   **Race Conditions**: Multiple `async` operations might be in-flight simultaneously, potentially leading to inconsistent state updates.

Toggling the context pill exacerbates the issue by causing additional state updates (`isContextEnabled`) and re-renders, which collide with the updates from the selection event handler, creating a bottleneck.

The issue is **not** related to the Anthropic API, which is only invoked when a user explicitly sends a message. The performance bottleneck is entirely on the client-side, within the Excel Add-in's interaction with the Office.js API.

## 3. Proposed Solution

The most effective solution is to **debounce** the event handler for `DocumentSelectionChanged`. Debouncing will ensure that the expensive logic inside the handler only runs *after* the user has stopped changing their selection for a brief, specified period (e.g., 300 milliseconds).

This will dramatically reduce the number of calls to `getSmartContext` and the subsequent state updates, solving the performance bottleneck.

We will implement this by creating a reusable `useDebounce` hook and applying it to the value derived from the selection change event.

## 4. Implementation Details

The plan involves creating one new file for the reusable hook and modifying one existing file.

### Step 1: Create a Reusable `useDebounce` Hook

This hook will take a value and a delay, and only return the updated value after the specified delay has passed without the source value changing.

**File to Create**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDebounce.ts`

```typescript
import { useState, useEffect } from 'react';

/**
 * A custom hook to debounce a value.
 *
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent the debounced value from updating if the value is changed
      // within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-call effect if value or delay changes
  );

  return debouncedValue;
}
```

### Step 2: Refactor the `EnhancedChatInterfaceWithSignalR` Component

We will modify the main component to use our new `useDebounce` hook to manage selection changes gracefully.

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

**Refactoring Logic**:

1.  Introduce a new state variable, `rawSelection`, to hold the immediate, unprocessed selection address from the event handler.
2.  The `DocumentSelectionChanged` event handler will now *only* update this `rawSelection` state, making it extremely fast and lightweight.
3.  Use the `useDebounce` hook to create a `debouncedSelection` value from `rawSelection`.
4.  Use a `useEffect` hook that listens to changes in `debouncedSelection`. This effect will contain the expensive logic: calling `getSmartContext` and updating the `activeContext`.
5.  Ensure the Office.js event handler is properly cleaned up on component unmount.

**Code Changes (Illustrative Snippets):**

```typescript
// excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx

// ... other imports
import { useDebounce } from '../../hooks/useDebounce'; // <-- IMPORT THE NEW HOOK

// ... inside the component function

const [isContextEnabled, setIsContextEnabled] = useState(true);
const [activeContext, setActiveContext] = useState<ContextItem[]>([]);
const [excelContext, setExcelContext] = useState<ExcelContext | null>(null);

// 1. Add new state for the raw, high-frequency selection changes
const [rawSelection, setRawSelection] = useState<string | null>(null);

// 2. Create a debounced version of the raw selection
const debouncedSelection = useDebounce(rawSelection, 300); // 300ms delay

// ...

// 3. This effect now runs ONLY when the selection event fires. It is now very cheap.
useEffect(() => {
  const registerSelectionHandler = async () => {
    try {
      await Excel.run(async (context) => {
        const document = context.document;
        const eventResult = document.onSelectionChanged.add(async (args) => {
          // This handler is now extremely fast.
          // It just gets the address and updates state.
          setRawSelection(args.address);
        });
        await context.sync();

        // Return a cleanup function for when the component unmounts
        return async () => {
          await Excel.run(async (ctx) => {
            eventResult.remove();
            await ctx.sync();
          });
        };
      });
    } catch (error) {
      console.error("Error registering selection handler:", error);
    }
  };

  const cleanupPromise = registerSelectionHandler();

  return () => {
    cleanupPromise.then(cleanup => cleanup && cleanup());
  };
}, []);


// 4. This new effect runs only when the debounced selection value changes.
// All expensive logic is moved here.
useEffect(() => {
  const updateContext = async () => {
    // Only run if there's a selection and it's not an empty string
    if (debouncedSelection) {
      try {
        const smartContext = await ExcelService.getInstance().getSmartContext();
        setExcelContext(smartContext);

        if (smartContext.selectedRange) {
          setActiveContext([{
            id: 'selection',
            type: 'selection',
            label: 'Context',
            value: smartContext.selectedRange,
          }]);
        } else {
          setActiveContext([]);
        }
      } catch (error) {
        console.error("Error getting smart context:", error);
        setActiveContext([]);
      }
    }
  };

  updateContext();
}, [debouncedSelection]); // <-- This is the key: it only runs after the user stops selecting

// ... rest of the component
```

## 5. Verification Plan

1.  **Run the Application**: Start the application using `npm run dev`.
2.  **Test Selection**: Open Excel and rapidly select different cells and ranges by dragging the mouse. The "Context" pill should **not** update in real-time while dragging. It should only update ~300ms *after* the selection is complete.
3.  **Test Responsiveness**: The UI should remain perfectly smooth and responsive during rapid selection.
4.  **Test Toggling**: Rapidly click the "Context" pill to toggle it on and off. The application should not lag or crash. The UI should respond instantly.
5.  **Test Functionality**: After the selection has settled and the pill has updated, send a chat message with context enabled. Verify that the correct, final selection context is sent to the backend and used by the AI.

By implementing this plan, the application's performance and stability will be drastically improved, providing a much smoother user experience.
