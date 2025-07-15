# Super-Detailed Implementation Plan: Visual Diff Feature

**Status: ✅ COMPLETED (2025-01-15)**

This document provides a granular, step-by-step plan for implementing an in-grid visual diff feature. It is designed to be a comprehensive guide for developers, incorporating details on API contracts, state management, error handling, and specific code implementation strategies.

## Implementation Summary

All phases of the visual diff feature have been successfully implemented. The feature now provides real-time visual previews of AI-suggested changes directly in the Excel grid, with color-coded highlights and a user-friendly approval interface.

---

## Completed Implementation

### **Phase 1: Backend Infrastructure ✅**

#### **1.1 Diff Service Implementation**
- **File Created**: `backend/internal/services/diff/diff_service.go`
- **Features**:
  - Efficient diff computation between workbook snapshots
  - Cell key parsing with regex pattern matching
  - Support for all diff types (Added, Deleted, ValueChanged, FormulaChanged, StyleChanged)
  - Column index conversion utilities

#### **1.2 Diff Handler and Routes**
- **File Created**: `backend/internal/handlers/diff_handler.go`
- **Route Added**: `/api/v1/excel/diff` (POST, protected)
- **Features**:
  - UUID validation for workbook IDs
  - Integration with SignalR for broadcasting
  - Comprehensive error handling

#### **1.3 SignalR Hub Enhancements**
- **File Modified**: `signalr-service/GridmateSignalR/Hubs/GridmateHub.cs`
- **Methods Added**:
  - `JoinWorkbookGroup(string workbookId)` - Join a workbook-specific group
  - `LeaveWorkbookGroup(string workbookId)` - Leave a workbook group
- **Broadcast Support**: Added handling for `workbookDiff` message type
- **Bug Fixes**: Fixed nullable reference type warnings

### **Phase 2: Excel Integration ✅**

#### **2.1 Workbook Snapshot Creation**
- **File Modified**: `excel-addin/src/services/excel/ExcelService.ts`
- **Method Added**: `createWorkbookSnapshot(options)`
- **Features**:
  - Configurable range selection (default: A1:Z100)
  - Support for "UsedRange" to capture all data
  - Formula and value extraction
  - Performance optimization with cell limits
  - Helper methods for cell address calculations

