#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Gridmate Development Environment (Single Terminal)...${NC}"
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

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${RED}🛑 Shutting down services...${NC}"
    kill $SIGNALR_PID $GO_PID $VITE_PID 2>/dev/null
    pkill -f "node.*vite" 2>/dev/null
    pkill -f "dotnet.*GridmateSignalR" 2>/dev/null
    pkill -f "go run cmd/api/main.go" 2>/dev/null
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

# --- Start Services in Background ---

# 1. Start SignalR Service
echo -e "${YELLOW}1️⃣  Starting .NET SignalR service...${NC}"
cd "${PROJECT_ROOT}/signalr-service/GridmateSignalR"
echo -e "${BLUE}--- .NET SignalR Service ---${NC}"
/usr/local/share/dotnet/dotnet run --launch-profile https &
SIGNALR_PID=$!
cd "${PROJECT_ROOT}"
echo ""

# Give SignalR time to start
sleep 3

# 2. Start Go Backend
echo -e "${YELLOW}2️⃣  Starting Go backend service...${NC}"
cd "${PROJECT_ROOT}/backend"
echo -e "${BLUE}--- Go Backend Service ---${NC}"
LOG_LEVEL=debug go run cmd/api/main.go 2>&1 | grep -E "(Building financial context|selectedData|nearbyRange)" &
GO_PID=$!
cd "${PROJECT_ROOT}"
echo ""

# Give Go backend time to start
sleep 3

# 3. Start Frontend Dev Server
echo -e "${YELLOW}3️⃣  Starting Frontend dev server...${NC}"
cd "${PROJECT_ROOT}/excel-addin"
echo -e "${BLUE}--- Frontend Vite Service ---${NC}"
npm run dev &
VITE_PID=$!
cd "${PROJECT_ROOT}"
echo ""

echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 10 # Give services time to fully start up

# 4. Sideload the add-in
echo -e "${YELLOW}4️⃣  Sideloading Excel add-in...${NC}"
cd "${PROJECT_ROOT}/excel-addin"
npm run sideload
cd "${PROJECT_ROOT}"

echo ""
echo -e "${GREEN}🎉 Gridmate development environment is running!${NC}"
echo ""
echo -e "${YELLOW}💡 All services are running in this terminal.${NC}"
echo "   - SignalR service PID: $SIGNALR_PID"
echo "   - Go backend PID: $GO_PID"
echo "   - Vite frontend PID: $VITE_PID"
echo ""
echo -e "${RED}👉 Press Ctrl+C to stop all services${NC}"
echo ""
echo -e "${BLUE}📋 Service logs will appear below:${NC}"
echo "=========================================="

# Wait for background processes
wait