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
)

func RegisterAPIRoutes(router *mux.Router, repos *repository.Repositories, jwtManager *auth.JWTManager, logger *logrus.Logger) {
	// Initialize handlers
	authHandler := handlers.NewAuthHandler(repos, jwtManager, logger)
	userHandler := handlers.NewUserHandler(repos, logger)
	apiKeyHandler := handlers.NewAPIKeyHandler(repos, logger)
	
	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(jwtManager, repos.APIKey, logger)
	
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
}