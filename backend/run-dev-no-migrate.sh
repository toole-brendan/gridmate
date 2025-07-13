#!/bin/bash

echo "🚀 Starting Gridmate backend (no auto-migration)..."

# Load parent .env
if [ -f "../.env" ]; then
    source ../.env
fi

# Disable auto-migration
export SKIP_MIGRATIONS=true
export AUTO_MIGRATE=false

echo "📋 Configuration:"
echo "  - API Server: http://localhost:$PORT"
echo "  - Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "  - Migrations: SKIPPED"
echo ""

# Run the backend
go run cmd/api/main.go