package financial

import (
	"fmt"
	"math"
)

// WorkingCapitalCalculator calculates working capital requirements
type WorkingCapitalCalculator struct {
	assumptions WorkingCapitalAssumptions
	method      CalculationMethod
}

// CalculationMethod represents different calculation methods
type CalculationMethod string

const (
	PercentOfSalesMethod  CalculationMethod = "percent_of_sales"
	DaysOutstandingMethod CalculationMethod = "days_outstanding"
	DetailedMethod        CalculationMethod = "detailed"
	IndustryBenchmark     CalculationMethod = "industry_benchmark"
)

// WorkingCapitalAssumptions contains assumptions for calculations
type WorkingCapitalAssumptions struct {
	// Days Outstanding Method
	DaysReceivable      float64 `json:"days_receivable"`       // Days Sales Outstanding (DSO)
	DaysInventory       float64 `json:"days_inventory"`        // Days Inventory Outstanding (DIO)
	DaysPayable         float64 `json:"days_payable"`          // Days Payable Outstanding (DPO)
	
	// Percent of Sales Method
	ReceivablePercent   float64 `json:"receivable_percent"`
	InventoryPercent    float64 `json:"inventory_percent"`
	PayablePercent      float64 `json:"payable_percent"`
	
	// Additional Components
	PrepaidExpenses     float64 `json:"prepaid_expenses"`
	AccruedExpenses     float64 `json:"accrued_expenses"`
	OtherCurrentAssets  float64 `json:"other_current_assets"`
	OtherCurrentLiabs   float64 `json:"other_current_liabs"`
	
	// Growth and Seasonality
	GrowthRate          float64   `json:"growth_rate"`
	SeasonalFactors     []float64 `json:"seasonal_factors"`
	
	// Industry Benchmarks
	IndustryDSO         float64 `json:"industry_dso"`
	IndustryDIO         float64 `json:"industry_dio"`
	IndustryDPO         float64 `json:"industry_dpo"`
}

// WorkingCapitalProjection represents working capital for a period
type WorkingCapitalProjection struct {
	Period                  int                    `json:"period"`
	Revenue                 float64                `json:"revenue"`
	COGS                    float64                `json:"cogs"`
	AccountsReceivable      float64                `json:"accounts_receivable"`
	Inventory               float64                `json:"inventory"`
	PrepaidExpenses         float64                `json:"prepaid_expenses"`
	CurrentAssets           float64                `json:"current_assets"`
	AccountsPayable         float64                `json:"accounts_payable"`
	AccruedExpenses         float64                `json:"accrued_expenses"`
	CurrentLiabilities      float64                `json:"current_liabilities"`
	WorkingCapital          float64                `json:"working_capital"`
	ChangeInWorkingCapital  float64                `json:"change_in_working_capital"`
	CashImpact              float64                `json:"cash_impact"`
	Metrics                 WorkingCapitalMetrics  `json:"metrics"`
	Formulas                map[string]string      `json:"formulas"`
}

// WorkingCapitalMetrics contains key metrics
type WorkingCapitalMetrics struct {
	DSO                     float64 `json:"dso"`
	DIO                     float64 `json:"dio"`
	DPO                     float64 `json:"dpo"`
	CashConversionCycle     float64 `json:"cash_conversion_cycle"`
	WorkingCapitalRatio     float64 `json:"working_capital_ratio"`
	QuickRatio              float64 `json:"quick_ratio"`
	CurrentRatio            float64 `json:"current_ratio"`
	WorkingCapitalTurnover  float64 `json:"working_capital_turnover"`
}

// WorkingCapitalAnalysis contains the complete analysis
type WorkingCapitalAnalysis struct {
	Method         CalculationMethod          `json:"method"`
	Projections    []WorkingCapitalProjection `json:"projections"`
	Summary        WorkingCapitalSummary      `json:"summary"`
	Optimization   []OptimizationSuggestion   `json:"optimization"`
	Formulas       map[string]string          `json:"formulas"`
}

// WorkingCapitalSummary contains summary statistics
type WorkingCapitalSummary struct {
	AverageWorkingCapital   float64 `json:"average_working_capital"`
	PeakWorkingCapital      float64 `json:"peak_working_capital"`
	PeakPeriod              int     `json:"peak_period"`
	TotalCashImpact         float64 `json:"total_cash_impact"`
	AverageCCC              float64 `json:"average_ccc"`
	WorkingCapitalEfficiency float64 `json:"working_capital_efficiency"`
}

