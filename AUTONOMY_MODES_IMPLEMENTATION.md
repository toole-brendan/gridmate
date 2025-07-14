# Cursor-Style Autonomy Modes Implementation

## Overview

This implementation adds Cursor-style autonomy modes to Gridmate, giving users control over how the AI assistant interacts with their Excel spreadsheets. The system supports three modes that mirror Cursor's approach:

1. **Ask Mode** - Read-only access, no tool execution
2. **Agent (Default)** - Requires approval for each action  
3. **Agent (YOLO)** - Auto-applies changes without approval

## Implementation Details

### Frontend Components

#### 1. AutonomyModeSelector (`/excel-addin/src/components/chat/AutonomyModeSelector.tsx`)
- Visual dropdown selector with mode descriptions
- Icons and styling matching Cursor's design
- Keyboard shortcut support (⌘. or Ctrl+.)
- Persists selected mode to localStorage

#### 2. ActionPreview (`/excel-addin/src/components/chat/ActionPreview.tsx`)
- Shows pending actions requiring approval
- Supports both single and batch action previews
- Clear approve/reject buttons
- Tool-specific parameter formatting

#### 3. ChatInterfaceWithSignalR Updates
- Integrated autonomy mode state management
- Handles tool requests based on current mode:
  - **Ask**: Returns descriptive message, no execution
  - **Agent Default**: Queues actions for approval
  - **Agent YOLO**: Executes immediately (with safety checks)
- Keyboard shortcuts for mode switching
- Persistent mode selection via localStorage

### Backend Updates

#### 1. AI Service (`/backend/internal/services/ai/service.go`)
- `ProcessChatWithToolsAndHistory` now accepts `autonomyMode` parameter
- In Ask mode, tools are not provided to the AI model
- Proper logging of autonomy mode throughout execution

#### 2. Message Types
- Updated `ChatMessage` struct to include `autonomyMode` field
- Updated `SignalRChatRequest` to pass autonomy mode from frontend

#### 3. SignalR Bridge
- Updated to forward autonomy mode from Excel to Go backend
- Maintains mode throughout the request lifecycle

### Safety Features

#### 1. Safety Checks (`/excel-addin/src/utils/safetyChecks.ts`)
- Detects potentially destructive operations
- Risk levels: low, medium, high
- Checks for:
  - Large range operations (>100 cells)
  - Formula overwrites
  - Delete/clear operations
- Even in YOLO mode, high-risk operations require approval

#### 2. Audit Logging
- Comprehensive `AuditLogger` class
- Tracks all tool executions with:
  - Timestamp
  - Tool name and parameters
  - Autonomy mode
  - Result (success/failure/rejected)
  - Error messages if applicable
- Stores up to 1000 recent operations
- Viewable in debug panel

### User Experience

#### Mode Behaviors

**Ask Mode**:
- AI can read and analyze spreadsheets
- Cannot make any changes
- Provides descriptions of what it would do
- Perfect for exploration and understanding

**Agent (Default)**:
- AI suggests changes via tool requests
- Each action appears in approval queue
- User can approve/reject individually or in batch
- Full transparency before any changes

**Agent (YOLO)**:
- AI executes most changes immediately
- High-risk operations still require approval
- Faster workflow for trusted operations
- All actions still logged for audit trail

#### Visual Feedback
- Mode selector in header with current mode
- Connection status indicator
- Pending actions queue with clear UI
- Collapsible debug panel with:
  - Session information
  - Current mode
  - Recent audit logs
  - Tool execution history

### Keyboard Shortcuts
- **⌘.** (Mac) or **Ctrl+.** (Windows): Cycle through autonomy modes
- Matches Cursor's keyboard shortcut for consistency

### Data Flow

1. User selects autonomy mode in UI
2. Mode is saved to localStorage for persistence
3. Chat messages include autonomy mode in payload
4. SignalR forwards mode to Go backend
5. AI service respects mode when selecting tools
6. Tool requests return to frontend
7. Frontend handles based on mode:
   - Ask: Display description only
   - Default: Queue for approval
   - YOLO: Execute (with safety checks)

### Security & Compliance

- Complete audit trail of all operations
- Persistent logs for compliance requirements
- Safety checks prevent accidental data loss
- User maintains full control at all times
- No operations without explicit mode selection

## Testing the Implementation

1. **Ask Mode**: Try asking the AI to modify cells - it should describe actions without executing
2. **Agent Default**: Request changes and verify approval UI appears
3. **Agent YOLO**: Make simple changes and verify immediate execution
4. **Safety Checks**: Try large range operations in YOLO mode - should still require approval
5. **Persistence**: Change modes, refresh page, verify mode is remembered
6. **Audit Logs**: Check debug panel for complete operation history

## Future Enhancements

1. **Custom Safety Rules**: Allow users to define their own safety thresholds
2. **Mode Profiles**: Save different mode configurations for different workflows
3. **Batch Operation Preview**: Enhanced preview for complex multi-step operations
4. **Undo/Redo Integration**: Connect audit log to undo functionality
5. **Export Audit Logs**: Allow downloading audit logs for compliance