package protocols

import (
	"encoding/json"
	"time"
)

// SemanticGridProtocol standardizes spreadsheet representation for LLM processing
type SemanticGridProtocol struct {
	Version      string                      `json:"version"`
	Metadata     ProtocolMetadata            `json:"metadata"`
	Spatial      SpatialRepresentation       `json:"spatial"`
	Semantic     SemanticRepresentation      `json:"semantic"`
	Structural   StructuralRepresentation    `json:"structural"`
	Differential DifferentialRepresentation  `json:"differential"`
	Extensions   *ProtocolExtensions         `json:"extensions,omitempty"`
}

// ProtocolMetadata contains metadata about the protocol instance
type ProtocolMetadata struct {
	Created          time.Time `json:"created"`
	Source           string    `json:"source"`
	Range            string    `json:"range"`
	TokenEstimate    int       `json:"tokenEstimate"`
	CompressionRatio float64   `json:"compressionRatio"`
	Confidence       float64   `json:"confidence"`
}

// SpatialRepresentation provides spatial view of the spreadsheet
type SpatialRepresentation struct {
	Format      string           `json:"format"` // "ascii", "markdown", "grid"
	Content     string           `json:"content"`
	Bounds      GridBounds       `json:"bounds"`
	Coordinates CoordinateSystem `json:"coordinates"`
}

// SemanticRepresentation provides semantic understanding
type SemanticRepresentation struct {
	Purpose       string           `json:"purpose"`
	Summary       string           `json:"summary"`
	Regions       []SemanticRegion `json:"regions"`
	Flows         []DataFlow       `json:"flows"`
	Metrics       []KeyMetric      `json:"metrics"`
	Relationships []Relationship   `json:"relationships"`
}

// StructuralRepresentation provides structural analysis
type StructuralRepresentation struct {
	Cells        map[string]Cell        `json:"cells"`
	Formulas     map[string]Formula     `json:"formulas"`
	Dependencies DependencyGraph        `json:"dependencies"`
	Patterns     []Pattern              `json:"patterns"`
	Hierarchy    HierarchicalStructure  `json:"hierarchy"`
}

// DifferentialRepresentation tracks changes
type DifferentialRepresentation struct {
	BaseState string         `json:"baseState"`
	Changes   []Change       `json:"changes"`
	Timeline  ChangeTimeline `json:"timeline"`
	Conflicts []Conflict     `json:"conflicts,omitempty"`
}

// GridBounds defines the boundaries of a grid area
type GridBounds struct {
	MinRow int `json:"minRow"`
	MaxRow int `json:"maxRow"`
	MinCol int `json:"minCol"`
	MaxCol int `json:"maxCol"`
}

// CoordinateSystem defines the coordinate system used
type CoordinateSystem struct {
	Type   string `json:"type"`   // "A1" or "R1C1"
	Origin string `json:"origin"` // "zero" or "one"
}

// SemanticRegion represents a semantically meaningful area
type SemanticRegion struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"` // "header", "data", "total", etc.
	Bounds     GridBounds             `json:"bounds"`
	Confidence float64                `json:"confidence"`
	Attributes map[string]interface{} `json:"attributes,omitempty"`
}

// DataFlow represents data flow between cells/regions
type DataFlow struct {
	ID          string  `json:"id"`
	From        string  `json:"from"` // Cell or region reference
	To          string  `json:"to"`
	Type        string  `json:"type"` // "input", "calculation", "output", "reference"
	Description *string `json:"description,omitempty"`
}

// KeyMetric represents an important metric in the spreadsheet
type KeyMetric struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Location     string   `json:"location"`
	Value        interface{} `json:"value"`
	Formula      *string  `json:"formula,omitempty"`
	Importance   string   `json:"importance"` // "high", "medium", "low"
	Dependencies []string `json:"dependencies"`
}

// Relationship represents relationships between elements
type Relationship struct {
	Type     string  `json:"type"` // "depends_on", "affects", "validates", "aggregates"
	Source   string  `json:"source"`
	Target   string  `json:"target"`
	Strength float64 `json:"strength"`
}

// Cell represents a spreadsheet cell
type Cell struct {
	Address  string        `json:"address"`
	Value    interface{}   `json:"value"`
	Formula  *string       `json:"formula,omitempty"`
	Format   *CellFormat   `json:"format,omitempty"`
	Metadata *CellMetadata `json:"metadata,omitempty"`
}

// CellFormat defines cell formatting
type CellFormat struct {
	NumberFormat *string          `json:"numberFormat,omitempty"`
	Font         *FontFormat      `json:"font,omitempty"`
	Fill         *FillFormat      `json:"fill,omitempty"`
	Borders      *BorderFormat    `json:"borders,omitempty"`
	Alignment    *AlignmentFormat `json:"alignment,omitempty"`
}

