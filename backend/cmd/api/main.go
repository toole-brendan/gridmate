package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/auth"
	"github.com/gridmate/backend/internal/config"
	"github.com/gridmate/backend/internal/database"
	"github.com/gridmate/backend/internal/handlers"
	"github.com/gridmate/backend/internal/repository"
	"github.com/gridmate/backend/internal/routes"
	"github.com/gridmate/backend/internal/services"
	"github.com/gridmate/backend/internal/services/ai"
	"github.com/gridmate/backend/internal/services/documents"
	"github.com/gridmate/backend/internal/websocket"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize logger
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetLevel(getLogLevel())

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	db, err := database.New(&cfg.Database, logger)
	if err != nil {
		logger.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db, "./migrations"); err != nil {
		logger.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repositories
	repos := repository.NewRepositories(db)

	// Initialize JWT manager
	jwtManager := auth.NewJWTManager(&cfg.JWT)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub(logger)
	go wsHub.Run()
	defer wsHub.Stop()

	// Initialize AI service
	aiService := ai.NewService(cfg, logger)

	// Initialize document service
	var docService *documents.DocumentService
	if aiService != nil {
		docService = documents.NewDocumentService(logger, aiService, repos.Documents, repos.Embeddings)
	} else {
		logger.Warn("Document service not initialized - AI service unavailable")
	}

	// Initialize Excel bridge service
	excelBridge := services.NewExcelBridge(wsHub, logger)
	excelBridge.SetAIService(aiService)

	// Initialize handlers
	wsHandler := handlers.NewWebSocketHandler(wsHub, logger)

	// Initialize router
	router := mux.NewRouter()

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, `{"status":"healthy","timestamp":"%s"}`, time.Now().UTC().Format(time.RFC3339))
	}).Methods("GET")

	// WebSocket endpoint
	router.HandleFunc("/ws", wsHandler.HandleWebSocket)
	router.HandleFunc("/ws/status", wsHandler.GetStatus).Methods("GET")

	// Register API routes
	routes.RegisterAPIRoutes(router, repos, jwtManager, excelBridge, docService, logger)

	// Configure CORS
	corsOptions := cors.New(cors.Options{
		AllowedOrigins:   getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000", "ws://localhost:3000"}),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Requested-With", "Upgrade", "Connection"},
		ExposedHeaders:   []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	// Create HTTP server
	port := getEnv("PORT", "8080")
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      corsOptions.Handler(router),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.Infof("Starting server on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down server...")

	// Graceful shutdown with 30 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatalf("Server forced to shutdown: %v", err)
	}

	logger.Info("Server exited")
}

func loggingMiddleware(logger *logrus.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			
			// Call the next handler
			next.ServeHTTP(w, r)
			
			// Log the request
			logger.WithFields(logrus.Fields{
				"method":   r.Method,
				"path":     r.URL.Path,
				"duration": time.Since(start).Milliseconds(),
				"ip":       r.RemoteAddr,
			}).Info("Request processed")
		})
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	// Simple comma-separated parsing
	// TODO: Implement proper parsing with trimming
	return []string{value}
}

func getLogLevel() logrus.Level {
	levelStr := getEnv("LOG_LEVEL", "info")
	level, err := logrus.ParseLevel(levelStr)
	if err != nil {
		return logrus.InfoLevel
	}
	return level
}