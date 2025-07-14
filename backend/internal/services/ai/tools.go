package ai

// ExcelTool represents a tool that can be called by the AI
type ExcelTool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"input_schema"`
}

// GetExcelTools returns all available Excel manipulation tools
func GetExcelTools() []ExcelTool {
	return []ExcelTool{
		{
			Name:        "read_range",
			Description: "Read cell values, formulas, and formatting from a specified range in the Excel spreadsheet. Returns detailed information about each cell including values, formulas, formatting, and data types.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"range": map[string]interface{}{
						"type":        "string",
						"description": "The Excel range to read (e.g., 'A1:D10', 'Sheet1!A1:B5', 'A:A' for entire column)",
					},
					"include_formulas": map[string]interface{}{
						"type":        "boolean",
						"description": "Whether to include formulas in the response",
						"default":     true,
					},
					"include_formatting": map[string]interface{}{
						"type":        "boolean",
						"description": "Whether to include cell formatting information",
						"default":     false,
					},
				},
				"required": []string{"range"},
			},
		},
		{
			Name:        "write_range",
			Description: "Write values to a specified range in the Excel spreadsheet. Can write single values or arrays of values. Preserves existing formatting unless specified otherwise.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"range": map[string]interface{}{
						"type":        "string",
						"description": "The Excel range to write to (e.g., 'A1:D10', 'Sheet1!A1:B5')",
					},
					"values": map[string]interface{}{
						"type":        "array",
						"description": "2D array of values to write. For single cell, use [[value]]",
						"items": map[string]interface{}{
							"type": "array",
							"items": map[string]interface{}{
								"oneOf": []map[string]interface{}{
									{"type": "string"},
									{"type": "number"},
									{"type": "boolean"},
									{"type": "null"},
								},
							},
						},
					},
					"preserve_formatting": map[string]interface{}{
						"type":        "boolean",
						"description": "Whether to preserve existing cell formatting",
						"default":     true,
					},
				},
				"required": []string{"range", "values"},
			},
		},
		{
			Name:        "apply_formula",
			Description: "Apply a formula to one or more cells. Handles relative and absolute references correctly when applying to multiple cells.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"range": map[string]interface{}{
						"type":        "string",
						"description": "The cell or range to apply the formula to",
					},
					"formula": map[string]interface{}{
						"type":        "string",
						"description": "The Excel formula to apply (e.g., '=SUM(A1:A10)', '=VLOOKUP(A2,Sheet2!A:B,2,FALSE)')",
					},
					"relative_references": map[string]interface{}{
						"type":        "boolean",
						"description": "Whether to adjust references when applying to multiple cells",
						"default":     true,
					},
				},
				"required": []string{"range", "formula"},
			},
		},
		{
			Name:        "analyze_data",
			Description: "Analyze a data range to understand its structure, data types, and patterns. Useful for understanding data before performing operations.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"range": map[string]interface{}{
						"type":        "string",
						"description": "The Excel range to analyze",
					},
					"include_statistics": map[string]interface{}{
						"type":        "boolean",
						"description": "Include basic statistics for numeric columns",
						"default":     true,
					},
					"detect_headers": map[string]interface{}{
						"type":        "boolean",
						"description": "Attempt to detect column headers",
						"default":     true,
					},
				},
				"required": []string{"range"},
			},
		},
		{
			Name:        "format_range",
			Description: "Apply formatting to a range of cells including number formats, colors, borders, and alignment.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"range": map[string]interface{}{
						"type":        "string",
						"description": "The Excel range to format",
					},
					"number_format": map[string]interface{}{
						"type":        "string",
						"description": "Number format string (e.g., '#,##0.00', '0.00%', '$#,##0.00')",
					},
					"font": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"bold":   map[string]interface{}{"type": "boolean"},
							"italic": map[string]interface{}{"type": "boolean"},
							"size":   map[string]interface{}{"type": "number"},
							"color":  map[string]interface{}{"type": "string"},
						},
					},
					"fill_color": map[string]interface{}{
						"type":        "string",
						"description": "Background color in hex format (e.g., '#FFFF00')",
					},
					"alignment": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"horizontal": map[string]interface{}{
								"type": "string",
								"enum": []string{"left", "center", "right", "fill", "justify"},
							},
							"vertical": map[string]interface{}{
								"type": "string",
								"enum": []string{"top", "middle", "bottom"},
							},
						},
					},
				},
				"required": []string{"range"},
			},
		},
		{
			Name:        "create_chart",
			Description: "Create a chart based on data in the spreadsheet. Supports various chart types commonly used in financial modeling.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"data_range": map[string]interface{}{
						"type":        "string",
						"description": "The data range for the chart",
					},
					"chart_type": map[string]interface{}{
						"type":        "string",
						"description": "Type of chart to create",
						"enum":        []string{"column", "bar", "line", "pie", "scatter", "area", "combo"},
					},
					"title": map[string]interface{}{
						"type":        "string",
						"description": "Chart title",
					},
					"position": map[string]interface{}{
						"type":        "string",
						"description": "Where to place the chart (e.g., 'F5')",
					},
					"include_legend": map[string]interface{}{
						"type":    "boolean",
						"default": true,
					},
				},
				"required": []string{"data_range", "chart_type"},
			},
		},
		{
			Name:        "validate_model",
			Description: "Validate a financial model by checking for common issues like circular references, broken formulas, inconsistent formulas in ranges, and #REF! errors.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"range": map[string]interface{}{
						"type":        "string",
						"description": "The range to validate (leave empty for entire worksheet)",
					},
					"check_circular_refs": map[string]interface{}{
						"type":    "boolean",
						"default": true,
					},
					"check_formula_consistency": map[string]interface{}{
						"type":    "boolean",
						"default": true,
					},
					"check_errors": map[string]interface{}{
						"type":    "boolean",
						"default": true,
					},
				},
				"required": []string{},
			},
		},
		{
			Name:        "get_named_ranges",
			Description: "Get all named ranges in the workbook or worksheet. Named ranges are commonly used in financial models for important values and ranges.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"scope": map[string]interface{}{
						"type":        "string",
						"description": "Scope of named ranges to retrieve",
						"enum":        []string{"workbook", "worksheet"},
						"default":     "workbook",
					},
				},
				"required": []string{},
			},
		},
		{
			Name:        "create_named_range",
			Description: "Create a named range for easier reference in formulas and navigation.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"name": map[string]interface{}{
						"type":        "string",
						"description": "Name for the range (e.g., 'Revenue', 'WACC', 'Assumptions')",
					},
					"range": map[string]interface{}{
						"type":        "string",
						"description": "The Excel range to name (e.g., 'Sheet1!A1:A10')",
					},
				},
				"required": []string{"name", "range"},
			},
		},
		{
			Name:        "insert_rows_columns",
			Description: "Insert rows or columns at a specified position, shifting existing data as needed.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"position": map[string]interface{}{
						"type":        "string",
						"description": "Where to insert (e.g., 'A5' for row 5, 'C' for column C)",
					},
					"count": map[string]interface{}{
						"type":        "integer",
						"description": "Number of rows or columns to insert",
						"default":     1,
					},
					"type": map[string]interface{}{
						"type":        "string",
						"description": "Whether to insert rows or columns",
						"enum":        []string{"rows", "columns"},
					},
				},
				"required": []string{"position", "type"},
			},
		},
		{
			Name:        "build_financial_formula",
			Description: "Intelligently builds financial formulas with proper error handling and context awareness. Handles first period vs subsequent periods, prevents #DIV/0! errors, and applies financial modeling best practices.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"formula_type": map[string]interface{}{
						"type":        "string",
						"description": "Type of financial formula to build",
						"enum":        []string{"growth_rate", "ratio", "sum", "average", "npv", "irr", "percentage", "lookup", "conditional"},
					},
					"target_cell": map[string]interface{}{
						"type":        "string",
						"description": "The cell where the formula will be applied (e.g., 'B5')",
					},
					"inputs": map[string]interface{}{
						"type":        "object",
						"description": "Context-aware parameters for formula generation",
						"properties": map[string]interface{}{
							"current_period_cell": map[string]interface{}{
								"type":        "string",
								"description": "Cell containing current period value",
							},
							"previous_period_cell": map[string]interface{}{
								"type":        "string", 
								"description": "Cell containing previous period value (for growth calculations)",
							},
							"numerator_cells": map[string]interface{}{
								"type":        "array",
								"description": "Cells for numerator in ratio calculations",
								"items":       map[string]interface{}{"type": "string"},
							},
							"denominator_cells": map[string]interface{}{
								"type":        "array",
								"description": "Cells for denominator in ratio calculations", 
								"items":       map[string]interface{}{"type": "string"},
							},
							"range_cells": map[string]interface{}{
								"type":        "string",
								"description": "Range for sum/average calculations (e.g., 'A1:A10')",
							},
							"lookup_table": map[string]interface{}{
								"type":        "string",
								"description": "Table range for lookup formulas",
							},
							"condition": map[string]interface{}{
								"type":        "string",
								"description": "Condition for conditional formulas",
							},
						},
					},
					"error_handling": map[string]interface{}{
						"type":        "boolean",
						"description": "Whether to wrap formula in IFERROR for safety",
						"default":     true,
					},
					"is_first_period": map[string]interface{}{
						"type":        "boolean",
						"description": "Whether this is the first period in a time series (affects growth rate formulas)",
						"default":     false,
					},
				},
				"required": []string{"formula_type", "target_cell", "inputs"},
			},
		},
		{
			Name:        "analyze_model_structure",
			Description: "Analyzes the structure and layout of financial models to understand sections, time periods, and data flow. Identifies assumptions, calculations, outputs, and key financial metrics.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"analysis_range": map[string]interface{}{
						"type":        "string",
						"description": "Range to analyze for model structure (e.g., 'A1:Z100')",
					},
					"focus_area": map[string]interface{}{
						"type":        "string",
						"description": "Specific area to focus analysis on",
						"enum":        []string{"entire_model", "assumptions", "calculations", "outputs", "time_periods", "key_metrics"},
						"default":     "entire_model",
					},
					"model_type_hint": map[string]interface{}{
						"type":        "string",
						"description": "Hint about expected model type to improve analysis",
						"enum":        []string{"DCF", "LBO", "M&A", "Comps", "Budget", "General"},
					},
				},
				"required": []string{"analysis_range"},
			},
		},
		{
			Name:        "smart_format_cells", 
			Description: "Applies intelligent formatting to cells based on their content and role in financial models. Includes standard financial formatting, conditional formatting, and model styling best practices.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"range": map[string]interface{}{
						"type":        "string",
						"description": "Range of cells to format",
					},
					"style_type": map[string]interface{}{
						"type":        "string",
						"description": "Type of financial styling to apply",
						"enum":        []string{"financial_input", "financial_calculation", "financial_output", "header", "assumption", "percentage", "currency", "multiple", "basis_points"},
					},
					"conditional_rules": map[string]interface{}{
						"type":        "array",
						"description": "Conditional formatting rules to apply",
						"items": map[string]interface{}{
							"type": "object",
							"properties": map[string]interface{}{
								"condition": map[string]interface{}{
									"type":        "string",
									"description": "Condition for formatting (e.g., '>0', '<0', '=0')",
								},
								"format": map[string]interface{}{
									"type":        "object",
									"description": "Format to apply when condition is met",
									"properties": map[string]interface{}{
										"font_color": map[string]interface{}{"type": "string"},
										"background_color": map[string]interface{}{"type": "string"},
										"font_style": map[string]interface{}{"type": "string", "enum": []string{"bold", "italic", "normal"}},
									},
								},
							},
						},
					},
					"number_format": map[string]interface{}{
						"type":        "string",
						"description": "Specific number format to apply (overrides style_type default)",
					},
				},
				"required": []string{"range", "style_type"},
			},
		},
		{
			Name:        "create_audit_trail",
			Description: "Creates comprehensive audit trail documentation for financial models including formula explanations, assumptions documentation, and change tracking.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"target_range": map[string]interface{}{
						"type":        "string",
						"description": "Range to document and create audit trail for",
					},
					"documentation_type": map[string]interface{}{
						"type":        "string",
						"description": "Type of documentation to create",
						"enum":        []string{"formula_explanations", "assumptions_summary", "model_overview", "change_log", "validation_notes"},
					},
					"add_comments": map[string]interface{}{
						"type":        "boolean",
						"description": "Whether to add cell comments explaining formulas",
						"default":     true,
					},
					"create_documentation_sheet": map[string]interface{}{
						"type":        "boolean", 
						"description": "Whether to create a separate documentation worksheet",
						"default":     false,
					},
					"include_sources": map[string]interface{}{
						"type":        "boolean",
						"description": "Whether to include source references and citations",
						"default":     true,
					},
				},
				"required": []string{"target_range", "documentation_type"},
			},
		},
		{
			Name:        "organize_financial_model",
			Description: "Creates professional section organization for any financial model type with intelligent model detection, industry-specific templates, and professional standards. Features automatic model type detection, context-aware sections, and customizable professional formatting for Investment Banking, Private Equity, Hedge Funds, and Corporate environments.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"model_type": map[string]interface{}{
						"type":        "string",
						"description": "Type of financial model (dcf, lbo, merger, comps, credit, universal). If not provided, will auto-detect from model content.",
						"enum":        []string{"dcf", "lbo", "merger", "m&a", "comps", "trading_comps", "credit", "universal"},
					},
					"sections": map[string]interface{}{
						"type":        "array",
						"description": "Array of section types to create. If not provided, will generate intelligent sections based on model type and context.",
						"items": map[string]interface{}{
							"type": "string",
						},
					},
					"layout": map[string]interface{}{
						"type":        "string",
						"description": "Model layout orientation",
						"enum":        []string{"horizontal", "vertical"},
						"default":     "horizontal",
					},
					"analysis_range": map[string]interface{}{
						"type":        "string",
						"description": "Range to analyze for current model structure and intelligent detection",
						"default":     "A1:Z100",
					},
					"professional_standards": map[string]interface{}{
						"type":        "string",
						"description": "Professional industry standards for formatting and organization",
						"enum":        []string{"investment_banking", "private_equity", "hedge_fund", "corporate"},
					},
					"industry_context": map[string]interface{}{
						"type":        "string",
						"description": "Industry context for specialized sections and terminology",
						"enum":        []string{"technology", "healthcare", "energy", "real_estate", "financial_services", "manufacturing"},
					},
				},
				"required": []string{},
			},
		},
	}
}

// ToolResult represents the result of executing a tool
type ToolResult struct {
	Type      string      `json:"type"`
	ToolUseID string      `json:"tool_use_id"`
	Content   interface{} `json:"content"`
	IsError   bool        `json:"is_error,omitempty"`
}