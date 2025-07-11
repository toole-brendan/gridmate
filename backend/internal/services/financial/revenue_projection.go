package financial

import (
	"fmt"
	"math"
)

// RevenueProjectionBuilder helps build revenue projection models
type RevenueProjectionBuilder struct {
	projectionType ProjectionType
	baseRevenue    float64
	periods        int
	assumptions    RevenueAssumptions
}

// ProjectionType represents different revenue projection methods
type ProjectionType string

const (
	LinearGrowth      ProjectionType = "linear"
	CompoundGrowth    ProjectionType = "compound"
	SeasonsalGrowth   ProjectionType = "seasonal"
	MarketShareBased  ProjectionType = "market_share"
	BottomUp         ProjectionType = "bottom_up"
	Regression       ProjectionType = "regression"
)

// RevenueAssumptions contains assumptions for revenue projections
type RevenueAssumptions struct {
	// Growth assumptions
	GrowthRate          float64   `json:"growth_rate"`
	GrowthRates         []float64 `json:"growth_rates"` // Period-specific rates
	TerminalGrowthRate  float64   `json:"terminal_growth_rate"`
	
	// Market-based assumptions
	MarketSize          float64   `json:"market_size"`
	MarketGrowthRate    float64   `json:"market_growth_rate"`
	MarketShare         float64   `json:"market_share"`
	MarketShareGrowth   float64   `json:"market_share_growth"`
	
	// Bottom-up assumptions
	UnitsVolume         float64   `json:"units_volume"`
	PricePerUnit        float64   `json:"price_per_unit"`
	VolumeGrowthRate    float64   `json:"volume_growth_rate"`
	PriceGrowthRate     float64   `json:"price_growth_rate"`
	
	// Seasonal factors (quarterly or monthly)
	SeasonalFactors     []float64 `json:"seasonal_factors"`
	
	// Other factors
	ChurnRate           float64   `json:"churn_rate"`
	RetentionRate       float64   `json:"retention_rate"`
	NewCustomerGrowth   float64   `json:"new_customer_growth"`
}

// RevenueProjection represents a revenue projection result
type RevenueProjection struct {
	Period      int                    `json:"period"`
	Revenue     float64                `json:"revenue"`
	GrowthRate  float64                `json:"growth_rate"`
	YoYGrowth   float64                `json:"yoy_growth"`
	Details     map[string]interface{} `json:"details"`
	Formulas    map[string]string      `json:"formulas"`
}

// ProjectionResult contains the complete projection results
type ProjectionResult struct {
	Type        ProjectionType      `json:"type"`
	Projections []RevenueProjection `json:"projections"`
	Summary     ProjectionSummary   `json:"summary"`
	Formulas    map[string]string   `json:"formulas"`
}

// ProjectionSummary contains summary statistics
type ProjectionSummary struct {
	TotalRevenue    float64 `json:"total_revenue"`
	CAGR            float64 `json:"cagr"`
	AverageRevenue  float64 `json:"average_revenue"`
	PeakRevenue     float64 `json:"peak_revenue"`
	PeakPeriod      int     `json:"peak_period"`
}

// NewRevenueProjectionBuilder creates a new revenue projection builder
func NewRevenueProjectionBuilder() *RevenueProjectionBuilder {
	return &RevenueProjectionBuilder{
		projectionType: LinearGrowth,
		assumptions:    RevenueAssumptions{},
	}
}

// SetBaseRevenue sets the starting revenue
func (rb *RevenueProjectionBuilder) SetBaseRevenue(revenue float64) *RevenueProjectionBuilder {
	rb.baseRevenue = revenue
	return rb
}

// SetPeriods sets the number of projection periods
func (rb *RevenueProjectionBuilder) SetPeriods(periods int) *RevenueProjectionBuilder {
	rb.periods = periods
	return rb
}

// SetProjectionType sets the projection method
func (rb *RevenueProjectionBuilder) SetProjectionType(projType ProjectionType) *RevenueProjectionBuilder {
	rb.projectionType = projType
	return rb
}

// SetAssumptions sets the projection assumptions
func (rb *RevenueProjectionBuilder) SetAssumptions(assumptions RevenueAssumptions) *RevenueProjectionBuilder {
	rb.assumptions = assumptions
	return rb
}

