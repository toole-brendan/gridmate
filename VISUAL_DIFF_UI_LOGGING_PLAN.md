# Plan: UI-Based Visual Diff Logging and Copy-Paste Fix

**Project:** Gridmate
**Date:** 2025-07-15

## 1. Objective

This plan addresses two critical issues preventing effective debugging of the visual diff feature:

1.  **Inaccessible Logs:** The detailed logging added in `VISUAL_DIFF_LOGGING_PLAN.md` is currently sent to the browser's developer console, which is not easily accessible for a sandboxed Office Add-in on all platforms (like macOS).
2.  **Unreliable "Copy" Button:** The "Copy All Debug Info" button in the debug container is still not functioning reliably, likely due to clipboard API restrictions within the add-in's webview environment.

The goal is to redirect all relevant logs into the "Debug Info" UI container and implement a foolproof method for copying that information.

## 2. Implementation Strategy

We will create a centralized, UI-aware logging service using a Zustand store. This will allow any part of the application to push logs into a shared state, which the debug UI can then render in real-time. For the copy functionality, we will implement a reliable fallback using a `<textarea>` element to ensure the user can always access the debug text.

---

## 3. Detailed Implementation Plan

### Step 1: Create a Centralized Logging Store

We'll create a dedicated Zustand store to manage logs. This decouples the logging mechanism from any single component.

**File to Create:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/logStore.ts`

```typescript
import create from 'zustand';

type LogEntry = {
  timestamp: string;
  source: 'general' | 'visual-diff' | 'signalr';
  message: string;
  data?: any;
};

interface LogState {
  logs: LogEntry[];
  addLog: (source: LogEntry['source'], message: string, data?: any) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  addLog: (source, message, data) => {
    const timestamp = new Date().toLocaleTimeString();
    const newEntry: LogEntry = { timestamp, source, message, data };
    console.log(`[${source}] ${message}`, data); // Keep console.log for those who can see it
    set((state) => ({ logs: [...state.logs.slice(-100), newEntry] })); // Keep last 100 logs
  },
  clearLogs: () => set({ logs: [] }),
}));

// Helper function for easy access
export const log = (source: LogEntry['source'], message: string, data?: any) => {
  useLogStore.getState().addLog(source, message, data);
};
```

### Step 2: Refactor Visual Diff Logging

Now, we will modify the key files from the previous logging plan to use our new `logStore` instead of `console.log`.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Action:** Replace all `console.log` calls with the new `log()` function.

```typescript
// In /Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts
import { log } from '../../store/logStore'; // Import the new logger

// ... inside the useDiffPreview hook

const initiatePreview = useCallback(async (operations: AISuggestedOperation[]) => {
    log('visual-diff', `[🚀 Diff Start]`, { operations });
    // ...

    try {
      // ...
      const before = await excelService.createWorkbookSnapshot({ /* ... */ });
      log('visual-diff', `[🔬 Diff Simulate] "Before" snapshot created.`, { before: JSON.parse(JSON.stringify(before)) });

      const after = await simulateOperations(before, operations, activeSheetName);
      log('visual-diff', `[🔬 Diff Simulate] "After" snapshot created.`, { after: JSON.parse(JSON.stringify(after)) });

      // ... all other console.log calls should be converted to log('visual-diff', ...)

    } catch (err) {
      log('visual-diff', `[❌ Diff Error] An error occurred in initiatePreview.`, { error: err });
      // ...
    } finally {
      log('visual-diff', `[🚀 Diff End] Process finished.`);
      // ...
    }
}, [/* dependencies */]);
```

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/DiffPreviewBar.tsx`

```typescript
// In /Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/DiffPreviewBar.tsx
import { log } from '../../store/logStore'; // Import the new logger

// ... inside the component
log('visual-diff', `[🎨 Diff Apply] DiffPreviewBar rendered.`, { isPreviewing, diffsCount: diffs.length, isLoading });
// ...
```

### Step 3: Display Visual Diff Logs in the UI

We will now update the main chat interface to subscribe to the `logStore` and render the logs.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

**Action:**
1.  Import `useLogStore`.
2.  Filter for the 'visual-diff' logs.
3.  Add a new `<details>` section within the main "Debug Info" container to display them.

```typescript
// In /Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx
import { useLogStore } from '../../store/logStore'; // Import the log store

export const EnhancedChatInterfaceWithSignalR: React.FC = () => {
  // ... existing state ...
  const allLogs = useLogStore((state) => state.logs);
  const visualDiffLogs = allLogs.filter(log => log.source === 'visual-diff');

  // ... existing component logic ...

  return (
    // ... main container
      {/* Debug Info (collapsed by default) */}
      <details /* ... existing props ... */>
        <summary /* ... existing props ... */>
          <span>Debug Info</span>
        </summary>
        <div /* ... existing props ... */>
          {/* ... existing debug info ... */}

          {/* Visual Diff Logs Section */}
          <details data-debug="true" style={{ marginTop: '8px' }} open>
            <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Visual Diff Logs ({visualDiffLogs.length})</summary>
            <div style={{ 
              marginTop: '4px', 
              maxHeight: '200px', 
              overflowY: 'auto',
              fontSize: '10px',
              lineHeight: '1.4',
              backgroundColor: '#0d1117',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #30363d',
              userSelect: 'text',
            }}>
              {visualDiffLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '2px', color: log.message.includes('❌') ? '#ff6b6b' : '#8b949e' }}>
                  <span style={{ color: '#6e7681' }}>[{log.timestamp}]</span> {log.message}
                  {log.data && (
                    <pre style={{ fontSize: '9px', color: '#666', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
              {visualDiffLogs.length === 0 && (
                <div style={{ color: '#6e7681' }}>No visual diff activity yet...</div>
              )}
            </div>
          </details>

          {/* ... other debug sections ... */}
        </div>
      </details>
    // ...
  );
}
```

