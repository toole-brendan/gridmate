# AI Toolset Expansion and Enhancement Plan

## 1. Overview

This document outlines the implementation plan to evolve the AI's capabilities from a set of low-level primitives to a suite of high-level, domain-specific tools tailored for advanced financial modeling. The goal is to create a "Cursor-like" experience where the AI can understand and execute complex, multi-step tasks that are central to an analyst's daily workflow.

This plan primarily involves modifications to the following key files:
-   **Frontend Tool Implementation**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts` is where the client-side logic for each tool will be implemented.
-   **Backend AI Configuration**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go` is where the tool definitions will be added to the system prompt to make the AI aware of its new capabilities.
-   **Backend Data Service (New File)**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/financialdata/service.go` will be created to handle fetching data from external financial APIs.

This plan is guided by two core principles:
1.  **Context Window Efficiency**: Tools are designed as high-leverage abstractions to minimize the number of back-and-forth calls with the AI.
2.  **Workflow Alignment**: New tools map directly to the common, repetitive, and high-value tasks performed by financial analysts.

---

## 2. New High-Level Tools Implementation

This section details the implementation of brand-new tools that abstract common financial modeling tasks.

### 2.1. Tool: `build_financial_schedule`

-   **Objective**: To generate a complete, standard financial schedule (e.g., Debt Schedule, Depreciation Waterfall) with labels and formulas.
-   **User Prompt Example**: *"Build a 5-year debt schedule starting in the current cell. The beginning balance is in cell C5. Assume a 5% interest rate and a fixed annual principal repayment of $2,000,000."*

#### Frontend Implementation

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action**: Add the following method inside the `ExcelService` class and wire it into the `executeToolRequest` switch statement.

```typescript
// Add to the executeToolRequest switch statement:
// case 'build_financial_schedule':
//   return await this.toolBuildFinancialSchedule(input);

private async toolBuildFinancialSchedule(input: any): Promise<any> {
  const { start_cell, schedule_type, years, inputs } = input;

  if (schedule_type !== 'debt_schedule') {
    throw new Error(`Schedule type "${schedule_type}" is not yet supported.`);
  }

  // --- Debt Schedule Example ---
  const headers = ["", ...Array.from({ length: years }, (_, i) => `Year ${i + 1}`)];
  const rows = [
    "Beginning Balance",
    "Interest Expense",
    "Principal Repayment",
    "Ending Balance"
  ];

  const data: any[][] = [headers];
  rows.forEach(row => data.push([row, ...Array(years).fill(null)]));

  // Write headers and labels
  const scheduleRange = `${start_cell}:${this.columnToLetter(this.letterToColumn(start_cell.match(/[A-Z]+/)[0]) + years)}${parseInt(start_cell.match(/\d+/)[0]) + rows.length}`;
  await this.toolWriteRange({ range: scheduleRange, values: data });

  // Apply formulas
  const startRow = parseInt(start_cell.match(/\d+/)[0]);
  const startColLetter = start_cell.match(/[A-Z]+/)[0];
  const startColIndex = this.letterToColumn(startColLetter);

  for (let year = 1; year <= years; year++) {
    const currentCol = this.columnToLetter(startColIndex + year);
    const prevCol = this.columnToLetter(startColIndex + year - 1);

    // Beginning Balance Formula
    const beginningBalanceCell = `${currentCol}${startRow + 1}`;
    const beginningBalanceFormula = (year === 1)
      ? `=${inputs.beginning_balance_cell}`
      : `=${prevCol}${startRow + 4}`; // Previous year's ending balance
    await this.toolApplyFormula({ range: beginningBalanceCell, formula: beginningBalanceFormula });

    // Interest Expense Formula
    const interestExpenseCell = `${currentCol}${startRow + 2}`;
    const interestExpenseFormula = `=${beginningBalanceCell}*${inputs.interest_rate}`;
    await this.toolApplyFormula({ range: interestExpenseCell, formula: interestExpenseFormula });

    // Principal Repayment
    const principalRepaymentCell = `${currentCol}${startRow + 3}`;
    await this.toolWriteRange({ range: principalRepaymentCell, values: [[inputs.principal_repayment]] });

    // Ending Balance Formula
    const endingBalanceCell = `${currentCol}${startRow + 4}`;
    const endingBalanceFormula = `=${beginningBalanceCell}-${principalRepaymentCell}`;
    await this.toolApplyFormula({ range: endingBalanceCell, formula: endingBalanceFormula });
  }

  return { status: 'success', message: `Debt schedule built successfully at ${start_cell}.` };
}
```

#### Backend Definition

**File to Modify**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

**Action**: Add the following tool definition to the system prompt sent to the AI.

```json
{
  "tool_name": "build_financial_schedule",
  "description": "Generates a standard financial schedule in the worksheet. Use for creating structures like debt schedules, depreciation waterfalls, etc.",
  "parameters": [
    { "name": "start_cell", "type": "string", "description": "The top-left cell where the schedule should be built, e.g., 'A1'." },
    { "name": "schedule_type", "type": "string", "description": "The type of schedule to build. Currently supports: 'debt_schedule'." },
    { "name": "years", "type": "number", "description": "The number of years the schedule should cover." },
    { "name": "inputs", "type": "object", "description": "An object containing the necessary inputs for the schedule, with values being either direct numbers or cell references.",
      "properties": {
        "beginning_balance_cell": { "type": "string", "description": "Cell reference for the starting debt balance." },
        "interest_rate": { "type": "string", "description": "The interest rate as a number (e.g., 0.05) or a cell reference." },
        "principal_repayment": { "type": "string", "description": "The fixed principal repayment amount or a cell reference." }
      }
    }
  ]
}
```

### 2.2. Tool: `trace_precedents`

-   **Objective**: To identify and return the addresses of all cells that directly feed into a specified cell's formula.
-   **User Prompt Example**: *"What cells are used to calculate the value in B22?"* or *"Trace the precedents for B22."*

#### Frontend Implementation

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action**: Add the following method and wire it into the `executeToolRequest` switch statement.

```typescript
// Add to the executeToolRequest switch statement:
// case 'trace_precedents':
//   return await this.toolTracePrecedents(input);

