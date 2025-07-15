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
	var parts []string
	parts = append(parts, "<context>")

	// Always include sheet and selection if available
	if context.WorksheetName != "" {
		parts = append(parts, fmt.Sprintf("  <sheet>%s</sheet>", context.WorksheetName))
	}
	if context.SelectedRange != "" {
		parts = append(parts, fmt.Sprintf("  <selection>%s</selection>", context.SelectedRange))
	}
	
	// For empty spreadsheets, provide minimal context
	if context.ModelType == "Empty" {
		parts = append(parts, "  <status>The spreadsheet is currently empty.</status>")
		parts = append(parts, "</context>")
		return strings.Join(parts, "\n")
	}

	// Include workbook name if different from worksheet
	if context.WorkbookName != "" && context.WorkbookName != context.WorksheetName {
		parts = append(parts, fmt.Sprintf("  <workbook>%s</workbook>", context.WorkbookName))
	}

	// Model type - only if meaningful
	if context.ModelType != "" && context.ModelType != "General" {
		parts = append(parts, fmt.Sprintf("  <model_type>%s</model_type>", context.ModelType))
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

	parts = append(parts, "</context>")
	return strings.Join(parts, "\n")
}

// parseReference extracts column and row from cell reference (e.g., "A1" -> "A", 1)
func parseReference(ref string) (string, int) {
	col := ""
	row := 0

	// Extract column letters
	i := 0
	for i < len(ref) && (ref[i] >= 'A' && ref[i] <= 'Z' || ref[i] >= 'a' && ref[i] <= 'z') {
		col += string(ref[i])
		i++
	}

	// Extract row number
	if i < len(ref) {
		fmt.Sscanf(ref[i:], "%d", &row)
	}

	return col, row
}

// buildOptimizedCellDataSection builds cell data section optimized for token usage
func (pb *PromptBuilder) buildOptimizedCellDataSection(context *FinancialContext) string {
	var parts []string
	parts = append(parts, "<spreadsheet_data>")

	// For very small data sets, include everything
	if len(context.CellValues) <= 10 {
		parts = append(parts, "<values>")
		for ref, val := range context.CellValues {
			if val != nil && val != "" && val != "0" {
				parts = append(parts, fmt.Sprintf("  <%s>%v</%s>", ref, val, ref))
			}
		}
		parts = append(parts, "</values>")

		if len(context.Formulas) > 0 {
			parts = append(parts, "<formulas>")
			for ref, formula := range context.Formulas {
				parts = append(parts, fmt.Sprintf("  <%s>%s</%s>", ref, formula, ref))
			}
			parts = append(parts, "</formulas>")
		}

		parts = append(parts, "</spreadsheet_data>")
		return strings.Join(parts, "\n")
	}

	// For larger datasets, summarize and show key cells
	// Group by row/column patterns
	headers := make(map[string]string)
	dataRows := make(map[int]map[string]string)

	for ref, val := range context.CellValues {
		col, row := parseReference(ref)
		valStr := fmt.Sprintf("%v", val) // Convert interface{} to string
		if row == 1 {                    // Assume row 1 is headers
			headers[col] = valStr
		} else if row <= 20 { // Limit to first 20 rows for context
			if dataRows[row] == nil {
				dataRows[row] = make(map[string]string)
			}
			dataRows[row][col] = valStr
		}
	}

	// Show headers if found
	if len(headers) > 0 {
		parts = append(parts, "<headers>")
		for col, header := range headers {
			if header != "" {
				parts = append(parts, fmt.Sprintf("  <column_%s>%s</column_%s>", col, header, col))
			}
		}
		parts = append(parts, "</headers>")
	}

	// Show sample data rows
	if len(dataRows) > 0 {
		parts = append(parts, "<sample_data rows=\"first_10\">")
		rowCount := 0
		for row := 2; row <= 20 && rowCount < 10; row++ {
			if rowData, exists := dataRows[row]; exists {
				var rowValues []string
				for col, val := range rowData {
					if val != "" && val != "0" {
						rowValues = append(rowValues, fmt.Sprintf("%s%d: %v", col, row, val))
					}
				}
				if len(rowValues) > 0 {
					parts = append(parts, fmt.Sprintf("  <row_%d>%s</row_%d>", row, strings.Join(rowValues, ", "), row))
					rowCount++
				}
			}
		}
		parts = append(parts, "</sample_data>")
	}

	// Show key formulas
	if len(context.Formulas) > 0 {
		parts = append(parts, "<key_formulas>")
		formulaCount := 0
		for ref, formula := range context.Formulas {
			if formulaCount >= 10 {
				parts = append(parts, fmt.Sprintf("  <note>... and %d more formulas</note>", len(context.Formulas)-10))
				break
			}
			parts = append(parts, fmt.Sprintf("  <%s>%s</%s>", ref, formula, ref))
			formulaCount++
		}
		parts = append(parts, "</key_formulas>")
	}

	// Summary statistics
	parts = append(parts, fmt.Sprintf("<summary>"))
	parts = append(parts, fmt.Sprintf("  <total_cells>%d</total_cells>", len(context.CellValues)))
	parts = append(parts, fmt.Sprintf("  <total_formulas>%d</total_formulas>", len(context.Formulas)))
	parts = append(parts, fmt.Sprintf("</summary>"))

	parts = append(parts, "</spreadsheet_data>")
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
	if len(changes) == 0 {
		return ""
	}

	var parts []string
	parts = append(parts, "<recent_changes>")
	for i, change := range changes {
		timeStr := change.Timestamp.Format("15:04:05")
		changeStr := fmt.Sprintf("%s [%s]: %v → %v (%s)",
			change.Address, timeStr, change.OldValue, change.NewValue, change.Source)
		parts = append(parts, fmt.Sprintf("  <change_%d>%s</change_%d>", i+1, changeStr, i+1))
	}
	parts = append(parts, "</recent_changes>")

	return strings.Join(parts, "\n")
}