// CellMetadata contains cell metadata
type CellMetadata struct {
	Purpose      *string         `json:"purpose,omitempty"`
	Confidence   *float64        `json:"confidence,omitempty"`
	LastModified *time.Time      `json:"lastModified,omitempty"`
	ModifiedBy   *string         `json:"modifiedBy,omitempty"`
	Validation   *ValidationRule `json:"validation,omitempty"`
}

// Formula represents a spreadsheet formula
type Formula struct {
	Expression   string   `json:"expression"`
	Normalized   string   `json:"normalized"`
	Type         string   `json:"type"`
	Dependencies []string `json:"dependencies"`
	Precedents   []string `json:"precedents"`
}

// DependencyGraph represents formula dependencies
type DependencyGraph struct {
	Nodes  []DependencyNode `json:"nodes"`
	Edges  []DependencyEdge `json:"edges"`
	Cycles []Cycle          `json:"cycles,omitempty"`
}

// DependencyNode represents a node in the dependency graph
type DependencyNode struct {
	ID      string `json:"id"`
	Type    string `json:"type"` // "cell", "range", "named_range"
	Address string `json:"address"`
	Level   int    `json:"level"`
}

// DependencyEdge represents an edge in the dependency graph
type DependencyEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
	Type string `json:"type"` // "direct", "indirect"
}

// Cycle represents a circular reference
type Cycle struct {
	Nodes    []string `json:"nodes"`
	Severity string   `json:"severity"` // "error", "warning"
}

// Pattern represents a detected pattern
type Pattern struct {
	ID          string            `json:"id"`
	Type        string            `json:"type"` // "formula", "value", "format", "structure"
	Description string            `json:"description"`
	Instances   []PatternInstance `json:"instances"`
	Confidence  float64           `json:"confidence"`
}

// PatternInstance represents an instance of a pattern
type PatternInstance struct {
	Location  string  `json:"location"`
	Variation *string `json:"variation,omitempty"`
}

// HierarchicalStructure represents the hierarchical structure
type HierarchicalStructure struct {
	Root  HierarchyNode `json:"root"`
	Depth int           `json:"depth"`
}

