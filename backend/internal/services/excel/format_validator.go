package excel

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/gridmate/backend/internal/services/ai"
)

type FormatValidator struct{}

func NewFormatValidator() *FormatValidator {
	return &FormatValidator{}
}

func (fv *FormatValidator) ValidateFormat(format *ai.CellFormat) error {
	if format == nil {
		return nil
	}
	
	// Validate number format
	if format.NumberFormat != "" {
		if err := fv.validateNumberFormat(format.NumberFormat); err != nil {
			return fmt.Errorf("invalid number format: %w", err)
		}
	}
	
	// Validate font
	if format.Font != nil {
		if err := fv.validateFont(format.Font); err != nil {
			return fmt.Errorf("invalid font: %w", err)
		}
	}
	
	// Validate colors
	if format.FillColor != "" {
		format.FillColor = fv.normalizeColor(format.FillColor)
	}
	
	// Validate alignment
	if format.Alignment != nil {
		if err := fv.validateAlignment(format.Alignment); err != nil {
			return fmt.Errorf("invalid alignment: %w", err)
		}
	}
	
	return nil
}

func (fv *FormatValidator) validateNumberFormat(format string) error {
	// Add validation logic for common Excel number formats
	validFormats := []string{
		"#,##0", "#,##0.00", "0.00%", "$#,##0.00",
		"0.0%", "#,##0.0", "0.000", 
	}
	
	// Check if it matches known formats or patterns
	for _, valid := range validFormats {
		if format == valid {
			return nil
		}
	}
	
	// Allow custom formats but validate basic structure
	if strings.ContainsAny(format, "0#$%") {
		return nil
	}
	
	return fmt.Errorf("unrecognized number format: %s", format)
}

func (fv *FormatValidator) validateFont(font *ai.FontStyle) error {
	if font.Size < 1 || font.Size > 409 {
		return fmt.Errorf("font size must be between 1 and 409, got %f", font.Size)
	}
	
	if font.Color != "" {
		font.Color = fv.normalizeColor(font.Color)
	}
	
	return nil
}

func (fv *FormatValidator) normalizeColor(color string) string {
	// Remove # prefix if present
	color = strings.TrimPrefix(color, "#")
	
	// Validate hex format
	if match, _ := regexp.MatchString("^[0-9A-Fa-f]{6}$", color); !match {
		// Return default black if invalid
		return "000000"
	}
	
	return strings.ToUpper(color)
}

func (fv *FormatValidator) validateAlignment(align *ai.Alignment) error {
	validHorizontal := []string{"left", "center", "right", "fill", "justify"}
	validVertical := []string{"top", "middle", "bottom"}
	
	if align.Horizontal != "" {
		valid := false
		for _, v := range validHorizontal {
			if align.Horizontal == v {
				valid = true
				break
			}
		}
		if !valid {
			return fmt.Errorf("invalid horizontal alignment: %s", align.Horizontal)
		}
	}
	
	if align.Vertical != "" {
		valid := false
		for _, v := range validVertical {
			if align.Vertical == v {
				valid = true
				break
			}
		}
		if !valid {
			return fmt.Errorf("invalid vertical alignment: %s", align.Vertical)
		}
	}
	
	return nil
}