#### **2.2 Grid Visualization Service**
- **File Created**: `excel-addin/src/services/diff/GridVisualizer.ts`
- **Class**: `GridVisualizer` with static methods
- **Features**:
  - Color-coded highlighting by diff type:
    - 🟢 Green (#C6EFCE): Added cells
    - 🔴 Red (#FFC7CE): Deleted cells
    - 🟡 Yellow (#FFEB9C): Value changes
    - 🔵 Blue (#B8CCE4): Formula changes
    - 🟣 Purple (#E4DFEC): Style changes
  - Original format preservation and restoration
  - Multi-sheet support with efficient grouping
  - Error resilience with per-sheet error handling

#### **2.3 TypeScript Type Definitions**
- **File Created**: `excel-addin/src/types/diff.ts`
- **Types Defined**:
  - `CellKey`, `CellSnapshot`, `WorkbookSnapshot`
  - `DiffKind` enum, `DiffHunk`, `DiffPayload`, `DiffMessage`
  - `AISuggestedOperation` for operation tracking

### **Phase 3: UI Integration ✅**

#### **3.1 State Management**
- **File Created**: `excel-addin/src/store/diffStore.ts`
- **Store**: Zustand-based state management
- **Features**:
  - Diff status tracking (idle, computing, previewing, applying, applied)
  - Pending operations storage
  - Error state management
  - Revision tracking for message ordering

#### **3.2 Diff Preview Hook**
- **File Created**: `excel-addin/src/hooks/useDiffPreview.ts`
- **Hook**: `useDiffPreview(signalRClient, workbookId)`
- **Features**:
  - Orchestrates the complete diff workflow
  - Snapshot creation and operation simulation
  - SignalR message handling
  - Error handling and loading states
  - Operation simulators for write_range, apply_formula, clear_range

#### **3.3 Visual Components**
- **File Created**: `excel-addin/src/components/chat/DiffPreviewBar.tsx`
- **Component**: Fixed-position preview bar
- **Features**:
  - Change summary with color-coded indicators
  - Apply/Reject buttons (changed from Cancel per request)
  - Loading states and error display
  - Responsive design with Tailwind CSS

#### **3.4 Chat Interface Integration**
- **File Modified**: `excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
- **Changes**:
  - Added diff preview hook integration
  - Modified `executeToolRequest` to use diff preview for write operations
  - Automatic workbook group joining on authentication
  - Added DiffPreviewBar component to UI
  - Integrated with existing autonomy modes (preview only in agent-default mode)

---

### **Original Plan (For Reference)**

### **Part 1: Backend Enhancements (Go & SignalR)**

The backend will be a stateless, high-performance diff engine. Its sole responsibility is to receive two workbook snapshots and return a computed set of differences.

#### **1.1. Core Data Structures**
*   **File**: `backend/internal/models/diff.go`
*   **Action**: Define the core Go structs. These are the data contracts for the entire diffing process.

```go
package models

import "github.com/google/uuid"

// CellKey uniquely identifies a cell. The combination of Sheet, Row, and Col
// forms a primary key for a cell's location.
type CellKey struct {
	Sheet string `json:"sheet"`
	Row   int    `json:"row"`
	Col   int    `json:"col"`
}

// CellSnapshot holds the state of a single cell. Pointers are used to omit
// empty fields in JSON, reducing payload size.
type CellSnapshot struct {
	Value   *string `json:"v,omitempty"`    // The displayed value of the cell.
	Formula *string `json:"f,omitempty"`    // The formula, if any (e.g., "=SUM(A1:A2)").
	Style   *string `json:"s,omitempty"`    // A deterministically serialized JSON string of cell formatting.
}

// WorkbookSnapshot is the representation of a workbook's state. The map key is a
// string like "Sheet1!A1" for fast lookups.
type WorkbookSnapshot map[string]CellSnapshot

// DiffKind enumerates the types of changes. This is crucial for the frontend
// to decide which visual treatment to apply.
type DiffKind string
const (
	Added          DiffKind = "Added"
	Deleted        DiffKind = "Deleted"
	ValueChanged   DiffKind = "ValueChanged"
	FormulaChanged DiffKind = "FormulaChanged"
	StyleChanged   DiffKind = "StyleChanged"
)

// DiffHunk represents a single atomic change. This is the fundamental unit
// of the diff that the frontend will render.
type DiffHunk struct {
	Key    CellKey      `json:"key"`
	Kind   DiffKind     `json:"kind"`
	Before CellSnapshot `json:"before,omitempty"`
	After  CellSnapshot `json:"after,omitempty"`
}

// DiffPayload is the JSON structure the Go backend expects from the frontend.
type DiffPayload struct {
	WorkbookID uuid.UUID        `json:"workbookId"`
	Before     WorkbookSnapshot `json:"before"`
	After      WorkbookSnapshot `json:"after"`
}

// DiffMessage is the JSON structure the Go backend sends to the SignalR service
// for broadcasting to the frontend clients.
type DiffMessage struct {
	WorkbookID uuid.UUID  `json:"workbookId"`
	Revision   int        `json:"revision"` // For future use to handle out-of-order messages.
	Hunks      []DiffHunk `json:"hunks"`
}
```

#### **1.2. Diff Computation Service**
*   **File**: `backend/internal/services/diff_service.go`
*   **Action**: Create the core diffing logic.

```go
package services

import "gridmate/internal/models"

type DiffService interface {
    ComputeDiff(before, after models.WorkbookSnapshot) []models.DiffHunk
}

type diffServiceImpl struct{}

func NewDiffService() DiffService {
    return &diffServiceImpl{}
}

// ComputeDiff calculates the difference between two workbook snapshots.
func (s *diffServiceImpl) ComputeDiff(before, after models.WorkbookSnapshot) []models.DiffHunk {
    hunks := []models.DiffHunk{}
    allKeys := // Get a union of all keys from 'before' and 'after' maps.

    for key := range allKeys {
        beforeSnapshot, inBefore := before[key]
        afterSnapshot, inAfter := after[key]
        
        // Parse key "Sheet1!A1" into CellKey struct
        cellKey := parseKey(key) 

        if inBefore && !inAfter {
            // Deleted
            hunks = append(hunks, models.DiffHunk{Key: cellKey, Kind: models.Deleted, Before: beforeSnapshot})
        } else if !inBefore && inAfter {
            // Added
            hunks = append(hunks, models.DiffHunk{Key: cellKey, Kind: models.Added, After: afterSnapshot})
        } else {
            // Modified: Compare fields
            if *beforeSnapshot.Formula != *afterSnapshot.Formula {
                hunks = append(hunks, models.DiffHunk{Key: cellKey, Kind: models.FormulaChanged, Before: beforeSnapshot, After: afterSnapshot})
            } else if *beforeSnapshot.Value != *afterSnapshot.Value {
                hunks = append(hunks, models.DiffHunk{Key: cellKey, Kind: models.ValueChanged, Before: beforeSnapshot, After: afterSnapshot})
            } else if *beforeSnapshot.Style != *afterSnapshot.Style {
                hunks = append(hunks, models.DiffHunk{Key: cellKey, Kind: models.StyleChanged, Before: beforeSnapshot, After: afterSnapshot})
            }
        }
    }
    return hunks
}
```

#### **1.3. API Endpoint and SignalR Broadcast**
*   **File**: `backend/internal/handlers/diff_handler.go`
*   **Action**: Create the HTTP handler to orchestrate the diffing process.

```go
// In diff_handler.go
func (h *Handler) handleComputeDiff() http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var payload models.DiffPayload
        // 1. Unmarshal request body into payload. Handle errors.
        
        // 2. Call the diff service
        hunks := h.diffService.ComputeDiff(payload.Before, payload.After)
        
        // 3. Construct the SignalR message
        message := models.DiffMessage{
            WorkbookID: payload.WorkbookID,
            Revision:   1, // Implement revision logic later
            Hunks:      hunks,
        }
        
        // 4. Make an HTTP POST request to the SignalR service's broadcast endpoint
        // e.g., POST http://signalr-service/api/broadcast
        // The body of this request is the JSON-marshalled 'message'.
        err := h.signalrClient.Broadcast(message)
        // Handle error if broadcast fails.
        
        // 5. Respond to the original request
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "diff_broadcast_initiated"})
    }
}
```
*   **File**: `signalr-service/GridmateSignalR/Controllers/BroadcastController.cs` (New)
*   **Action**: Create a controller in the C# SignalR project to receive broadcasts from the Go backend.

```csharp
// In BroadcastController.cs
[ApiController]
[Route("api/[controller]")]
public class BroadcastController : ControllerBase
{
    private readonly IHubContext<DiffHub> _hubContext;

    public BroadcastController(IHubContext<DiffHub> hubContext)
    {
        _hubContext = hubContext;
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] DiffMessage message)
    {
        // Clients.Group sends the message only to clients in the specified group.
        await _hubContext.Clients.Group(message.WorkbookId.ToString())
                         .SendAsync("ReceiveDiff", message);
        return Ok();
    }
}
```

---

### **Part 2: Frontend Integration (Excel Add-in)**

#### **2.1. State Management**
*   **File**: `excel-addin/src/store/diffStore.ts` (New)
*   **Action**: Create a Zustand store to manage the state of the diff and approval process.

```typescript
import create from 'zustand';
import { DiffHunk } from '../types/diff'; // Assumes types are defined
import { AISuggestedOperation } from '../types/ai';