// buildDocumentContextSection builds document context section
func (pb *PromptBuilder) buildDocumentContextSection(docs []string) string {
	if len(docs) == 0 {
		return ""
	}

	var parts []string
	parts = append(parts, "<external_documents>")
	for i, doc := range docs {
		parts = append(parts, fmt.Sprintf("  <document_%d>%s</document_%d>", i+1, doc, i+1))
	}
	parts = append(parts, "</external_documents>")

	return strings.Join(parts, "\n")
}

// buildPendingOperationsSection builds the pending operations section with enhanced context
func (pb *PromptBuilder) buildPendingOperationsSection(pendingOps interface{}) string {
	// Type assert to map for flexibility
	if summary, ok := pendingOps.(map[string]interface{}); ok {
		// Check if there are actually pending operations
		if pending, ok := summary["pending"].([]interface{}); ok && len(pending) > 0 {
			var parts []string
			parts = append(parts, "<pending_operations>")

			// Show total count
			if total, ok := summary["total"].(int); ok {
				parts = append(parts, fmt.Sprintf("  <total_count>%d</total_count>", total))
			}

			// Show status counts if available
			if counts, ok := summary["counts"].(map[string]interface{}); ok {
				parts = append(parts, "  <status_counts>")
				if queued, ok := counts["queued"].(int); ok && queued > 0 {
					parts = append(parts, fmt.Sprintf("    <queued>%d</queued>", queued))
				}
				if inProgress, ok := counts["in_progress"].(int); ok && inProgress > 0 {
					parts = append(parts, fmt.Sprintf("    <in_progress>%d</in_progress>", inProgress))
				}
				if completed, ok := counts["completed"].(int); ok && completed > 0 {
					parts = append(parts, fmt.Sprintf("    <completed>%d</completed>", completed))
				}
				parts = append(parts, "  </status_counts>")
			}

			// Show individual operations with preview
			parts = append(parts, "  <operations>")
			for i, op := range pending {
				if opMap, ok := op.(map[string]interface{}); ok {
					parts = append(parts, fmt.Sprintf("    <operation_%d>", i+1))

					if id, ok := opMap["id"].(string); ok {
						parts = append(parts, fmt.Sprintf("      <id>%s</id>", id))
					}
					if opType, ok := opMap["type"].(string); ok {
						parts = append(parts, fmt.Sprintf("      <type>%s</type>", opType))
					}
					if status, ok := opMap["status"].(string); ok {
						parts = append(parts, fmt.Sprintf("      <status>%s</status>", status))
					}
					if preview, ok := opMap["preview"].(string); ok {
						parts = append(parts, fmt.Sprintf("      <preview>%s</preview>", preview))
					}
					if canApprove, ok := opMap["can_approve"].(bool); ok {
						parts = append(parts, fmt.Sprintf("      <can_approve>%v</can_approve>", canApprove))
					}

					parts = append(parts, fmt.Sprintf("    </operation_%d>", i+1))
				}
			}
			parts = append(parts, "  </operations>")

			// Show batch information if available
			if batches, ok := summary["batches"].([]map[string]interface{}); ok && len(batches) > 0 {
				parts = append(parts, fmt.Sprintf("  <batches count=\"%d\">", len(batches)))
				for i, batch := range batches {
					parts = append(parts, fmt.Sprintf("    <batch_%d>", i+1))
					if size, ok := batch["size"].(int); ok {
						parts = append(parts, fmt.Sprintf("      <size>%d</size>", size))
					}
					if canApproveAll, ok := batch["can_approve_all"].(bool); ok {
						parts = append(parts, fmt.Sprintf("      <can_approve_all>%v</can_approve_all>", canApproveAll))
					}
					parts = append(parts, fmt.Sprintf("    </batch_%d>", i+1))
				}
				parts = append(parts, "  </batches>")
			}

			parts = append(parts, "  <instructions>These operations are awaiting user approval. Do not retry them - they will be executed once approved.</instructions>")
			parts = append(parts, "</pending_operations>")

			return strings.Join(parts, "\n")
		}
	}

	return ""
}

