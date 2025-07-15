#!/bin/bash

echo "🚀 Starting Gridmate backend in development mode..."

# Load parent .env for API keys
if [ -f "../.env" ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

# Override with local development settings
export PORT=8080
export ENV=development
export LOG_LEVEL=info

# Azure PostgreSQL settings
export DB_HOST=gridmate-db-server.postgres.database.azure.com
export DB_PORT=5432
export DB_USER=gridmateadmin
export DB_NAME=gridmate_db
export DB_SSL_MODE=require

# You'll need to set this - for now we'll prompt
if [ -z "$DB_PASSWORD" ]; then
    echo -n "Enter password for Azure PostgreSQL (gridmateadmin@gridmate-db-server): "
    read -s DB_PASSWORD
    export DB_PASSWORD
    echo
fi

# CORS for Excel add-in
export CORS_ALLOWED_ORIGINS=http://localhost:3000,https://localhost:3000

# Disable optional services for now
export REDIS_HOST=""
export CHROMADB_HOST=""

# JWT secret for development
export JWT_SECRET=dev-secret-key-change-in-production

echo "📋 Configuration:"
echo "  - API Server: http://localhost:$PORT"
echo "  - Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "  - CORS Origins: $CORS_ALLOWED_ORIGINS"
echo "  - Anthropic API: ${ANTHROPIC_API_KEY:0:20}..."
echo ""

# Run the backend
go run cmd/api/main.go