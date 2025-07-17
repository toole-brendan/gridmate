#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Gridmate Development Environment...${NC}"
echo ""

# Kill previous processes
echo -e "${RED}🔪 Killing previous processes...${NC}"
pkill -f "node.*vite" 2>/dev/null
pkill -f "dotnet.*GridmateSignalR" 2>/dev/null
pkill -f "go run cmd/api/main.go" 2>/dev/null
pkill -f "npm.*sideload" 2>/dev/null
sleep 1

echo -e "${GREEN}✅ Previous processes killed${NC}"
echo ""

# Get the absolute path to the project root
PROJECT_ROOT=$(pwd)

# --- Start Services in New Terminal Windows ---

# 1. Start SignalR Service
echo -e "${YELLOW}1️⃣  Starting .NET SignalR service in a new terminal...${NC}"
osascript <<EOD
tell application "Terminal"
    do script "cd '${PROJECT_ROOT}/signalr-service/GridmateSignalR' && echo '--- .NET SignalR Service ---' && /usr/local/share/dotnet/dotnet run --launch-profile https"
end tell
EOD

# 2. Start Go Backend
echo -e "${YELLOW}2️⃣  Starting Go backend service in a new terminal...${NC}"
osascript <<EOD
tell application "Terminal"
    do script "cd '${PROJECT_ROOT}/backend' && echo '--- Go Backend Service ---' && LOG_LEVEL=debug go run cmd/api/main.go"
end tell
EOD

# 3. Start Frontend Dev Server
echo -e "${YELLOW}3️⃣  Starting Frontend dev server in a new terminal...${NC}"
osascript <<EOD
tell application "Terminal"
    do script "cd '${PROJECT_ROOT}/excel-addin' && echo '--- Frontend Vite Service ---' && npm run dev"
end tell
EOD

echo ""
echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 10 # Give services time to start up

# 4. Sideload the add-in
echo -e "${YELLOW}4️⃣  Sideloading Excel add-in...${NC}"
cd "${PROJECT_ROOT}/excel-addin"
npm run sideload
cd "${PROJECT_ROOT}"

echo ""
echo -e "${GREEN}🎉 Gridmate development environment is running!${NC}"
echo ""
echo -e "${YELLOW}💡 Your services are running in separate terminal windows.${NC}"
echo "   - Look for the '.NET SignalR Service' window for SignalR logs."
echo "   - Look for the 'Go Backend Service' window for Go logs."
echo "   - Look for the 'Frontend Vite Service' window for Vite logs."
echo ""
echo -e "${RED}👉 To stop the environment, close the new terminal windows or press Ctrl+C in each one.${NC}"
echo "" 