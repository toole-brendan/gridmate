#!/bin/bash

echo "🚀 Starting Gridmate backend with SQLite (development mode)..."

# Load parent .env for API keys
if [ -f "../.env" ]; then
    export $(grep -v '^#' ../.env | grep -E "ANTHROPIC|OPENAI" | xargs)
fi

# Override with SQLite settings
export PORT=8080
export ENV=development
export LOG_LEVEL=debug

# Use SQLite instead of PostgreSQL
export DB_HOST=
export DB_PORT=
export DB_USER=
export DB_PASSWORD=
export DB_NAME=gridmate_dev.db
export DB_DRIVER=sqlite3

# CORS for Excel add-in
export CORS_ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000

# JWT secret for development
export JWT_SECRET=dev-secret-key-change-in-production

echo "📋 Configuration:"
echo "  - API Server: http://localhost:$PORT"
echo "  - Database: SQLite (local file: $DB_NAME)"
echo "  - CORS Origins: $CORS_ALLOWED_ORIGINS"
echo "  - Anthropic API: ${ANTHROPIC_API_KEY:0:20}..."
echo ""

# Run the backend
go run cmd/api/main.go