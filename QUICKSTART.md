# Wendigo Quick Start Guide

## Running the Application

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your Anthropic API key
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## First Time Setup

When you first launch Wendigo:

1. The app will appear as a sidebar on the right side of your screen
2. Click "Connect Excel" or "Connect Sheets" to establish a connection
3. Once connected, you can start chatting with the AI assistant

## Key Features to Try

1. **Formula Generation**: Type "Create a formula to calculate compound annual growth rate"
2. **Error Detection**: Type "Check for errors in my spreadsheet"
3. **Model Building**: Type "Help me build a DCF model"
4. **Data Analysis**: Select a range and type "Analyze this data"

## Keyboard Shortcuts

- `Enter` - Send message
- `Shift+Enter` - New line in message
- `Ctrl/Cmd+K` - Clear chat history
- `Esc` - Minimize window

## Troubleshooting

- **Can't connect to Excel**: Make sure Excel is running and the Office.js add-in is loaded
- **API errors**: Check that your Anthropic API key is correctly set in .env
- **Window positioning issues**: Click the pin icon to toggle window docking

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linter
- `npm run typecheck` - Check TypeScript types