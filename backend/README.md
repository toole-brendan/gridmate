# Gridmate Backend API

This is the Go backend service for Gridmate - an AI-powered financial modeling assistant.

## Prerequisites

- Go 1.22 or higher
- Docker and Docker Compose
- PostgreSQL (via Docker)
- Make (optional, for using Makefile commands)

## Quick Start

1. Clone the repository and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Set up environment variables:
   - Create `.env` in the root directory with your API keys (ANTHROPIC_API_KEY, etc.)
   - Optionally create `backend/.env` for backend-specific overrides

3. Start the development environment:
   ```bash
   docker-compose up -d
   ```

4. Run database migrations:
   ```bash
   make migrate-up
   ```

5. Run the application:
   ```bash
   make run
   ```

The API will be available at `http://localhost:8080`

## Project Structure

```
backend/
├── cmd/
│   └── api/          # Application entrypoint
├── internal/         # Private application code
│   ├── config/       # Configuration management
│   ├── handlers/     # HTTP request handlers
│   ├── middleware/   # HTTP middleware
│   ├── models/       # Data models
│   ├── repository/   # Data access layer
│   └── services/     # Business logic
├── pkg/              # Public packages
│   ├── logger/       # Logging utilities
│   └── utils/        # Helper functions
├── migrations/       # Database migrations
├── scripts/          # Build and deployment scripts
├── go.mod           # Go module definition
├── go.sum           # Go module checksums
├── Dockerfile       # Container definition
├── docker-compose.yml # Local development setup
└── Makefile         # Common tasks

```

## Available Commands

```bash
make help          # Show all available commands
make build         # Build the application
make run           # Run the application
make test          # Run tests
make docker-up     # Start Docker containers
make docker-down   # Stop Docker containers
make migrate-up    # Run database migrations
make migrate-down  # Rollback migrations
make lint          # Run linter
make fmt           # Format code
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/v1` - API welcome message

## Development

### Running locally without Docker

1. Ensure PostgreSQL is running locally
2. Update `.env` with your local database credentials
3. Run migrations: `make migrate-up`
4. Run the application: `go run cmd/api/main.go`

### Running tests

```bash
make test
make test-coverage  # With coverage report
```

### Code formatting and linting

```bash
make fmt   # Format code
make lint  # Run linter
```

## Configuration

The application uses environment variables for configuration. The backend scripts (run-dev.sh, run-dev-sqlite.sh) load from the root `.env` file and set appropriate defaults.

Key configuration areas:
- Database connection
- JWT authentication
- CORS settings
- External API keys
- Feature flags

## Docker Support

### Building the Docker image

```bash
docker build -t gridmate-api:latest .
```

### Running with Docker Compose

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- ChromaDB vector database
- The API service

## Database Migrations

Migrations are managed using golang-migrate. Place migration files in the `migrations/` directory.

Create a new migration:
```bash
migrate create -ext sql -dir migrations -seq create_users_table
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

[License information here]