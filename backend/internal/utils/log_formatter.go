package utils

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// EnhancedTextFormatter provides improved formatting for development logs
type EnhancedTextFormatter struct {
	*logrus.TextFormatter
	
	// Group related operations
	GroupOperations bool
	
	// Summarize batch operations
	SummarizeBatch bool
	
	// Component-specific colors
	ComponentColors map[string]string
	
	// Operation type colors
	OperationColors map[string]string
}

// NewEnhancedFormatter creates a new enhanced formatter
func NewEnhancedFormatter() *EnhancedTextFormatter {
	return &EnhancedTextFormatter{
		TextFormatter: &logrus.TextFormatter{
			FullTimestamp:   true,
			TimestampFormat: "15:04:05.000",
			DisableColors:   false,
			ForceColors:     true,
			PadLevelText:    true,
		},
		GroupOperations: true,
		SummarizeBatch:  true,
		ComponentColors: map[string]string{
			"signalr":       "\033[36m", // Cyan
			"excel_bridge":  "\033[35m", // Magenta
			"tool_executor": "\033[33m", // Yellow
			"ai_service":    "\033[34m", // Blue
			"auth":          "\033[32m", // Green
			"database":      "\033[31m", // Red
		},
		OperationColors: map[string]string{
			"read_range":    "\033[36m", // Cyan - read operations
			"write_range":   "\033[33m", // Yellow - write operations
			"format_range":  "\033[35m", // Magenta - formatting
			"apply_formula": "\033[34m", // Blue - formulas
			"tool_batch":    "\033[32m", // Green - batch operations
		},
	}
}

// Format implements the Formatter interface with enhanced formatting
func (f *EnhancedTextFormatter) Format(entry *logrus.Entry) ([]byte, error) {
	var b bytes.Buffer
	
	// Check for special formatting cases
	if f.shouldGroupOperation(entry) {
		return f.formatGroupedOperation(entry)
	}
	
	if f.shouldSummarizeBatch(entry) {
		return f.formatBatchSummary(entry)
	}
	
	// Standard formatting with enhancements
	timestamp := entry.Time.Format(f.TimestampFormat)
	
	// Color-code based on component
	component := f.getComponent(entry)
	componentColor := f.getComponentColor(component)
	
	// Format level with colors
	levelText := f.formatLevel(entry.Level)
	
	// Build the log line
	if component != "" {
		fmt.Fprintf(&b, "%s %s%s[%s]%s ",
			timestamp,
			componentColor,
			levelText,
			component,
			"\033[0m", // Reset color
		)
	} else {
		fmt.Fprintf(&b, "%s %s ",
			timestamp,
			levelText,
		)
	}
	
	// Add message
	fmt.Fprintf(&b, "%s", entry.Message)
	
	// Add important fields in a readable format
	if len(entry.Data) > 0 {
		fmt.Fprintf(&b, " %s", f.formatFields(entry.Data))
	}
	
	b.WriteByte('\n')
	return b.Bytes(), nil
}

// formatGroupedOperation formats related operations together
func (f *EnhancedTextFormatter) formatGroupedOperation(entry *logrus.Entry) ([]byte, error) {
	var b bytes.Buffer
	
	timestamp := entry.Time.Format(f.TimestampFormat)
	groupID := entry.Data["operation_group"]
	operationType := entry.Data["operation_type"]
	
	// Use operation-specific colors
	opColor := f.getOperationColor(fmt.Sprintf("%v", operationType))
	
	// Create a grouped header
	if entry.Data["group_start"] == true {
		fmt.Fprintf(&b, "\n%s %s══════ %s Operation Group [%s] ══════%s\n",
			timestamp,
			opColor,
			operationType,
			groupID,
			"\033[0m",
		)
	}
	
	// Format the operation
	fmt.Fprintf(&b, "%s %s  ├─ %s%s",
		timestamp,
		opColor,
		entry.Message,
		"\033[0m",
	)
	
	// Add key fields
	if fields := f.extractKeyFields(entry.Data); fields != "" {
		fmt.Fprintf(&b, " %s", fields)
	}
	
	// End marker
	if entry.Data["group_end"] == true {
		fmt.Fprintf(&b, "\n%s %s══════ End Group [%s] ══════%s",
			timestamp,
			opColor,
			groupID,
			"\033[0m",
		)
	}
	
	b.WriteByte('\n')
	return b.Bytes(), nil
}

