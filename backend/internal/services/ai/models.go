package ai

import "time"


// FormulaAssistanceRequest represents a request for formula help
type FormulaAssistanceRequest struct {
	CellReference  string            // e.g., "B5"
	CurrentFormula string            // Existing formula if any
	Description    string            // What the user wants to achieve
	RelatedCells   map[string]string // Related cell references and their values
	Context        *SpreadsheetContext
}

// SpreadsheetContext provides context about the spreadsheet
type SpreadsheetContext struct {
	SheetName     string
	ModelSection  string // e.g., "Revenue Build", "Debt Schedule"
	RowHeaders    []string
	ColumnHeaders []string
}

// FormulaAssistanceResponse contains the AI's formula suggestions
type FormulaAssistanceResponse struct {
	Formula      string
	Explanation  string
	Assumptions  []string
	Alternatives []FormulaSuggestion
	Warnings     []string
	Suggestions  []FormulaSuggestion
}

// FormulaSuggestion represents an alternative formula approach
type FormulaSuggestion struct {
	Formula     string
	Description string
	ProsCons    map[string][]string // "pros" and "cons" keys
}

// SpreadsheetAnalysisRequest represents a request to analyze a spreadsheet
type SpreadsheetAnalysisRequest struct {
	ModelType   string
	Description string
	Sheets      []string
	KeyMetrics  map[string]string // Metric name to value/formula
	DateRange   string
}

// SpreadsheetAnalysisResponse contains analysis insights
type SpreadsheetAnalysisResponse struct {
	Summary       string
	ModelType     string // AI's assessment of model type
	Insights      []string
	Improvements  []Improvement
	Risks         []Risk
	KeyFindings   map[string]string
	NextSteps     []string
	ConfidenceScore float32
	Issues        []ModelIssue
}

// Improvement represents a suggested improvement
type Improvement struct {
	Area        string
	Description string
	Impact      string // High, Medium, Low
	Effort      string // High, Medium, Low
	Priority    int
}

// Risk represents an identified risk
type Risk struct {
	Type        string
	Description string
	Severity    string // High, Medium, Low
	Mitigation  string
}

// ModelIssue represents an issue found in the model
type ModelIssue struct {
	Location    string // Cell reference or range
	Type        string
	Description string
	Severity    string
	Suggestion  string
}

// ModelValidationRequest represents a request to validate a model
type ModelValidationRequest struct {
	ModelType string
	Formulas  map[string]string // Cell reference to formula
	Checks    []string          // Specific validation checks requested
	Ranges    []ValidationRange
}

// ValidationRange represents a range of cells for validation
type ValidationRange struct {
	Sheet     string
	StartCell string
	EndCell   string
	Purpose   string // What this range represents
}

// ModelValidationResponse contains validation results
type ModelValidationResponse struct {
	IsValid         bool
	Issues          []ValidationIssue
	Passed          []ValidationCheck
	Summary         string
	Score           int // 0-100
	Recommendations []string
}

// ValidationIssue represents a validation problem
type ValidationIssue struct {
	ID          string
	Location    string
	Type        string // "Error", "Warning", "BestPractice"
	Category    string // "Formula", "Structure", "Logic", etc.
	Description string
	Impact      string
	Fix         string
	AutoFixable bool
}

// ValidationCheck represents a passed validation
type ValidationCheck struct {
	Name        string
	Description string
	Status      string
}

// ChatResponse represents a chat completion response
type ChatResponse struct {
	Message          string
	SuggestedActions []SuggestedAction
	References       []Reference
	Confidence       float32
	Model            string
	TokensUsed       int
}

// SuggestedAction represents an action the AI suggests
type SuggestedAction struct {
	Type        string // "UpdateCell", "InsertFormula", "CreateChart", etc.
	Description string
	Target      string // Cell reference or range
	Value       string // New value or formula
	Preview     string // Preview of the change
}

// Reference represents a source reference
type Reference struct {
	Type   string // "Documentation", "FinancialData", "Calculation"
	Source string
	Detail string
	URL    string
}

// TemplateGenerationRequest represents a request to generate a model template
type TemplateGenerationRequest struct {
	ModelType       string
	Specifications  map[string]string
	TargetComplexity string // "Simple", "Intermediate", "Advanced"
	IncludeFeatures []string
}

// TemplateGenerationResponse contains the generated template structure
type TemplateGenerationResponse struct {
	Structure    ModelTemplate
	Instructions []StepInstruction
	Formulas     map[string]FormulaDefinition
	BestPractices []string
}