// OptimizationSuggestion represents a working capital optimization opportunity
type OptimizationSuggestion struct {
	Area        string  `json:"area"`
	Current     float64 `json:"current"`
	Target      float64 `json:"target"`
	Impact      float64 `json:"impact"`
	Description string  `json:"description"`
}

// NewWorkingCapitalCalculator creates a new calculator
func NewWorkingCapitalCalculator() *WorkingCapitalCalculator {
	return &WorkingCapitalCalculator{
		assumptions: WorkingCapitalAssumptions{
			DaysReceivable: 45,
			DaysInventory:  60,
			DaysPayable:    30,
		},
		method: DaysOutstandingMethod,
	}
}

// SetAssumptions sets the calculation assumptions
func (wc *WorkingCapitalCalculator) SetAssumptions(assumptions WorkingCapitalAssumptions) *WorkingCapitalCalculator {
	wc.assumptions = assumptions
	return wc
}

// SetMethod sets the calculation method
func (wc *WorkingCapitalCalculator) SetMethod(method CalculationMethod) *WorkingCapitalCalculator {
	wc.method = method
	return wc
}

// Calculate performs working capital calculations
func (wc *WorkingCapitalCalculator) Calculate(periods int, revenues []float64, cogs []float64) (*WorkingCapitalAnalysis, error) {
	if len(revenues) < periods || len(cogs) < periods {
		return nil, fmt.Errorf("insufficient revenue or COGS data for %d periods", periods)
	}
	
	projections := make([]WorkingCapitalProjection, periods)
	var previousWC float64
	
	for i := 0; i < periods; i++ {
		projection := WorkingCapitalProjection{
			Period:   i + 1,
			Revenue:  revenues[i],
			COGS:     cogs[i],
			Formulas: make(map[string]string),
		}
		
		// Calculate components based on method
		switch wc.method {
		case DaysOutstandingMethod:
			wc.calculateDaysMethod(&projection)
		case PercentOfSalesMethod:
			wc.calculatePercentMethod(&projection)
		case DetailedMethod:
			wc.calculateDetailedMethod(&projection, i)
		case IndustryBenchmark:
			wc.calculateBenchmarkMethod(&projection)
		}
		
		// Calculate working capital
		projection.CurrentAssets = projection.AccountsReceivable + projection.Inventory + projection.PrepaidExpenses
		projection.CurrentLiabilities = projection.AccountsPayable + projection.AccruedExpenses
		projection.WorkingCapital = projection.CurrentAssets - projection.CurrentLiabilities
		
		// Calculate change in working capital
		if i > 0 {
			projection.ChangeInWorkingCapital = projection.WorkingCapital - previousWC
			projection.CashImpact = -projection.ChangeInWorkingCapital // Negative because increase in WC uses cash
		}
		
		// Calculate metrics
		projection.Metrics = wc.calculateMetrics(projection)
		
		// Store for next period
		previousWC = projection.WorkingCapital
		projections[i] = projection
	}
	
	// Generate analysis
	analysis := &WorkingCapitalAnalysis{
		Method:       wc.method,
		Projections:  projections,
		Summary:      wc.calculateSummary(projections),
		Optimization: wc.generateOptimizationSuggestions(projections),
		Formulas:     wc.generateFormulas(),
	}
	
	return analysis, nil
}

// calculateDaysMethod calculates using days outstanding method
func (wc *WorkingCapitalCalculator) calculateDaysMethod(proj *WorkingCapitalProjection) {
	daysInPeriod := 365.0 / 4 // Assuming quarterly
	
	// Accounts Receivable = Revenue * DSO / Days in Period
	proj.AccountsReceivable = proj.Revenue * wc.assumptions.DaysReceivable / daysInPeriod
	proj.Formulas["accounts_receivable"] = fmt.Sprintf("=Revenue*%.0f/%.0f", wc.assumptions.DaysReceivable, daysInPeriod)
	
	// Inventory = COGS * DIO / Days in Period
	proj.Inventory = proj.COGS * wc.assumptions.DaysInventory / daysInPeriod
	proj.Formulas["inventory"] = fmt.Sprintf("=COGS*%.0f/%.0f", wc.assumptions.DaysInventory, daysInPeriod)
	
	// Accounts Payable = COGS * DPO / Days in Period
	proj.AccountsPayable = proj.COGS * wc.assumptions.DaysPayable / daysInPeriod
	proj.Formulas["accounts_payable"] = fmt.Sprintf("=COGS*%.0f/%.0f", wc.assumptions.DaysPayable, daysInPeriod)
	
	// Add other components
	proj.PrepaidExpenses = wc.assumptions.PrepaidExpenses
	proj.AccruedExpenses = wc.assumptions.AccruedExpenses
}

