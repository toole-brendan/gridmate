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
pkill -f "go.*main.go" 2>/dev/null
pkill -f "npm.*sideload" 2>/dev/null
sleep 2 # Give processes time to clean up

echo -e "${GREEN}✅ Previous processes killed${NC}"
echo ""

# Function to check if a service is ready
check_service() {
    local service_name=$1
    local check_command=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if eval $check_command; then
            echo -e "${GREEN}✅ $service_name is ready${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to start${NC}"
    return 1
}

# Start SignalR service
echo -e "${YELLOW}1️⃣  Starting SignalR service...${NC}"
cd signalr-service/GridmateSignalR
/usr/local/share/dotnet/dotnet run &
SIGNALR_PID=$!
cd ../..
echo -n "Waiting for SignalR to start"
check_service "SignalR" "curl -s http://localhost:5000/health > /dev/null 2>&1 || curl -s http://localhost:5183/health > /dev/null 2>&1"
echo ""

# Start Go backend
echo -e "${YELLOW}2️⃣  Starting Go backend...${NC}"
cd backend
go run cmd/api/main.go &
GO_PID=$!
cd ..
echo -n "Waiting for Go backend to start"
check_service "Go backend" "curl -s http://localhost:8080/health > /dev/null 2>&1"
echo ""

# Start Excel add-in dev server
echo -e "${YELLOW}3️⃣  Starting Excel add-in dev server...${NC}"
cd excel-addin
npm run dev &
VITE_PID=$!
cd ..
echo -n "Waiting for Vite dev server to start"
check_service "Vite dev server" "curl -s https://localhost:3000 > /dev/null 2>&1"
echo ""

# Sideload the add-in
echo -e "${YELLOW}4️⃣  Sideloading Excel add-in...${NC}"
cd excel-addin
npm run sideload
cd ..

echo ""
echo -e "${GREEN}🎉 Gridmate development environment is running!${NC}"
echo ""
echo -e "${YELLOW}📝 Service PIDs:${NC}"
echo "   SignalR: $SIGNALR_PID"
echo "   Go Backend: $GO_PID"
echo "   Vite Dev Server: $VITE_PID"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   - All services are running in the background"
echo "   - Excel should open automatically with the add-in loaded"
echo "   - Check the logs if any service fails"
echo "   - Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${RED}🛑 Stopping all services...${NC}"
    kill $SIGNALR_PID 2>/dev/null
    kill $GO_PID 2>/dev/null
    kill $VITE_PID 2>/dev/null
    pkill -f "node.*vite" 2>/dev/null
    pkill -f "dotnet.*GridmateSignalR" 2>/dev/null
    pkill -f "go.*main.go" 2>/dev/null
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT

# Keep the script running
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
wait 