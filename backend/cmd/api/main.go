package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
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
	"github.com/gridmate/backend/internal/middleware"
	"github.com/gridmate/backend/internal/repository"
	"github.com/gridmate/backend/internal/routes"
	"github.com/gridmate/backend/internal/services"
	"github.com/gridmate/backend/internal/services/ai"
	"github.com/gridmate/backend/internal/services/documents"
	"github.com/gridmate/backend/pkg/logger"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize logger using factory
	logger := logger.NewDefaultLogger()

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

	// Initialize session manager
	sessionManager := services.NewSessionManager(logger)

	// Initialize AI service
	aiServiceConfig := ai.ServiceConfig{
		Provider:        cfg.AI.Provider,
		DefaultModel:    cfg.AI.Model,
		StreamingMode:   cfg.AI.StreamingMode,
		MaxTokens:       cfg.AI.MaxTokens,
		Temperature:     cfg.AI.Temperature,
		TopP:            cfg.AI.TopP,
		RequestTimeout:  cfg.AI.RequestTimeout,
		RetryDelay:      cfg.AI.RetryDelay,
		EnableActions:   cfg.AI.EnableActions,
		EnableEmbedding: cfg.AI.EnableEmbedding,
	}
	aiService, err := ai.NewService(aiServiceConfig)
	if err != nil {
		logger.WithError(err).Warn("Failed to initialize AI service")
	}

	// Initialize Excel bridge service, injecting the AI service
	excelBridge := services.NewExcelBridge(logger, aiService)
	excelBridge.SetSessionManager(sessionManager)
	if aiService != nil {
		// Set the AI service on the bridge
		excelBridge.SetAIService(aiService)

		// Get components from bridge and wire them to AI service
		toolExecutor := excelBridge.GetToolExecutor()
		if toolExecutor != nil {
			aiService.SetToolExecutor(toolExecutor)
			logger.Info("Tool executor transferred to main AI service")
		}

		// Wire context builder to AI service
		contextBuilder := excelBridge.GetContextBuilder()
		if contextBuilder != nil {
			aiService.SetContextBuilder(contextBuilder)
			logger.Info("Context builder transferred to main AI service")
		}

		// Wire queued operations registry to AI service
		queuedOpsRegistry := excelBridge.GetQueuedOperationRegistry()
		if queuedOpsRegistry != nil {
			aiService.SetQueuedOperationRegistry(queuedOpsRegistry)
			logger.Info("Queued operations registry transferred to main AI service")
		}

		// Initialize advanced AI components
		if toolExecutor != nil {
			logger.Info("Initializing advanced AI components (memory, context analyzer, orchestrator)")

			// Create financial memory repository and service
			memoryRepo := repository.NewFinancialMemoryRepository(db.DB.DB)
			memoryService := ai.NewFinancialMemoryService(db.DB.DB, memoryRepo)

			// Create model validator
			modelValidator := ai.NewDefaultModelValidator(toolExecutor)

			// Create context analyzer
			contextAnalyzer := ai.NewFinancialModelAnalyzer(toolExecutor, memoryService, modelValidator)

			// Create tool orchestrator
			toolOrchestrator := ai.NewToolOrchestrator(toolExecutor, memoryService, contextAnalyzer)

			// Wire up advanced components to AI service
			aiService.SetAdvancedComponents(memoryService, contextAnalyzer, toolOrchestrator)

			logger.Info("Advanced AI components successfully initialized and connected")
		}
	}

	// Initialize SignalR bridge
	signalRBridge := handlers.NewSignalRBridge("http://localhost:5252")

	// Set SignalR bridge in Excel bridge for tool requests
	excelBridge.SetSignalRBridge(signalRBridge)

	// Initialize document service
	docService := documents.NewDocumentService(logger, aiService, repos.Documents, repos.Embeddings)

	// Initialize handlers
	signalRHandler := handlers.NewSignalRHandler(excelBridge, signalRBridge, logger)
	metricsHandler := handlers.NewMetricsHandler(sessionManager, logger)

	// Initialize router
	router := mux.NewRouter()

	// Initialize logging middleware
	loggingMiddleware := middleware.NewLoggingMiddleware(logger)
	router.Use(loggingMiddleware.Middleware)

	// Initialize acknowledgment middleware
	ackMiddleware := middleware.AcknowledgmentMiddleware(logger)
	router.Use(ackMiddleware)

	// Add compression middleware for better performance
	router.Use(middleware.GzipMiddleware)

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		sessionCount := sessionManager.GetSessionCount()
		fmt.Fprintf(w, `{"status":"healthy","timestamp":"%s","session_count":%d}`, time.Now().UTC().Format(time.RFC3339), sessionCount)
	}).Methods("GET")

	// Chat API endpoints for SignalR bridge
	router.HandleFunc("/api/chat", signalRHandler.HandleSignalRChat).Methods("POST")
	router.HandleFunc("/api/tool-response", signalRHandler.HandleSignalRToolResponse).Methods("POST")
	router.HandleFunc("/api/selection-update", signalRHandler.HandleSignalRSelectionUpdate).Methods("POST")

	// Metrics endpoints
	router.HandleFunc("/api/metrics/sessions", metricsHandler.GetSessionMetrics).Methods("GET")
	router.HandleFunc("/api/metrics/health", metricsHandler.GetHealthCheck).Methods("GET")
	router.HandleFunc("/api/metrics/session", metricsHandler.GetSessionDetails).Methods("GET")
	router.HandleFunc("/api/metrics/sessions/by-type", metricsHandler.GetSessionsByType).Methods("GET")
	router.HandleFunc("/api/metrics/sessions/by-user", metricsHandler.GetSessionsByUser).Methods("GET")

	// Register API routes
	routes.RegisterAPIRoutes(router, repos, jwtManager, excelBridge, docService, signalRBridge, logger)

	// Configure CORS
	corsOptions := cors.New(cors.Options{
		AllowedOrigins:   getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000", "https://localhost:3000"}),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Requested-With", "Upgrade", "Connection"},
		ExposedHeaders:   []string{"Content-Length", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	})

	// Create HTTP server with extended timeouts for AI and Excel operations
	port := getEnv("PORT", "8080")
	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      corsOptions.Handler(router),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 6 * time.Minute, // Longer than max request timeout
		IdleTimeout:  120 * time.Second,
		MaxHeaderBytes: 1 << 20, // 1 MB - increased to handle larger context payloads
	}

	// Start periodic session cleanup
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			ctx := context.Background()
			deleted, err := repos.Sessions.CleanupExpired(ctx)
			if err != nil {
				logger.WithError(err).Error("Failed to cleanup expired sessions")
			} else {
				logger.WithField("count", deleted).Info("Cleaned up expired sessions")
			}
		}
	}()

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
	// Parse comma-separated values with trimming
	var result []string
	for _, v := range strings.Split(value, ",") {
		trimmed := strings.TrimSpace(v)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func getLogLevel() logrus.Level {
	levelStr := getEnv("LOG_LEVEL", "info")
	level, err := logrus.ParseLevel(levelStr)
	if err != nil {
		return logrus.InfoLevel
	}
	return level
}
