package config

import (
	"fmt"
	"os"
	"path"
	"runtime"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// LogConfig holds the complete logging configuration
type LogConfig struct {
	// Global settings
	Level          string            `json:"level" yaml:"level"`
	Format         string            `json:"format" yaml:"format"`
	Output         string            `json:"output" yaml:"output"`
	TimeFormat     string            `json:"time_format" yaml:"time_format"`
	Environment    string            `json:"environment" yaml:"environment"`
	
	// Component-specific levels
	ComponentLevels map[string]string `json:"component_levels" yaml:"component_levels"`
	
	// Feature toggles
	EnableColors      bool              `json:"enable_colors" yaml:"enable_colors"`
	EnableCaller      bool              `json:"enable_caller" yaml:"enable_caller"`
	EnableStackTrace  bool              `json:"enable_stack_trace" yaml:"enable_stack_trace"`
	GroupOperations   bool              `json:"group_operations" yaml:"group_operations"`
	SummarizeBatch    bool              `json:"summarize_batch" yaml:"summarize_batch"`
	
	// Filtering
	SkipPaths         []string          `json:"skip_paths" yaml:"skip_paths"`
	SuppressedFields  []string          `json:"suppressed_fields" yaml:"suppressed_fields"`
	MaxBodySize       int               `json:"max_body_size" yaml:"max_body_size"`
	
	// Performance
	BufferSize        int               `json:"buffer_size" yaml:"buffer_size"`
	FlushInterval     time.Duration     `json:"flush_interval" yaml:"flush_interval"`
}

// DefaultConfig returns a default logging configuration
func DefaultConfig() *LogConfig {
	return &LogConfig{
		Level:       "info",
		Format:      "text",
		Output:      "stdout",
		TimeFormat:  "15:04:05.000",
		Environment: "development",
		
		ComponentLevels: map[string]string{
			"signalr":      "info",
			"excel_bridge": "info",
			"tool_executor": "info",
			"ai_service":   "info",
			"auth":         "info",
			"database":     "warn",
		},
		
		EnableColors:     true,
		EnableCaller:     false,
		EnableStackTrace: false,
		GroupOperations:  true,
		SummarizeBatch:   true,
		
		SkipPaths: []string{
			"/health",
			"/readiness",
			"/api/v1/health",
			"/metrics",
		},
		
		SuppressedFields: []string{
			"password",
			"token",
			"secret",
			"api_key",
			"authorization",
		},
		
		MaxBodySize:   1024,
		BufferSize:    1000,
		FlushInterval: 5 * time.Second,
	}
}

// DevelopmentConfig returns configuration optimized for development
func DevelopmentConfig() *LogConfig {
	config := DefaultConfig()
	config.Level = "debug"
	config.Format = "text"
	config.EnableColors = true
	config.EnableCaller = true
	config.GroupOperations = true
	config.SummarizeBatch = true
	config.TimeFormat = "15:04:05"
	
	// More verbose component logging in development
	config.ComponentLevels = map[string]string{
		"signalr":      "debug",
		"excel_bridge": "debug",
		"tool_executor": "info",
		"ai_service":   "debug",
		"auth":         "info",
		"database":     "info",
	}
	
	return config
}

// ProductionConfig returns configuration optimized for production
func ProductionConfig() *LogConfig {
	config := DefaultConfig()
	config.Level = "info"
	config.Format = "json"
	config.EnableColors = false
	config.EnableCaller = false
	config.GroupOperations = false
	config.SummarizeBatch = false
	config.TimeFormat = "2006-01-02T15:04:05.000Z"
	config.Environment = "production"
	
	// Less verbose component logging in production
	config.ComponentLevels = map[string]string{
		"signalr":      "warn",
		"excel_bridge": "info",
		"tool_executor": "info",
		"ai_service":   "info",
		"auth":         "warn",
		"database":     "error",
	}
	
	return config
}

// DebugConfig returns configuration for debugging issues
func DebugConfig() *LogConfig {
	config := DefaultConfig()
	config.Level = "trace"
	config.Format = "text"
	config.EnableColors = true
	config.EnableCaller = true
	config.EnableStackTrace = true
	config.GroupOperations = false
	config.SummarizeBatch = false
	config.Environment = "debug"
	
	// Maximum verbosity for all components
	for component := range config.ComponentLevels {
		config.ComponentLevels[component] = "trace"
	}
	
	return config
}

// ConfigureLogger creates and configures a logger based on the provided config
func ConfigureLogger(cfg *LogConfig) *logrus.Logger {
	logger := logrus.New()
	
	// Set global log level
	level, err := logrus.ParseLevel(cfg.Level)
	if err != nil {
		level = logrus.InfoLevel
	}
	logger.SetLevel(level)
	
	// Configure output
	switch cfg.Output {
	case "stdout":
		logger.SetOutput(os.Stdout)
	case "stderr":
		logger.SetOutput(os.Stderr)
	default:
		file, err := os.OpenFile(cfg.Output, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
		if err != nil {
			logger.WithError(err).Error("Failed to open log file, using stdout")
			logger.SetOutput(os.Stdout)
		} else {
			logger.SetOutput(file)
		}
	}
	
	// Configure formatter based on format and environment
	switch cfg.Format {
	case "json":
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat:   cfg.TimeFormat,
			DisableTimestamp:  false,
			DisableHTMLEscape: true,
			PrettyPrint:       cfg.Environment == "development",
			FieldMap: logrus.FieldMap{
				logrus.FieldKeyTime:  "timestamp",
				logrus.FieldKeyLevel: "level",
				logrus.FieldKeyMsg:   "message",
				logrus.FieldKeyFunc:  "caller",
			},
		})
	default:
		logger.SetFormatter(&CustomTextFormatter{
			TextFormatter: &logrus.TextFormatter{
				TimestampFormat: cfg.TimeFormat,
				FullTimestamp:   true,
				DisableColors:   !cfg.EnableColors,
				CallerPrettyfier: func(f *runtime.Frame) (string, string) {
					filename := path.Base(f.File)
					return fmt.Sprintf("%s()", f.Function), fmt.Sprintf("%s:%d", filename, f.Line)
				},
			},
			Config: cfg,
		})
	}
	
	// Set report caller
	logger.SetReportCaller(cfg.EnableCaller)
	
	return logger
}

