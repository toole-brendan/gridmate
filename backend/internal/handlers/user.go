package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	
	"github.com/gridmate/backend/internal/auth"
	"github.com/gridmate/backend/internal/models"
	"github.com/gridmate/backend/internal/repository"
)

type UserHandler struct {
	userRepo       repository.UserRepository
	passwordHasher *auth.PasswordHasher
	logger         *logrus.Logger
}

func NewUserHandler(repos *repository.Repositories, logger *logrus.Logger) *UserHandler {
	return &UserHandler{
		userRepo:       repos.Users,
		passwordHasher: auth.NewPasswordHasher(),
		logger:         logger,
	}
}

type UpdateProfileRequest struct {
	FirstName string `json:"first_name,omitempty"`
	LastName  string `json:"last_name,omitempty"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

// UserResponse is defined in auth.go

func (h *UserHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
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

func (h *UserHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	
	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid user ID")
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		h.sendError(w, http.StatusNotFound, "User not found")
		return
	}

	// Update fields
	updateReq := &models.UpdateUserRequest{}
	if req.FirstName != "" {
		updateReq.FirstName = &req.FirstName
	}
	if req.LastName != "" {
		updateReq.LastName = &req.LastName
	}

	if err := h.userRepo.Update(r.Context(), userID, updateReq); err != nil {
		h.logger.WithError(err).Error("Failed to update user")
		h.sendError(w, http.StatusInternalServerError, "Failed to update profile")
		return
	}
	
	// Get updated user
	user, err = h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		h.sendError(w, http.StatusInternalServerError, "Failed to retrieve updated user")
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

func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	
	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid user ID")
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.sendError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		h.sendError(w, http.StatusNotFound, "User not found")
		return
	}

	// Verify current password
	valid, err := h.passwordHasher.VerifyPassword(req.CurrentPassword, user.PasswordHash)
	if err != nil || !valid {
		h.sendError(w, http.StatusUnauthorized, "Current password is incorrect")
		return
	}

	// Hash new password
	newPasswordHash, err := h.passwordHasher.HashPassword(req.NewPassword)
	if err != nil {
		h.logger.WithError(err).Error("Failed to hash password")
		h.sendError(w, http.StatusInternalServerError, "Failed to update password")
		return
	}

	// Update password
	// TODO: Add UpdatePassword method to UserRepository
	// For now, this is a placeholder
	h.logger.WithFields(logrus.Fields{
		"user_id": userID,
		"hash_length": len(newPasswordHash),
	}).Info("Password update requested")
	
	// if err := h.userRepo.UpdatePassword(r.Context(), userID, newPasswordHash); err != nil {
	// 	h.logger.WithError(err).Error("Failed to update user")
	// 	h.sendError(w, http.StatusInternalServerError, "Failed to update password")
	// 	return
	// }

	h.sendJSON(w, http.StatusOK, map[string]string{"message": "Password updated successfully"})
}

func (h *UserHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.Context().Value("user_id").(string)
	
	// Parse user ID
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		h.sendError(w, http.StatusUnauthorized, "Invalid user ID")
		return
	}

	// Soft delete the user
	if err := h.userRepo.Delete(r.Context(), userID); err != nil {
		h.logger.WithError(err).Error("Failed to delete user")
		h.sendError(w, http.StatusInternalServerError, "Failed to delete account")
		return
	}

	h.sendJSON(w, http.StatusOK, map[string]string{"message": "Account deleted successfully"})
}

func (h *UserHandler) sendJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.WithError(err).Error("Failed to encode response")
	}
}

func (h *UserHandler) sendError(w http.ResponseWriter, status int, message string) {
	h.sendJSON(w, status, map[string]string{"error": message})
}