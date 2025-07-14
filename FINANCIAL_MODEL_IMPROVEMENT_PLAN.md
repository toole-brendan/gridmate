# Implementation Plan: Fix Financial Model Organization, Formatting, and Formula Validation
## (Model-Agnostic Approach + Advanced AI Prompt System)

## Problem Analysis

Based on the backend logs and Excel screenshot, I've identified three critical issues:

1. **Poor Organization**: Models lack proper section breaks, headers, and logical flow
2. **Professional Formatting**: Inconsistent styling and non-standard financial formats  
3. **Formula Application Errors**: Tools fail with dimension mismatches and invalid formats

**NEW ANALYSIS** (inspired by Cursor's prompt engineering): Additional critical issues:
4. **Inefficient Tool Usage**: Sequential rather than parallel tool execution reduces performance
5. **Insufficient Context Gathering**: AI doesn't comprehensively analyze models before acting
6. **No Memory System**: No learning from user preferences for financial modeling workflows
7. **Poor Communication Guidelines**: Unclear when to ask vs. proceed autonomously
8. **Limited Error Recovery**: Basic error handling without intelligent retry/rollback

## Philosophy: Universal Financial Modeling Standards + Advanced AI Operations

Instead of building DCF-specific features, we'll implement **universal financial modeling best practices** with **sophisticated AI operations** that work across all model types:

- **Consistent Section Organization**: Headers, spacing, and visual hierarchy
- **Professional Financial Formatting**: Industry-standard number formats and styling
- **Flexible Model Structure**: Adaptable to any financial model type
- **Smart Context Recognition**: Understanding model patterns without hardcoding specific model types
- **Efficient AI Operations**: Parallel analysis and intelligent tool usage (inspired by Cursor)
- **Financial Memory System**: Learning and adapting to user preferences over time
- **Comprehensive Context Gathering**: Full model understanding before any changes
- **Intelligent Communication**: Clear guidelines for when to ask vs. proceed

## Phase 0: Advanced AI Prompt System Enhancement (Critical Priority)

**Inspired by Cursor's sophisticated prompt engineering, adapted for financial modeling**

### 0.1 Enhanced System Prompt with Financial Modeling Guidelines (Backend)
**File**: `/backend/internal/services/ai/prompt_builder.go` 

**Current Issue**: Basic system prompt lacks sophisticated operational guidelines
**Enhancement**: Implement Cursor-style comprehensive system prompt with financial modeling focus

Key improvements:
- **Parallel Tool Execution**: Like Cursor, emphasize running multiple financial analysis tools simultaneously
- **Comprehensive Context Gathering**: Always understand full model before making changes
- **Financial Memory System**: Learn user preferences for modeling conventions and standards
- **Clear Communication Guidelines**: When to ask vs. proceed autonomously in financial contexts
- **Error Handling**: Sophisticated validation and rollback for financial calculations

### 0.2 Parallel Tool Execution Framework (Backend)
**File**: `/backend/internal/services/ai/tool_executor.go`

**Add**: Parallel execution capability inspired by Cursor's efficiency focus

```go
// Execute multiple financial analysis tools simultaneously
func (te *ToolExecutor) executeParallelFinancialAnalysis(ctx context.Context, sessionID string, tools []string) ([]ParallelToolResult, error)
```

**Benefits**:
- 3-5x faster model analysis by running tools simultaneously
- Read assumptions, calculations, and outputs in parallel
- Analyze formulas while validating structure concurrently
- Build comprehensive model context before any changes

### 0.3 Financial Modeling Memory System (Backend)
**File**: `/backend/internal/services/ai/financial_memory.go` (NEW)

**Create**: User preference learning system for financial modeling

Learn and adapt to:
- **Modeling Conventions**: Preferred layouts, section organization, naming
- **Formatting Standards**: Color schemes, number formats, styling preferences
- **Calculation Methods**: Preferred formulas, assumptions, validation approaches  
- **Professional Standards**: Industry-specific conventions (PE, HF, IB, Corp Dev)
- **Default Assumptions**: Common discount rates, growth rates, multiples

### 0.4 Enhanced Communication Guidelines (Backend)
**File**: `/backend/internal/services/ai/prompt_builder.go`

**Add**: Financial modeling specific communication rules inspired by Cursor's clarity

**When to Proceed Autonomously**:
- Standard financial formatting (accounting notation, percentages)
- Professional section headers and spacing
- Formula validation for mathematical correctness
- Model organization according to best practices

**When to Ask for Confirmation**:
- Changing core assumptions or input values
- Modifying calculation methodologies
- Restructuring significant model sections
- Company-specific conventions

**When to Stop and Ask for Help**:
- Calculation errors that seem intentional
- Inconsistent or conflicting model logic
- Unclear model structure or purpose

### 0.5 Intelligent Context Analysis (Backend)
**File**: `/backend/internal/services/ai/context_analyzer.go` (NEW)

**Create**: Comprehensive model understanding before action, inspired by Cursor's thorough analysis

Before any financial model changes:
1. **Read Current Model Structure**: Understand complete layout
2. **Analyze Existing Formulas**: Trace all calculation dependencies
3. **Identify Model Type**: DCF, LBO, M&A, Trading Comps, Credit, etc.
4. **Validate Current Logic**: Check for errors or inconsistencies
5. **Understand User Intent**: Confirm changes align with model purpose
6. **Check User Preferences**: Apply learned conventions and standards

### 0.6 Financial Model-Specific Tool Orchestration (Backend)
**File**: `/backend/internal/services/ai/tool_orchestrator.go` (NEW)

**Create**: Intelligent tool selection and execution for financial models

```go
func (to *ToolOrchestrator) ExecuteFinancialModelingRequest(ctx context.Context, sessionID string, userRequest string) (*OrchestrationResult, error)
```

**Capabilities**:
- Analyze user intent in financial modeling context
- Generate intelligent tool execution plans
- Execute tools in parallel where possible
- Learn from interactions to improve future responses

## Phase 1: Fix Core Tool Implementation (High Priority)

### 1.1 Fix Formula Application Tool (Excel Add-in)
**File**: `/excel-addin/src/services/excel/ExcelService.ts` (lines 574-596)

**Issues**:
- `toolApplyFormula` doesn't handle range formulas properly
- Always sets `[[formula]]` regardless of target range size
- No proper relative reference handling for ranges

**Fix**: Implement proper range formula handling that works for any model type.

### 1.2 Fix Smart Format Implementation (Backend)
**File**: `/backend/internal/services/ai/tool_executor.go` (lines 1177+)

**Issues**:
- `applyConditionalRules` is placeholder implementation
- `buildFinancialFormat` doesn't handle all financial formats
- No proper error handling for invalid formats

**Fix**: Complete implementation with comprehensive financial formatting that applies to all model types.

### 1.3 Add Universal Model Organization Tool (Backend)
**File**: `/backend/internal/services/ai/tool_executor.go`

**New Tool**: `organize_financial_model`
```go
case "organize_financial_model":
    content, err := te.executeOrganizeFinancialModel(ctx, sessionID, toolCall.Input)
    // Implementation creates structured sections with proper organization
    // Works for ANY financial model type (DCF, LBO, M&A, Comps, etc.)
```

## Phase 2: Universal Financial Formatting Standards (Medium Priority)

### 2.1 Enhanced Format Mapping (Excel Add-in)
**File**: `/excel-addin/src/services/excel/ExcelService.ts` (lines 647-767)

**Enhance**: Add comprehensive financial formats used across all model types:
- **Currency formats**: Standard accounting formats
- **Percentage formats**: Growth rates, margins, returns (used in all models)
- **Multiple formats**: Valuation multiples (EV/EBITDA, P/E, etc.)
- **Basis points**: Interest rates, spreads
- **Large number formats**: Millions, billions with proper scaling
- **Professional conditional formatting**: Positive/negative value styling

### 2.2 Universal Styling Standards (Backend)
**File**: `/backend/internal/services/ai/tool_executor.go`

**Enhance**: `buildFinancialFormat` with **universal financial modeling standards**:
- **Input cells**: Blue text (universally recognized across all models)
- **Calculation cells**: Black text (standard for formulas)
- **Output cells**: Bold black text (standard for results)
- **Section headers**: Bold, larger font, consistent across model types
- **Assumption areas**: Light blue background (universal input identification)
- **Professional borders**: Clean, consistent styling

## Phase 3: Universal Model Organization System (Medium Priority)

### 3.1 Financial Model Structure Analyzer (Backend)
**File**: `/backend/internal/services/ai/tool_executor.go` (lines 761+)

**Enhance**: `executeAnalyzeModelStructure` to recognize **universal patterns**:
- **Input sections**: Where assumptions and inputs are located
- **Calculation sections**: Where formulas and computations happen
- **Output sections**: Where final results are displayed
- **Time period orientation**: Horizontal vs vertical time layouts
- **Key metric identification**: Important cells regardless of model type
- **Data flow patterns**: How information flows through any model

### 3.2 Smart Section Creation Tool (Backend)
**File**: `/backend/internal/services/ai/tools.go`

**Add**: New tool `create_model_sections` that works for ANY model type:
```json
{
  "name": "create_model_sections",
  "description": "Creates professional section organization for any financial model type with proper headers, spacing, and visual hierarchy",
  "parameters": {
    "sections": "array of section types (assumptions, calculations, outputs, etc.)",
    "layout": "horizontal or vertical orientation", 
    "spacing": "professional spacing between sections",
    "header_style": "consistent header formatting"
  }
}
```

### 3.3 Universal Model Template Framework (Backend)
**File**: `/backend/internal/services/financial/model_template.go` (NEW)

**Create**: **Flexible template system** that adapts to any model type:
- **Section-based organization**: Not model-specific sections
- **Professional spacing and headers**: Universal standards
- **Flexible time period handling**: Works for any time horizon
- **Input/calculation/output areas**: Universal model components
- **Smart section detection**: Understands model intent without hardcoding

## Phase 4: Enhanced Universal Prompts (Low Priority)

### 4.1 Universal Financial Modeling Prompts (Backend)
**File**: `/backend/internal/services/ai/prompt_builder.go` (lines 355+)

**Enhance**: Add **universal financial modeling instructions**:
- **Professional organization principles**: Clear sections, headers, spacing
- **Universal formatting standards**: Input/calculation/output styling
- **Time period best practices**: Consistent period handling
- **Formula validation**: Error checking for any model type
- **Professional presentation**: Standards that apply to all models

### 4.2 Model-Agnostic Guidelines (Backend)
**File**: `/backend/internal/services/ai/prompt_builder.go`

**Add**: Instructions for **universal best practices**:
- Creating clear, professional section headers
- Consistent spacing and organization
- Professional formatting that works across model types
- Universal formula patterns and validation
- Flexible model structure recognition

## Key Tools Enhancement Strategy

### Instead of DCF-specific tools, enhance existing tools to be more intelligent:

1. **`analyze_model_structure`**: Make it recognize ANY model type and suggest appropriate organization
2. **`smart_format_cells`**: Apply professional standards regardless of model type  
3. **`build_financial_formula`**: Handle common formulas used across all model types
4. **`create_audit_trail`**: Work for any financial model documentation needs

### Universal Model Components:
- **Assumptions sections**: Every model has inputs/assumptions
- **Calculation areas**: Every model has computational logic
- **Output summaries**: Every model has key results
- **Time periods**: Most models have temporal elements
- **Key metrics**: Every model has important values to highlight

## Implementation Priority

### Phase 0 - Critical (Week 1): Advanced AI Prompt System
1. **Enhanced System Prompt**: Implement Cursor-style comprehensive prompt with financial focus
2. **Parallel Tool Execution**: Add framework for simultaneous tool execution (3-5x performance)
3. **Financial Memory System**: Create user preference learning for modeling conventions
4. **Communication Guidelines**: Clear rules for when to ask vs. proceed autonomously
5. **Context Analysis**: Comprehensive model understanding before any changes

### Phase 1 - Immediate (Week 1-2): Core Tool Fixes
1. Fix `toolApplyFormula` range handling (works for all models)
2. Complete `applyConditionalRules` with universal formatting
3. Add universal `organize_financial_model` tool
4. Integrate parallel execution into existing tools

### Phase 2 - Short-term (Week 2-3): Enhanced Intelligence
1. Enhanced universal format mapping and validation
2. Professional styling standards for all model types
3. Smart section creation tool (model-agnostic)
4. Tool orchestration system for intelligent tool selection

### Phase 3 - Medium-term (Week 3-4): Advanced Features
1. Universal model template framework
2. Enhanced model structure analyzer (recognizes any model type)
3. Memory-driven recommendations and automation
4. Advanced error handling and recovery systems

## Success Metrics

### Technical:
- ✅ Zero formula application errors across all model types
- ✅ Zero formatting errors regardless of model type
- ✅ 100% successful tool execution rate for any financial model
- ✅ 3-5x faster analysis through parallel tool execution
- ✅ Comprehensive context gathering before any model changes
- ✅ Intelligent error recovery and validation

### User Experience:
- ✅ Professional models regardless of type (DCF, LBO, M&A, Comps, etc.)
- ✅ Consistent organization across all model types
- ✅ Universal financial formatting standards
- ✅ Logical flow and professional presentation for any model
- ✅ AI learns and adapts to user preferences over time
- ✅ Clear communication about when AI will ask vs. proceed
- ✅ Faster response times through parallel operations

### AI Intelligence:
- ✅ Memory system learns user modeling conventions
- ✅ Intelligent tool selection based on context and user preferences
- ✅ Proactive analysis and recommendations
- ✅ Context-aware communication and autonomy decisions

## Universal Benefits

This approach provides:
- **Flexibility**: Works for DCF, LBO, M&A, Trading Comps, Credit, Budget models, etc.
- **Consistency**: Same professional standards across all model types
- **Scalability**: Easy to add new model types without rebuilding infrastructure
- **Professional Standards**: Industry-standard formatting and organization
- **AI Intelligence**: Smart recognition of model patterns without hardcoding

The system will be **truly universal** - helping analysts create professional, well-organized models regardless of the specific type or use case.

## Detailed Implementation Specifications

### Phase 1 Implementation Details

#### 1.1 Formula Application Fix

**Current Issue in ExcelService.ts:**
```typescript
// BROKEN: Always uses [[formula]] regardless of range size
if (relative_references) {
  excelRange.formulas = [[formula]]
} else {
  excelRange.formulas = [[formula]]
}
```

**Fix Implementation:**
```typescript
private async toolApplyFormula(input: any): Promise<any> {
  const { range, formula, relative_references = true } = input
  
  return Excel.run(async (context: any) => {
    const worksheet = context.workbook.worksheets.getActiveWorksheet()
    const excelRange = worksheet.getRange(range)
    
    // Load range properties to determine size
    excelRange.load(['rowCount', 'columnCount', 'address'])
    await context.sync()
    
    try {
      if (relative_references && (excelRange.rowCount > 1 || excelRange.columnCount > 1)) {
        // For ranges with relative references, use .formula property
        // This allows Excel to auto-adjust references for each cell
        excelRange.formula = formula
      } else {
        // For single cells or absolute references, use formulas array
        const formulaArray = Array(excelRange.rowCount).fill(null).map(() => 
          Array(excelRange.columnCount).fill(formula)
        )
        excelRange.formulas = formulaArray
      }
      
      await context.sync()
      
      return {
        message: 'Formula applied successfully',
        status: 'success',
        range: excelRange.address,
        formula_applied: formula
      }
    } catch (error) {
      console.error('Formula application error:', error)
      throw new Error(`Failed to apply formula "${formula}" to range "${range}": ${error.message}`)
    }
  })
}
```

#### 1.2 Smart Format Implementation Fix

**Current Issue in tool_executor.go:**
```go
func (te *ToolExecutor) applyConditionalRules(format *CellFormat, conditionalRules []interface{}) *CellFormat {
	// Basic implementation - would need more sophisticated conditional formatting
	// For now, just apply the base format
	return format
}
```

**Fix Implementation:**
```go
func (te *ToolExecutor) applyConditionalRules(format *CellFormat, conditionalRules []interface{}) *CellFormat {
	if len(conditionalRules) == 0 {
		return format
	}

	// Enhanced conditional formatting implementation
	for _, ruleInterface := range conditionalRules {
		rule, ok := ruleInterface.(map[string]interface{})
		if !ok {
			continue
		}

		condition, hasCondition := rule["condition"].(string)
		formatRule, hasFormat := rule["format"].(map[string]interface{})
		
		if !hasCondition || !hasFormat {
			continue
		}

		// Apply conditional formatting based on condition
		switch {
		case strings.Contains(condition, ">0"):
			// Positive values - standard formatting
			if fontColor, ok := formatRule["font_color"].(string); ok {
				if format.Font == nil {
					format.Font = &FontStyle{}
				}
				format.Font.Color = fontColor
			}
		case strings.Contains(condition, "<0"):
			// Negative values - typically red
			if fontColor, ok := formatRule["font_color"].(string); ok {
				if format.Font == nil {
					format.Font = &FontStyle{}
				}
				format.Font.Color = fontColor
			}
			// For negative financial values, often use parentheses format
			if format.NumberFormat != "" && !strings.Contains(format.NumberFormat, "_)") {
				format.NumberFormat = strings.Replace(format.NumberFormat, "0.00", "0.00_);[Red](0.00)", 1)
			}
		case strings.Contains(condition, "=0"):
			// Zero values - often dash or special formatting
			if format.NumberFormat != "" {
				format.NumberFormat = strings.Replace(format.NumberFormat, "0.00", "0.00_);(0.00);\"-\"", 1)
			}
		}

		// Apply background color if specified
		if bgColor, ok := formatRule["background_color"].(string); ok {
			format.FillColor = bgColor
		}

		// Apply font style if specified
		if fontStyle, ok := formatRule["font_style"].(string); ok {
			if format.Font == nil {
				format.Font = &FontStyle{}
			}
			switch fontStyle {
			case "bold":
				format.Font.Bold = true
			case "italic":
				format.Font.Italic = true
			}
		}
	}

	return format
}
```

#### 1.3 Universal Model Organization Tool

**New Tool Implementation:**
```go
func (te *ToolExecutor) executeOrganizeFinancialModel(ctx context.Context, sessionID string, input map[string]interface{}) (map[string]interface{}, error) {
	// Extract parameters
	modelType, _ := input["model_type"].(string)
	sections, _ := input["sections"].([]interface{})
	layout, _ := input["layout"].(string)
	if layout == "" {
		layout = "horizontal" // default
	}

	// Analyze current model structure
	analysisRange, _ := input["analysis_range"].(string)
	if analysisRange == "" {
		analysisRange = "A1:Z100" // default scan range
	}

	// Read current model to understand structure
	data, err := te.excelBridge.ReadRange(ctx, sessionID, analysisRange, true, false)
	if err != nil {
		return nil, fmt.Errorf("failed to read model for analysis: %w", err)
	}

	// Generate universal organization plan
	organizationPlan := te.generateUniversalOrganizationPlan(data, modelType, sections, layout)

	// Apply organization changes
	err = te.applyModelOrganization(ctx, sessionID, organizationPlan)
	if err != nil {
		return nil, fmt.Errorf("failed to apply model organization: %w", err)
	}

	return map[string]interface{}{
		"status": "success",
		"message": "Financial model organized successfully",
		"organization_plan": organizationPlan,
		"sections_created": len(organizationPlan["sections"].([]interface{})),
		"layout": layout,
	}, nil
}

func (te *ToolExecutor) generateUniversalOrganizationPlan(data *RangeData, modelType string, sections []interface{}, layout string) map[string]interface{} {
	plan := map[string]interface{}{
		"layout": layout,
		"sections": []interface{}{},
		"formatting": map[string]interface{}{},
		"spacing": map[string]interface{}{},
	}

	// Universal sections that apply to all financial models
	defaultSections := []string{"assumptions", "calculations", "outputs"}
	if len(sections) == 0 {
		sections = make([]interface{}, len(defaultSections))
		for i, section := range defaultSections {
			sections[i] = section
		}
	}

	sectionPlans := []interface{}{}
	currentRow := 1

	for i, sectionInterface := range sections {
		section := sectionInterface.(string)
		
		sectionPlan := map[string]interface{}{
			"name": section,
			"type": te.getSectionType(section),
			"start_row": currentRow,
			"header_style": "professional",
			"spacing_after": 2,
		}

		// Add section header
		headerRange := fmt.Sprintf("A%d:%s%d", currentRow, te.getLastColumn(layout), currentRow)
		sectionPlan["header_range"] = headerRange
		sectionPlan["header_text"] = te.getUniversalSectionHeader(section)
		
		currentRow += 3 // Header + spacing

		// Estimate section size based on type
		sectionRows := te.estimateSectionSize(section, modelType)
		sectionPlan["end_row"] = currentRow + sectionRows - 1
		sectionPlan["content_range"] = fmt.Sprintf("A%d:%s%d", currentRow, te.getLastColumn(layout), currentRow + sectionRows - 1)
		
		currentRow += sectionRows + 2 // Content + spacing between sections
		
		sectionPlans = append(sectionPlans, sectionPlan)
	}

	plan["sections"] = sectionPlans
	return plan
}
```

### Phase 2 Implementation Details

#### 2.1 Enhanced Format Mapping

**Enhanced ExcelService.ts format mapping:**
```typescript
private validateAndNormalizeFormat(format: string, formatMap: { [key: string]: string }): string {
  // ... existing code ...

  // Enhanced financial formats for all model types
  const enhancedFormatMap: { [key: string]: string } = {
    // ... existing formats ...
    
    // Universal Financial Formats
    'irr': '0.0%',
    'return': '0.0%', 
    'yield': '0.0%',
    'discount_rate': '0.0%',
    'cost_of_capital': '0.0%',
    'margin': '0.0%',
    'growth': '0.0%',
    'terminal_growth': '0.0%',
    
    // Valuation Multiples (used across all models)
    'ev_ebitda': '0.0x',
    'ev_revenue': '0.0x', 
    'pe_ratio': '0.0x',
    'pb_ratio': '0.0x',
    'price_sales': '0.0x',
    'multiple': '0.0x',
    'times': '0.0x',
    
    // Financial Statement Items
    'revenue': '$#,##0',
    'ebitda': '$#,##0',
    'net_income': '$#,##0',
    'free_cash_flow': '$#,##0',
    'debt': '$#,##0',
    'equity': '$#,##0',
    'enterprise_value': '$#,##0',
    
    // Large Number Formats
    'millions': '#,##0,,"M"',
    'billions': '#,##0,,,"B"',
    'thousands_k': '#,##0,"K"',
    
    // Professional Conditional Formats
    'currency_positive_negative': '$#,##0.00_);[Red]($#,##0.00)',
    'currency_with_zero': '$#,##0.00_);($#,##0.00);"-"',
    'percentage_positive_negative': '0.0%_);[Red](0.0%)',
    
    // Credit/Fixed Income Formats
    'basis_points': '0"bps"',
    'credit_spread': '0"bps"',
    'interest_rate': '0.00%',
    'yield_to_maturity': '0.00%',
    
    // Trading/Comps Formats
    'trading_multiple': '0.0x',
    'median_multiple': '0.0x',
    'premium_discount': '0.0%',
    
    // LBO/PE Formats  
    'moic': '0.0x',
    'money_multiple': '0.0x',
    'annualized_return': '0.0%'
  }

  // Merge with existing format map
  const combinedFormatMap = { ...formatMap, ...enhancedFormatMap }
  
  // ... rest of existing validation logic ...
}
```

#### 2.2 Universal Styling Standards

**Enhanced buildFinancialFormat:**
```go
func (te *ToolExecutor) buildFinancialFormat(styleType string, input map[string]interface{}) *CellFormat {
	format := &CellFormat{}

	// Override with specific number format if provided
	if numberFormat, ok := input["number_format"].(string); ok {
		format.NumberFormat = numberFormat
		return format
	}

	// Universal financial modeling standards
	switch styleType {
	case "financial_input", "assumption":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "#0066CC", Bold: false} // Professional blue
		format.FillColor = "#F0F8FF" // Light blue background for easy identification
		
	case "financial_calculation", "formula":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "#000000", Bold: false} // Standard black
		
	case "financial_output", "result", "total":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "#000000", Bold: true} // Bold for emphasis
		
	case "header", "section_header":
		format.Font = &FontStyle{Bold: true, Size: 12, Color: "#000000"}
		format.Alignment = &Alignment{Horizontal: "center", Vertical: "middle"}
		format.FillColor = "#E6E6FA" // Light lavender for headers
		
	case "subheader":
		format.Font = &FontStyle{Bold: true, Size: 10, Color: "#000000"}
		format.Alignment = &Alignment{Horizontal: "left", Vertical: "middle"}
		
	case "percentage":
		format.NumberFormat = "0.0%"
		format.Font = &FontStyle{Color: "#000000", Bold: false}
		
	case "currency":
		format.NumberFormat = "$#,##0.00"
		format.Font = &FontStyle{Color: "#000000", Bold: false}
		
	case "multiple":
		format.NumberFormat = "0.0\"x\""
		format.Font = &FontStyle{Color: "#000000", Bold: false}
		
	case "basis_points":
		format.NumberFormat = "0\"bps\""
		format.Font = &FontStyle{Color: "#000000", Bold: false}
		
	case "large_currency":
		format.NumberFormat = "$#,##0,,\"M\""
		format.Font = &FontStyle{Color: "#000000", Bold: false}
		
	// Model-specific but universal styling
	case "key_metric":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "#000000", Bold: true, Size: 11}
		format.FillColor = "#FFFACD" // Light yellow for key metrics
		
	case "positive_negative":
		format.NumberFormat = "$#,##0.00_);[Red]($#,##0.00)"
		format.Font = &FontStyle{Color: "#000000", Bold: false}
		
	default:
		format.NumberFormat = "General"
		format.Font = &FontStyle{Color: "#000000", Bold: false}
	}

	return format
}
```

This comprehensive plan addresses all three core issues with a universal, model-agnostic approach that will benefit all types of financial models that analysts create.