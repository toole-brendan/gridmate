package ai

import (
	"fmt"
	"strings"
)

// PromptBuilder builds context-aware prompts for financial modeling
type PromptBuilder struct {
	systemPrompt string
}

// NewPromptBuilder creates a new prompt builder
func NewPromptBuilder() *PromptBuilder {
	return &PromptBuilder{
		systemPrompt: getFinancialModelingSystemPrompt(),
	}
}

// GetFinancialSystemPrompt returns the financial modeling system prompt
func (pb *PromptBuilder) GetFinancialSystemPrompt() string {
	return pb.systemPrompt
}

// BuildChatPrompt builds a prompt for chat interactions
func (pb *PromptBuilder) BuildChatPrompt(userMessage string, context *FinancialContext) []Message {
	messages := []Message{
		{Role: "system", Content: pb.systemPrompt},
	}

	// Add context information if available
	if context != nil {
		contextPrompt := pb.buildContextPrompt(context)
		if contextPrompt != "" {
			messages = append(messages, Message{
				Role:    "system",
				Content: fmt.Sprintf("Current Context:\n%s", contextPrompt),
			})
		}
	}

	// Add the user message
	messages = append(messages, Message{
		Role:    "user",
		Content: userMessage,
	})

	return messages
}

// BuildAnalysisPrompt builds a prompt for automatic analysis
func (pb *PromptBuilder) BuildAnalysisPrompt(context *FinancialContext, analysisType string) []Message {
	messages := []Message{
		{Role: "system", Content: pb.systemPrompt},
	}

	contextPrompt := pb.buildContextPrompt(context)
	if contextPrompt != "" {
		messages = append(messages, Message{
			Role:    "system",
			Content: fmt.Sprintf("Current Context:\n%s", contextPrompt),
		})
	}

	var prompt string
	switch analysisType {
	case "selection_analysis":
		prompt = "Analyze the currently selected range and provide insights about its purpose and calculations. Identify any potential issues or improvements."
	case "formula_validation":
		prompt = "Review the formulas in the current selection for accuracy, best practices, and potential errors. Suggest improvements where applicable."
	case "model_overview":
		prompt = "Provide an overview of this financial model, identifying its type, key components, and overall structure."
	default:
		prompt = "Analyze the current spreadsheet context and provide relevant insights."
	}

	messages = append(messages, Message{
		Role:    "user",
		Content: prompt,
	})

	return messages
}

// buildContextPrompt builds the context section of the prompt
func (pb *PromptBuilder) buildContextPrompt(context *FinancialContext) string {
	var parts []string

	// Workbook and worksheet info
	if context.WorkbookName != "" {
		parts = append(parts, fmt.Sprintf("Workbook: %s", context.WorkbookName))
	}
	if context.WorksheetName != "" {
		parts = append(parts, fmt.Sprintf("Worksheet: %s", context.WorksheetName))
	}

	// Model type
	if context.ModelType != "" {
		parts = append(parts, fmt.Sprintf("Model Type: %s", context.ModelType))
	}

	// Selected range
	if context.SelectedRange != "" {
		parts = append(parts, fmt.Sprintf("Selected Range: %s", context.SelectedRange))
	}

	// Cell values and formulas
	if len(context.CellValues) > 0 || len(context.Formulas) > 0 {
		parts = append(parts, pb.buildCellDataSection(context))
	}

	// Recent changes
	if len(context.RecentChanges) > 0 {
		parts = append(parts, pb.buildRecentChangesSection(context.RecentChanges))
	}

	// Document context
	if len(context.DocumentContext) > 0 {
		parts = append(parts, pb.buildDocumentContextSection(context.DocumentContext))
	}

	return strings.Join(parts, "\n\n")
}

// buildCellDataSection builds the cell data section
func (pb *PromptBuilder) buildCellDataSection(context *FinancialContext) string {
	var parts []string

	if len(context.CellValues) > 0 {
		parts = append(parts, "Cell Values:")
		for addr, value := range context.CellValues {
			parts = append(parts, fmt.Sprintf("  %s: %v", addr, value))
		}
	}

	if len(context.Formulas) > 0 {
		if len(parts) > 0 {
			parts = append(parts, "")
		}
		parts = append(parts, "Formulas:")
		for addr, formula := range context.Formulas {
			parts = append(parts, fmt.Sprintf("  %s: %s", addr, formula))
		}
	}

	return strings.Join(parts, "\n")
}

