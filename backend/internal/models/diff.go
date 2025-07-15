package models

import "github.com/google/uuid"

// CellKey uniquely identifies a cell within a workbook.
type CellKey struct {
	Sheet string `json:"sheet"`
	Row   int    `json:"row"`
	Col   int    `json:"col"`
}

// CellSnapshot holds the state of a single cell at a point in time.
type CellSnapshot struct {
	Value   *string `json:"v,omitempty"`
	Formula *string `json:"f,omitempty"`
	Style   *string `json:"s,omitempty"` // Serialized JSON of style properties
}

// WorkbookSnapshot represents the state of an entire workbook as a map of cell locations to their snapshots.
// The key is a string representation like "SheetName!R1C1" for efficient lookup.
type WorkbookSnapshot map[string]CellSnapshot

// DiffKind enumerates the types of changes that can occur in a cell.
type DiffKind string

const (
	Added          DiffKind = "Added"
	Deleted        DiffKind = "Deleted"
	ValueChanged   DiffKind = "ValueChanged"
	FormulaChanged DiffKind = "FormulaChanged"
	StyleChanged   DiffKind = "StyleChanged"
)

// DiffHunk represents a single, atomic change to a cell in the workbook.
type DiffHunk struct {
	Key    CellKey      `json:"key"`
	Kind   DiffKind     `json:"kind"`
	Before CellSnapshot `json:"before,omitempty"`
	After  CellSnapshot `json:"after,omitempty"`
}

// DiffPayload is the structure received from the client for comparison.
type DiffPayload struct {
	WorkbookID uuid.UUID        `json:"workbookId"`
	Before     WorkbookSnapshot `json:"before"`
	After      WorkbookSnapshot `json:"after"`
}

// DiffMessage is the structure broadcast via SignalR to clients.
type DiffMessage struct {
	WorkbookID uuid.UUID  `json:"workbookId"`
	Revision   int        `json:"revision"`
	Hunks      []DiffHunk `json:"hunks"`
}
