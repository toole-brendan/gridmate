# Remove Recently Edited Context Pills

## Issue Summary

The Excel add-in currently auto-populates "recently edited" context pills (edit and change pills) that appear alongside the user's selected range context pill. These auto-populated pills are causing UI clutter and should be completely removed, leaving only the user's manually selected range as context.

## Current Implementation

The auto-population of context pills happens in `RefactoredChatInterface.tsx` (lines 150-205) where the system automatically adds:
- Up to 3 recent AI edit pills (type: 'edit')
- Up to 2 significant change pills (type: 'change')

These are added to the `activeContext` array alongside the user's selected range.

## The Fix

Remove the code that auto-populates edit and change context pills in the `updateAvailableMentions` function.

### File: `/workspace/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

**Lines 151-205** - Remove or comment out the auto-population logic:

```tsx
// Remove this entire block:
// Auto-add recent AI edits as context pills
if (context.recentEdits && context.recentEdits.length > 0) {
  // Get the most recent 3 AI edits
  const recentAIEdits = context.recentEdits
    .filter(edit => edit.source === 'ai')
    .slice(-3);
  
  for (const edit of recentAIEdits) {
    const editLabel = `Recent edit: ${edit.range}`;
    contextItems.push({
      id: `edit-${edit.timestamp}`,
      type: 'edit',
      label: editLabel,
      value: edit.range,
      metadata: {
        timestamp: edit.timestamp,
        tool: edit.tool
      }
    });
  }
}

// Add cells with significant changes (if we have old/new values)
if (context.recentEdits && context.recentEdits.length > 0) {
  const significantChanges = context.recentEdits
    .filter(edit => {
      // Check if value changed significantly
      if (edit.oldValues && edit.newValues) {
        const oldVal = edit.oldValues[0]?.[0];
        const newVal = edit.newValues[0]?.[0];
        // Consider it significant if type changed or numeric value changed by >10%
        if (typeof oldVal !== typeof newVal) return true;
        if (typeof oldVal === 'number' && typeof newVal === 'number') {
          const percentChange = Math.abs((newVal - oldVal) / oldVal);
          return percentChange > 0.1;
        }
        return oldVal !== newVal;
      }
      return false;
    })
    .slice(-2); // Take up to 2 significant changes
  
  for (const change of significantChanges) {
    if (!contextItems.find(item => item.value === change.range)) {
      contextItems.push({
        id: `change-${change.timestamp}`,
        type: 'change',
        label: `Changed: ${change.range}`,
        value: change.range,
        metadata: {
          oldValue: change.oldValues?.[0]?.[0],
          newValue: change.newValues?.[0]?.[0]
        }
      });
    }
  }
}
```

## Implementation Steps

1. Open `/workspace/excel-addin/src/components/chat/RefactoredChatInterface.tsx`
2. Navigate to line 151 (start of the "Auto-add recent AI edits" section)
3. Delete or comment out lines 151-205 (both the recent AI edits block and the significant changes block)
4. Ensure the `contextItems` array only contains the user's selected range

## Expected Result

After this fix:
- Only the user's manually selected range will appear as a context pill
- No automatic "Recent edit:" or "Changed:" pills will be added
- The UI will be cleaner with just one context pill showing the selected Excel range
- Users maintain full control over what context is provided to the AI

## Alternative: Keep the Logic But Disable It

If you want to preserve the code for potential future use, you can wrap it in a feature flag:

```tsx
const ENABLE_AUTO_CONTEXT_PILLS = false; // Feature flag

if (ENABLE_AUTO_CONTEXT_PILLS && context.recentEdits && context.recentEdits.length > 0) {
  // ... existing auto-population code ...
}
```

This way, the feature can be easily re-enabled later if needed.