### Step 4: Implement a Foolproof "Copy All Debug Info" Button

To fix the copy functionality, we will provide a visible `<textarea>` as a reliable fallback.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

**Action:**
1.  Add state to manage the visibility of the textarea and the copy feedback.
2.  Create the full debug text string.
3.  Update the `onClick` handler to first try the clipboard API, but on failure, reveal the textarea.

```typescript
// In /Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx

export const EnhancedChatInterfaceWithSignalR: React.FC = () => {
  // ... existing state ...
  const [copyButtonText, setCopyButtonText] = useState('📋 Copy All Debug Info');
  const [showDebugText, setShowDebugText] = useState(false);

  // Get all logs from the store
  const allLogs = useLogStore((state) => state.logs);

  // Generate the full debug string
  const getDebugInfoString = () => {
    const generalLogs = allLogs.filter(l => l.source === 'general').map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    const diffLogs = allLogs.filter(l => l.source === 'visual-diff').map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    
    return `Debug Info - ${new Date().toISOString()}
=====================================
Session: ${sessionIdRef.current}
Mode: ${autonomyMode}
Connection: ${connectionStatus} ${isAuthenticated ? '(authenticated)' : '(not authenticated)'}
SignalR Connected: ${signalRClient.current?.isConnected() ? 'Yes' : 'No'}

--- General Logs ---
${generalLogs}

--- Visual Diff Logs ---
${diffLogs}

--- Audit Logs (last 10) ---
${AuditLogger.getRecentLogs(10).reverse().map(log => 
  `${new Date(log.timestamp).toLocaleTimeString()} - ${log.toolName} - ${log.result} ${log.autonomyMode ? `(${log.autonomyMode})` : ''}${log.error ? ` - Error: ${log.error}` : ''}`
).join('\n')}
`;
  };

  const handleCopy = async () => {
    const debugInfo = getDebugInfoString();
    try {
      await navigator.clipboard.writeText(debugInfo);
      setCopyButtonText('✅ Copied!');
    } catch (err) {
      setCopyButtonText('❌ Manual Copy Required');
      setShowDebugText(true); // Reveal the textarea on failure
    } finally {
      setTimeout(() => setCopyButtonText('📋 Copy All Debug Info'), 3000);
    }
  };

  return (
    // ...
      <details /* ... */>
        <summary /* ... */>Debug Info</summary>
        <div>
          {/* ... other sections ... */}
          
          {/* Copy Button */}
          <button onClick={handleCopy} style={/* ... */}>
            {copyButtonText}
          </button>

          {/* Fallback Textarea */}
          {showDebugText && (
            <div style={{ marginTop: '8px' }}>
              <p style={{ fontSize: '10px', color: '#e5e7eb' }}>
                Automatic copy failed. Please copy the text below manually:
              </p>
              <textarea
                readOnly
                value={getDebugInfoString()}
                style={{
                  width: '100%',
                  height: '150px',
                  marginTop: '4px',
                  backgroundColor: '#0d1117',
                  color: '#e5e7eb',
                  border: '1px solid #30363d',
                  fontSize: '10px',
                }}
              />
            </div>
          )}

          {/* ... log sections ... */}
        </div>
      </details>
    // ...
  );
}
```

## 4. Verification Steps

After implementing these changes:

1.  **Trigger a visual diff operation** (e.g., "write 'test' in A1").
2.  **Open the "Debug Info" container.**
3.  **Confirm Logs Appear:** Verify that a new "Visual Diff Logs" section is present and populated with logs prefixed with `[🚀 Diff Start]`, `[🔬 Diff Simulate]`, etc.
4.  **Test Successful Copy:** Click the "Copy All Debug Info" button.
    -   **Expected:** The button text changes to "✅ Copied!", and the full debug info (including the new log sections) is on your clipboard.
5.  **Test Failed Copy (Simulated):** If possible, disable clipboard permissions for the site to test the fallback.
    -   **Expected:** The button text changes to "❌ Manual Copy Required", and a textarea containing all the debug information appears below it, allowing for manual selection and copying.
6.  **Confirm Content:** Paste the copied content into a text editor and ensure it contains all the sections: general info, general logs, visual diff logs, and audit logs.

This plan provides a robust solution for both viewing logs directly in the UI and ensuring that the debug information can be reliably copied for reporting purposes.
