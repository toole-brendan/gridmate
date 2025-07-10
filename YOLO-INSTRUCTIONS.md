# YOLO Mode Implementation Instructions

You are about to run in YOLO mode to implement the Wendigo Financial Modeling AI Assistant according to the implementation-plan.md. Execute the following plan systematically:

## Your Mission
Build the MVP of Wendigo - an AI-powered financial modeling assistant that integrates with Excel and Google Sheets. Focus on Phase 1 (Foundation) and essential MVP features.

## Implementation Order

### 1. Project Setup (First Priority)
- Initialize the Electron + React + TypeScript project structure
- Set up the development environment with all necessary dependencies
- Configure build tools and linting
- Create the basic folder structure as outlined in CLAUDE.md

### 2. Desktop Application Shell
- Create the Electron main process
- Build the sidebar overlay UI with React
- Implement window management and positioning
- Add basic styling with Tailwind CSS

### 3. Spreadsheet Integration Layer
- Create the unified SpreadsheetAdapter interface
- Implement ExcelAdapter using Office.js API
- Add basic cell/range monitoring capabilities
- Set up event listeners for spreadsheet changes

### 4. AI Chat Interface
- Build the chat panel component
- Integrate with Anthropic Claude API
- Implement context-aware prompting
- Add markdown rendering for responses

### 5. Core Features
- Formula assistance and generation
- Error checking and validation
- Basic change tracking with undo/redo
- Simple audit trail using SQLite

### 6. State Management
- Set up Zustand for app state
- Implement Redux for model state (if needed)
- Create proper state persistence

## Key Requirements
- All processing must happen locally
- Every AI action must be auditable
- Changes require preview + confirmation
- Support Excel files up to 50MB
- Response time < 3 seconds

## Technical Specifications
- Use the exact tech stack from the plan:
  - Electron for desktop
  - React + TypeScript for UI
  - Tailwind CSS for styling
  - Node.js + Express for local server
  - SQLite for audit trails
  - Office.js for Excel integration

## File Structure to Create
```
/src
  /components     # React UI components
  /services       # Business logic and integrations
  /agents         # AI agent implementations
  /models         # Data models and types
  /utils          # Helper functions
  /store          # State management
  /main           # Electron main process
  /renderer       # Electron renderer process
```

## Critical Implementation Notes
1. Start with a working desktop app shell before adding features
2. Test Excel integration thoroughly - it's the core feature
3. Keep the UI simple and focused on the sidebar chat interface
4. Ensure all financial calculations are 100% accurate
5. Implement proper error handling throughout
6. Add comprehensive logging for debugging

## First Milestone
Get a basic Electron app running with:
- A sidebar that can overlay on Excel
- A simple chat interface
- Basic connection to Claude API
- Ability to read selected cells from Excel

Once this milestone is reached, iteratively add features from the plan.

## Remember
- This is for financial professionals who need extreme accuracy
- Every error could cost millions
- Maintain audit trails for compliance
- Performance is critical for large models
- Security first - no external data transmission without permission

Now execute this plan step by step, starting with project initialization.