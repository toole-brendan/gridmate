# Wendigo - AI-Powered Financial Modeling Assistant

Wendigo is a desktop application that serves as "Cursor for financial modeling" - an AI-powered assistant that integrates directly with Excel and Google Sheets to help financial analysts build and analyze complex financial models.

## Features

- 🤖 **AI-Powered Assistance**: Claude Sonnet 3.5 powered chat interface for financial modeling help
- 📊 **Native Integration**: Seamless sidebar overlay for Excel and Google Sheets
- 🔍 **Context Awareness**: Understands your entire model and referenced documents
- ✅ **Human-in-the-Loop**: All changes previewed and require approval
- 📝 **Audit Trail**: Complete history of all AI actions and modifications
- 🏦 **Financial Templates**: Pre-built components for DCF, LBO, M&A models
- 🔐 **Security First**: All processing happens locally on your machine

## Target Users

- Hedge Fund Analysts
- Private Equity Associates
- Investment Banking Analysts
- Portfolio Managers
- Corporate Finance Teams

## Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Desktop**: Electron
- **AI/LLM**: Anthropic Claude Sonnet 3.5 (with local fallback)
- **Database**: SQLite + ChromaDB
- **Integration**: Office.js (Excel) + Google Sheets API

## Development Status

🚧 **Currently in early development**

See [implementation-plan.md](implementation-plan.md) for detailed technical roadmap.

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

## Documentation

- [Implementation Plan](implementation-plan.md) - Detailed technical implementation plan
- [CLAUDE.md](CLAUDE.md) - Project context for AI assistance

## License

*TBD*

## Contact

*TBD*