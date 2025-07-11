# Gridmate Excel Add-in

The core Gridmate product - an AI-powered financial modeling assistant that integrates directly with Microsoft Excel.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Sideload the add-in in Excel:
```bash
npm run sideload
```

## Development

### Project Structure
```
excel-addin/
├── src/
│   ├── components/    # React components
│   ├── services/      # Business logic
│   ├── store/         # State management (Zustand)
│   ├── types/         # TypeScript types
│   └── app.tsx        # Entry point
├── public/
│   ├── manifest.xml   # Office Add-in manifest
│   └── assets/        # Icons and static files
└── vite.config.ts     # Build configuration
```

### Key Technologies
- **React 18** + **TypeScript** for UI
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Office.js** for Excel integration
- **WebSocket** for backend communication

### Scripts
- `npm run dev` - Start development server with HTTPS
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript compiler

### Testing in Excel
1. The dev server runs on https://localhost:3000
2. Use the manifest.xml file to sideload the add-in
3. Click the "Gridmate AI" button in the Excel ribbon

## Architecture

### Communication Flow
```
Excel Add-in (React) <-> WebSocket <-> Backend (Go)
                           ↓
                     AI Service (Claude/GPT)
```

### State Management
We use Zustand for managing:
- Excel context (workbook, worksheet, selection)
- Chat messages
- Formula intelligence data
- UI state

## Security
- All data processing happens on the backend
- WebSocket uses WSS (secure) protocol
- No external API calls from the add-in
- Token-based authentication