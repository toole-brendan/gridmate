package config

import (
	"github.com/gridmate/backend/internal/utils"
	"github.com/sirupsen/logrus"
)

// Example configurations for different environments

// SetupDevelopmentLogging configures logging for development with enhanced formatting
func SetupDevelopmentLogging() *logrus.Logger {
	logger := logrus.New()
	
	// Use enhanced formatter for development
	formatter := utils.NewEnhancedFormatter()
	formatter.GroupOperations = true
	formatter.SummarizeBatch = true
	
	logger.SetFormatter(formatter)
	logger.SetLevel(logrus.DebugLevel)
	
	return logger
}

// SetupProductionLogging configures logging for production with JSON output
func SetupProductionLogging() *logrus.Logger {
	cfg := ProductionConfig()
	logger := ConfigureLogger(cfg)
	
	// Production uses JSON formatting
	logger.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: "2006-01-02T15:04:05.000Z",
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "level",
			logrus.FieldKeyMsg:   "message",
		},
	})
	
	return logger
}

// Example of how logs would look in different modes:

/*
DEVELOPMENT MODE (Enhanced, Grouped, Colored):
────────────────────────────────────────────────

15:04:05.123 [INFO][tool_executor] Processing tool request { request_id: abc-123, session_id: session_123, tool: write_range }

══════ Batch Operation Group [batch_2_session_123] ══════
15:04:05.124   ├─ Format A1 { range: A1, preview: Format A1 }
15:04:05.125   ├─ Format A3:G3 { range: A3:G3, preview: Format A3:G3 }
══════ End Group [batch_2_session_123] ══════

📊 Batch Summary [batch_2_session_123]
   Total: 11 | Success: 11 | Failed: 0
   ├─ write_range: 6
   ├─ format_range: 5
   ⏱️  Duration: 2.5s
════════════════════════

PRODUCTION MODE (JSON, Structured):
────────────────────────────────────────────────

{"timestamp":"2025-07-14T22:01:06.424Z","level":"info","message":"Tool request received","component":"tool_executor","request_id":"abc-123","session_id":"session_123","tool_type":"write_range"}
{"timestamp":"2025-07-14T22:01:06.435Z","level":"info","message":"Tool request completed","component":"tool_executor","request_id":"abc-123","status":200,"duration_ms":11}

DEBUG MODE (Everything, No Grouping):
────────────────────────────────────────────────

15:04:05.123 [DEBU][signalr] main.go:45 SignalR connection established { user_id: user-123, connection_id: conn-456 }
15:04:05.124 [DEBU][excel_bridge] bridge.go:123 Reading Excel range { range: A1:Z100, include_formulas: true }
15:04:05.125 [TRAC][tool_executor] executor.go:234 Tool input validation { tool: write_range, input: {...} }
...every single operation logged...
*/

// LoggingPresets provides common logging configurations
type LoggingPresets struct {
	// Quiet mode - only errors and critical info
	Quiet func() *LogConfig
	
	// Normal mode - standard info level
	Normal func() *LogConfig
	
	// Verbose mode - detailed debug info
	Verbose func() *LogConfig
	
	// Trace mode - everything including internal operations
	Trace func() *LogConfig
}

// GetLoggingPresets returns preset configurations
func GetLoggingPresets() LoggingPresets {
	return LoggingPresets{
		Quiet: func() *LogConfig {
			cfg := DefaultConfig()
			cfg.Level = "error"
			cfg.GroupOperations = true
			cfg.SummarizeBatch = true
			for k := range cfg.ComponentLevels {
				cfg.ComponentLevels[k] = "error"
			}
			return cfg
		},
		
		Normal: func() *LogConfig {
			return DefaultConfig()
		},
		
		Verbose: func() *LogConfig {
			cfg := DevelopmentConfig()
			cfg.Level = "debug"
			cfg.EnableCaller = true
			return cfg
		},
		
		Trace: func() *LogConfig {
			return DebugConfig()
		},
	}
}