// Build generates the revenue projections
func (rb *RevenueProjectionBuilder) Build() (*ProjectionResult, error) {
	if rb.baseRevenue <= 0 {
		return nil, fmt.Errorf("base revenue must be positive")
	}
	if rb.periods <= 0 {
		return nil, fmt.Errorf("number of periods must be positive")
	}
	
	var projections []RevenueProjection
	
	switch rb.projectionType {
	case LinearGrowth:
		projections = rb.buildLinearGrowth()
	case CompoundGrowth:
		projections = rb.buildCompoundGrowth()
	case SeasonsalGrowth:
		projections = rb.buildSeasonalGrowth()
	case MarketShareBased:
		projections = rb.buildMarketShareBased()
	case BottomUp:
		projections = rb.buildBottomUp()
	case Regression:
		projections = rb.buildRegression()
	default:
		return nil, fmt.Errorf("unknown projection type: %s", rb.projectionType)
	}
	
	// Calculate summary
	summary := rb.calculateSummary(projections)
	
	// Generate formulas
	formulas := rb.generateFormulas()
	
	return &ProjectionResult{
		Type:        rb.projectionType,
		Projections: projections,
		Summary:     summary,
		Formulas:    formulas,
	}, nil
}

// buildLinearGrowth builds linear growth projections
func (rb *RevenueProjectionBuilder) buildLinearGrowth() []RevenueProjection {
	projections := make([]RevenueProjection, rb.periods)
	growthAmount := rb.baseRevenue * rb.assumptions.GrowthRate
	
	for i := 0; i < rb.periods; i++ {
		revenue := rb.baseRevenue + (growthAmount * float64(i+1))
		
		projections[i] = RevenueProjection{
			Period:     i + 1,
			Revenue:    revenue,
			GrowthRate: rb.assumptions.GrowthRate,
			YoYGrowth:  growthAmount,
			Details: map[string]interface{}{
				"base_revenue":   rb.baseRevenue,
				"growth_amount":  growthAmount,
			},
			Formulas: map[string]string{
				"revenue": fmt.Sprintf("=B2+($B$2*%.2f*%d)", rb.assumptions.GrowthRate, i+1),
			},
		}
	}
	
	return projections
}

// buildCompoundGrowth builds compound growth projections
func (rb *RevenueProjectionBuilder) buildCompoundGrowth() []RevenueProjection {
	projections := make([]RevenueProjection, rb.periods)
	previousRevenue := rb.baseRevenue
	
	for i := 0; i < rb.periods; i++ {
		growthRate := rb.assumptions.GrowthRate
		if len(rb.assumptions.GrowthRates) > i {
			growthRate = rb.assumptions.GrowthRates[i]
		}
		
		revenue := previousRevenue * (1 + growthRate)
		yoyGrowth := revenue - previousRevenue
		
		projections[i] = RevenueProjection{
			Period:     i + 1,
			Revenue:    revenue,
			GrowthRate: growthRate,
			YoYGrowth:  yoyGrowth,
			Details: map[string]interface{}{
				"previous_revenue": previousRevenue,
				"growth_factor":    1 + growthRate,
			},
			Formulas: map[string]string{
				"revenue":     fmt.Sprintf("=B%d*(1+%.2f)", i+2, growthRate),
				"yoy_growth":  fmt.Sprintf("=B%d-B%d", i+3, i+2),
				"growth_rate": fmt.Sprintf("=(B%d-B%d)/B%d", i+3, i+2, i+2),
			},
		}
		
		previousRevenue = revenue
	}
	
	return projections
}