interface DiffState {
  hunks: DiffHunk[] | null;
  status: 'idle' | 'previewing' | 'applying';
  pendingOperations: AISuggestedOperation[] | null;
  setPreview: (hunks: DiffHunk[], operations: AISuggestedOperation[]) => void;
  clearPreview: () => void;
  // More actions to be added
}

export const useDiffStore = create<DiffState>((set) => ({
  hunks: null,
  status: 'idle',
  pendingOperations: null,
  setPreview: (hunks, operations) => set({
    hunks,
    pendingOperations: operations,
    status: 'previewing',
  }),
  clearPreview: () => set({
    hunks: null,
    pendingOperations: null,
    status: 'idle',
  }),
}));
```

#### **2.2. Augment `ExcelService`**
*   **File**: `excel-addin/src/services/excel/ExcelService.ts`
*   **Action**: Add the snapshot creation logic.

```typescript
// Inside ExcelService class

public async createWorkbookSnapshot(rangeAddress: string = "A1:Z100"): Promise<WorkbookSnapshot> {
    return Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getActiveWorksheet();
        const range = sheet.getRange(rangeAddress);
        
        // Load all required properties in a single batch call
        range.load(["address", "values", "formulas", "format/fill", "format/font"]);
        await context.sync();

        const snapshot: WorkbookSnapshot = {};
        
        for (let i = 0; i < range.rowCount; i++) {
            for (let j = 0; j < range.columnCount; j++) {
                const cellAddress = this.getCellAddress(range.address, i, j); // Existing helper
                const cell = range.getCell(i, j);
                
                // Serialize style to a stable JSON string for comparison
                const style = JSON.stringify({
                    font: cell.format.font,
                    fill: cell.format.fill,
                });

                snapshot[cellAddress] = {
                    v: cell.values[0][0],
                    f: cell.formulas[0][0],
                    s: style,
                };
            }
        }
        return snapshot;
    });
}
```

#### **2.3. Create `GridVisualizer` Service**
*   **File**: `excel-addin/src/services/diff/GridVisualizer.ts`
*   **Action**: Implement the logic to paint and clear highlights on the grid.

```typescript
// In GridVisualizer.ts
import { ExcelService } from '../excel/ExcelService';
import { DiffHunk, DiffKind } from '../../types/diff';

