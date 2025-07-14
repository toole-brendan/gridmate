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
// Optimized to minimize tokens for empty or sparse spreadsheets
func (pb *PromptBuilder) buildContextPrompt(context *FinancialContext) string {
	// For empty spreadsheets, provide minimal context
	if context.ModelType == "Empty" {
		return fmt.Sprintf("Workbook: %s\nWorksheet: %s\nThe spreadsheet is currently empty.",
			context.WorkbookName, context.WorksheetName)
	}

	var parts []string

	// Basic info - combine to save tokens
	basicInfo := []string{}
	if context.WorkbookName != "" {
		basicInfo = append(basicInfo, fmt.Sprintf("Workbook: %s", context.WorkbookName))
	}
	if context.WorksheetName != "" {
		basicInfo = append(basicInfo, fmt.Sprintf("Worksheet: %s", context.WorksheetName))
	}
	if len(basicInfo) > 0 {
		parts = append(parts, strings.Join(basicInfo, ", "))
	}

	// Model type - only if meaningful
	if context.ModelType != "" && context.ModelType != "General" {
		parts = append(parts, fmt.Sprintf("Model Type: %s", context.ModelType))
	}

	// Selected range - only if it contains data
	if context.SelectedRange != "" && len(context.CellValues) > 0 {
		parts = append(parts, fmt.Sprintf("Selected Range: %s", context.SelectedRange))
	}

	// Cell values and formulas - optimize for size
	if len(context.CellValues) > 0 || len(context.Formulas) > 0 {
		dataSection := pb.buildOptimizedCellDataSection(context)
		if dataSection != "" {
			parts = append(parts, dataSection)
		}
	}

	// Recent changes - only if relevant and limited
	if len(context.RecentChanges) > 0 && len(context.RecentChanges) <= 5 {
		parts = append(parts, pb.buildRecentChangesSection(context.RecentChanges))
	}

	// Document context - only if not redundant
	if len(context.DocumentContext) > 0 && len(context.DocumentContext) <= 3 {
		parts = append(parts, pb.buildDocumentContextSection(context.DocumentContext))
	}

	// Pending operations - if any exist
	if context.PendingOperations != nil {
		parts = append(parts, pb.buildPendingOperationsSection(context.PendingOperations))
	}

	return strings.Join(parts, "\n")
}