// buildSeasonalGrowth builds seasonal growth projections
func (rb *RevenueProjectionBuilder) buildSeasonalGrowth() []RevenueProjection {
	projections := make([]RevenueProjection, rb.periods)
	baseGrowthRate := rb.assumptions.GrowthRate
	seasonalFactors := rb.assumptions.SeasonalFactors
	
	if len(seasonalFactors) == 0 {
		// Default quarterly seasonality
		seasonalFactors = []float64{0.9, 1.1, 0.95, 1.05}
	}
	
	for i := 0; i < rb.periods; i++ {
		// Apply base growth
		baseRevenue := rb.baseRevenue * math.Pow(1+baseGrowthRate, float64(i+1)/float64(len(seasonalFactors)))
		
		// Apply seasonal factor
		seasonIndex := i % len(seasonalFactors)
		revenue := baseRevenue * seasonalFactors[seasonIndex]
		
		projections[i] = RevenueProjection{
			Period:     i + 1,
			Revenue:    revenue,
			GrowthRate: baseGrowthRate,
			Details: map[string]interface{}{
				"base_revenue":     baseRevenue,
				"seasonal_factor":  seasonalFactors[seasonIndex],
				"season_index":     seasonIndex + 1,
			},
			Formulas: map[string]string{
				"base_revenue": fmt.Sprintf("=$B$2*(1+%.2f)^(%d/%d)", baseGrowthRate, i+1, len(seasonalFactors)),
				"revenue":      fmt.Sprintf("=base_revenue*%.2f", seasonalFactors[seasonIndex]),
			},
		}
		
		if i > 0 {
			projections[i].YoYGrowth = revenue - projections[i-1].Revenue
		}
	}
	
	return projections
}

// buildMarketShareBased builds market share based projections
func (rb *RevenueProjectionBuilder) buildMarketShareBased() []RevenueProjection {
	projections := make([]RevenueProjection, rb.periods)
	
	marketSize := rb.assumptions.MarketSize
	marketShare := rb.assumptions.MarketShare
	
	for i := 0; i < rb.periods; i++ {
		// Grow market size
		currentMarketSize := marketSize * math.Pow(1+rb.assumptions.MarketGrowthRate, float64(i))
		
		// Grow market share
		currentMarketShare := marketShare * math.Pow(1+rb.assumptions.MarketShareGrowth, float64(i))
		
		// Cap market share at reasonable levels
		if currentMarketShare > 0.5 {
			currentMarketShare = 0.5 // Cap at 50%
		}
		
		revenue := currentMarketSize * currentMarketShare
		
		projections[i] = RevenueProjection{
			Period:  i + 1,
			Revenue: revenue,
			Details: map[string]interface{}{
				"market_size":  currentMarketSize,
				"market_share": currentMarketShare,
			},
			Formulas: map[string]string{
				"market_size":  fmt.Sprintf("=$D$2*(1+%.2f)^%d", rb.assumptions.MarketGrowthRate, i),
				"market_share": fmt.Sprintf("=MIN($E$2*(1+%.2f)^%d, 0.5)", rb.assumptions.MarketShareGrowth, i),
				"revenue":      fmt.Sprintf("=market_size*market_share"),
			},
		}
		
		if i > 0 {
			projections[i].YoYGrowth = revenue - projections[i-1].Revenue
			projections[i].GrowthRate = projections[i].YoYGrowth / projections[i-1].Revenue
		}
	}
	
	return projections
}

// buildBottomUp builds bottom-up projections
func (rb *RevenueProjectionBuilder) buildBottomUp() []RevenueProjection {
	projections := make([]RevenueProjection, rb.periods)
	
	units := rb.assumptions.UnitsVolume
	price := rb.assumptions.PricePerUnit
	
	for i := 0; i < rb.periods; i++ {
		// Grow units and price
		currentUnits := units * math.Pow(1+rb.assumptions.VolumeGrowthRate, float64(i))
		currentPrice := price * math.Pow(1+rb.assumptions.PriceGrowthRate, float64(i))
		
		// Account for churn if specified
		if rb.assumptions.ChurnRate > 0 {
			retentionFactor := math.Pow(1-rb.assumptions.ChurnRate, float64(i))
			currentUnits *= retentionFactor
		}
		
		revenue := currentUnits * currentPrice
		
		projections[i] = RevenueProjection{
			Period:  i + 1,
			Revenue: revenue,
			Details: map[string]interface{}{
				"units":           currentUnits,
				"price_per_unit":  currentPrice,
				"volume_growth":   rb.assumptions.VolumeGrowthRate,
				"price_growth":    rb.assumptions.PriceGrowthRate,
			},
			Formulas: map[string]string{
				"units":    fmt.Sprintf("=$F$2*(1+%.2f)^%d*(1-%.2f)^%d", rb.assumptions.VolumeGrowthRate, i, rb.assumptions.ChurnRate, i),
				"price":    fmt.Sprintf("=$G$2*(1+%.2f)^%d", rb.assumptions.PriceGrowthRate, i),
				"revenue":  fmt.Sprintf("=units*price"),
			},
		}
		
		if i > 0 {
			projections[i].YoYGrowth = revenue - projections[i-1].Revenue
			projections[i].GrowthRate = projections[i].YoYGrowth / projections[i-1].Revenue
		}
	}
	
	return projections
}

