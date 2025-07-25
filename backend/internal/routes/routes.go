package routes

import (
	"fmt"
	"net/http"
	
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/auth"
	"github.com/gridmate/backend/internal/handlers"
	"github.com/gridmate/backend/internal/middleware"
	"github.com/gridmate/backend/internal/repository"
	"github.com/gridmate/backend/internal/services"
	"github.com/gridmate/backend/internal/services/diff"
	"github.com/gridmate/backend/internal/services/documents"
)

func RegisterAPIRoutes(
	router *mux.Router, 
	repos *repository.Repositories, 
	jwtManager *auth.JWTManager,
	excelBridge *services.ExcelBridge,
	docService *documents.DocumentService,
	signalRBridge *handlers.SignalRBridge,
	logger *logrus.Logger,
) {
	// Initialize handlers
	authHandler := handlers.NewAuthHandler(repos, jwtManager, logger)
	userHandler := handlers.NewUserHandler(repos, logger)
	apiKeyHandler := handlers.NewAPIKeyHandler(repos, logger)
	documentHandler := handlers.NewDocumentHandler(docService, logger)
	chatHandler := handlers.NewChatHandler(excelBridge, docService, logger)
	excelHandler := handlers.NewExcelHandler(excelBridge, logger)
	modelsHandler := handlers.NewModelsHandler(logger)
	auditHandler := handlers.NewAuditHandler(repos, logger)
	
	// Initialize diff service and handler
	diffService := diff.NewService()
	diffHandler := handlers.NewDiffHandler(diffService, signalRBridge, logger)
	
	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtManager, repos.APIKeys, logger)
	
	// API v1 routes
	api := router.PathPrefix("/api/v1").Subrouter()
	
	// Public routes
	api.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"message":"Welcome to Gridmate API","version":"1.0.0"}`)
	}).Methods("GET")
	
	// Auth routes (public)
	authRoutes := api.PathPrefix("/auth").Subrouter()
	authRoutes.HandleFunc("/login", authHandler.Login).Methods("POST")
	authRoutes.HandleFunc("/register", authHandler.Register).Methods("POST")
	authRoutes.HandleFunc("/refresh", authHandler.RefreshToken).Methods("POST")
	
	// Protected routes
	protected := api.PathPrefix("").Subrouter()
	protected.Use(authMiddleware.Authenticate)
	
	// Auth routes (protected)
	protected.HandleFunc("/auth/logout", authHandler.Logout).Methods("POST")
	protected.HandleFunc("/auth/me", authHandler.GetCurrentUser).Methods("GET")
	
	// User routes (protected)
	userRoutes := protected.PathPrefix("/users").Subrouter()
	userRoutes.HandleFunc("/profile", userHandler.GetProfile).Methods("GET")
	userRoutes.HandleFunc("/profile", userHandler.UpdateProfile).Methods("PUT")
	userRoutes.HandleFunc("/password", userHandler.ChangePassword).Methods("PUT")
	userRoutes.HandleFunc("/account", userHandler.DeleteAccount).Methods("DELETE")
	
	// API Key routes (protected)
	apiKeyRoutes := protected.PathPrefix("/auth/api-keys").Subrouter()
	apiKeyRoutes.HandleFunc("", apiKeyHandler.Create).Methods("POST")
	apiKeyRoutes.HandleFunc("", apiKeyHandler.List).Methods("GET")
	apiKeyRoutes.HandleFunc("/{id}", apiKeyHandler.Delete).Methods("DELETE")
	
	// Document routes (protected)
	docRoutes := protected.PathPrefix("/documents").Subrouter()
	docRoutes.HandleFunc("/edgar", documentHandler.UploadEDGARDocument).Methods("POST")
	docRoutes.HandleFunc("/search", documentHandler.SearchDocuments).Methods("POST")
	docRoutes.HandleFunc("/context", documentHandler.GetDocumentContext).Methods("GET")
	docRoutes.HandleFunc("", documentHandler.ListDocuments).Methods("GET")
	docRoutes.HandleFunc("/{id}", documentHandler.DeleteDocument).Methods("DELETE")
	
	// AI Chat routes (protected)
	chatRoutes := protected.PathPrefix("/ai").Subrouter()
	chatRoutes.HandleFunc("/chat", chatHandler.Chat).Methods("POST")
	chatRoutes.HandleFunc("/suggestions", chatHandler.GetChatSuggestions).Methods("GET")
	chatRoutes.HandleFunc("/suggest", chatHandler.SuggestFormula).Methods("POST")
	
	// Excel routes (protected)
	excelRoutes := protected.PathPrefix("/excel").Subrouter()
	excelRoutes.HandleFunc("/context", excelHandler.SendContext).Methods("POST")
	excelRoutes.HandleFunc("/diff", diffHandler.ComputeDiff).Methods("POST")
	
	// Model templates routes (protected)
	modelsRoutes := protected.PathPrefix("/models").Subrouter()
	modelsRoutes.HandleFunc("/templates", modelsHandler.GetTemplates).Methods("GET")
	modelsRoutes.HandleFunc("/template", modelsHandler.GetTemplate).Methods("GET")
	
	// Audit routes (protected)
	auditRoutes := protected.PathPrefix("/audit").Subrouter()
	auditRoutes.HandleFunc("/log", auditHandler.LogAction).Methods("POST")
	auditRoutes.HandleFunc("/logs", auditHandler.GetLogs).Methods("GET")
}