// calculatePercentMethod calculates using percent of sales method
func (wc *WorkingCapitalCalculator) calculatePercentMethod(proj *WorkingCapitalProjection) {
	proj.AccountsReceivable = proj.Revenue * wc.assumptions.ReceivablePercent
	proj.Formulas["accounts_receivable"] = fmt.Sprintf("=Revenue*%.2f", wc.assumptions.ReceivablePercent)
	
	proj.Inventory = proj.Revenue * wc.assumptions.InventoryPercent
	proj.Formulas["inventory"] = fmt.Sprintf("=Revenue*%.2f", wc.assumptions.InventoryPercent)
	
	proj.AccountsPayable = proj.Revenue * wc.assumptions.PayablePercent
	proj.Formulas["accounts_payable"] = fmt.Sprintf("=Revenue*%.2f", wc.assumptions.PayablePercent)
	
	proj.PrepaidExpenses = wc.assumptions.PrepaidExpenses
	proj.AccruedExpenses = wc.assumptions.AccruedExpenses
}

// calculateDetailedMethod calculates using detailed assumptions
func (wc *WorkingCapitalCalculator) calculateDetailedMethod(proj *WorkingCapitalProjection, period int) {
	// Start with days method
	wc.calculateDaysMethod(proj)
	
	// Apply seasonality if available
	if len(wc.assumptions.SeasonalFactors) > 0 {
		seasonIndex := period % len(wc.assumptions.SeasonalFactors)
		seasonFactor := wc.assumptions.SeasonalFactors[seasonIndex]
		
		proj.AccountsReceivable *= seasonFactor
		proj.Inventory *= seasonFactor
		proj.Formulas["seasonal_adjustment"] = fmt.Sprintf("*%.2f", seasonFactor)
	}
	
	// Add other current assets/liabilities
	proj.CurrentAssets += wc.assumptions.OtherCurrentAssets
	proj.CurrentLiabilities += wc.assumptions.OtherCurrentLiabs
}

// calculateBenchmarkMethod calculates using industry benchmarks
func (wc *WorkingCapitalCalculator) calculateBenchmarkMethod(proj *WorkingCapitalProjection) {
	daysInPeriod := 365.0 / 4 // Assuming quarterly
	
	// Use industry benchmarks
	proj.AccountsReceivable = proj.Revenue * wc.assumptions.IndustryDSO / daysInPeriod
	proj.Inventory = proj.COGS * wc.assumptions.IndustryDIO / daysInPeriod
	proj.AccountsPayable = proj.COGS * wc.assumptions.IndustryDPO / daysInPeriod
	
	proj.Formulas["benchmark_note"] = "Using industry benchmark days"
}

// calculateMetrics calculates working capital metrics
func (wc *WorkingCapitalCalculator) calculateMetrics(proj WorkingCapitalProjection) WorkingCapitalMetrics {
	metrics := WorkingCapitalMetrics{}
	daysInPeriod := 365.0 / 4 // Assuming quarterly
	
	// Days metrics
	if proj.Revenue > 0 {
		metrics.DSO = proj.AccountsReceivable / proj.Revenue * daysInPeriod
	}
	if proj.COGS > 0 {
		metrics.DIO = proj.Inventory / proj.COGS * daysInPeriod
		metrics.DPO = proj.AccountsPayable / proj.COGS * daysInPeriod
	}
	
	// Cash Conversion Cycle
	metrics.CashConversionCycle = metrics.DSO + metrics.DIO - metrics.DPO
	
	// Liquidity ratios
	if proj.CurrentLiabilities > 0 {
		metrics.CurrentRatio = proj.CurrentAssets / proj.CurrentLiabilities
		metrics.QuickRatio = (proj.CurrentAssets - proj.Inventory) / proj.CurrentLiabilities
		metrics.WorkingCapitalRatio = proj.WorkingCapital / proj.CurrentLiabilities
	}
	
	// Efficiency
	if proj.WorkingCapital > 0 {
		metrics.WorkingCapitalTurnover = proj.Revenue / proj.WorkingCapital
	}
	
	return metrics
}