// buildRegression builds regression-based projections (simplified)
func (rb *RevenueProjectionBuilder) buildRegression() []RevenueProjection {
	projections := make([]RevenueProjection, rb.periods)
	
	// Simple exponential smoothing approach
	alpha := 0.3 // Smoothing parameter
	trend := rb.baseRevenue * rb.assumptions.GrowthRate
	level := rb.baseRevenue
	
	for i := 0; i < rb.periods; i++ {
		revenue := level + trend*float64(i+1)
		
		projections[i] = RevenueProjection{
			Period:  i + 1,
			Revenue: revenue,
			Details: map[string]interface{}{
				"level":           level,
				"trend":           trend,
				"smoothing_alpha": alpha,
			},
			Formulas: map[string]string{
				"revenue": fmt.Sprintf("=$B$2+($B$2*%.2f*%d)", rb.assumptions.GrowthRate, i+1),
			},
		}
		
		if i > 0 {
			projections[i].YoYGrowth = revenue - projections[i-1].Revenue
			projections[i].GrowthRate = projections[i].YoYGrowth / projections[i-1].Revenue
		}
		
		// Update level and trend (simplified)
		level = alpha*revenue + (1-alpha)*level
		trend = alpha*(revenue-projections[max(0, i-1)].Revenue) + (1-alpha)*trend
	}
	
	return projections
}

// calculateSummary calculates summary statistics
func (rb *RevenueProjectionBuilder) calculateSummary(projections []RevenueProjection) ProjectionSummary {
	summary := ProjectionSummary{}
	
	if len(projections) == 0 {
		return summary
	}
	
	totalRevenue := 0.0
	peakRevenue := 0.0
	peakPeriod := 0
	
	for i, proj := range projections {
		totalRevenue += proj.Revenue
		if proj.Revenue > peakRevenue {
			peakRevenue = proj.Revenue
			peakPeriod = i + 1
		}
	}
	
	summary.TotalRevenue = totalRevenue
	summary.AverageRevenue = totalRevenue / float64(len(projections))
	summary.PeakRevenue = peakRevenue
	summary.PeakPeriod = peakPeriod
	
	// Calculate CAGR
	if rb.baseRevenue > 0 && len(projections) > 0 {
		finalRevenue := projections[len(projections)-1].Revenue
		years := float64(len(projections)) / 4.0 // Assuming quarterly periods
		summary.CAGR = math.Pow(finalRevenue/rb.baseRevenue, 1/years) - 1
	}
	
	return summary
}

// generateFormulas generates Excel formulas for the projection
func (rb *RevenueProjectionBuilder) generateFormulas() map[string]string {
	formulas := map[string]string{
		"headers": "A1:Revenue Projection, B1:Period, C1:Revenue, D1:Growth Rate, E1:YoY Growth",
		"base_revenue": fmt.Sprintf("B2:%.2f", rb.baseRevenue),
	}
	
	switch rb.projectionType {
	case LinearGrowth:
		formulas["formula_template"] = "=B$2*(1+growth_rate*period)"
		formulas["growth_calculation"] = "Linear growth with constant amount"
		
	case CompoundGrowth:
		formulas["formula_template"] = "=Previous_Cell*(1+growth_rate)"
		formulas["growth_calculation"] = "Compound growth formula"
		
	case MarketShareBased:
		formulas["market_size_formula"] = "=Base_Market_Size*(1+Market_Growth_Rate)^Period"
		formulas["market_share_formula"] = "=MIN(Base_Market_Share*(1+Share_Growth_Rate)^Period, 0.5)"
		formulas["revenue_formula"] = "=Market_Size*Market_Share"
	}
	
	return formulas
}

// Helper function
func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}