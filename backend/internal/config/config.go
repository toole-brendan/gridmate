package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	App      AppConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Redis    RedisConfig
	CORS     CORSConfig
	API      APIConfig
	AI       AIConfig
}

// AppConfig holds application-specific configuration
type AppConfig struct {
	Port        string
	Environment string
	LogLevel    string
	Name        string
	Version     string
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host         string
	Port         int
	User         string
	Password     string
	Name         string
	SSLMode      string
	MaxOpenConns int
	MaxIdleConns int
	MaxLifetime  time.Duration
}

// JWTConfig holds JWT configuration
type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	Enabled  bool
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
	MaxAge         int
}

// APIConfig holds external API configuration
type APIConfig struct {
	AnthropicKey string
	OpenAIKey    string
}

// AIConfig holds AI service configuration
type AIConfig struct {
	Provider        string
	Model           string
	StreamingMode   bool
	MaxTokens       int
	Temperature     float32
	TopP            float32
	RequestTimeout  time.Duration
	EnableActions   bool
	EnableEmbedding bool
	// Provider-specific configs
	AnthropicAPIKey    string
	AzureOpenAIKey     string
	AzureOpenAIEndpoint string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		App: AppConfig{
			Port:        getEnv("PORT", "8080"),
			Environment: getEnv("ENV", "development"),
			LogLevel:    getEnv("LOG_LEVEL", "info"),
			Name:        "Gridmate API",
			Version:     "1.0.0",
		},
		Database: DatabaseConfig{
			Host:         getEnv("DB_HOST", "localhost"),
			Port:         getEnvAsInt("DB_PORT", 5432),
			User:         getEnv("DB_USER", "gridmate"),
			Password:     getEnv("DB_PASSWORD", ""),
			Name:         getEnv("DB_NAME", "gridmate_db"),
			SSLMode:      getEnv("DB_SSL_MODE", "disable"),
			MaxOpenConns: getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns: getEnvAsInt("DB_MAX_IDLE_CONNS", 5),
			MaxLifetime:  getEnvAsDuration("DB_MAX_LIFETIME", 5*time.Minute),
		},
		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", ""),
			Expiry: getEnvAsDuration("JWT_EXPIRY", 24*time.Hour),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnvAsInt("REDIS_PORT", 6379),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getEnvAsInt("REDIS_DB", 0),
			Enabled:  getEnvAsBool("REDIS_ENABLED", true),
		},
		CORS: CORSConfig{
			AllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
			AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
			AllowedHeaders: []string{"Authorization", "Content-Type", "X-Requested-With"},
			MaxAge:         getEnvAsInt("CORS_MAX_AGE", 300),
		},
		API: APIConfig{
			AnthropicKey: getEnv("ANTHROPIC_API_KEY", ""),
			OpenAIKey:    getEnv("OPENAI_API_KEY", ""),
		},
		AI: AIConfig{
			Provider:            getEnv("AI_PROVIDER", "anthropic"),
			Model:              getEnv("AI_MODEL", ""),
			StreamingMode:      getEnvAsBool("AI_STREAMING", true),
			MaxTokens:          getEnvAsInt("AI_MAX_TOKENS", 8192), // Increased for complex tool sequences
			Temperature:        getEnvAsFloat32("AI_TEMPERATURE", 0.7),
			TopP:               getEnvAsFloat32("AI_TOP_P", 0.9),
			RequestTimeout:     getEnvAsDuration("AI_REQUEST_TIMEOUT", 30*time.Second),
			EnableActions:      getEnvAsBool("AI_ENABLE_ACTIONS", true),
			EnableEmbedding:    getEnvAsBool("AI_ENABLE_EMBEDDING", true),
			AnthropicAPIKey:    getEnv("ANTHROPIC_API_KEY", ""),
			AzureOpenAIKey:     getEnv("AZURE_OPENAI_KEY", ""),
			AzureOpenAIEndpoint: getEnv("AZURE_OPENAI_ENDPOINT", ""),
		},
	}

	// Validate required configuration
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.Database.Password == "" {
		return fmt.Errorf("database password is required")
	}
	if c.JWT.Secret == "" && c.App.Environment != "development" {
		return fmt.Errorf("JWT secret is required in non-development environments")
	}
	return nil
}

// DatabaseDSN returns the database connection string
func (c *Config) DatabaseDSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	return strings.Split(valueStr, ",")
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	valueStr := getEnv(key, "")
	if value, err := time.ParseDuration(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsFloat32(key string, defaultValue float32) float32 {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseFloat(valueStr, 32); err == nil {
		return float32(value)
	}
	return defaultValue
}