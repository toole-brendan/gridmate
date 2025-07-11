package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gridmate/backend/internal/auth"
	"github.com/gridmate/backend/internal/repository"
	"github.com/sirupsen/logrus"
)

type contextKey string

const (
	UserIDKey    contextKey = "user_id"
	UserEmailKey contextKey = "user_email"
	UserRoleKey  contextKey = "user_role"
)

type AuthMiddleware struct {
	jwtManager *auth.JWTManager
	apiKeyRepo repository.APIKeyRepository
	logger     *logrus.Logger
}

func NewAuthMiddleware(jwtManager *auth.JWTManager, apiKeyRepo repository.APIKeyRepository, logger *logrus.Logger) *AuthMiddleware {
	return &AuthMiddleware{
		jwtManager: jwtManager,
		apiKeyRepo: apiKeyRepo,
		logger:     logger,
	}
}

// Authenticate validates JWT tokens and adds user info to context
func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token == "" {
			respondUnauthorized(w, "Missing authentication token")
			return
		}

		claims, err := m.jwtManager.ValidateAccessToken(token)
		if err != nil {
			m.logger.WithError(err).Debug("Invalid token")
			respondUnauthorized(w, "Invalid authentication token")
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
		ctx = context.WithValue(ctx, UserRoleKey, claims.Role)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole checks if the user has the required role
func (m *AuthMiddleware) RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole, ok := r.Context().Value(UserRoleKey).(string)
			if !ok {
				respondForbidden(w, "Access denied")
				return
			}

			for _, role := range roles {
				if userRole == role {
					next.ServeHTTP(w, r)
					return
				}
			}

			respondForbidden(w, "Insufficient privileges")
		})
	}
}

// OptionalAuth validates JWT tokens if present but doesn't require them
func (m *AuthMiddleware) OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractToken(r)
		if token != "" {
			claims, err := m.jwtManager.ValidateToken(token)
			if err == nil && claims.TokenType == "access" {
				// Add user info to context if token is valid
				ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
				ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
				ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
				r = r.WithContext(ctx)
			}
		}

		next.ServeHTTP(w, r)
	})
}

// APIKeyAuth validates API key authentication
func (m *AuthMiddleware) APIKeyAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-API-Key")
		if apiKey == "" {
			// Fall back to Bearer token auth
			m.Authenticate(next).ServeHTTP(w, r)
			return
		}

		// Validate the API key
		apiKeyInfo, err := m.apiKeyRepo.ValidateAPIKey(r.Context(), apiKey)
		if err != nil {
			m.logger.WithError(err).Debug("Invalid API key")
			respondUnauthorized(w, "Invalid API key")
			return
		}

		// Update last used timestamp
		go func() {
			if err := m.apiKeyRepo.UpdateLastUsed(context.Background(), apiKeyInfo.ID); err != nil {
				m.logger.WithError(err).Error("Failed to update API key last used")
			}
		}()

		// Add user info to context
		ctx := context.WithValue(r.Context(), UserIDKey, apiKeyInfo.UserID)
		ctx = context.WithValue(ctx, UserEmailKey, "") // API keys don't have email
		ctx = context.WithValue(ctx, UserRoleKey, "api")

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Helper functions

func extractToken(r *http.Request) string {
	// Check Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
			return parts[1]
		}
	}

	// Check query parameter (useful for WebSocket connections)
	if token := r.URL.Query().Get("token"); token != "" {
		return token
	}

	// Check cookie
	if cookie, err := r.Cookie("access_token"); err == nil {
		return cookie.Value
	}

	return ""
}

func respondUnauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	w.Write([]byte(`{"error":"` + message + `"}`))
}

func respondForbidden(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	w.Write([]byte(`{"error":"` + message + `"}`))
}

func respondInternalError(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	w.Write([]byte(`{"error":"Internal server error"}`))
}

// Context helper functions

func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}

func GetUserEmail(ctx context.Context) (string, bool) {
	email, ok := ctx.Value(UserEmailKey).(string)
	return email, ok
}

func GetUserRole(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(UserRoleKey).(string)
	return role, ok
}