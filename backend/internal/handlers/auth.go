package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/auth"
	"github.com/gridmate/backend/internal/models"
	"github.com/gridmate/backend/internal/repository"
)

type AuthHandler struct {
	userRepo       repository.UserRepository
	sessionRepo    repository.SessionRepository
	apiKeyRepo     repository.APIKeyRepository
	jwtManager     *auth.JWTManager
	passwordHasher *auth.PasswordHasher
	logger         *logrus.Logger
}

func NewAuthHandler(repos *repository.Repositories, jwtManager *auth.JWTManager, logger *logrus.Logger) *AuthHandler {
	return &AuthHandler{
		userRepo:       repos.Users,
		sessionRepo:    repos.Sessions,
		apiKeyRepo:     repos.APIKeys,
		jwtManager:     jwtManager,
		passwordHasher: auth.NewPasswordHasher(),
		logger:         logger,
	}
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	User         *UserResponse `json:"user"`
}

type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type UserResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	CreatedAt time.Time `json:"created_at"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Find user by email
	user, err := h.userRepo.GetByEmail(r.Context(), req.Email)
	if err != nil {
		h.logger.WithError(err).Error("Failed to find user")
		h.sendError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Verify password
	valid, err := h.passwordHasher.VerifyPassword(req.Password, user.PasswordHash)
	if err != nil || !valid {
		h.sendError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Generate tokens
	accessToken, refreshToken, err := h.jwtManager.GenerateTokenPair(user.ID.String(), user.Email, user.Role)
	if err != nil {
		h.logger.WithError(err).Error("Failed to generate tokens")
		h.sendError(w, http.StatusInternalServerError, "Failed to generate tokens")
		return
	}

	// Create session
	// Hash the tokens for storage
	tokenHash := auth.HashAPIKey(accessToken)
	refreshTokenHash := auth.HashAPIKey(refreshToken)
	expiresAt := time.Now().Add(30 * 24 * time.Hour).Unix() // 30 days
	
	if err := h.sessionRepo.Create(r.Context(), user.ID, tokenHash, refreshTokenHash, expiresAt); err != nil {
		h.logger.WithError(err).Error("Failed to create session")
		h.sendError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// Update last login
	// TODO: Implement UpdateLastLogin in UserRepository
	// if err := h.userRepo.UpdateLastLogin(r.Context(), user.ID); err != nil {
	// 	h.logger.WithError(err).Warn("Failed to update last login")
	// }

	// Send response
	resp := LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(h.jwtManager.GetAccessTokenDuration().Seconds()),
		User: &UserResponse{
			ID:        user.ID.String(),
			Email:     user.Email,
			FirstName: "", // TODO: Handle nullable FirstName
			LastName:  "", // TODO: Handle nullable LastName,
			CreatedAt: user.CreatedAt,
		},
	}

	h.sendJSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Check if user already exists
	existing, _ := h.userRepo.GetByEmail(r.Context(), req.Email)
	if existing != nil {
		h.sendError(w, http.StatusConflict, "User already exists")
		return
	}

	// Hash password
	passwordHash, err := h.passwordHasher.HashPassword(req.Password)
	if err != nil {
		h.logger.WithError(err).Error("Failed to hash password")
		h.sendError(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	// Create user
	firstName := req.FirstName
	lastName := req.LastName
	user := &models.User{
		Email:        req.Email,
		PasswordHash: passwordHash,
		FirstName:    &firstName,
		LastName:     &lastName,
		Role:         "user", // Default role
	}

	if err := h.userRepo.Create(r.Context(), user); err != nil {
		h.logger.WithError(err).Error("Failed to create user")
		h.sendError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Generate tokens
	accessToken, refreshToken, err := h.jwtManager.GenerateTokenPair(user.ID.String(), user.Email, user.Role)
	if err != nil {
		h.logger.WithError(err).Error("Failed to generate tokens")
		h.sendError(w, http.StatusInternalServerError, "Failed to generate tokens")
		return
	}

	// Create session
	// Hash the tokens for storage
	tokenHash := auth.HashAPIKey(accessToken)
	refreshTokenHash := auth.HashAPIKey(refreshToken)
	expiresAt := time.Now().Add(30 * 24 * time.Hour).Unix() // 30 days
	
	if err := h.sessionRepo.Create(r.Context(), user.ID, tokenHash, refreshTokenHash, expiresAt); err != nil {
		h.logger.WithError(err).Error("Failed to create session")
		h.sendError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// Send response
	resp := LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(h.jwtManager.GetAccessTokenDuration().Seconds()),
		User: &UserResponse{
			ID:        user.ID.String(),
			Email:     user.Email,
			FirstName: "", // TODO: Handle nullable FirstName
			LastName:  "", // TODO: Handle nullable LastName,
			CreatedAt: user.CreatedAt,
		},
	}

	h.sendJSON(w, http.StatusCreated, resp)
}

func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate refresh token
	_, err := h.jwtManager.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid refresh token")
		return
	}

	// Check if session exists by hashed refresh token
	refreshTokenHash := auth.HashAPIKey(req.RefreshToken)
	userIDPtr, err := h.sessionRepo.GetByRefreshTokenHash(r.Context(), refreshTokenHash)
	if err != nil || userIDPtr == nil {
		h.sendError(w, http.StatusUnauthorized, "Session expired")
		return
	}

	// Get user
	user, err := h.userRepo.GetByID(r.Context(), *userIDPtr)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "User not found")
		return
	}

	// Generate new tokens
	accessToken, refreshToken, err := h.jwtManager.GenerateTokenPair(user.ID.String(), user.Email, user.Role)
	if err != nil {
		h.logger.WithError(err).Error("Failed to generate tokens")
		h.sendError(w, http.StatusInternalServerError, "Failed to generate tokens")
		return
	}

	// Delete old session and create new one
	tokenHash := auth.HashAPIKey(accessToken)
	newRefreshTokenHash := auth.HashAPIKey(refreshToken)
	expiresAt := time.Now().Add(30 * 24 * time.Hour).Unix()
	
	// Delete by old refresh token
	_ = h.sessionRepo.Delete(r.Context(), refreshTokenHash)
	
	// Create new session
	if err := h.sessionRepo.Create(r.Context(), user.ID, tokenHash, newRefreshTokenHash, expiresAt); err != nil {
		h.logger.WithError(err).Error("Failed to create new session")
		h.sendError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// Send response
	resp := LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(h.jwtManager.GetAccessTokenDuration().Seconds()),
		User: &UserResponse{
			ID:        user.ID.String(),
			Email:     user.Email,
			FirstName: "", // TODO: Handle nullable FirstName
			LastName:  "", // TODO: Handle nullable LastName,
			CreatedAt: user.CreatedAt,
		},
	}

	h.sendJSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Get token from header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		h.sendError(w, http.StatusUnauthorized, "Missing authorization header")
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	claims, err := h.jwtManager.ValidateAccessToken(tokenString)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid token")
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid user ID")
		return
	}
	
	// Delete all sessions for user
	if err := h.sessionRepo.DeleteByUserID(r.Context(), userID); err != nil {
		h.logger.WithError(err).Error("Failed to delete sessions")
		h.sendError(w, http.StatusInternalServerError, "Failed to logout")
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

func (h *AuthHandler) GetCurrentUser(w http.ResponseWriter, r *http.Request) {
	// Get user ID from context (set by auth middleware)
	userIDStr := r.Context().Value("user_id").(string)
	
	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid user ID")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		h.sendError(w, http.StatusNotFound, "User not found")
		return
	}

	firstName := ""
	if user.FirstName != nil {
		firstName = *user.FirstName
	}
	lastName := ""
	if user.LastName != nil {
		lastName = *user.LastName
	}
	
	resp := UserResponse{
		ID:        user.ID.String(),
		Email:     user.Email,
		FirstName: firstName,
		LastName:  lastName,
		CreatedAt: user.CreatedAt,
	}

	h.sendJSON(w, http.StatusOK, resp)
}

func (h *AuthHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode response")
	}
}

func (h *AuthHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}