// formatBatchSummary creates a summary view for batch operations
func (f *EnhancedTextFormatter) formatBatchSummary(entry *logrus.Entry) ([]byte, error) {
	var b bytes.Buffer
	
	timestamp := entry.Time.Format(f.TimestampFormat)
	batchID := entry.Data["batch_id"]
	totalOps := entry.Data["total_operations"]
	successCount := entry.Data["successful"]
	
	// Create summary header
	fmt.Fprintf(&b, "\n%s \033[1;32m📊 Batch Summary [%s]\033[0m\n",
		timestamp,
		batchID,
	)
	
	// Operation breakdown
	if operations, ok := entry.Data["operations"].([]interface{}); ok {
		fmt.Fprintf(&b, "%s   Total: %d | Success: %d | Failed: %d\n",
			timestamp,
			totalOps,
			successCount,
			len(operations)-int(successCount.(int)),
		)
		
		// Group by operation type
		opTypes := make(map[string]int)
		for _, op := range operations {
			if opMap, ok := op.(map[string]interface{}); ok {
				opType := fmt.Sprintf("%v", opMap["type"])
				opTypes[opType]++
			}
		}
		
		// Display operation type counts
		for opType, count := range opTypes {
			opColor := f.getOperationColor(opType)
			fmt.Fprintf(&b, "%s   %s├─ %s: %d%s\n",
				timestamp,
				opColor,
				opType,
				count,
				"\033[0m",
			)
		}
	}
	
	// Duration if available
	if duration := entry.Data["duration"]; duration != nil {
		fmt.Fprintf(&b, "%s   ⏱️  Duration: %v\n", timestamp, duration)
	}
	
	fmt.Fprintf(&b, "%s \033[1;32m════════════════════════\033[0m\n", timestamp)
	
	return b.Bytes(), nil
}

// Helper methods

func (f *EnhancedTextFormatter) shouldGroupOperation(entry *logrus.Entry) bool {
	if !f.GroupOperations {
		return false
	}
	_, hasGroup := entry.Data["operation_group"]
	return hasGroup
}

func (f *EnhancedTextFormatter) shouldSummarizeBatch(entry *logrus.Entry) bool {
	if !f.SummarizeBatch {
		return false
	}
	_, hasBatch := entry.Data["batch_summary"]
	return hasBatch
}

func (f *EnhancedTextFormatter) getComponent(entry *logrus.Entry) string {
	if comp, ok := entry.Data["component"].(string); ok {
		return comp
	}
	return ""
}

func (f *EnhancedTextFormatter) getComponentColor(component string) string {
	if color, ok := f.ComponentColors[component]; ok && !f.DisableColors {
		return color
	}
	return ""
}

func (f *EnhancedTextFormatter) getOperationColor(operation string) string {
	if color, ok := f.OperationColors[operation]; ok && !f.DisableColors {
		return color
	}
	return "\033[0m"
}

func (f *EnhancedTextFormatter) formatLevel(level logrus.Level) string {
	if f.DisableColors {
		return fmt.Sprintf("[%s]", strings.ToUpper(level.String()[:4]))
	}
	
	var levelColor string
	switch level {
	case logrus.DebugLevel, logrus.TraceLevel:
		levelColor = "\033[37m" // Gray
	case logrus.InfoLevel:
		levelColor = "\033[34m" // Blue
	case logrus.WarnLevel:
		levelColor = "\033[33m" // Yellow
	case logrus.ErrorLevel, logrus.FatalLevel, logrus.PanicLevel:
		levelColor = "\033[31m" // Red
	default:
		levelColor = "\033[0m" // Default
	}
	
	return fmt.Sprintf("%s[%s]%s",
		levelColor,
		strings.ToUpper(level.String()[:4]),
		"\033[0m",
	)
}

