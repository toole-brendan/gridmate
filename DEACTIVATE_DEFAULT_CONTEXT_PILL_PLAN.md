# Plan: Deactivate Default Context Pill on Load

## 1. Objective

The goal is to modify the Excel add-in's chat interface so that it starts with no "context pill" active. The context pill, which represents the currently selected range in Excel, should only appear *after* the user explicitly selects a new range *following* the initial load of the add-in.

## 2. Analysis of Current Behavior

The file responsible for this behavior is `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`.

Currently, a `useEffect` hook runs when the component mounts. This hook immediately calls the `updateAvailableMentions()` function. This function performs two actions:
1.  It fetches available mentions (like `@Sheet1`).
2.  It fetches the currently selected cell range and uses `setActiveContext()` to display it as a context pill.

This second action is what causes the pill to be active on load.

## 3. Proposed Solution

The most robust solution is to separate the logic for the initial load from the logic for subsequent selection changes. We will create a new function specifically for the initial load that populates the necessary data *without* activating the context pill.

## 4. Implementation Steps

The following changes will be made within `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`:

### Step 1: Create a New Function for Initialization

We will introduce a new function, `initializeContextAndMentions`, which will run only once on load. This function will get the smart context from Excel but will only use it to set the available `@` mentions, explicitly setting the active context pill to an empty array.

```typescript
// To be added inside the RefactoredChatInterface component

const initializeContextAndMentions = useCallback(async () => {
  addDebugLog('Initializing context and mentions on load...');
  try {
    const context = await ExcelService.getInstance().getSmartContext();
    const mentions: MentionItem[] = [];
    
    if (context.worksheet) {
      mentions.push({ 
        id: `sheet-${context.worksheet}`, 
        type: 'sheet', 
        label: context.worksheet, 
        value: `@${context.worksheet}`, 
        description: 'Current worksheet' 
      });
    }
    
    setAvailableMentions(mentions);

    // Explicitly set the active context to empty on initial load
    setActiveContext([]); 

  } catch (error) {
    addDebugLog(`Failed to initialize context: ${error}`, 'error');
  }
}, [addDebugLog]);
```

### Step 2: Modify the `useEffect` Hook for Component Mount

We will change the main `useEffect` hook to call our new `initializeContextAndMentions` function instead of `updateAvailableMentions`.

**Current Code:**
```typescript
useEffect(() => {
  addDebugLog('Initializing selection change listener...');
  const setupListener = async () => {
    // ... listener setup logic
  };
  setupListener();
  updateAvailableMentions(); // This is the call that will be changed
}, [addDebugLog, updateAvailableMentions]);
```

**Proposed New Code:**
```typescript
useEffect(() => {
  addDebugLog('Initializing selection change listener...');
  const setupListener = async () => {
    try {
      await Excel.run(async (context) => {
        const worksheet = context.workbook.worksheets.getActiveWorksheet();
        worksheet.onSelectionChanged.add(async () => {
          setRawSelection(`selection_${Date.now()}`);
        });
        await context.sync();
        addDebugLog('Selection change listener registered.', 'success');
      });
    } catch (error) {
      addDebugLog(`Failed to set up selection listener: ${error}`, 'error');
    }
  };
  
  setupListener();
  initializeContextAndMentions(); // Use the new initialization function

}, [addDebugLog, initializeContextAndMentions]); // Update dependencies
```
*Note: The dependency array for the `useEffect` will also be updated to include `initializeContextAndMentions`.*

### Step 3: No Other Changes Needed

The existing `useEffect` hook that listens for changes to `debouncedSelection` will remain untouched. It will continue to call `updateAvailableMentions` whenever the user changes their selection. This is the desired behavior, as this function correctly sets the context pill for all subsequent user actions.

By implementing this plan, we will achieve the desired outcome: the add-in will load with a clean slate, and the context pill will only appear when the user interacts with the spreadsheet.
