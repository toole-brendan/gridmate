package ai

import (
	"github.com/rs/zerolog/log"
)

// DetectBatchableOperations analyzes tool calls to identify operations that can be batched together
func (te *ToolExecutor) DetectBatchableOperations(toolCalls []ToolCall) [][]ToolCall {
	if len(toolCalls) <= 1 {
		return [][]ToolCall{toolCalls}
	}

	var batches [][]ToolCall
	var currentBatch []ToolCall

	for i, toolCall := range toolCalls {
		if i == 0 {
			currentBatch = append(currentBatch, toolCall)
			continue
		}

		// Check if current tool can be batched with the previous ones
		if te.canBatchTogether(currentBatch, toolCall) {
			currentBatch = append(currentBatch, toolCall)
		} else {
			// Start a new batch
			if len(currentBatch) > 0 {
				batches = append(batches, currentBatch)
			}
			currentBatch = []ToolCall{toolCall}
		}
	}

	// Add the last batch
	if len(currentBatch) > 0 {
		batches = append(batches, currentBatch)
	}

	log.Info().
		Int("total_tools", len(toolCalls)).
		Int("batch_count", len(batches)).
		Msg("Detected batchable operations")

	return batches
}

// canBatchTogether determines if a tool call can be batched with existing batch
func (te *ToolExecutor) canBatchTogether(batch []ToolCall, newTool ToolCall) bool {
	// Don't batch if the batch is already too large
	if len(batch) >= 10 {
		return false
	}

	// Get the first tool in the batch to determine batch type
	firstTool := batch[0]

	// Same tool type operations can often be batched
	if firstTool.Name == newTool.Name {
		return te.canBatchSameType(firstTool, newTool)
	}

	// Different tools can be batched if they operate on related ranges
	return te.canBatchRelatedOperations(batch, newTool)
}

// canBatchSameType checks if two operations of the same type can be batched
func (te *ToolExecutor) canBatchSameType(tool1, tool2 ToolCall) bool {
	switch tool1.Name {
	case "write_range":
		// Batch write operations if they're in adjacent or nearby cells
		range1 := te.extractRange(tool1.Input)
		range2 := te.extractRange(tool2.Input)
		return te.areRangesAdjacent(range1, range2) || te.areRangesInSameSection(range1, range2)

	case "apply_formula":
		// Batch formula applications in the same column or row
		range1 := te.extractRange(tool1.Input)
		range2 := te.extractRange(tool2.Input)
		return te.areRangesInSameColumnOrRow(range1, range2)

	case "format_range":
		// Always batch formatting operations - they're safe and quick
		return true

	default:
		return false
	}
}

// canBatchRelatedOperations checks if different tool types can be batched
func (te *ToolExecutor) canBatchRelatedOperations(batch []ToolCall, newTool ToolCall) bool {
	// Common patterns that can be batched:
	// 1. Write + Format on same range
	// 2. Write + Apply formula in adjacent cells
	// 3. Multiple operations building a table structure

	newRange := te.extractRange(newTool.Input)
	if newRange == "" {
		return false
	}

	for _, existingTool := range batch {
		existingRange := te.extractRange(existingTool.Input)
		if existingRange == "" {
			continue
		}

		// Write + Format pattern
		if (existingTool.Name == "write_range" && newTool.Name == "format_range") ||
			(existingTool.Name == "format_range" && newTool.Name == "write_range") {
			if existingRange == newRange || te.rangeContains(existingRange, newRange) {
				return true
			}
		}

		// Operations in same table section
		if te.areRangesInSameSection(existingRange, newRange) {
			return true
		}
	}

	return false
}

// Helper methods for range analysis
func (te *ToolExecutor) extractRange(input map[string]interface{}) string {
	if rangeAddr, ok := input["range_address"].(string); ok {
		return rangeAddr
	}
	return ""
}

func (te *ToolExecutor) areRangesAdjacent(range1, range2 string) bool {
	// Parse ranges and check if they're adjacent
	// Example: A1:A10 and A11:A20 are adjacent
	// This is a simplified implementation
	return false // TODO: Implement proper range adjacency check
}

func (te *ToolExecutor) areRangesInSameSection(range1, range2 string) bool {
	// Check if ranges are in the same logical section of a model
	// Example: Both in rows 1-20 (assumptions section)
	// This is a simplified implementation
	return false // TODO: Implement section detection
}

func (te *ToolExecutor) areRangesInSameColumnOrRow(range1, range2 string) bool {
	// Check if ranges share the same column or row
	// This is a simplified implementation
	return false // TODO: Implement column/row detection
}

func (te *ToolExecutor) rangeContains(parentRange, childRange string) bool {
	// Check if one range contains another
	// This is a simplified implementation
	return parentRange == childRange // TODO: Implement proper range containment
}