// buildRecentChangesSection builds the recent changes section
func (pb *PromptBuilder) buildRecentChangesSection(changes []CellChange) string {
	parts := []string{"Recent Changes:"}

	for _, change := range changes {
		timeStr := change.Timestamp.Format("15:04:05")
		parts = append(parts, fmt.Sprintf("  %s [%s]: %v → %v (%s)",
			change.Address, timeStr, change.OldValue, change.NewValue, change.Source))
	}

	return strings.Join(parts, "\n")
}

// buildDocumentContextSection builds the document context section
func (pb *PromptBuilder) buildDocumentContextSection(docs []string) string {
	parts := []string{"Relevant Document Context:"}

	for i, doc := range docs {
		parts = append(parts, fmt.Sprintf("  %d. %s", i+1, doc))
	}

	return strings.Join(parts, "\n")
}

// getFinancialModelingSystemPrompt returns the system prompt for financial modeling
func getFinancialModelingSystemPrompt() string {
	return `You are Gridmate, an AI assistant specialized in financial modeling and Excel/Google Sheets analysis. You have the ability to directly modify Excel sheets through built-in tools.

IMPORTANT: When the user asks about spreadsheet data or requests changes to the spreadsheet, you MUST use the provided Excel tools instead of just describing what to do. Always use tools for any Excel operation:
- Use read_range to read cell values
- Use write_range to write values
- Use apply_formula to set formulas
- Use format_range for formatting
- Use other tools as appropriate

You are an expert in:

1. **Financial Modeling**: DCF, LBO, M&A, Trading Comps, Credit Analysis, and other valuation methodologies
2. **Excel/Sheets Expertise**: Advanced formulas, functions, data analysis, and best practices
3. **Financial Analysis**: Understanding financial statements, ratios, and business metrics
4. **Formula Validation**: Identifying errors, inconsistencies, and optimization opportunities

## Core Capabilities:

### Formula Assistance
- Generate accurate Excel/Google Sheets formulas for financial calculations
- Validate existing formulas for accuracy and best practices
- Suggest optimizations and improvements
- Identify circular references and formula errors

### Financial Model Analysis
- Identify model types (DCF, LBO, etc.) and their components
- Analyze model structure and data flow
- Validate calculations against financial principles
- Suggest model improvements and best practices

### Context-Aware Help
- Understand current selection and provide relevant assistance
- Analyze recent changes and their impact
- Provide insights based on the overall model structure
- Reference external financial documents when provided

## Response Guidelines:

1. **Accuracy First**: All financial calculations must be 100% accurate
2. **Show Work**: Explain reasoning behind suggestions and calculations
3. **Best Practices**: Follow industry-standard financial modeling conventions
4. **Human Oversight**: Always suggest that critical changes be reviewed
5. **Actionable**: Provide specific, implementable recommendations

## Response Format:

When suggesting changes or actions, format them clearly:
- Explain the reasoning
- Provide the specific formula or action
- Indicate confidence level
- Note if human review is recommended

## Financial Modeling Conventions:

- Use consistent formatting (blue for inputs, black for calculations, green for outputs)
- Follow proper cash flow timing conventions
- Use appropriate rounding for financial figures
- Maintain clear audit trails
- Document assumptions clearly

Remember: You are assisting professional financial analysts who need extreme accuracy and reliability. Every suggestion should be thoroughly considered and explained.

## Action Generation:

When asked to create or modify Excel content, you should generate structured actions that can be applied directly to the spreadsheet. Format actions as follows:

### For creating a DCF model or other financial models:
When asked to create a model, generate multiple cell_update actions with specific ranges, values, and formulas. For example:

ACTION: cell_update
RANGE: A1:A10
VALUES: ["DCF Model", "", "Revenue", "COGS", "Gross Profit", "Operating Expenses", "EBIT", "Tax", "NOPAT", ""]
DESCRIPTION: Setting up row headers for DCF model

ACTION: cell_update  
RANGE: B1:F1
VALUES: ["", "2024", "2025", "2026", "2027", "2028"]
DESCRIPTION: Year headers for historical and projected periods

ACTION: formula_update
RANGE: B5
FORMULA: =B3-B4
DESCRIPTION: Gross Profit calculation (Revenue - COGS)

Always generate complete sets of actions needed to implement the requested financial model or calculation. Include formulas, formatting, and structure.`
}

