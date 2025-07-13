# Gridmate Excel Add-in

The core Gridmate product - an AI-powered financial modeling assistant that integrates directly with Microsoft Excel.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Install certificates (first time only):
```bash
npm run certificates
```

3. Start development and sideload the add-in:
```bash
npm run sideload
```

This will:
- Start the development server on https://localhost:3000
- Open Excel
- Automatically sideload the add-in

### Alternative Sideloading Options

- **Desktop Excel only**: `npm run start:desktop`
- **Web Excel only**: `npm run start:web`
- **Stop and uninstall**: `npm run stop`
- **Validate manifest**: `npm run validate`

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

## Troubleshooting

### Common Issues

1. **Certificate errors when sideloading**
   - Run `npm run certificates` and accept the certificate prompts
   - On Windows, you may need to run as administrator
   - On Mac, you may need to manually trust the certificate in Keychain Access

2. **"Add-in Error" when loading**
   - Ensure the dev server is running (`npm run dev`)
   - Check that the manifest URLs match your dev server (https://localhost:3000)
   - Clear Office cache: File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs → Clear

3. **Changes not appearing**
   - Hard refresh the add-in: Right-click in the taskpane → Reload
   - For manifest changes, run `npm run stop` then `npm run sideload` again

4. **Sideloading fails**
   - Ensure Excel is fully closed before running sideload commands
   - Check that you're using a supported version of Office (Office 2016 or later)
   - For Office on the web, manually upload the manifest via Insert → Add-ins → Upload My Add-in