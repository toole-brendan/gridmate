# Context Pill Feature Documentation

## Overview

The Context Pill feature provides users with a visual, interactive indicator of the current Excel selection context that is being sent to the AI. This feature allows users to control whether their current spreadsheet selection is included in AI prompts, giving them fine-grained control over the context provided to the AI assistant.

## Key Features

- **Real-time Context Display**: Shows the current Excel selection (e.g., "Sheet1!M19:N33") in an orange-styled pill
- **Toggle Functionality**: Click to enable/disable sending context to AI
- **Visual Feedback**: Orange when enabled (context is sent), gray when disabled (context is not sent)
- **Automatic Updates**: Updates in real-time as users change their Excel selection

## Architecture & Files

### Frontend Components

#### 1. **`/excel-addin/src/components/chat/mentions/ContextPill.tsx`**
- **Purpose**: Core component that renders individual context pills
- **Key Features**:
  - Renders as either a clickable button or static div based on `onClick` prop
  - Handles different context types (sheet, range, filter, selection)
  - Shows appropriate icons for each context type
  - Provides visual styling based on enabled/disabled state
  - Supports removable pills with X button
- **Props**:
  - `item`: Context item with type, label, and value
  - `onClick`: Optional click handler for toggle functionality
  - `isEnabled`: Boolean indicating if context is active
  - `onRemove`: Optional handler for removing context

#### 2. **`/excel-addin/src/components/chat/mentions/ContextPillsContainer.tsx`** (Part of ContextPill.tsx)
- **Purpose**: Container component that manages multiple context pills
- **Key Features**:
  - Maps over context items and renders ContextPill for each
  - Only makes "selection" type pills clickable
  - Passes through toggle and enabled state to pills
- **Props**:
  - `items`: Array of context items
  - `onContextToggle`: Handler for toggling context on/off
  - `isContextEnabled`: Current enabled state
  - `onRemove`: Handler for removing individual contexts

#### 3. **`/excel-addin/src/components/chat/EnhancedChatInterface.tsx`**
- **Purpose**: Main chat interface that integrates the context pills
- **Integration Points**:
  - Renders ContextPillsContainer above the chat input (lines 484-495)
  - Receives context state and handlers from parent
  - Passes through props: `activeContext`, `onContextToggle`, `isContextEnabled`

#### 4. **`/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`**
- **Purpose**: SignalR-connected wrapper that manages state and Excel integration
- **Key Responsibilities**:
  - Maintains `isContextEnabled` state (line 63)
  - Monitors Excel selection changes via Office.js events
  - Updates `activeContext` when selection changes (lines 158-168)
  - Passes context to backend only when enabled (lines 781-786)
  - Provides toggle handler: `() => setIsContextEnabled(!isContextEnabled)`

### Backend Integration

#### 1. **`/backend/internal/services/ai/prompt_builder.go`**
- **Purpose**: Constructs prompts for the AI with optional context
- **Context Handling**:
  - Receives context from frontend when enabled
  - Wraps Excel context in `<context>` tags for AI
  - Includes selection range, cell values, and formulas when available

### Excel Service Integration

#### 1. **`/excel-addin/src/services/excel/ExcelService.ts`**
- **Purpose**: Interfaces with Excel via Office.js APIs
- **Methods**:
  - `getSmartContext()`: Retrieves current selection, worksheet, and workbook info
  - Returns context object with `selectedRange`, `worksheet`, `workbook` properties

## Workflow

### 1. **Initial Setup**
```typescript
// EnhancedChatInterfaceWithSignalR.tsx
const [isContextEnabled, setIsContextEnabled] = useState(true)
const [activeContext, setActiveContext] = useState<ContextItem[]>([])
```

### 2. **Selection Monitoring**
```typescript
// Real-time selection change listener
Office.context.document.addHandlerAsync(
  Office.EventType.DocumentSelectionChanged,
  async () => {
    const context = await ExcelService.getInstance().getSmartContext()
    if (context.selectedRange) {
      setActiveContext([{
        id: 'selection',
        type: 'selection',
        label: 'Context',
        value: context.selectedRange
      }])
    }
  }
)
```

### 3. **User Interaction**
- User clicks the orange context pill
- `onContextToggle` is called, toggling `isContextEnabled`
- Visual feedback updates immediately (orange ↔ gray)

### 4. **Message Sending**
```typescript
// Only include context when enabled
const messagePayload = {
  type: 'chat_message',
  data: {
    content: messageContent,
    excelContext: isContextEnabled ? {
      ...excelContext,
      activeContext: activeContext.map(c => ({ type: c.type, value: c.value }))
    } : null
  }
}
```

### 5. **Backend Processing**
- Backend receives message with optional `excelContext`
- If context is present, prompt_builder includes it in AI prompt
- AI receives context about current Excel selection for more relevant responses

## Visual States

### Enabled State (Default)
- **Appearance**: Orange background (`bg-orange-500/10`)
- **Text Color**: Orange (`text-orange-400`)
- **Border**: Orange (`border-orange-500/20`)
- **Hover**: Darker orange background
- **Meaning**: Context IS being sent to AI

### Disabled State
- **Appearance**: Gray background (`bg-gray-800/20`)
- **Text Color**: Gray (`text-gray-500`)
- **Border**: Gray (`border-gray-700/30`)
- **Opacity**: 50% (`opacity-50`)
- **Meaning**: Context is NOT being sent to AI

## User Benefits

1. **Privacy Control**: Users can disable context when working with sensitive data
2. **Relevance Control**: Users can prevent AI from being confused by unrelated selections
3. **Transparency**: Users always know what context the AI is receiving
4. **Immediate Feedback**: Visual state changes instantly on click

## Technical Considerations

1. **Performance**: Selection monitoring uses Office.js event handlers for efficiency
2. **State Management**: Context state is maintained at the top level for consistency
3. **Type Safety**: Full TypeScript typing for context items and props
4. **Accessibility**: Implemented as a proper button element with click handlers
5. **Extensibility**: Architecture supports multiple context types beyond just selection

## Future Enhancements

1. **Multiple Contexts**: Support for multiple active contexts simultaneously
2. **Context History**: Show recent contexts that can be re-selected
3. **Smart Context**: AI-suggested relevant ranges based on user activity
4. **Keyboard Shortcuts**: Toggle context with keyboard shortcut (e.g., Cmd+K)
5. **Context Presets**: Save frequently used ranges as named contexts