func (f *EnhancedTextFormatter) formatFields(data logrus.Fields) string {
	// Skip certain noisy fields
	skipFields := map[string]bool{
		"component":       true,
		"operation_group": true,
		"group_start":     true,
		"group_end":       true,
		"batch_summary":   true,
	}
	
	// Collect important fields
	var parts []string
	
	// Priority fields first
	priorityFields := []string{"request_id", "session_id", "tool", "status", "error"}
	for _, field := range priorityFields {
		if val, ok := data[field]; ok && !skipFields[field] {
			parts = append(parts, f.formatField(field, val))
		}
	}
	
	// Other fields
	var otherFields []string
	for key := range data {
		found := false
		for _, pf := range priorityFields {
			if key == pf {
				found = true
				break
			}
		}
		if !found && !skipFields[key] {
			otherFields = append(otherFields, key)
		}
	}
	
	sort.Strings(otherFields)
	for _, field := range otherFields {
		parts = append(parts, f.formatField(field, data[field]))
	}
	
	if len(parts) > 0 {
		return fmt.Sprintf("{ %s }", strings.Join(parts, ", "))
	}
	return ""
}

func (f *EnhancedTextFormatter) formatField(key string, value interface{}) string {
	// Special formatting for certain fields
	switch key {
	case "duration", "duration_ms":
		return fmt.Sprintf("%s: %v", key, f.formatDuration(value))
	case "size", "bytes":
		return fmt.Sprintf("%s: %s", key, f.formatBytes(value))
	case "error":
		if !f.DisableColors {
			return fmt.Sprintf("\033[31m%s: %v\033[0m", key, value)
		}
	case "status":
		return fmt.Sprintf("%s: %s", key, f.formatStatus(value))
	}
	
	// Truncate long values
	valStr := fmt.Sprintf("%v", value)
	if len(valStr) > 50 {
		valStr = valStr[:47] + "..."
	}
	
	return fmt.Sprintf("%s: %s", key, valStr)
}

func (f *EnhancedTextFormatter) formatDuration(value interface{}) string {
	switch v := value.(type) {
	case time.Duration:
		return v.String()
	case float64:
		return fmt.Sprintf("%.2fms", v)
	case int64:
		return fmt.Sprintf("%dms", v)
	default:
		return fmt.Sprintf("%v", value)
	}
}

func (f *EnhancedTextFormatter) formatBytes(value interface{}) string {
	var bytes float64
	switch v := value.(type) {
	case int:
		bytes = float64(v)
	case int64:
		bytes = float64(v)
	case float64:
		bytes = v
	default:
		return fmt.Sprintf("%v", value)
	}
	
	units := []string{"B", "KB", "MB", "GB"}
	unit := 0
	for bytes >= 1024 && unit < len(units)-1 {
		bytes /= 1024
		unit++
	}
	return fmt.Sprintf("%.2f%s", bytes, units[unit])
}

func (f *EnhancedTextFormatter) formatStatus(value interface{}) string {
	status := fmt.Sprintf("%v", value)
	if f.DisableColors {
		return status
	}
	
	switch strings.ToLower(status) {
	case "success", "200", "201", "204":
		return fmt.Sprintf("\033[32m%s\033[0m", status) // Green
	case "error", "failed", "500", "503":
		return fmt.Sprintf("\033[31m%s\033[0m", status) // Red
	case "queued", "pending":
		return fmt.Sprintf("\033[33m%s\033[0m", status) // Yellow
	default:
		return status
	}
}

func (f *EnhancedTextFormatter) extractKeyFields(data logrus.Fields) string {
	keyFields := []string{"range", "formula", "values", "preview"}
	var parts []string
	
	for _, field := range keyFields {
		if val, ok := data[field]; ok {
			parts = append(parts, f.formatField(field, val))
		}
	}
	
	if len(parts) > 0 {
		return fmt.Sprintf("{ %s }", strings.Join(parts, ", "))
	}
	return ""
}