// calculateSummary calculates summary statistics
func (wc *WorkingCapitalCalculator) calculateSummary(projections []WorkingCapitalProjection) WorkingCapitalSummary {
	summary := WorkingCapitalSummary{}
	
	if len(projections) == 0 {
		return summary
	}
	
	totalWC := 0.0
	totalCCC := 0.0
	peakWC := 0.0
	
	for i, proj := range projections {
		totalWC += proj.WorkingCapital
		totalCCC += proj.Metrics.CashConversionCycle
		summary.TotalCashImpact += proj.CashImpact
		
		if proj.WorkingCapital > peakWC {
			peakWC = proj.WorkingCapital
			summary.PeakPeriod = i + 1
		}
	}
	
	n := float64(len(projections))
	summary.AverageWorkingCapital = totalWC / n
	summary.PeakWorkingCapital = peakWC
	summary.AverageCCC = totalCCC / n
	
	// Calculate efficiency
	totalRevenue := 0.0
	for _, proj := range projections {
		totalRevenue += proj.Revenue
	}
	if totalWC > 0 {
		summary.WorkingCapitalEfficiency = totalRevenue / totalWC
	}
	
	return summary
}

// generateOptimizationSuggestions generates optimization opportunities
func (wc *WorkingCapitalCalculator) generateOptimizationSuggestions(projections []WorkingCapitalProjection) []OptimizationSuggestion {
	suggestions := []OptimizationSuggestion{}
	
	if len(projections) == 0 {
		return suggestions
	}
	
	// Calculate averages
	avgDSO := 0.0
	avgDIO := 0.0
	avgDPO := 0.0
	
	for _, proj := range projections {
		avgDSO += proj.Metrics.DSO
		avgDIO += proj.Metrics.DIO
		avgDPO += proj.Metrics.DPO
	}
	
	n := float64(len(projections))
	avgDSO /= n
	avgDIO /= n
	avgDPO /= n
	
	// DSO optimization
	if avgDSO > 45 {
		targetDSO := math.Max(30, avgDSO*0.8)
		impact := (avgDSO - targetDSO) / 365 * projections[len(projections)-1].Revenue
		suggestions = append(suggestions, OptimizationSuggestion{
			Area:        "Accounts Receivable",
			Current:     avgDSO,
			Target:      targetDSO,
			Impact:      impact,
			Description: fmt.Sprintf("Reduce DSO from %.0f to %.0f days through better collections", avgDSO, targetDSO),
		})
	}
	
	// DIO optimization
	if avgDIO > 60 {
		targetDIO := math.Max(45, avgDIO*0.8)
		impact := (avgDIO - targetDIO) / 365 * projections[len(projections)-1].COGS
		suggestions = append(suggestions, OptimizationSuggestion{
			Area:        "Inventory",
			Current:     avgDIO,
			Target:      targetDIO,
			Impact:      impact,
			Description: fmt.Sprintf("Reduce DIO from %.0f to %.0f days through better inventory management", avgDIO, targetDIO),
		})
	}
	
	// DPO optimization (increase is good)
	if avgDPO < 45 {
		targetDPO := math.Min(60, avgDPO*1.3)
		impact := (targetDPO - avgDPO) / 365 * projections[len(projections)-1].COGS
		suggestions = append(suggestions, OptimizationSuggestion{
			Area:        "Accounts Payable",
			Current:     avgDPO,
			Target:      targetDPO,
			Impact:      impact,
			Description: fmt.Sprintf("Extend DPO from %.0f to %.0f days through payment term negotiation", avgDPO, targetDPO),
		})
	}
	
	return suggestions
}

// generateFormulas generates Excel formulas
func (wc *WorkingCapitalCalculator) generateFormulas() map[string]string {
	formulas := map[string]string{
		"working_capital": "=Current_Assets-Current_Liabilities",
		"current_assets": "=Accounts_Receivable+Inventory+Prepaid_Expenses",
		"current_liabilities": "=Accounts_Payable+Accrued_Expenses",
		"change_in_wc": "=Working_Capital-Previous_Working_Capital",
		"cash_impact": "=-Change_in_Working_Capital",
		
		// Days calculations
		"dso_formula": "=Accounts_Receivable/Revenue*Days_in_Period",
		"dio_formula": "=Inventory/COGS*Days_in_Period",
		"dpo_formula": "=Accounts_Payable/COGS*Days_in_Period",
		"ccc_formula": "=DSO+DIO-DPO",
		
		// Ratios
		"current_ratio": "=Current_Assets/Current_Liabilities",
		"quick_ratio": "=(Current_Assets-Inventory)/Current_Liabilities",
		"wc_turnover": "=Revenue/Working_Capital",
		
		// Headers
		"headers": "A1:Period, B1:Revenue, C1:AR, D1:Inventory, E1:AP, F1:Working Capital, G1:Change in WC",
	}
	
	return formulas
}