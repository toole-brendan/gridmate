package excel

import (
	"testing"

	"github.com/gridmate/backend/internal/services/ai"
)

func TestFormatValidator(t *testing.T) {
	validator := NewFormatValidator()
	
	tests := []struct {
		name    string
		format  *ai.CellFormat
		wantErr bool
	}{
		{
			name: "valid font format",
			format: &ai.CellFormat{
				Font: &ai.FontStyle{
					Bold:  true,
					Size:  12,
					Color: "#FF0000",
				},
			},
			wantErr: false,
		},
		{
			name: "invalid font size - too small",
			format: &ai.CellFormat{
				Font: &ai.FontStyle{
					Size: 0,
				},
			},
			wantErr: true,
		},
		{
			name: "invalid font size - too large",
			format: &ai.CellFormat{
				Font: &ai.FontStyle{
					Size: 500,
				},
			},
			wantErr: true,
		},
		{
			name: "valid number format",
			format: &ai.CellFormat{
				NumberFormat: "#,##0.00",
			},
			wantErr: false,
		},
		{
			name: "invalid number format",
			format: &ai.CellFormat{
				NumberFormat: "invalid format",
			},
			wantErr: true,
		},
		{
			name: "valid fill color",
			format: &ai.CellFormat{
				FillColor: "#00FF00",
			},
			wantErr: false,
		},
		{
			name: "valid fill color without hash",
			format: &ai.CellFormat{
				FillColor: "00FF00",
			},
			wantErr: false,
		},
		{
			name: "invalid fill color",
			format: &ai.CellFormat{
				FillColor: "invalid",
			},
			wantErr: false, // Should normalize to default color
		},
		{
			name: "valid alignment",
			format: &ai.CellFormat{
				Alignment: &ai.Alignment{
					Horizontal: "center",
					Vertical:   "middle",
				},
			},
			wantErr: false,
		},
		{
			name: "invalid horizontal alignment",
			format: &ai.CellFormat{
				Alignment: &ai.Alignment{
					Horizontal: "invalid",
				},
			},
			wantErr: true,
		},
		{
			name: "invalid vertical alignment",
			format: &ai.CellFormat{
				Alignment: &ai.Alignment{
					Vertical: "invalid",
				},
			},
			wantErr: true,
		},
		{
			name: "complex valid format",
			format: &ai.CellFormat{
				NumberFormat: "$#,##0.00",
				Font: &ai.FontStyle{
					Bold:   true,
					Italic: false,
					Size:   14,
					Color:  "0000FF",
				},
				FillColor: "#FFFF00",
				Alignment: &ai.Alignment{
					Horizontal: "right",
					Vertical:   "top",
				},
			},
			wantErr: false,
		},
		{
			name:    "nil format",
			format:  nil,
			wantErr: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateFormat(tt.format)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateFormat() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFormatValidator_validateNumberFormat(t *testing.T) {
	validator := NewFormatValidator()
	
	tests := []struct {
		name    string
		format  string
		wantErr bool
	}{
		{"valid currency format", "$#,##0.00", false},
		{"valid percentage format", "0.00%", false},
		{"valid general format", "#,##0", false},
		{"valid decimal format", "#,##0.00", false},
		{"valid integer format", "0", false},
		{"custom format with symbols", "#,##0.0", false},
		{"empty format", "", true},
		{"format without number symbols", "abc", true},
		{"format with only text", "text", true},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.validateNumberFormat(tt.format)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateNumberFormat() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFormatValidator_validateFont(t *testing.T) {
	validator := NewFormatValidator()
	
	tests := []struct {
		name    string
		font    *ai.FontStyle
		wantErr bool
	}{
		{
			name: "valid font",
			font: &ai.FontStyle{
				Bold:   true,
				Italic: false,
				Size:   12,
				Color:  "FF0000",
			},
			wantErr: false,
		},
		{
			name: "minimum font size",
			font: &ai.FontStyle{
				Size: 1,
			},
			wantErr: false,
		},
		{
			name: "maximum font size",
			font: &ai.FontStyle{
				Size: 409,
			},
			wantErr: false,
		},
		{
			name: "font size too small",
			font: &ai.FontStyle{
				Size: 0,
			},
			wantErr: true,
		},
		{
			name: "font size too large",
			font: &ai.FontStyle{
				Size: 410,
			},
			wantErr: true,
		},
		{
			name: "valid color with hash",
			font: &ai.FontStyle{
				Size:  12,
				Color: "#FF0000",
			},
			wantErr: false,
		},
		{
			name: "valid color without hash",
			font: &ai.FontStyle{
				Size:  12,
				Color: "FF0000",
			},
			wantErr: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.validateFont(tt.font)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateFont() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFormatValidator_normalizeColor(t *testing.T) {
	validator := NewFormatValidator()
	
	tests := []struct {
		name     string
		color    string
		expected string
	}{
		{"color with hash", "#FF0000", "FF0000"},
		{"color without hash", "FF0000", "FF0000"},
		{"lowercase color", "#ff0000", "FF0000"},
		{"mixed case color", "#Ff0000", "FF0000"},
		{"invalid color", "invalid", "000000"},
		{"short color", "FFF", "000000"},
		{"long color", "FF0000AA", "000000"},
		{"empty color", "", "000000"},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validator.normalizeColor(tt.color)
			if result != tt.expected {
				t.Errorf("normalizeColor() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestFormatValidator_validateAlignment(t *testing.T) {
	validator := NewFormatValidator()
	
	tests := []struct {
		name      string
		alignment *ai.Alignment
		wantErr   bool
	}{
		{
			name: "valid alignment",
			alignment: &ai.Alignment{
				Horizontal: "center",
				Vertical:   "middle",
			},
			wantErr: false,
		},
		{
			name: "valid horizontal only",
			alignment: &ai.Alignment{
				Horizontal: "left",
			},
			wantErr: false,
		},
		{
			name: "valid vertical only",
			alignment: &ai.Alignment{
				Vertical: "top",
			},
			wantErr: false,
		},
		{
			name: "invalid horizontal",
			alignment: &ai.Alignment{
				Horizontal: "invalid",
			},
			wantErr: true,
		},
		{
			name: "invalid vertical",
			alignment: &ai.Alignment{
				Vertical: "invalid",
			},
			wantErr: true,
		},
		{
			name: "empty alignment",
			alignment: &ai.Alignment{
				Horizontal: "",
				Vertical:   "",
			},
			wantErr: false,
		},
		{
			name: "all valid horizontal alignments",
			alignment: &ai.Alignment{
				Horizontal: "justify",
			},
			wantErr: false,
		},
		{
			name: "all valid vertical alignments",
			alignment: &ai.Alignment{
				Vertical: "bottom",
			},
			wantErr: false,
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.validateAlignment(tt.alignment)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateAlignment() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestFormatValidator_Integration(t *testing.T) {
	validator := NewFormatValidator()
	
	// Test that validation modifies the format object appropriately
	format := &ai.CellFormat{
		Font: &ai.FontStyle{
			Size:  12,
			Color: "#FF0000", // Should be normalized to FF0000
		},
		FillColor: "#00FF00", // Should be normalized to 00FF00
	}
	
	err := validator.ValidateFormat(format)
	if err != nil {
		t.Errorf("ValidateFormat() unexpected error: %v", err)
	}
	
	// Check that colors were normalized
	if format.Font.Color != "FF0000" {
		t.Errorf("Font color not normalized, got %s", format.Font.Color)
	}
	
	if format.FillColor != "00FF00" {
		t.Errorf("Fill color not normalized, got %s", format.FillColor)
	}
}