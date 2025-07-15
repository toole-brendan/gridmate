package diff

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/gridmate/backend/internal/models"
)

// Service provides diff computation functionality
type Service interface {
	ComputeDiff(before, after models.WorkbookSnapshot) []models.DiffHunk
}

type serviceImpl struct{}

// NewService creates a new diff service
func NewService() Service {
	return &serviceImpl{}
}

// ComputeDiff calculates the difference between two workbook snapshots
func (s *serviceImpl) ComputeDiff(before, after models.WorkbookSnapshot) []models.DiffHunk {
	hunks := []models.DiffHunk{}
	
	// Create a map to track all unique keys
	allKeys := make(map[string]bool)
	for key := range before {
		allKeys[key] = true
	}
	for key := range after {
		allKeys[key] = true
	}
	
	// Process each key
	for key := range allKeys {
		beforeSnapshot, inBefore := before[key]
		afterSnapshot, inAfter := after[key]
		
		// Parse the key into CellKey struct
		cellKey, err := parseKey(key)
		if err != nil {
			// Skip invalid keys
			continue
		}
		
		if inBefore && !inAfter {
			// Cell was deleted
			hunks = append(hunks, models.DiffHunk{
				Key:    cellKey,
				Kind:   models.Deleted,
				Before: beforeSnapshot,
			})
		} else if !inBefore && inAfter {
			// Cell was added
			hunks = append(hunks, models.DiffHunk{
				Key:   cellKey,
				Kind:  models.Added,
				After: afterSnapshot,
			})
		} else if inBefore && inAfter {
			// Cell might be modified - check each field
			hunk := s.compareSnapshots(cellKey, beforeSnapshot, afterSnapshot)
			if hunk != nil {
				hunks = append(hunks, *hunk)
			}
		}
	}
	
	return hunks
}

// compareSnapshots compares two cell snapshots and returns a diff hunk if they differ
func (s *serviceImpl) compareSnapshots(key models.CellKey, before, after models.CellSnapshot) *models.DiffHunk {
	// Check formula changes first (highest priority)
	if !equalStrings(before.Formula, after.Formula) {
		return &models.DiffHunk{
			Key:    key,
			Kind:   models.FormulaChanged,
			Before: before,
			After:  after,
		}
	}
	
	// Check value changes
	if !equalStrings(before.Value, after.Value) {
		return &models.DiffHunk{
			Key:    key,
			Kind:   models.ValueChanged,
			Before: before,
			After:  after,
		}
	}
	
	// Check style changes
	if !equalStrings(before.Style, after.Style) {
		return &models.DiffHunk{
			Key:    key,
			Kind:   models.StyleChanged,
			Before: before,
			After:  after,
		}
	}
	
	// No changes detected
	return nil
}

// equalStrings compares two string pointers, treating nil as empty string
func equalStrings(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		// One is nil, check if the other is empty string
		if a == nil {
			return b != nil && *b == ""
		}
		return a != nil && *a == ""
	}
	return *a == *b
}

// parseKey parses a cell key string like "Sheet1!A1" into a CellKey struct
func parseKey(key string) (models.CellKey, error) {
	// Expected format: "SheetName!ColRow" e.g., "Sheet1!A1" or "Budget!AB123"
	parts := strings.Split(key, "!")
	if len(parts) != 2 {
		return models.CellKey{}, fmt.Errorf("invalid key format: %s", key)
	}
	
	sheet := parts[0]
	cellRef := parts[1]
	
	// Parse cell reference using regex
	// Pattern matches column letters followed by row numbers
	re := regexp.MustCompile(`^([A-Z]+)(\d+)$`)
	matches := re.FindStringSubmatch(cellRef)
	if len(matches) != 3 {
		return models.CellKey{}, fmt.Errorf("invalid cell reference: %s", cellRef)
	}
	
	col := columnToIndex(matches[1])
	row, err := strconv.Atoi(matches[2])
	if err != nil {
		return models.CellKey{}, fmt.Errorf("invalid row number: %s", matches[2])
	}
	
	// Convert to 0-based indexing
	return models.CellKey{
		Sheet: sheet,
		Row:   row - 1, // Excel rows are 1-based, we use 0-based
		Col:   col,
	}, nil
}

// columnToIndex converts Excel column letters to 0-based index
// A=0, B=1, ..., Z=25, AA=26, AB=27, etc.
func columnToIndex(column string) int {
	index := 0
	for i, char := range column {
		// Calculate position value (A=1, B=2, etc.)
		charValue := int(char - 'A' + 1)
		// Calculate place value (rightmost = 1, next = 26, next = 26^2, etc.)
		placeValue := 1
		for j := 0; j < len(column)-i-1; j++ {
			placeValue *= 26
		}
		index += charValue * placeValue
	}
	return index - 1 // Convert to 0-based
}