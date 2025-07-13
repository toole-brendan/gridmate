# Gridmate Excel Add-in Development Setup

This document describes the setup process for running the Gridmate Excel add-in in development mode with a working backend connection.

## Overview

Gridmate is an AI-powered financial modeling assistant that integrates directly with Microsoft Excel. The system consists of:
- **Excel Add-in** (React/TypeScript) - Runs inside Excel as a task pane
- **Backend API** (Go) - Provides AI services using Anthropic Claude
- **Azure PostgreSQL** - Database for storing user data and conversations

## Prerequisites

- Node.js and npm
- Go 1.23+
- Microsoft Excel (desktop version)
- Azure PostgreSQL database
- Anthropic API key

## Project Structure

```
gridmate/
├── excel-addin/          # Excel add-in frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # WebSocket and Excel services
│   │   └── app.tsx      # Entry point
│   ├── public/
│   │   └── manifest.xml # Office add-in manifest
│   └── package.json
├── backend/             # Go backend API
│   ├── cmd/api/        # Main application
│   ├── internal/       # Business logic
│   ├── migrations/     # Database migrations
│   └── docker-compose.yml
└── .env                # Shared environment variables
```

## Setup Steps Completed

### 1. Excel Add-in Configuration

**Fixed missing npm scripts:**
- Added Office add-in development packages
- Created sideloading scripts in package.json
- Set up certificate handling for HTTPS

**Key files modified:**
- `excel-addin/package.json` - Added sideloading and Office add-in scripts
- `excel-addin/vite.config.ts` - Configured flexible certificate loading
- `excel-addin/index.html` - Added fallback content

### 2. Backend Database Configuration

**Azure PostgreSQL Setup:**
- Database: `gridmate-db-server.postgres.database.azure.com`
- User: `gridmateadmin`
- Added firewall rules for development IP

**Migration Fixes:**
- Replaced `uuid-ossp` extension with built-in `gen_random_uuid()`
- Commented out pgvector extension (not supported in Azure PostgreSQL)
- Fixed migration state tracking issues

**Environment Configuration (.env):**
```bash
# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-...

# Azure PostgreSQL
DB_HOST=gridmate-db-server.postgres.database.azure.com
DB_PORT=5432
DB_USER=gridmateadmin
DB_PASSWORD=your_password
DB_NAME=gridmate_db
DB_SSL_MODE=require

# Backend Configuration
PORT=8080
ENV=development
LOG_LEVEL=debug
JWT_SECRET=dev-secret-key
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000
```

### 3. Frontend WebSocket Integration

**Created components:**
- `ChatInterfaceWrapper.tsx` - Main wrapper component
- `ChatInterfaceWithBackend.tsx` - WebSocket-connected chat interface
- Updated `WebSocketClient.ts` - Added debugging and error handling

**Key changes:**
- Fixed WebSocket event handling
- Added connection status UI
- Removed React StrictMode to prevent double mounting
- Added extensive debugging logs

### 4. Fixed Issues

1. **Import Error**: Fixed `App.tsx` import to use `ChatInterface` component
2. **Database Migrations**: 
   - Fixed Azure PostgreSQL compatibility issues
   - Cleaned up dirty migration states
   - Removed duplicate migration files
3. **WebSocket Connection**:
   - Fixed event listener names (connected vs connect)
   - Added proper cleanup on unmount
   - Added CORS configuration for WebSocket

## Running the Application

### Terminal 1 - Backend API
```bash
cd backend
go run cmd/api/main.go
```

You should see:
```
{"level":"info","msg":"Database connection established","time":"..."}
{"level":"info","msg":"WebSocket hub started","time":"..."}
{"level":"info","msg":"Starting server on port 8080","time":"..."}
```

### Terminal 2 - Excel Add-in Frontend
```bash
cd excel-addin
npm run dev
```

The Vite dev server will start on https://localhost:3000

### Terminal 3 - Sideload the Add-in
```bash
cd excel-addin
npm run sideload
```

This will:
1. Open Excel with the add-in loaded
2. Show "Gridmate AI" button in the Home ribbon
3. Click to open the chat interface sidebar

## Troubleshooting

### WebSocket Connection Issues

If you see "Connecting to backend..." but it never connects:

1. **Check backend is running**: Should show WebSocket connection logs
2. **Check browser console**: Look for WebSocket errors
3. **Verify CORS**: Backend should allow origins from localhost:3000
4. **Check firewall**: Azure PostgreSQL needs your IP whitelisted

### Database Issues

If migrations fail:
1. Check Azure firewall rules: `az postgres flexible-server firewall-rule list`
2. Verify password is correct in .env
3. Clean migration state if dirty: `UPDATE schema_migrations SET dirty = false`

### Excel Add-in Loading Issues

If the add-in doesn't load:
1. Clear Excel cache: `rm -rf ~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/`
2. Stop and restart: `npm run stop` then `npm run sideload`
3. Check manifest.xml URLs match your dev server

## Current Status

- ✅ Excel add-in loads and displays chat interface
- ✅ Backend connects to Azure PostgreSQL
- ✅ WebSocket connection established
- ⚠️ Connection status UI needs fixing (messages are received but UI doesn't update)
- 🔄 AI integration ready but needs testing

## Next Steps

1. Fix the connection status indicator in the UI
2. Test AI message processing with Anthropic Claude
3. Add Excel context integration (selected cells)
4. Implement financial modeling features

## Useful Commands

```bash
# Check if backend is accessible
curl http://localhost:8080/health

# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8080/ws

# View Azure PostgreSQL tables
PGPASSWORD=your_password psql -h gridmate-db-server.postgres.database.azure.com -U gridmateadmin -d gridmate_db -c "\dt"

# Check migration status
PGPASSWORD=your_password psql -h gridmate-db-server.postgres.database.azure.com -U gridmateadmin -d gridmate_db -c "SELECT * FROM schema_migrations;"
```

## Debug Output Examples

When working correctly, you should see:

**Backend logs:**
```
{"level":"info","msg":"WebSocket connection attempt","path":"/ws","remoteAddr":"[::1]:52795"}
{"clientID":"client_20250712211715.626932","level":"info","msg":"WebSocket client connected"}
```

**Frontend console:**
```
🚀 app.tsx loaded
✅ Office.onReady fired!
🔌 Initializing WebSocket connection...
📥 Raw WebSocket message received: {"type":"notification","data":{"title":"Connected"}}
✅ Received connection confirmation from backend
```

---

*Document created: July 12, 2025*
*Last updated: During Excel add-in development session*