export class GridVisualizer {
    public static async applyHighlights(hunks: DiffHunk[]): Promise<void> {
        await Excel.run(async (context) => {
            for (const hunk of hunks) {
                const range = context.workbook.worksheets.getItem(hunk.key.sheet)
                    .getRangeByIndexes(hunk.key.row, hunk.key.col, 1, 1);

                switch (hunk.kind) {
                    case DiffKind.Added:
                        range.format.fill.color = "#C6EFCE"; // Light Green
                        break;
                    case DiffKind.Deleted:
                        range.format.borders.getItem('EdgeTop').color = "#FF0000";
                        // Add other borders...
                        break;
                    case DiffKind.ValueChanged:
                        range.format.fill.color = "#FFEB9C"; // Light Yellow
                        break;
                    // Add other cases
                }
            }
            await context.sync();
        });
    }
    
    public static async clearHighlights(hunks: DiffHunk[]): Promise<void> {
        await Excel.run(async (context) => {
            for (const hunk of hunks) {
                const range = context.workbook.worksheets.getItem(hunk.key.sheet)
                    .getRangeByIndexes(hunk.key.row, hunk.key.col, 1, 1);
                range.format.fill.clear();
                range.format.borders.load('items');
                await context.sync();
                range.format.borders.items.forEach(b => b.style = 'None');
            }
            await context.sync();
        });
    }
}
```

#### **2.4. Detailed User Workflow (`agent-default`)**
1.  **User Action**: User submits a prompt.
2.  **AI Response**: The AI returns a set of operations, e.g., `[{ tool: 'write_range', ... }]`.
3.  **Initiate Preview**: A React component (e.g., `Chat.tsx`) orchestrates the preview:
    ```typescript
    const handleAIResponse = async (operations) => {
        // 1. Get "before" state
        const before = await ExcelService.getInstance().createWorkbookSnapshot();
        
        // 2. Simulate "after" state in-memory (pure JS)
        const after = simulateApplyOperations(before, operations);
        
        // 3. Store operations in Zustand for later execution
        useDiffStore.getState().setPendingOperations(operations);
        
        // 4. Send to backend for diffing
        await api.post('/diff', { workbookId, before, after });
        // The SignalR listener will handle the rest.
    };
    ```
4.  **SignalR Listener**:
    ```typescript
    // In a service that initializes the SignalR connection
    connection.on("ReceiveDiff", (message: DiffMessage) => {
        const { hunks } = message;
        const { pendingOperations } = useDiffStore.getState();
        
        // Update state to trigger UI changes
        useDiffStore.getState().setPreview(hunks, pendingOperations);
        
        // Apply visual cues to the grid
        GridVisualizer.applyHighlights(hunks);
    });
    ```
5.  **User Approval**: The user clicks an "Approve" button in a React component.
    ```typescript
    const handleApprove = async () => {
        const { pendingOperations, hunks } = useDiffStore.getState();
        
        // 1. Execute the stored operations for real
        for (const op of pendingOperations) {
            await ExcelService.getInstance().executeToolRequest(op.tool, op.input);
        }
        
        // 2. Clean up the grid visuals
        await GridVisualizer.clearHighlights(hunks);
        
        // 3. Reset the state
        useDiffStore.getState().clearPreview();
    };
    ```

This super-detailed plan provides a clear path forward, specifying the implementation details for each part of the system and how they connect, ensuring a robust and well-integrated feature.

---

## Implementation Results

### **What Was Achieved**

The visual diff feature has been fully implemented across all three phases:

1. **Backend Infrastructure**: Complete diff computation engine with SignalR broadcasting
2. **Excel Integration**: Efficient snapshot creation and visual grid highlighting
3. **UI Components**: Intuitive preview bar with apply/reject workflow

### **Key Features Delivered**

- **Real-time Preview**: Changes are visualized in the grid before applying
- **Color-coded Indicators**: Different colors for different types of changes
- **User Control**: Clear apply/reject buttons for every change
- **Performance**: Optimized for large workbooks with configurable limits
- **Integration**: Seamlessly integrated with existing autonomy modes

### **Technical Highlights**

- **Scalable Architecture**: Stateless diff computation allows horizontal scaling
- **Error Resilience**: Graceful handling of errors at every level
- **Type Safety**: Full TypeScript types for all diff-related structures
- **State Management**: Clean separation of concerns with Zustand store
- **Real-time Updates**: SignalR groups enable efficient workbook-specific broadcasts

### **User Experience**

When AI suggests changes in `agent-default` mode:
1. Grid cells highlight with color-coded changes
2. Preview bar appears showing change summary
3. User can review changes visually in the grid
4. Apply or Reject with a single click
5. Changes are applied or discarded cleanly

This implementation successfully delivers on the promise of giving users complete visibility and control over AI-suggested changes while maintaining the speed and efficiency that makes Gridmate valuable for financial modeling workflows.