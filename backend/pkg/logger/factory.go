package logger

import (
	"os"
	"strings"

	"github.com/sirupsen/logrus"
)

// Config holds logger configuration
type Config struct {
	Level      string
	Format     string // "json" or "text"
	Output     string // "stdout" or file path
	TimeFormat string
}

// NewLogger creates a configured logger instance
func NewLogger(cfg *Config) *logrus.Logger {
	logger := logrus.New()

	// Set log level
	level, err := logrus.ParseLevel(cfg.Level)
	if err != nil {
		level = logrus.InfoLevel
	}
	logger.SetLevel(level)

	// Set formatter
	if cfg.Format == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: cfg.TimeFormat,
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "time",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
			},
		})
	} else {
		logger.SetFormatter(&logrus.TextFormatter{
			TimestampFormat: cfg.TimeFormat,
			FullTimestamp:   true,
		})
	}

	// Set output
	if cfg.Output != "" && cfg.Output != "stdout" {
		file, err := os.OpenFile(cfg.Output, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err == nil {
			logger.SetOutput(file)
		} else {
			logger.WithError(err).Error("Failed to open log file, using stdout")
		}
	}

	return logger
}

// NewDefaultLogger creates a logger with default configuration
func NewDefaultLogger() *logrus.Logger {
	cfg := &Config{
		Level:      getEnvOrDefault("LOG_LEVEL", "info"),
		Format:     getEnvOrDefault("LOG_FORMAT", "json"),
		Output:     getEnvOrDefault("LOG_OUTPUT", "stdout"),
		TimeFormat: "2006-01-02T15:04:05.000Z",
	}
	return NewLogger(cfg)
}

// NewComponentLogger creates a logger for a specific component
func NewComponentLogger(component string) *logrus.Logger {
	logger := NewDefaultLogger()
	return logger.WithField("component", component).Logger
}

// WithRequestID adds request ID to logger context
func WithRequestID(logger *logrus.Logger, requestID string) *logrus.Entry {
	return logger.WithField("request_id", requestID)
}

// WithUserContext adds user context to logger
func WithUserContext(logger *logrus.Logger, userID, email string) *logrus.Entry {
	return logger.WithFields(logrus.Fields{
		"user_id":    userID,
		"user_email": email,
	})
}

// WithError adds error context to logger
func WithError(logger *logrus.Logger, err error) *logrus.Entry {
	return logger.WithError(err)
}

// getEnvOrDefault gets environment variable or returns default
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return strings.ToLower(value)
	}
	return defaultValue
}