// BuildFormulaPrompt builds a prompt specifically for formula generation
func (pb *PromptBuilder) BuildFormulaPrompt(description string, context *FinancialContext) []Message {
	messages := []Message{
		{Role: "system", Content: pb.systemPrompt},
	}

	// Add specific formula generation instructions
	formulaInstructions := `You are being asked to generate a formula. Please:
1. Provide the exact formula syntax for Excel/Google Sheets
2. Explain what the formula does
3. Note any assumptions or requirements
4. Suggest the appropriate cell formatting if relevant
5. Indicate if the formula should be copied to other cells

Format your response with the formula clearly marked, like:
Formula: =YOUR_FORMULA_HERE
Explanation: [Your explanation]`

	messages = append(messages, Message{
		Role:    "system",
		Content: formulaInstructions,
	})

	if context != nil {
		contextPrompt := pb.buildContextPrompt(context)
		if contextPrompt != "" {
			messages = append(messages, Message{
				Role:    "system",
				Content: fmt.Sprintf("Current Context:\n%s", contextPrompt),
			})
		}
	}

	messages = append(messages, Message{
		Role:    "user",
		Content: fmt.Sprintf("Generate a formula for: %s", description),
	})

	return messages
}

// BuildValidationPrompt builds a prompt for formula/model validation
func (pb *PromptBuilder) BuildValidationPrompt(context *FinancialContext, validationType string) []Message {
	messages := []Message{
		{Role: "system", Content: pb.systemPrompt},
	}

	var instructions string
	switch validationType {
	case "formula_check":
		instructions = `Please review the formulas in the current context for:
1. Mathematical accuracy
2. Proper cell references
3. Excel/Sheets best practices
4. Potential circular references
5. Error handling (IFERROR, etc.)
6. Performance considerations

Provide specific recommendations for improvements.`
	case "model_validation":
		instructions = `Please validate this financial model for:
1. Structural integrity and logical flow
2. Calculation accuracy
3. Industry standard practices
4. Missing components or checks
5. Sensitivity analysis opportunities
6. Documentation and clarity

Identify any red flags or areas needing attention.`
	default:
		instructions = "Please review the current context and identify any issues or improvements."
	}

	messages = append(messages, Message{
		Role:    "system",
		Content: instructions,
	})

	if context != nil {
		contextPrompt := pb.buildContextPrompt(context)
		if contextPrompt != "" {
			messages = append(messages, Message{
				Role:    "system",
				Content: fmt.Sprintf("Current Context:\n%s", contextPrompt),
			})
		}
	}

	messages = append(messages, Message{
		Role:    "user",
		Content: "Please validate the current context based on the instructions above.",
	})

	return messages
}

// DetectModelType attempts to detect the financial model type from context
func (pb *PromptBuilder) DetectModelType(context *FinancialContext) string {
	if context == nil {
		return ""
	}

	// Simple heuristics based on cell values and formulas
	contentStr := strings.ToLower(fmt.Sprintf("%v %v", context.CellValues, context.Formulas))

	if strings.Contains(contentStr, "dcf") || strings.Contains(contentStr, "wacc") || strings.Contains(contentStr, "terminal value") {
		return "DCF"
	}
	if strings.Contains(contentStr, "lbo") || strings.Contains(contentStr, "leverage") || strings.Contains(contentStr, "irr") {
		return "LBO"
	}
	if strings.Contains(contentStr, "merger") || strings.Contains(contentStr, "accretion") || strings.Contains(contentStr, "dilution") {
		return "M&A"
	}
	if strings.Contains(contentStr, "trading") || strings.Contains(contentStr, "multiple") || strings.Contains(contentStr, "ev/ebitda") {
		return "Trading Comps"
	}
	if strings.Contains(contentStr, "credit") || strings.Contains(contentStr, "debt") || strings.Contains(contentStr, "coverage") {
		return "Credit Analysis"
	}

	return "General"
}