package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/auth"
	"github.com/gridmate/backend/internal/models"
	"github.com/gridmate/backend/internal/repository"
)

type AuthHandler struct {
	userRepo    repository.UserRepository
	sessionRepo repository.SessionRepository
	apiKeyRepo  repository.APIKeyRepository
	jwtManager  *auth.JWTManager
	logger      *logrus.Logger
}

func NewAuthHandler(repos *repository.Repositories, jwtManager *auth.JWTManager, logger *logrus.Logger) *AuthHandler {
	return &AuthHandler{
		userRepo:    repos.User,
		sessionRepo: repos.Session,
		apiKeyRepo:  repos.APIKey,
		jwtManager:  jwtManager,
		logger:      logger,
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
	if err := auth.VerifyPassword(user.PasswordHash, req.Password); err != nil {
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
	session := &models.Session{
		UserID:           user.ID,
		RefreshTokenHash: refreshToken, // TODO: Hash this
		ExpiresAt:        time.Now().Add(30 * 24 * time.Hour), // 30 days
	}
	if err := h.sessionRepo.Create(r.Context(), session); err != nil {
		h.logger.WithError(err).Error("Failed to create session")
		h.sendError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// Update last login
	if err := h.userRepo.UpdateLastLogin(r.Context(), user.ID); err != nil {
		h.logger.WithError(err).Warn("Failed to update last login")
	}

	// Send response
	resp := LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int(h.jwtManager.GetAccessTokenDuration().Seconds()),
		User: &UserResponse{
			ID:        user.ID.String(),
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
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
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		h.logger.WithError(err).Error("Failed to hash password")
		h.sendError(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	// Create user
	user := &models.User{
		Email:        req.Email,
		PasswordHash: passwordHash,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
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
	session := &models.Session{
		UserID:           user.ID,
		RefreshTokenHash: refreshToken, // TODO: Hash this
		ExpiresAt:        time.Now().Add(30 * 24 * time.Hour),
	}
	if err := h.sessionRepo.Create(r.Context(), session); err != nil {
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
			FirstName: user.FirstName,
			LastName:  user.LastName,
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
	claims, err := h.jwtManager.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid refresh token")
		return
	}

	// Check if session exists
	session, err := h.sessionRepo.GetByRefreshToken(r.Context(), req.RefreshToken)
	if err != nil || session.ExpiresAt.Before(time.Now()) {
		h.sendError(w, http.StatusUnauthorized, "Session expired")
		return
	}

	// Parse user ID
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid user ID")
		return
	}
	
	// Get user
	user, err := h.userRepo.GetByID(r.Context(), userID)
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

	// Update session
	session.RefreshTokenHash = refreshToken // TODO: Hash this
	session.ExpiresAt = time.Now().Add(30 * 24 * time.Hour)
	if err := h.sessionRepo.Update(r.Context(), session); err != nil {
		h.logger.WithError(err).Error("Failed to update session")
		h.sendError(w, http.StatusInternalServerError, "Failed to update session")
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
			FirstName: user.FirstName,
			LastName:  user.LastName,
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

	resp := UserResponse{
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
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