// HierarchyNode represents a node in the hierarchy
type HierarchyNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"` // "workbook", "sheet", "region", "table", "range"
	Name     string                 `json:"name"`
	Children []HierarchyNode        `json:"children"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// Change represents a change to the spreadsheet
type Change struct {
	ID        string          `json:"id"`
	Timestamp time.Time       `json:"timestamp"`
	Type      string          `json:"type"` // "value", "formula", "format", etc.
	Target    string          `json:"target"`
	Before    interface{}     `json:"before"`
	After     interface{}     `json:"after"`
	Metadata  *ChangeMetadata `json:"metadata,omitempty"`
}

// ChangeMetadata contains metadata about a change
type ChangeMetadata struct {
	Source    string  `json:"source"`
	Reason    *string `json:"reason,omitempty"`
	Validated *bool   `json:"validated,omitempty"`
	Applied   *bool   `json:"applied,omitempty"`
}

// ChangeTimeline represents a timeline of changes
type ChangeTimeline struct {
	Start       time.Time    `json:"start"`
	End         time.Time    `json:"end"`
	Changes     []Change     `json:"changes"`
	Checkpoints []Checkpoint `json:"checkpoints"`
}

// Checkpoint represents a checkpoint in the timeline
type Checkpoint struct {
	ID          string    `json:"id"`
	Timestamp   time.Time `json:"timestamp"`
	Description string    `json:"description"`
	State       string    `json:"state"`
}

// Conflict represents a conflict between changes
type Conflict struct {
	Type       string               `json:"type"` // "merge", "dependency", "validation"
	Changes    []string             `json:"changes"`
	Resolution *ConflictResolution  `json:"resolution,omitempty"`
}

// ConflictResolution represents how a conflict was resolved
type ConflictResolution struct {
	Strategy string      `json:"strategy"` // "accept_source", "accept_target", "merge", "manual"
	Result   interface{} `json:"result,omitempty"`
}

// ProtocolExtensions allows for vendor-specific extensions
type ProtocolExtensions struct {
	Custom map[string]interface{} `json:"custom,omitempty"`
	Vendor *VendorExtensions      `json:"vendor,omitempty"`
}

// VendorExtensions contains vendor-specific extensions
type VendorExtensions struct {
	Excel  *ExcelExtensions  `json:"excel,omitempty"`
	Sheets *SheetsExtensions `json:"sheets,omitempty"`
}

// ExcelExtensions contains Excel-specific features
type ExcelExtensions struct {
	Tables       []Table       `json:"tables,omitempty"`
	PivotTables  []PivotTable  `json:"pivotTables,omitempty"`
	Charts       []Chart       `json:"charts,omitempty"`
	NamedRanges  []NamedRange  `json:"namedRanges,omitempty"`
}

// Table represents an Excel table
type Table struct {
	Name    string  `json:"name"`
	Range   string  `json:"range"`
	Headers bool    `json:"headers"`
	Totals  bool    `json:"totals"`
	Style   *string `json:"style,omitempty"`
}

// PivotTable represents a pivot table
type PivotTable struct {
	Name        string       `json:"name"`
	SourceRange string       `json:"sourceRange"`
	Location    string       `json:"location"`
	Fields      []PivotField `json:"fields"`
}

// PivotField represents a field in a pivot table
type PivotField struct {
	Name        string  `json:"name"`
	Area        string  `json:"area"` // "row", "column", "data", "filter"
	Aggregation *string `json:"aggregation,omitempty"`
}

// Chart represents a chart
type Chart struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	DataRange string `json:"dataRange"`
	Location  string `json:"location"`
}

// NamedRange represents a named range
type NamedRange struct {
	Name    string  `json:"name"`
	Range   string  `json:"range"`
	Scope   string  `json:"scope"` // "workbook", "sheet"
	Comment *string `json:"comment,omitempty"`
}

// SheetsExtensions contains Google Sheets-specific features
type SheetsExtensions struct {
	ProtectedRanges    []ProtectedRange    `json:"protectedRanges,omitempty"`
	ConditionalFormats []ConditionalFormat `json:"conditionalFormats,omitempty"`
}

// ProtectedRange represents a protected range
type ProtectedRange struct {
	Range   string   `json:"range"`
	Editors []string `json:"editors"`
}

// ConditionalFormat represents conditional formatting
type ConditionalFormat struct {
	Range string       `json:"range"`
	Rules []FormatRule `json:"rules"`
}

// FormatRule represents a formatting rule
type FormatRule struct {
	Condition string      `json:"condition"`
	Format    CellFormat  `json:"format"`
}

// ValidationRule represents data validation
type ValidationRule struct {
	Type         string              `json:"type"` // "list", "number", "date", "text", "custom"
	Criteria     ValidationCriteria  `json:"criteria"`
	ShowError    bool                `json:"showError"`
	ErrorMessage *string             `json:"errorMessage,omitempty"`
}

// ValidationCriteria defines validation criteria
type ValidationCriteria struct {
	Operator string        `json:"operator"`
	Values   []interface{} `json:"values"`
	Formula  *string       `json:"formula,omitempty"`
}

// FontFormat defines font formatting
type FontFormat struct {
	Name      *string `json:"name,omitempty"`
	Size      *int    `json:"size,omitempty"`
	Bold      *bool   `json:"bold,omitempty"`
	Italic    *bool   `json:"italic,omitempty"`
	Underline *bool   `json:"underline,omitempty"`
	Color     *string `json:"color,omitempty"`
}

// FillFormat defines fill formatting
type FillFormat struct {
	Type    string   `json:"type"` // "solid", "gradient", "pattern"
	Color   *string  `json:"color,omitempty"`
	Colors  []string `json:"colors,omitempty"`
	Pattern *string  `json:"pattern,omitempty"`
}

// BorderFormat defines border formatting
type BorderFormat struct {
	Top    *BorderStyle `json:"top,omitempty"`
	Right  *BorderStyle `json:"right,omitempty"`
	Bottom *BorderStyle `json:"bottom,omitempty"`
	Left   *BorderStyle `json:"left,omitempty"`
}

// BorderStyle defines a border style
type BorderStyle struct {
	Style string  `json:"style"`
	Color *string `json:"color,omitempty"`
}

// AlignmentFormat defines alignment formatting
type AlignmentFormat struct {
	Horizontal    *string `json:"horizontal,omitempty"`
	Vertical      *string `json:"vertical,omitempty"`
	WrapText      *bool   `json:"wrapText,omitempty"`
	TextRotation  *int    `json:"textRotation,omitempty"`
}

// Constants
const (
	ProtocolVersion = "1.0.0"
)

// NewSemanticGridProtocol creates a new protocol instance
func NewSemanticGridProtocol(
	spatial SpatialRepresentation,
	semantic SemanticRepresentation,
	structural StructuralRepresentation,
	differential DifferentialRepresentation,
) *SemanticGridProtocol {
	return &SemanticGridProtocol{
		Version: ProtocolVersion,
		Metadata: ProtocolMetadata{
			Created:          time.Now(),
			Source:           "gridmate",
			TokenEstimate:    0,
			CompressionRatio: 1.0,
			Confidence:       1.0,
		},
		Spatial:      spatial,
		Semantic:     semantic,
		Structural:   structural,
		Differential: differential,
	}
}

// Serialize converts the protocol to JSON
func (p *SemanticGridProtocol) Serialize() ([]byte, error) {
	return json.MarshalIndent(p, "", "  ")
}

// Deserialize creates a protocol from JSON
func Deserialize(data []byte) (*SemanticGridProtocol, error) {
	var protocol SemanticGridProtocol
	err := json.Unmarshal(data, &protocol)
	if err != nil {
		return nil, err
	}
	return &protocol, nil
}