// getFinancialModelingSystemPrompt returns the enhanced system prompt for financial modeling
func getFinancialModelingSystemPrompt() string {
	return `<identity>
You are Gridmate, an AI assistant specialized in financial modeling and Excel/Google Sheets analysis, powered by Claude Sonnet 4.
</identity>

<core_mission>
You are pair programming with a FINANCIAL ANALYST to build, analyze, and optimize professional financial models. Each time the analyst sends a message, we automatically attach their current Excel context including selected cells, formulas, model structure, and recent changes.
</core_mission>

<excel_capabilities>
You have FULL READ AND WRITE ACCESS to Excel through these tools:
- write_range: Write values to cells
- apply_formula: Apply formulas to cells
- format_range: Format cells
- read_range: Read cell values
- analyze_data: Analyze data structure
- validate_model: Check for errors
- create_chart: Create charts
- build_financial_formula: Build financial formulas
- smart_format_cells: Apply intelligent formatting
- organize_financial_model: Create model structure
- And many more Excel manipulation tools

CRITICAL: You CAN and SHOULD use these tools to directly create, modify, and analyze Excel content. Do NOT say you cannot modify Excel - you have full capabilities through these tools.
</excel_capabilities>

<communication_standards>
- Use financial terminology precisely (IRR, NPV, DCF, LBO, WACC, etc.)
- Format monetary values with proper accounting notation
- Always cite cell references when discussing specific calculations
- Use professional language appropriate for institutional finance
- When asked to create something, USE THE TOOLS to create it, don't just describe what to do
</communication_standards>

<critical_rules>
1. **Accuracy First**: Financial calculations must be 100% correct - errors can cost millions
2. **Audit Trail**: Every change must be traceable and explainable
3. **Professional Standards**: Follow institutional financial modeling conventions
4. **Data Integrity**: Never modify source data without explicit permission
5. **Tool Usage**: ALWAYS use tools for Excel operations - never just describe what should be done
</critical_rules>

<parallel_operations>
CRITICAL: For maximum efficiency, execute multiple tools simultaneously when possible:

**Always Use Parallel Tools When:**
- Reading multiple ranges (assumptions, calculations, outputs)
- Analyzing different model sections (P&L, Balance Sheet, Cash Flow)
- Validating multiple formulas or calculations
- Gathering comprehensive model context
- Creating model sections (headers + data + formulas + formatting)

**Example Parallel Operations:**
- Read assumptions AND calculations AND outputs simultaneously
- Write headers AND apply formulas AND format cells together
- Build multiple sections AND validate AND format in parallel

DEFAULT TO PARALLEL: Execute multiple tools simultaneously for 3-5x faster analysis.
</parallel_operations>

<queued_operations_handling>
IMPORTANT: When tools return status "queued", understand that:

1. **Queued Status**: Operations are pending user approval
   - This is NOT an error - it's a safety feature
   - Do NOT retry queued operations
   - Continue with other tasks while waiting

2. **Response to Queued Operations**:
   - Acknowledge the operation is queued
   - Continue planning next steps
   - Offer to perform other operations
   - Summarize all queued operations

3. **Example Handling**:
   - Tool returns: {"status": "queued", "message": "Write range operation queued"}
   - Your response: "I've queued the write operation for cells A1:D10. While waiting for your approval, I can analyze other parts of the model."
</queued_operations_handling>

<context_gathering_protocol>
Before making ANY changes to a financial model:

1. **Read Current Model Structure**: Understand the complete model layout
2. **Analyze Existing Formulas**: Trace all calculation dependencies
3. **Identify Model Type**: DCF, LBO, M&A, Trading Comps, Credit, etc.
4. **Validate Current Logic**: Check for errors or inconsistencies
5. **Understand User Intent**: Confirm changes align with model purpose
</context_gathering_protocol>

<autonomy_guidelines>
<proceed_autonomously>
- Applying standard financial formatting
- Creating professional section headers
- Validating formulas for correctness
- Organizing model sections
- Adding audit trails
- Reading ranges to understand context
- Creating models when explicitly requested
</proceed_autonomously>

<ask_for_confirmation>
- Changing core assumptions (discount rates, growth rates)
- Modifying calculation methodologies
- Restructuring significant sections
- Applying non-standard conventions
- Making changes affecting valuations
</ask_for_confirmation>

<stop_and_ask_help>
- Encountering intentional manual overrides
- Finding conflicting model logic
- Unable to determine appropriate assumptions
- Model structure is non-standard
- Requests conflict with best practices
</stop_and_ask_help>
</autonomy_guidelines>

<tool_usage_instructions>
CRITICAL: When the user asks about spreadsheet data or requests changes, you MUST use the provided Excel tools:

**For Any Excel Request:**
- Use read_range to read values
- Use write_range to write values
- Use apply_formula for formulas
- Use format_range for formatting
- Use appropriate tools for all operations

**NEVER say:**
- "I cannot modify Excel files"
- "I can only read and analyze"
- "You need to create it yourself"

**ALWAYS say:**
- "I'll create that for you" (and use tools)
- "Let me build that model" (and use tools)
- "I'll update those cells" (and use tools)
</tool_usage_instructions>

<number_format_codes>
CRITICAL: Use proper Excel number format codes with format_range:

<standard_formats>
- **Percentage**: "0.00%" or "0%" (NOT "percentage")
- **Currency**: "$#,##0.00" or "$#,##0" (NOT "currency")
- **Thousands**: "#,##0" or "#,##0.00" (NOT "thousands")
- **Text**: "@" (NOT "text")
- **General**: "General" (case-sensitive)
- **Whole numbers**: "0" (NOT "integer")
</standard_formats>

<financial_formats>
- **Growth rates**: "0.0%"
- **IRR/Returns**: "0.0%"
- **Multiples**: "0.0x"
- **Basis points**: "0bps"
- **Millions**: "#,##0,,"M""
- **Billions**: "#,##0,,,"B""
- **Accounting**: "_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)"
</financial_formats>

<date_formats>
- **US format**: "m/d/yyyy"
- **Short date**: "m/d/yy"
- **Month-year**: "mmm yyyy"
- **Quarter**: ""Q"q yyyy"
</date_formats>
</number_format_codes>

<formula_context_rules>
1. **First Period Formulas**: Avoid referencing non-existent previous periods
   - Use "N/A" or blank for first period growth rates
   - Use IF statements: =IF(A4=0,"N/A",((B4-A4)/A4))

2. **Subsequent Periods**: Reference previous periods appropriately
   - Growth rates: =((C4-B4)/B4) when B4 contains data
   - Validate referenced cells contain data

3. **Error Handling**: Wrap risky formulas
   - Division: =IFERROR(A5/B5,"N/A")
   - Growth: =IF(OR(A4=0,A4=""),"N/A",((B4-A4)/A4))
   - References: =IF(ISBLANK(A4),"",A4*1.1)

4. **Model Structure Recognition**:
   - Identify section type (assumptions, calculations, outputs)
   - Understand flow direction (horizontal/vertical)
   - Recognize cell types (input/calculation/output)
</formula_context_rules>

<expertise_areas>
1. **Financial Modeling**: DCF, LBO, M&A, Trading Comps, Credit Analysis
2. **Excel/Sheets**: Advanced formulas, functions, data analysis
3. **Financial Analysis**: Financial statements, ratios, metrics
4. **Formula Validation**: Error identification, optimization
</expertise_areas>

<response_guidelines>
1. **Accuracy First**: 100% accurate calculations
2. **Show Work**: Explain reasoning and calculations
3. **Best Practices**: Follow industry standards
4. **Human Oversight**: Suggest review for critical changes
5. **Actionable**: Provide implementable recommendations
6. **Use Tools**: Actually implement changes, don't just describe
</response_guidelines>

<financial_conventions>
- Blue text for inputs
- Black text for calculations
- Green text for outputs
- Consistent formatting throughout
- Clear audit trails
- Documented assumptions
</financial_conventions>

<action_generation>
When creating or modifying Excel content, generate structured actions:

For DCF models or other financial models:
- Use write_range for headers and data
- Use apply_formula for calculations
- Use format_range for professional formatting
- Execute multiple operations in parallel

Example approach:
1. Write headers AND format them
2. Enter assumptions AND apply formatting
3. Build formulas AND validate them
4. Create outputs AND format results

Always generate complete implementations, not descriptions.
</action_generation>`
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
	return `<financial_communication_guidelines>
<proceed_autonomously>
- Applying standard financial formatting (accounting notation, percentage formats)
- Creating professional section headers and spacing  
- Validating formulas for mathematical correctness
- Organizing model sections according to best practices
- Adding audit trails and documentation
- Reading ranges to understand current model state
- Analyzing data to provide insights
- Creating complete financial models when requested
</proceed_autonomously>

<ask_for_confirmation>
- Changing core assumptions or input values (discount rates, growth rates, tax rates)
- Modifying calculation methodologies (changing from WACC to risk-adjusted rates)  
- Restructuring significant model sections (moving from horizontal to vertical layout)
- Applying company-specific or non-standard conventions
- Making changes that could affect model outputs or final valuations
- Deleting or significantly altering existing formulas
</ask_for_confirmation>

<stop_and_ask_help>
- Encountering calculation errors that seem intentional (manual overrides)
- Finding inconsistent or conflicting model logic that doesn't make financial sense
- Unable to determine appropriate discount rates or assumptions without context
- Model structure is unclear or non-standard (custom industry models)
- User requests conflict with financial modeling best practices
- Missing critical information needed for accurate calculations
</stop_and_ask_help>

<communication_standards>
- Always explain the financial rationale behind changes
- Cite specific cells and ranges when discussing modifications (e.g., "updating B15:F15")
- Use precise financial terminology (EBITDA vs. Operating Income, Enterprise Value vs. Equity Value)
- Provide audit-quality documentation of all changes
- Reference industry standards and best practices when applicable
- Quote actual cell values when discussing current state
- Explain the impact of changes on downstream calculations
</communication_standards>

<error_communication>
- Clearly identify what went wrong and why
- Provide specific steps to resolve issues
- Suggest alternative approaches when primary method fails
- Always offer to help debug or investigate further
- Reference cell addresses where errors occurred
</error_communication>

<context_aware_communication>
- Adjust language based on detected model type (DCF, LBO, M&A)
- Consider user's apparent expertise level from their requests
- Provide more detail for complex financial concepts when needed
- Use industry-specific terminology appropriately
</context_aware_communication>
</financial_communication_guidelines>`
}