private async toolTracePrecedents(input: any): Promise<{ cell: string, precedents: string[] }> {
  const { cell } = input;
  return Excel.run(async (context: any) => {
    const worksheet = context.workbook.worksheets.getActiveWorksheet();
    const targetCell = worksheet.getRange(cell);
    const precedents = targetCell.getDirectPrecedents();
    precedents.load('areas');
    await context.sync();

    const precedentAddresses: string[] = [];
    for (const area of precedents.areas.items) {
      precedentAddresses.push(area.address);
    }

    return { cell, precedents: precedentAddresses };
  });
}
```

#### Backend Definition

**File to Modify**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

**Action**: Add the following tool definition to the system prompt.

```json
{
  "tool_name": "trace_precedents",
  "description": "Traces the direct precedent cells that a formula in a specified cell refers to. Use this to understand how a value is calculated.",
  "parameters": [
    { "name": "cell", "type": "string", "description": "The cell to analyze, e.g., 'B22'." }
  ]
}
```

### 2.3. Tool: `find_hardcoded_values`

-   **Objective**: To scan a range and identify any formulas that contain hardcoded numbers, which is a common modeling error.
-   **User Prompt Example**: *"Check the selected range for any hardcoded numbers in the formulas."*

#### Frontend Implementation

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action**: Add the following method and wire it into the `executeToolRequest` switch statement.

```typescript
// Add to the executeToolRequest switch statement:
// case 'find_hardcoded_values':
//   return await this.toolFindHardcodedValues(input);