// GetComponentLogger returns a logger configured for a specific component
func GetComponentLogger(baseLogger *logrus.Logger, cfg *LogConfig, component string) *logrus.Logger {
	componentLogger := logrus.New()
	
	// Copy base logger settings
	componentLogger.SetOutput(baseLogger.Out)
	componentLogger.SetFormatter(baseLogger.Formatter)
	componentLogger.SetReportCaller(baseLogger.ReportCaller)
	
	// Set component-specific level
	if levelStr, ok := cfg.ComponentLevels[component]; ok {
		if level, err := logrus.ParseLevel(levelStr); err == nil {
			componentLogger.SetLevel(level)
		} else {
			componentLogger.SetLevel(baseLogger.Level)
		}
	} else {
		componentLogger.SetLevel(baseLogger.Level)
	}
	
	return componentLogger
}

// LoadFromEnv loads configuration from environment variables
func LoadFromEnv() *LogConfig {
	env := os.Getenv("APP_ENV")
	
	var config *LogConfig
	switch strings.ToLower(env) {
	case "production", "prod":
		config = ProductionConfig()
	case "debug":
		config = DebugConfig()
	default:
		config = DevelopmentConfig()
	}
	
	// Override with specific env vars
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		config.Level = level
	}
	
	if format := os.Getenv("LOG_FORMAT"); format != "" {
		config.Format = format
	}
	
	if output := os.Getenv("LOG_OUTPUT"); output != "" {
		config.Output = output
	}
	
	if colors := os.Getenv("LOG_COLORS"); colors != "" {
		config.EnableColors = strings.ToLower(colors) == "true"
	}
	
	if groupOps := os.Getenv("LOG_GROUP_OPERATIONS"); groupOps != "" {
		config.GroupOperations = strings.ToLower(groupOps) == "true"
	}
	
	return config
}

// CustomTextFormatter extends logrus.TextFormatter with custom formatting
type CustomTextFormatter struct {
	*logrus.TextFormatter
	Config *LogConfig
}

// Format implements the Formatter interface
func (f *CustomTextFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	// Check if this is a grouped operation
	if f.Config.GroupOperations {
		if _, ok := entry.Data["operation_group"]; ok {
			// Apply special formatting for grouped operations
			return f.formatGroupedOperation(entry)
		}
	}
	
	// Default formatting
	return f.TextFormatter.Format(entry)
}

// formatGroupedOperation applies special formatting for grouped operations
func (f *CustomTextFormatter) formatGroupedOperation(entry *logrus.Entry) ([]byte, error) {
	// This will be implemented in the log formatter file
	// For now, just use default formatting
	return f.TextFormatter.Format(entry)
}