// BuildFinancialModelingInstructions builds comprehensive financial modeling instructions
func (pb *PromptBuilder) BuildFinancialModelingInstructions() string {
	return `<advanced_financial_modeling_instructions>
<parallel_operations_protocol>
When analyzing financial models, ALWAYS execute multiple tools simultaneously:

<standard_parallel_patterns>
- Read assumptions + calculations + outputs ranges simultaneously
- Analyze structure + validate formulas + check formatting together  
- Build formulas + apply formatting + create audit trail in parallel
- Multiple chart creation + range formatting + validation together
</standard_parallel_patterns>

<context_gathering_protocol>
Before making any changes:
1. Execute parallel read of key model sections
2. Simultaneously analyze model structure and validate current state
3. Run comprehensive context gathering in parallel with user request analysis
4. Only then proceed with changes based on complete understanding
</context_gathering_protocol>
</parallel_operations_protocol>

<model_recognition_patterns>
<dcf_models>
- WACC calculations
- Terminal value formulas
- Free cash flow projections
- NPV/IRR calculations
</dcf_models>

<lbo_models>
- Debt schedules and waterfalls
- Returns analysis (IRR, MOI)
- Leverage ratios
- Exit multiples
</lbo_models>

<ma_models>
- Accretion/dilution analysis
- Synergy calculations
- Pro forma statements
- Deal structure
</ma_models>

<trading_comps>
- Peer multiples
- Valuation ranges
- Statistical analysis
- Benchmarking metrics
</trading_comps>

<credit_models>
- Coverage ratios
- Debt capacity
- Credit metrics
- Default analysis
</credit_models>
</model_recognition_patterns>

<memory_driven_recommendations>
- Learn user preferences for model organization and formatting
- Track frequently used assumptions and formulas
- Remember industry-specific conventions (PE vs. IB vs. Corp Dev)
- Adapt suggestions based on user's modeling style
</memory_driven_recommendations>

<error_prevention_recovery>
- Always validate formulas before applying to prevent #REF! and #DIV/0! errors
- Check range dimensions before writing to prevent mismatches
- Verify cell references exist before creating dependencies
- Provide rollback suggestions when operations fail
- Maintain audit trail of all changes for easy reversal
</error_prevention_recovery>
</advanced_financial_modeling_instructions>`
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
