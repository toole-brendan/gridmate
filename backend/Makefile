.PHONY: help build run test clean docker-up docker-down migrate-up migrate-down lint fmt

# Default target
help:
	@echo "Available targets:"
	@echo "  build        - Build the application"
	@echo "  run          - Run the application locally"
	@echo "  test         - Run tests"
	@echo "  clean        - Clean build artifacts"
	@echo "  docker-up    - Start Docker containers"
	@echo "  docker-down  - Stop Docker containers"
	@echo "  migrate-up   - Run database migrations"
	@echo "  migrate-down - Rollback database migrations"
	@echo "  lint         - Run linter"
	@echo "  fmt          - Format code"

# Build the application
build:
	@echo "Building application..."
	@go build -o bin/api cmd/api/main.go

# Run the application
run:
	@echo "Running application..."
	@go run cmd/api/main.go

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf bin/ tmp/ coverage.out coverage.html

# Start Docker containers
docker-up:
	@echo "Starting Docker containers..."
	@docker-compose up -d

# Stop Docker containers
docker-down:
	@echo "Stopping Docker containers..."
	@docker-compose down

# Build Docker image
docker-build:
	@echo "Building Docker image..."
	@docker build -t gridmate-api:latest .

# Run database migrations
migrate-up:
	@echo "Running migrations..."
	@migrate -path migrations -database "postgresql://gridmate:gridmate_dev_password@localhost:5432/gridmate_db?sslmode=disable" up

# Rollback database migrations
migrate-down:
	@echo "Rolling back migrations..."
	@migrate -path migrations -database "postgresql://gridmate:gridmate_dev_password@localhost:5432/gridmate_db?sslmode=disable" down

# Install dependencies
deps:
	@echo "Installing dependencies..."
	@go mod download
	@go mod tidy

# Run linter
lint:
	@echo "Running linter..."
	@golangci-lint run

# Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Install development tools
install-tools:
	@echo "Installing development tools..."
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Generate mocks
mocks:
	@echo "Generating mocks..."
	@go generate ./...