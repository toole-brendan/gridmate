package models

// Workbook represents a complete Excel workbook
type Workbook struct {
	Name      string   `json:"name"`
	SessionID string   `json:"session_id,omitempty"`
	Sheets    []*Sheet `json:"sheets"`
}

// Sheet represents a single worksheet
type Sheet struct {
	Name      string      `json:"name"`
	Data      *RangeData  `json:"data"`
	UsedRange string      `json:"usedRange"`
	IsActive  bool        `json:"isActive"`
}

// RangeData represents data from a spreadsheet range
type RangeData struct {
	Sheet    string                 `json:"sheet"`
	Range    string                 `json:"range"`
	Values   [][]interface{}        `json:"values"`
	Formulas [][]string             `json:"formulas,omitempty"`
	Formats  [][]string             `json:"formats,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}