// ModelTemplate defines the structure of a financial model template
type ModelTemplate struct {
	Sheets       []SheetDefinition
	NamedRanges  []NamedRange
	Assumptions  []AssumptionInput
	Outputs      []OutputDefinition
}

// SheetDefinition defines a sheet in the model
type SheetDefinition struct {
	Name     string
	Purpose  string
	Sections []SectionDefinition
	Order    int
}

// SectionDefinition defines a section within a sheet
type SectionDefinition struct {
	Name      string
	StartRow  int
	EndRow    int
	Columns   []ColumnDefinition
	Purpose   string
}

// ColumnDefinition defines a column in a section
type ColumnDefinition struct {
	Letter      string
	Header      string
	DataType    string
	Formula     string
	Format      string
}

// NamedRange represents a named range in Excel
type NamedRange struct {
	Name     string
	Range    string // Legacy field, use Address instead
	Address  string // The range address (e.g., "A1:B10")
	Purpose  string
	Sheet    string
	Scope    string // "workbook" or sheet name
}

// AssumptionInput represents an input assumption
type AssumptionInput struct {
	Name         string
	Location     string
	DefaultValue interface{}
	DataType     string
	Validation   string
	Description  string
}

// OutputDefinition represents a model output
type OutputDefinition struct {
	Name        string
	Location    string
	Formula     string
	Format      string
	Description string
}

// StepInstruction provides step-by-step guidance
type StepInstruction struct {
	Step        int
	Action      string
	Location    string
	Details     string
	Formula     string
	Validation  string
}

// FormulaDefinition provides detailed formula information
type FormulaDefinition struct {
	Purpose     string
	Formula     string
	Explanation string
	References  []string
	Assumptions []string
}

// AuditEntry represents an audit trail entry
type AuditEntry struct {
	ID          string
	Timestamp   time.Time
	User        string
	Action      string
	Target      string // Cell or range
	OldValue    string
	NewValue    string
	Reason      string
	AIProvider  string
	Confidence  float32
}

// DataRetrievalRequest represents a request to extract data
type DataRetrievalRequest struct {
	Source     string   // "10K", "Earnings", "MarketData", etc.
	Company    string
	Period     string
	DataPoints []string // Specific metrics to extract
	Format     string   // "Structured", "Raw"
}

// DataRetrievalResponse contains extracted data
type DataRetrievalResponse struct {
	Data       map[string]DataPoint
	Source     string
	AsOfDate   time.Time
	Confidence map[string]float32
}

// DataPoint represents an extracted data point
type DataPoint struct {
	Value      interface{}
	Unit       string
	Period     string
	Source     string
	Page       int
	Context    string
	Confidence float32
}

// ErrorResponse represents an error from the AI service
type ErrorResponse struct {
	Error      string
	Code       string
	Retryable  bool
	RetryAfter int // seconds
}

// SectionInfo represents information about a model section
type SectionInfo struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Range       string `json:"range"`
	Description string `json:"description"`
	Purpose     string `json:"purpose"`
}

// RiskFactor represents an individual risk factor
type RiskFactor struct {
	Factor      string  `json:"factor"`
	Impact      string  `json:"impact"`      // low, medium, high
	Probability string  `json:"probability"` // low, medium, high
	Description string  `json:"description"`
}

// ModelBackup represents a backup of model state for error recovery
type ModelBackup struct {
	SessionID    string     `json:"session_id"`
	Range        string     `json:"range"`
	Data         *RangeData `json:"data"`
	BackupTime   time.Time  `json:"backup_time"`
	BackupReason string     `json:"backup_reason"`
}

// ChangeRecord tracks individual changes for rollback capability
type ChangeRecord struct {
	Operation string      `json:"operation"`
	Range     string      `json:"range"`
	OldValue  interface{} `json:"old_value"`
	NewValue  interface{} `json:"new_value"`
	Timestamp time.Time   `json:"timestamp"`
}

// ValidationSummary provides comprehensive model validation results
type ValidationSummary struct {
	Range          string            `json:"range"`
	ValidationTime time.Time         `json:"validation_time"`
	TotalCells     int               `json:"total_cells"`
	ErrorCells     []string          `json:"error_cells"`
	WarnCells      []string          `json:"warn_cells"`
	Issues         []ValidationIssue `json:"issues"`
	OverallStatus  string            `json:"overall_status"`
}

