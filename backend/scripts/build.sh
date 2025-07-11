#!/bin/bash

# Build script for Gridmate backend

set -e

echo "Building Gridmate backend..."

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf bin/

# Get dependencies
echo "Getting dependencies..."
go mod download
go mod tidy

# Run tests
echo "Running tests..."
go test -v ./...

# Build for multiple platforms
echo "Building binaries..."

# Linux AMD64
echo "Building for Linux AMD64..."
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/gridmate-linux-amd64 cmd/api/main.go

# Darwin AMD64 (Intel Mac)
echo "Building for Darwin AMD64..."
GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o bin/gridmate-darwin-amd64 cmd/api/main.go

# Darwin ARM64 (M1/M2 Mac)
echo "Building for Darwin ARM64..."
GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o bin/gridmate-darwin-arm64 cmd/api/main.go

# Windows AMD64
echo "Building for Windows AMD64..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/gridmate-windows-amd64.exe cmd/api/main.go

echo "Build complete! Binaries are in the bin/ directory."
ls -la bin/