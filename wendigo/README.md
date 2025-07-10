# Wendigo - AI-Powered Financial Modeling Assistant

Wendigo is a desktop application that integrates with Excel and Google Sheets to provide AI-powered assistance for financial modeling tasks.

## Features

- **Seamless Integration**: Works as a sidebar overlay for Excel and Google Sheets
- **AI-Powered Chat**: Get instant help with formulas, analysis, and modeling
- **Context-Aware**: Understands your active spreadsheet and provides relevant suggestions
- **Audit Trail**: Complete history of all changes and AI interactions
- **Formula Generation**: Create complex formulas from natural language descriptions
- **Error Detection**: Automatically identify and fix common spreadsheet errors

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Excel (for Excel integration)
- Google account (for Google Sheets integration)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/wendigo/wendigo-app.git
cd wendigo-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

4. Run in development mode:
```bash
npm run dev
```

### Building

To build the application for production:

```bash
npm run build
```

The packaged application will be in the `dist` folder.

## Architecture

- **Frontend**: React + TypeScript with Tailwind CSS
- **Desktop Framework**: Electron
- **State Management**: Zustand
- **AI Integration**: Anthropic Claude API
- **Database**: SQLite for audit trails

## Development

### Project Structure

```
/src
  /main           # Electron main process
  /preload        # Preload scripts
  /renderer       # React application
    /components   # UI components
    /store        # State management
    /services     # Business logic
  /shared         # Shared types and utilities
```

### Key Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run tests

## License

MIT License - see LICENSE file for details