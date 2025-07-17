# Backend Filtering Fix Plan

## 1. Executive Summary

This document outlines the plan to fix a critical performance issue where spreadsheet data is not being filtered correctly. The previous implementation placed the filtering logic in the `ToolExecutor`, which is too late in the data processing pipeline. This results in large, unfiltered payloads being passed through the system, causing memory and network overhead.

The solution is to relocate the filtering logic to the `ExcelBridge`, ensuring that data is filtered immediately after it is read from the spreadsheet and before it is passed to any other backend service.

## 2. Analysis of the Flaw

The current data flow for a `read_range` operation is as follows:

1.  **Excel Client (Frontend)**: Sends a `read_range` request.
2.  **SignalR**: Transmits the request to the backend.
3.  **ExcelBridge (`excel_bridge_impl.go`)**: Receives the request, calls the Excel client via SignalR, and receives a large, unfiltered `RangeData` object. This large object is then passed up the chain.
4.  **AI Service (`service.go`)**: Receives the tool call.
5.  **ToolExecutor (`tool_executor_basic_ops.go`)**: Finally executes the tool, which includes the `filterEmptyRows` function.

The problem is that the performance-intensive work of serializing and passing the large JSON object happens in **Step 3**. The filtering in **Step 5** happens too late to prevent the performance hit.

## 3. Implementation Strategy

The fix involves moving the `filterEmptyRows` function from the `ai` package to the `excel` package and applying it at the correct stage.

### Step 1: Relocate `filterEmptyRows` Function

The `filterEmptyRows` function will be moved from `backend/internal/services/ai/tool_executor_basic_ops.go` to `backend/internal/services/excel/excel_bridge_impl.go`.

The function signature will remain the same, but it will now operate on the `ai.RangeData` type from within the `excel` package.

**Source File:** `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/tool_executor_basic_ops.go`
**Destination File:** `/Users/brendantoole/projects2/gridmate/backend/internal/services/excel/excel_bridge_impl.go`

### Step 2: Remove Filtering Logic from `ToolExecutor`

In `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/tool_executor_basic_ops.go`, the `filterEmptyRows` function definition will be removed entirely.

Then, the call to it within the `executeReadRange` function will be removed.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/tool_executor_basic_ops.go`

**Action:** In the `executeReadRange` function, remove the filtering call.

```go
// --- OLD CODE ---
	result, err := te.excelBridge.ReadRange(ctx, sessionID, rangeAddr, includeFormulas, includeFormatting)
	if err != nil {
		return nil, err
	}

	// Filter out empty rows to reduce payload size
	result = filterEmptyRows(result)

	return result, nil

// --- NEW CODE ---
	result, err := te.excelBridge.ReadRange(ctx, sessionID, rangeAddr, includeFormulas, includeFormatting)
	if err != nil {
		return nil, err
	}

	return result, nil
```

### Step 3: Integrate Filtering into `ExcelBridge`

The `filterEmptyRows` function will be added to `/Users/brendantoole/projects2/gridmate/backend/internal/services/excel/excel_bridge_impl.go`.

Then, it will be called inside the `ReadRange` function immediately after the data is successfully unmarshaled.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/backend/internal/services/excel/excel_bridge_impl.go`

**Action:** Add the `filterEmptyRows` function definition to this file. Then, modify the `ReadRange` function.

```go
// --- OLD CODE ---
	var rangeData ai.RangeData
	if err := json.Unmarshal(jsonData, &rangeData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal range data: %w", err)
	}

	return &rangeData, nil

// --- NEW CODE ---
	var rangeData ai.RangeData
	if err := json.Unmarshal(jsonData, &rangeData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal range data: %w", err)
	}

	// Filter empty rows before returning the data
	filteredData := filterEmptyRows(&rangeData)

	return filteredData, nil
```
*(Note: The `filterEmptyRows` function from `tool_executor_basic_ops.go` should be copied into this file, with its definition adjusted to handle the `ai.RangeData` type correctly within the `excel` package context).*

## 4. Verification and Testing

1.  **Run the Application**: Start the application using the same test case that previously caused errors.
2.  **Inspect Backend Logs**: Check the backend logs for the `tool-response` message related to the `read_range` call. The `result` field should now contain a significantly smaller, filtered array, with no trailing empty rows.
3.  **Confirm Logging**: Look for the "Filtered empty rows from range data" log message coming from the `excel_bridge` component, confirming the logic executed in the correct place.
4.  **Frontend Behavior**: Ensure the frontend chat interface displays the data correctly and the application remains stable.
5.  **Unit Testing**: Add a unit test for the `filterEmptyRows` function in its new location (`excel_bridge_impl_test.go`) to ensure it behaves as expected with various data shapes (e.g., all empty, some empty, fully dense).

This plan will correctly implement the filtering logic at the source, resolving the performance bottleneck and improving overall application stability.