private async toolFindHardcodedValues(input: any): Promise<{ hardcoded_cells: { cell: string, formula: string, hardcoded_value: number }[] }> {
  const { range } = input;
  const rangeData = await this.toolReadRange({ range, include_formulas: true });

  const hardcodedCells: { cell: string, formula: string, hardcoded_value: number }[] = [];
  const formulaRegex = /[+\-*/^=(,]\s*(\d+(\.\d+)?)/g; // Regex to find numbers not in cell references

  for (let i = 0; i < rangeData.formulas.length; i++) {
    for (let j = 0; j < rangeData.formulas[i].length; j++) {
      const formula = rangeData.formulas[i][j];
      if (typeof formula === 'string' && formula.startsWith('=')) {
        let match;
        while ((match = formulaRegex.exec(formula)) !== null) {
          // Avoid matching numbers within cell references like 'A10'
          const preChar = formula.charAt(match.index - 1);
          if (!/[A-Z]/i.test(preChar)) {
            const cellAddress = this.getCellAddress(rangeData.address, i, j);
            hardcodedCells.push({
              cell: cellAddress,
              formula: formula,
              hardcoded_value: parseFloat(match[1])
            });
            break; // Only report first hardcoded value per cell
          }
        }
      }
    }
  }
  return { hardcoded_cells: hardcodedCells };
}
```

#### Backend Definition

**File to Modify**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

**Action**: Add the following tool definition to the system prompt.

```json
{
  "tool_name": "find_hardcoded_values",
  "description": "Scans a range of formulas and identifies any that contain hardcoded numerical values instead of cell references. This is useful for auditing a model for best practices.",
  "parameters": [
    { "name": "range", "type": "string", "description": "The cell range to scan, e.g., 'A1:F50'." }
  ]
}
```

---

## 3. Existing Tool Enhancements

This section details improvements to existing tools to make them more powerful and aligned with user needs.

### 3.1. Tool Enhancement: `validate_model`

-   **Objective**: To evolve `validate_model` from a simple error checker into a comprehensive model auditing tool.
-   **Enhancements**:
    1.  Integrate the `find_hardcoded_values` logic.
    2.  Add a check for inconsistent formulas within a contiguous row or column.

#### Frontend Implementation

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action**: Replace the existing `toolValidateModel` method with the enhanced version below.

```typescript
private async toolValidateModel(input: any): Promise<any> {
  const { range } = input;
  const rangeData = await this.toolReadRange({ range, include_formulas: true, include_formatting: false });

  const results = {
    errors: [],
    hardcoded_values: [],
    inconsistent_formulas: []
  };

  // 1. Check for basic Excel errors
  for (let i = 0; i < rangeData.values.length; i++) {
    for (let j = 0; j < rangeData.values[i].length; j++) {
      const value = rangeData.values[i][j];
      if (typeof value === 'string' && value.startsWith('#')) {
        results.errors.push({
          cell: this.getCellAddress(rangeData.address, i, j),
          error: value
        });
      }
    }
  }

  // 2. Check for hardcoded values
  const hardcodedCheck = await this.toolFindHardcodedValues({ range });
  results.hardcoded_values = hardcodedCheck.hardcoded_cells;

  // 3. Check for inconsistent formulas (basic implementation)
  // Check rows for inconsistency
  for (let i = 0; i < rangeData.formulas.length; i++) {
    for (let j = 1; j < rangeData.formulas[i].length; j++) {
      const f1 = rangeData.formulas[i][j-1];
      const f2 = rangeData.formulas[i][j];
      if (f1 && f2 && f1 !== f2) { // This is a naive check, needs improvement for R1C1 style comparison
        results.inconsistent_formulas.push({
          cell: this.getCellAddress(rangeData.address, i, j),
          details: `Formula is different from the cell to its left (${this.getCellAddress(rangeData.address, i, j-1)}).`
        });
      }
    }
  }

  return results;
}
```

#### Backend Definition

**File to Modify**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

**Action**: Update the existing tool definition for `validate_model` in the system prompt.

```json
{
  "tool_name": "validate_model",
  "description": "Performs a comprehensive audit of a given range. It checks for Excel errors (e.g., #REF!), hardcoded numbers in formulas, and inconsistent formulas across rows or columns.",
  "parameters": [
    { "name": "range", "type": "string", "description": "The cell range to validate, e.g., 'A1:Z100'." }
  ]
}
```

---

## 4. Backend Integration for `fetch_financial_data`

This tool requires a new backend service to interact with an external financial data provider.

-   **Objective**: To enable the AI to fetch real-world financial data (e.g., stock prices, company fundamentals) and insert it into the sheet.
-   **User Prompt Example**: *"Pull Apple's revenue and net income for the last 3 fiscal years and place it here."*

#### Backend Implementation (Proposal)

1.  **Choose a Data Provider**: Select a financial data API. A free, easy-to-use option is [Alpha Vantage](https://www.alphavantage.co/). A more robust, paid option would be [Polygon.io](https://polygon.io/).
2.  **Create New Service**:
    -   **File to Create**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/financialdata/service.go`
    -   **Purpose**: This service will be responsible for making HTTP requests to the chosen financial data API. It will handle API key management, request formatting, and parsing the response into a clean format.
3.  **Create New API Endpoint**:
    -   Expose the new service via a new API endpoint, for example: `POST /api/v1/data/fetch`.
    -   The request body should specify the data needed (e.g., ticker, metric, period).
    -   The endpoint in the Go router will call the `financialdata` service.

#### Frontend Implementation

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action**: Add the following method. This method will call the new backend endpoint.

```typescript
// Add to the executeToolRequest switch statement:
// case 'fetch_financial_data':
//   return await this.toolFetchFinancialData(input);

private async toolFetchFinancialData(input: any): Promise<any> {
  const { company, metrics, years, start_cell } = input;

  // This URL is a placeholder for the actual backend endpoint
  const response = await fetch('http://localhost:8080/api/v1/data/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, metrics, years })
  });

  if (!response.ok) {
    throw new Error('Failed to fetch financial data from the backend.');
  }

  const data = await response.json();
  // data should be a 2D array [[header1, h2], [value1, v2], ...]

  await this.toolWriteRange({ range: start_cell, values: data });

  return { status: 'success', message: `Financial data for ${company} fetched successfully.` };
}
```

#### Backend Definition

**File to Modify**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

**Action**: Add the following tool definition to the system prompt.

```json
{
  "tool_name": "fetch_financial_data",
  "description": "Fetches real-world financial data for a specified company from external sources and writes it into the sheet.",
  "parameters": [
    { "name": "company", "type": "string", "description": "The name or stock ticker of the company, e.g., 'Apple' or 'AAPL'." },
    { "name": "metrics", "type": "array", "items": { "type": "string" }, "description": "A list of financial metrics to fetch, e.g., ['revenue', 'net_income']." },
    { "name": "years", "type": "number", "description": "The number of past years of data to retrieve." },
    { "name": "start_cell", "type": "string", "description": "The top-left cell where the fetched data should be placed." }
  ]
}
```

---

## 5. New Tools for Aesthetics and Native Features

This section details tools for controlling visual layout and for replicating common, native Excel features that are not directly exposed by the APIs.

### 5.1. Tool: `apply_layout`

-   **Objective**: To provide the AI with precise control over the visual layout of cells, including merging, setting dimensions, and applying borders.
-   **User Prompt Examples**:
    -   *"Merge cells A1 through E1 for the main header."*
    -   *"Set the width of column C to 30."*
    -   *"Put an outline border around the selected table."*

#### Frontend Implementation

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action**: Add the following method and wire it into the `executeToolRequest` switch statement.

```typescript
// Add to the executeToolRequest switch statement:
// case 'apply_layout':
//   return await this.toolApplyLayout(input);

private async toolApplyLayout(input: any): Promise<any> {
  const { range, merge, row_height, column_width, auto_fit, border } = input;

  return Excel.run(async (context: any) => {
    const excelRange = context.workbook.worksheets.getActiveWorksheet().getRange(range);

    if (merge) {
      excelRange.merge(merge === 'across');
    }
    if (row_height) {
      excelRange.format.rowHeight = row_height;
    }
    if (column_width) {
      excelRange.format.columnWidth = column_width;
    }
    if (auto_fit) {
      if (auto_fit === 'rows') excelRange.format.autofitRows();
      if (auto_fit === 'columns') excelRange.format.autofitColumns();
    }
    if (border) {
      const { edge, style, weight, color } = border;
      const borderStyle = style || 'Continuous';
      const borderWeight = weight || 'Thin';
      const borderColor = color || 'Black';
      
      const borderObj = excelRange.format.borders.getItem(edge);
      borderObj.style = borderStyle;
      borderObj.weight = borderWeight;
      borderObj.color = borderColor;
    }

    await context.sync();
    return { status: 'success', message: `Layout applied successfully to ${range}.` };
  });
}
```

#### Backend Definition

**File to Modify**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

**Action**: Add the following tool definition to the system prompt.

```json
{
  "tool_name": "apply_layout",
  "description": "Modifies the visual layout of the worksheet. Can merge cells, set row heights and column widths, autofit, and apply borders.",
  "parameters": [
    { "name": "range", "type": "string", "description": "The target range for the layout change, e.g., 'A1:C10'." },
    { "name": "merge", "type": "string", "enum": ["all", "across"], "description": "Optional. 'all' merges the entire range into one cell. 'across' merges each row in the range individually." },
    { "name": "row_height", "type": "number", "description": "Optional. Sets the height for all rows in the range." },
    { "name": "column_width", "type": "number", "description": "Optional. Sets the width for all columns in the range." },
    { "name": "auto_fit", "type": "string", "enum": ["rows", "columns"], "description": "Optional. Auto-fits the height of rows or the width of columns in the range based on their content." },
    { "name": "border", "type": "object", "description": "Optional. Applies a border. Specify 'edge' ('Top', 'Bottom', 'Left', 'Right', 'Outline', 'Inside') and optionally 'style' ('Continuous', 'Dash', 'Dot'), 'weight' ('Thin', 'Medium', 'Thick'), and 'color'." }
  ]
}
```

### 5.2. Tool: `sort_range`

-   **Objective**: To replicate Excel's native sorting functionality.
-   **User Prompt Example**: *"Sort the table from A3 to F50 by the values in column D in descending order."*

#### Frontend Implementation

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action**: Add the following method and wire it into the `executeToolRequest` switch statement.

```typescript
// Add to the executeToolRequest switch statement:
// case 'sort_range':
//   return await this.toolSortRange(input);

private async toolSortRange(input: any): Promise<any> {
  const { range, sort_by } = input;

  return Excel.run(async (context: any) => {
    const excelRange = context.workbook.worksheets.getActiveWorksheet().getRange(range);
    const sortFields = sort_by.map(field => ({
      key: field.column_index, // Assumes column index is provided
      ascending: field.order !== 'descending',
    }));

    excelRange.sort.apply(sortFields);
    await context.sync();
    return { status: 'success', message: `Range ${range} sorted.` };
  });
}
```

#### Backend Definition

**File to Modify**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

**Action**: Add the following tool definition to the system prompt.

```json
{
  "tool_name": "sort_range",
  "description": "Sorts a range of data based on one or more columns.",
  "parameters": [
    { "name": "range", "type": "string", "description": "The entire range to sort, including headers, e.g., 'A1:G50'." },
    { "name": "sort_by", "type": "array", "items": {
        "type": "object",
        "properties": {
          "column_index": { "type": "number", "description": "The 0-based index of the column to sort by within the specified range." },
          "order": { "type": "string", "enum": ["ascending", "descending"], "description": "The sort order." }
        }
      }, "description": "An array of objects specifying the columns and order to sort by."
    }
  ]
}
```

### 5.3. Tool: `remove_duplicates`

-   **Objective**: To replicate Excel's native "Remove Duplicates" feature.
-   **User Prompt Example**: *"Remove duplicates from my selection based on the first column."*

#### Frontend Implementation

**File to Modify**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action**: Add the following method and wire it into the `executeToolRequest` switch statement.

```typescript
// Add to the executeToolRequest switch statement:
// case 'remove_duplicates':
//   return await this.toolRemoveDuplicates(input);

private async toolRemoveDuplicates(input: any): Promise<any> {
  const { range, key_columns_indices } = input;

  return Excel.run(async (context: any) => {
    const excelRange = context.workbook.worksheets.getActiveWorksheet().getRange(range);
    const result = excelRange.removeDuplicates(key_columns_indices, true); // true = hasHeaders
    result.load('removed');
    await context.sync();
    return { status: 'success', message: `${result.removed} duplicate rows were removed.` };
  });
}
```

#### Backend Definition

**File to Modify**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go`

**Action**: Add the following tool definition to the system prompt.

```json
{
  "tool_name": "remove_duplicates",
  "description": "Removes duplicate rows from a specified range based on the values in key columns.",
  "parameters": [
    { "name": "range", "type": "string", "description": "The range to process, e.g., 'A1:D100'." },
    { "name": "key_columns_indices", "type": "array", "items": { "type": "number" }, "description": "An array of 0-based column indices within the range to check for duplicates." }
  ]
}
```

---

## 6. Implementation and Verification Steps

1.  **Modify Frontend**: Open `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts` and add/update the methods as described above. Ensure each new tool is added to the `executeToolRequest` switch statement.
2.  **Modify Backend (Prompting)**: Open `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/prompt_builder.go` and add/update the JSON tool definitions within the system prompt string.
3.  **Implement Backend (Data Service)**: Create the new `financialdata` service and API endpoint in the Go backend as proposed.
4.  **Rebuild and Run**: Rebuild both the frontend and backend applications.
5.  **Test Each Tool**: Systematically test each new and enhanced tool using the example user prompts.
    -   Verify that the AI calls the correct tool with the correct parameters.
    -   Verify that the `ExcelService` executes the action correctly in the Excel sheet.
    -   Verify that the final response to the user is accurate and helpful.