// buildOptimizedCellDataSection builds a compact cell data section
// Only includes the most relevant data to minimize token usage
func (pb *PromptBuilder) buildOptimizedCellDataSection(context *FinancialContext) string {
	var parts []string
	totalCells := len(context.CellValues) + len(context.Formulas)

	// If we have very few cells, include all
	if totalCells <= 20 {
		return pb.buildCellDataSection(context)
	}

	// For larger contexts, summarize and show only key cells
	if len(context.CellValues) > 20 {
		parts = append(parts, fmt.Sprintf("Cell Data: %d cells with values", len(context.CellValues)))
		// Show first 10 cells as sample
		count := 0
		for addr, value := range context.CellValues {
			if count >= 10 {
				parts = append(parts, "  ... (more cells omitted)")
				break
			}
			parts = append(parts, fmt.Sprintf("  %s: %v", addr, value))
			count++
		}
	}

	if len(context.Formulas) > 10 {
		parts = append(parts, fmt.Sprintf("\nFormulas: %d formulas present", len(context.Formulas)))
		// Show first 5 formulas as sample
		count := 0
		for addr, formula := range context.Formulas {
			if count >= 5 {
				parts = append(parts, "  ... (more formulas omitted)")
				break
			}
			parts = append(parts, fmt.Sprintf("  %s: %s", addr, formula))
			count++
		}
	} else if len(context.Formulas) > 0 {
		parts = append(parts, "\nFormulas:")
		for addr, formula := range context.Formulas {
			parts = append(parts, fmt.Sprintf("  %s: %s", addr, formula))
		}
	}

	return strings.Join(parts, "\n")
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

// buildPendingOperationsSection builds the pending operations section
func (pb *PromptBuilder) buildPendingOperationsSection(pendingOps interface{}) string {
	// Type assertion to handle the interface
	if summary, ok := pendingOps.(map[string]interface{}); ok {
		var parts []string

		// Get counts and total pending
		if total, ok := summary["total"].(int); ok && total > 0 {
			parts = append(parts, fmt.Sprintf("\nPending Operations (%d total):", total))

			// Show status counts if available
			if counts, ok := summary["counts"].(map[string]int); ok {
				statusInfo := []string{}
				if queued := counts["queued"]; queued > 0 {
					statusInfo = append(statusInfo, fmt.Sprintf("%d queued", queued))
				}
				if inProgress := counts["in_progress"]; inProgress > 0 {
					statusInfo = append(statusInfo, fmt.Sprintf("%d in progress", inProgress))
				}
				if len(statusInfo) > 0 {
					parts = append(parts, fmt.Sprintf("Status: %s", strings.Join(statusInfo, ", ")))
				}
			}

			// Show blocked operations warning
			if hasBlocked, ok := summary["has_blocked"].(bool); ok && hasBlocked {
				parts = append(parts, "⚠️ Some operations are blocked by dependencies")
			}

			// List pending operations with previews
			if pendingList, ok := summary["pending"].([]map[string]interface{}); ok {
				parts = append(parts, "\nQueued Operations:")
				for i, op := range pendingList {
					if i >= 10 { // Limit to first 10 to save tokens
						parts = append(parts, fmt.Sprintf("  ... and %d more operations", len(pendingList)-10))
						break
					}

					opType := op["type"].(string)
					preview := ""
					if p, ok := op["preview"].(string); ok {
						preview = p
					}
					canApprove := ""
					if ca, ok := op["can_approve"].(bool); ok && !ca {
						canApprove = " [blocked]"
					}

					if preview != "" {
						parts = append(parts, fmt.Sprintf("  %d. %s: %s%s", i+1, opType, preview, canApprove))
					} else {
						parts = append(parts, fmt.Sprintf("  %d. %s operation%s", i+1, opType, canApprove))
					}
				}
			}

			// Show batch information if available
			if batches, ok := summary["batches"].([]map[string]interface{}); ok && len(batches) > 0 {
				parts = append(parts, fmt.Sprintf("\nBatched Operations: %d batches", len(batches)))
				for _, batch := range batches {
					if size, ok := batch["size"].(int); ok {
						if canApproveAll, ok := batch["can_approve_all"].(bool); ok && canApproveAll {
							parts = append(parts, fmt.Sprintf("  - Batch of %d operations (ready for approval)", size))
						} else {
							parts = append(parts, fmt.Sprintf("  - Batch of %d operations (some blocked)", size))
						}
					}
				}
			}

			parts = append(parts, "\nInstructions: These operations are awaiting user approval. Do not retry them - they will be executed once approved.")

			return strings.Join(parts, "\n")
		}
	}

	return ""
}

// getFinancialModelingSystemPrompt returns the enhanced system prompt for financial modeling
func getFinancialModelingSystemPrompt() string {
	return `You are Gridmate, an AI assistant specialized in financial modeling and Excel/Google Sheets analysis, powered by Claude Sonnet 4.

## Core Identity & Mission
You are pair programming with a FINANCIAL ANALYST to build, analyze, and optimize professional financial models. Each time the analyst sends a message, we automatically attach their current Excel context including selected cells, formulas, model structure, and recent changes.

## Communication Standards for Financial Modeling
- Use financial terminology precisely (IRR, NPV, DCF, LBO, WACC, etc.)
- Format monetary values with proper accounting notation
- Always cite cell references when discussing specific calculations
- Use professional language appropriate for institutional finance

## Critical Financial Modeling Rules
1. **Accuracy First**: Financial calculations must be 100% correct - errors can cost millions
2. **Audit Trail**: Every change must be traceable and explainable
3. **Professional Standards**: Follow institutional financial modeling conventions
4. **Data Integrity**: Never modify source data without explicit permission

## Tool Execution Philosophy - Parallel Operations
CRITICAL: For maximum efficiency in financial model analysis, execute multiple tools simultaneously when possible:

**Always Use Parallel Tools When:**
- Reading multiple ranges (assumptions, calculations, outputs)
- Analyzing different model sections (P&L, Balance Sheet, Cash Flow)
- Validating multiple formulas or calculations
- Gathering comprehensive model context

**Example Parallel Operations:**
- Read assumptions AND calculations AND outputs simultaneously
- Analyze formulas AND format cells AND validate calculations together
- Build multiple charts AND format ranges AND create audit trail in parallel

DEFAULT TO PARALLEL: Unless operations must be sequential (output of A required for B), execute multiple tools simultaneously for 3-5x faster analysis.

## Handling Queued Operations
IMPORTANT: When using tools that modify Excel data (write_range, apply_formula, format_range), understand that:

1. **Queued Status**: If a tool returns status "queued", it means the operation is pending user approval
   - This is NOT an error - it's a safety feature for financial accuracy
   - Do NOT retry queued operations - they are already waiting for approval
   - Continue with other tasks or analysis while waiting

2. **Response to Queued Operations**:
   - Acknowledge that the operation is queued for approval
   - Continue planning next steps without depending on the queued operation
   - Offer to perform read-only analysis or other non-modifying operations
   - When multiple operations are queued, summarize them for the user

3. **Example Handling**:
   - Tool returns: {"status": "queued", "message": "Write range operation queued for user approval"}
   - Your response: "I've queued the write operation for cells A1:D10. This requires your approval before executing. While waiting, I can analyze other parts of the model or answer questions."

## Comprehensive Financial Context Gathering
Before making ANY changes to a financial model:

1. **Read Current Model Structure**: Understand the complete model layout
2. **Analyze Existing Formulas**: Trace all calculation dependencies
3. **Identify Model Type**: DCF, LBO, M&A, Trading Comps, Credit, etc.
4. **Validate Current Logic**: Check for errors or inconsistencies
5. **Understand User Intent**: Confirm the requested changes align with model purpose

## Communication Guidelines for Financial Models

### When to Proceed Autonomously:
- Applying standard financial formatting (accounting notation, percentage formats)
- Creating professional section headers and spacing
- Validating formulas for mathematical correctness
- Organizing model sections according to best practices
- Adding audit trails and documentation

### When to Ask for Confirmation:
- Changing core assumptions or input values
- Modifying calculation methodologies
- Restructuring significant model sections
- Applying company-specific or non-standard conventions
- Making changes that could affect model outputs

### When to Stop and Ask for Help:
- Encountering calculation errors that seem intentional
- Finding inconsistent or conflicting model logic
- Unable to determine appropriate discount rates or assumptions
- Model structure is unclear or non-standard
- User requests conflict with financial modeling best practices

You have the ability to directly modify Excel sheets through built-in tools.

IMPORTANT: When the user asks about spreadsheet data or requests changes to the spreadsheet, you MUST use the provided Excel tools instead of just describing what to do. Always use tools for any Excel operation:
- Use read_range to read cell values
- Use write_range to write values
- Use apply_formula to set formulas
- Use format_range for formatting
- Use other tools as appropriate

CRITICAL: When using the format_range tool, you MUST use proper Excel number format codes:

## Standard Formats:
- **Percentage**: use "0.00%" or "0%" (NOT "percentage", "percent", or "pct")
- **Currency**: use "$#,##0.00" or "$#,##0" (NOT "currency", "dollar", or "money")
- **Thousands**: use "#,##0" or "#,##0.00" (NOT "thousands" or "comma")
- **Text**: use "@" (NOT "text" or "string")
- **General**: use "General" (case-sensitive, NOT "general")
- **Whole numbers**: use "0" (NOT "integer" or "whole")

## Financial Modeling Formats:
- **Growth rates**: "0.0%" (for single decimal percentage)
- **IRR/Returns**: "0.0%" (for returns and yields)
- **Multiples**: "0.0x" (for valuation multiples like EV/EBITDA)
- **Basis points**: "0bps" (for precise percentage changes)
- **Large numbers**: "#,##0,,"M"" (millions) or "#,##0,,,"B"" (billions)
- **Accounting**: "_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)"

## Date Formats:
- **US format**: "m/d/yyyy" (NOT "date")
- **Short date**: "m/d/yy"
- **Month-year**: "mmm yyyy" (for period headers like "Jan 2024")
- **Quarter**: ""Q"q yyyy" (for quarterly models)

## Conditional Formatting:
- **Positive/Negative**: "$#,##0.00_);[Red]($#,##0.00)" (shows negatives in red)
- **Zero handling**: "$#,##0.00_);($#,##0.00);"-""" (shows dash for zero)

NEVER use generic format names - always use the exact Excel format code as specified above.

CRITICAL: When creating formulas, especially for financial models, understand temporal context:

## Formula Context Rules:
1. **First Period Formulas**: In the first period/column of financial models, avoid referencing previous periods that don't exist
   - Growth rates: Use "N/A" or blank for first period, NOT =((B4-A4)/A4) if A4 is empty
   - Period-over-period changes: Start from second period
   - Use IF statements to handle first period: =IF(A4=0,"N/A",((B4-A4)/A4))

2. **Subsequent Period Formulas**: From second period onwards, reference previous periods
   - Growth rates: =((C4-B4)/B4) is appropriate when B4 contains data
   - Cumulative calculations: Build on previous periods
   - Always validate that referenced cells contain data

3. **Error Handling**: Wrap risky formulas in IFERROR or IF statements
   - Division formulas: =IFERROR(A5/B5,"N/A") prevents #DIV/0! errors
   - Growth rates: =IF(OR(A4=0,A4=""),"N/A",((B4-A4)/A4))
   - Reference checks: =IF(ISBLANK(A4),"",A4*1.1)

4. **Financial Model Structure Recognition**:
   - Identify if you're in assumptions, calculations, or outputs section
   - Understand if model flows horizontally (periods in columns) or vertically
   - Recognize input cells vs calculation cells vs output cells

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

// BuildFinancialCommunicationGuidelines builds financial modeling specific communication rules
func (pb *PromptBuilder) BuildFinancialCommunicationGuidelines() string {
	return `
## Financial Modeling Communication Guidelines

### When to Proceed Autonomously:
- Applying standard financial formatting (accounting notation, percentage formats)
- Creating professional section headers and spacing  
- Validating formulas for mathematical correctness
- Organizing model sections according to best practices
- Adding audit trails and documentation
- Reading ranges to understand current model state
- Analyzing data to provide insights

### When to Ask for Confirmation:
- Changing core assumptions or input values (discount rates, growth rates, tax rates)
- Modifying calculation methodologies (changing from WACC to risk-adjusted rates)  
- Restructuring significant model sections (moving from horizontal to vertical layout)
- Applying company-specific or non-standard conventions
- Making changes that could affect model outputs or final valuations
- Deleting or significantly altering existing formulas

### When to Stop and Ask for Help:
- Encountering calculation errors that seem intentional (manual overrides)
- Finding inconsistent or conflicting model logic that doesn't make financial sense
- Unable to determine appropriate discount rates or assumptions without context
- Model structure is unclear or non-standard (custom industry models)
- User requests conflict with financial modeling best practices
- Missing critical information needed for accurate calculations

### Financial Communication Standards:
- Always explain the financial rationale behind changes
- Cite specific cells and ranges when discussing modifications (e.g., "updating B15:F15")
- Use precise financial terminology (EBITDA vs. Operating Income, Enterprise Value vs. Equity Value)
- Provide audit-quality documentation of all changes
- Reference industry standards and best practices when applicable
- Quote actual cell values when discussing current state
- Explain the impact of changes on downstream calculations

### Error Communication:
- Clearly identify what went wrong and why
- Provide specific steps to resolve issues
- Suggest alternative approaches when primary method fails
- Always offer to help debug or investigate further
- Reference cell addresses where errors occurred

### Context-Aware Communication:
- Adjust language based on detected model type (DCF, LBO, M&A)
- Consider user's apparent expertise level from their requests
- Provide more detail for complex financial concepts when needed
- Use industry-specific terminology appropriately
`
}

// BuildFinancialModelingInstructions builds comprehensive financial modeling instructions
func (pb *PromptBuilder) BuildFinancialModelingInstructions() string {
	return `
## Advanced Financial Modeling Instructions

### Parallel Operations for Maximum Efficiency:
When analyzing financial models, ALWAYS execute multiple tools simultaneously:

**Standard Parallel Operations:**
- Read assumptions + calculations + outputs ranges simultaneously
- Analyze structure + validate formulas + check formatting together  
- Build formulas + apply formatting + create audit trail in parallel
- Multiple chart creation + range formatting + validation together

**Context Gathering Protocol:**
Before making any changes:
1. Execute parallel read of key model sections
2. Simultaneously analyze model structure and validate current state
3. Run comprehensive context gathering in parallel with user request analysis
4. Only then proceed with changes based on complete understanding

### Financial Model Recognition:
- **DCF Models**: Look for WACC, terminal value, free cash flow calculations
- **LBO Models**: Identify debt schedules, returns analysis, leverage ratios
- **M&A Models**: Find accretion/dilution, synergies, pro forma statements
- **Trading Comps**: Locate multiples, peer analysis, valuation ranges
- **Credit Models**: Detect coverage ratios, debt capacity, credit metrics

### Memory-Driven Recommendations:
- Learn user preferences for model organization and formatting
- Track frequently used assumptions and formulas
- Remember industry-specific conventions (PE vs. IB vs. Corp Dev)
- Adapt suggestions based on user's modeling style

### Error Prevention and Recovery:
- Always validate formulas before applying to prevent #REF! and #DIV/0! errors
- Check range dimensions before writing to prevent mismatches
- Verify cell references exist before creating dependencies
- Provide rollback suggestions when operations fail
- Maintain audit trail of all changes for easy reversal
`
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
