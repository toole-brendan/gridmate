package financial

import (
	"fmt"
	"math"
)

// ExpenseModelingHelper helps build expense models
type ExpenseModelingHelper struct {
	categories    map[string]*ExpenseCategory
	drivers       map[string]*CostDriver
	allocations   map[string]*AllocationRule
	scenarios     map[string]*ExpenseScenario
}

// ExpenseCategory represents a category of expenses
type ExpenseCategory struct {
	Name          string              `json:"name"`
	Type          ExpenseType         `json:"type"`
	IsVariable    bool                `json:"is_variable"`
	BaseAmount    float64             `json:"base_amount"`
	GrowthRate    float64             `json:"growth_rate"`
	Driver        string              `json:"driver,omitempty"`
	SubCategories []*ExpenseCategory  `json:"sub_categories,omitempty"`
	Formulas      map[string]string   `json:"formulas"`
}

// ExpenseType represents different types of expenses
type ExpenseType string

const (
	COGS            ExpenseType = "cogs"
	SGA             ExpenseType = "sga"
	RAndD           ExpenseType = "r_and_d"
	Marketing       ExpenseType = "marketing"
	Personnel       ExpenseType = "personnel"
	Facilities      ExpenseType = "facilities"
	Technology      ExpenseType = "technology"
	Professional    ExpenseType = "professional"
	Other           ExpenseType = "other"
)

// CostDriver represents a driver for variable costs
type CostDriver struct {
	Name        string            `json:"name"`
	BaseValue   float64           `json:"base_value"`
	GrowthRate  float64           `json:"growth_rate"`
	Unit        string            `json:"unit"`
	LinkedTo    string            `json:"linked_to,omitempty"` // e.g., "revenue", "headcount"
}

// AllocationRule defines how to allocate shared costs
type AllocationRule struct {
	Name            string             `json:"name"`
	Method          AllocationMethod   `json:"method"`
	Basis           string             `json:"basis"`
	Percentages     map[string]float64 `json:"percentages,omitempty"`
}

// AllocationMethod represents different allocation methods
type AllocationMethod string

const (
	DirectAllocation    AllocationMethod = "direct"
	PercentageAllocation AllocationMethod = "percentage"
	HeadcountAllocation AllocationMethod = "headcount"
	RevenueAllocation   AllocationMethod = "revenue"
	SquareFootAllocation AllocationMethod = "square_foot"
)

// ExpenseScenario represents a scenario for expense modeling
type ExpenseScenario struct {
	Name         string                      `json:"name"`
	Description  string                      `json:"description"`
	Adjustments  map[string]float64          `json:"adjustments"` // Category -> adjustment factor
	Constraints  []ExpenseConstraint         `json:"constraints"`
}

// ExpenseConstraint represents a constraint on expenses
type ExpenseConstraint struct {
	Type        ConstraintType `json:"type"`
	Category    string         `json:"category"`
	Limit       float64        `json:"limit"`
	AsPercent   bool           `json:"as_percent"`
}

// ConstraintType represents different constraint types
type ConstraintType string

const (
	MaxConstraint         ConstraintType = "max"
	MinConstraint         ConstraintType = "min"
	TargetConstraint      ConstraintType = "target"
	GrowthCapConstraint   ConstraintType = "growth_cap"
)

// ExpenseProjection represents projected expenses
type ExpenseProjection struct {
	Period         int                          `json:"period"`
	Categories     map[string]CategoryProjection `json:"categories"`
	TotalExpenses  float64                      `json:"total_expenses"`
	ByType         map[ExpenseType]float64      `json:"by_type"`
	Metrics        ExpenseMetrics               `json:"metrics"`
}

// CategoryProjection represents projection for a category
type CategoryProjection struct {
	Amount        float64           `json:"amount"`
	PercentOfTotal float64          `json:"percent_of_total"`
	PercentOfRevenue float64        `json:"percent_of_revenue,omitempty"`
	GrowthRate    float64           `json:"growth_rate"`
	Driver        interface{}       `json:"driver,omitempty"`
	Formula       string            `json:"formula"`
}

// ExpenseMetrics contains expense-related metrics
type ExpenseMetrics struct {
	OpexRatio          float64 `json:"opex_ratio"`
	COGSMargin         float64 `json:"cogs_margin"`
	SGAPercent         float64 `json:"sga_percent"`
	RAndDPercent       float64 `json:"r_and_d_percent"`
	PersonnelPercent   float64 `json:"personnel_percent"`
	VariableCostRatio  float64 `json:"variable_cost_ratio"`
	FixedCostRatio     float64 `json:"fixed_cost_ratio"`
}

// NewExpenseModelingHelper creates a new expense modeling helper
func NewExpenseModelingHelper() *ExpenseModelingHelper {
	return &ExpenseModelingHelper{
		categories:  make(map[string]*ExpenseCategory),
		drivers:     make(map[string]*CostDriver),
		allocations: make(map[string]*AllocationRule),
		scenarios:   make(map[string]*ExpenseScenario),
	}
}

// AddCategory adds an expense category
func (em *ExpenseModelingHelper) AddCategory(category *ExpenseCategory) {
	em.categories[category.Name] = category
}

// AddDriver adds a cost driver
func (em *ExpenseModelingHelper) AddDriver(driver *CostDriver) {
	em.drivers[driver.Name] = driver
}

// AddAllocationRule adds an allocation rule
func (em *ExpenseModelingHelper) AddAllocationRule(rule *AllocationRule) {
	em.allocations[rule.Name] = rule
}

// ProjectExpenses projects expenses for multiple periods
func (em *ExpenseModelingHelper) ProjectExpenses(periods int, revenueProjections []float64) ([]ExpenseProjection, error) {
	projections := make([]ExpenseProjection, periods)
	
	for i := 0; i < periods; i++ {
		revenue := 0.0
		if i < len(revenueProjections) {
			revenue = revenueProjections[i]
		}
		
		projection := ExpenseProjection{
			Period:     i + 1,
			Categories: make(map[string]CategoryProjection),
			ByType:     make(map[ExpenseType]float64),
		}
		
		totalExpenses := 0.0
		
		// Project each category
		for name, category := range em.categories {
			catProjection := em.projectCategory(category, i, revenue)
			projection.Categories[name] = catProjection
			totalExpenses += catProjection.Amount
			
			// Aggregate by type
			projection.ByType[category.Type] += catProjection.Amount
		}
		
		projection.TotalExpenses = totalExpenses
		
		// Calculate metrics
		projection.Metrics = em.calculateMetrics(projection, revenue)
		
		projections[i] = projection
	}
	
	return projections, nil
}

// projectCategory projects a single category
func (em *ExpenseModelingHelper) projectCategory(category *ExpenseCategory, period int, revenue float64) CategoryProjection {
	projection := CategoryProjection{}
	
	if category.IsVariable && category.Driver != "" {
		// Variable cost based on driver
		driver, exists := em.drivers[category.Driver]
		if exists {
			driverValue := driver.BaseValue * math.Pow(1+driver.GrowthRate, float64(period))
			projection.Amount = category.BaseAmount * driverValue
			projection.Driver = driverValue
			projection.Formula = fmt.Sprintf("=%s*%.2f*driver_value", category.Name, category.BaseAmount)
		}
	} else {
		// Fixed cost with growth
		projection.Amount = category.BaseAmount * math.Pow(1+category.GrowthRate, float64(period))
		projection.Formula = fmt.Sprintf("=%s*(1+%.2f)^%d", category.Name, category.GrowthRate, period)
	}
	
	projection.GrowthRate = category.GrowthRate
	
	if revenue > 0 {
		projection.PercentOfRevenue = projection.Amount / revenue
	}
	
	return projection
}

// calculateMetrics calculates expense metrics
func (em *ExpenseModelingHelper) calculateMetrics(projection ExpenseProjection, revenue float64) ExpenseMetrics {
	metrics := ExpenseMetrics{}
	
	if revenue > 0 {
		metrics.OpexRatio = projection.TotalExpenses / revenue
		
		if cogs, exists := projection.ByType[COGS]; exists {
			metrics.COGSMargin = cogs / revenue
		}
		
		if sga, exists := projection.ByType[SGA]; exists {
			metrics.SGAPercent = sga / revenue
		}
		
		if randd, exists := projection.ByType[RAndD]; exists {
			metrics.RAndDPercent = randd / revenue
		}
		
		if personnel, exists := projection.ByType[Personnel]; exists {
			metrics.PersonnelPercent = personnel / revenue
		}
	}
	
	// Calculate variable vs fixed ratio
	variableTotal := 0.0
	fixedTotal := 0.0
	
	for name, category := range em.categories {
		if catProj, exists := projection.Categories[name]; exists {
			if category.IsVariable {
				variableTotal += catProj.Amount
			} else {
				fixedTotal += catProj.Amount
			}
		}
	}
	
	if projection.TotalExpenses > 0 {
		metrics.VariableCostRatio = variableTotal / projection.TotalExpenses
		metrics.FixedCostRatio = fixedTotal / projection.TotalExpenses
	}
	
	return metrics
}

// ApplyScenario applies a scenario to expense projections
func (em *ExpenseModelingHelper) ApplyScenario(scenario *ExpenseScenario, baseProjections []ExpenseProjection) []ExpenseProjection {
	adjustedProjections := make([]ExpenseProjection, len(baseProjections))
	
	for i, baseProj := range baseProjections {
		adjustedProj := ExpenseProjection{
			Period:     baseProj.Period,
			Categories: make(map[string]CategoryProjection),
			ByType:     make(map[ExpenseType]float64),
		}
		
		totalExpenses := 0.0
		
		// Apply adjustments to each category
		for catName, catProj := range baseProj.Categories {
			adjustedCatProj := catProj
			
			// Apply scenario adjustment if exists
			if adjustment, exists := scenario.Adjustments[catName]; exists {
				adjustedCatProj.Amount *= adjustment
			}
			
			// Apply constraints
			for _, constraint := range scenario.Constraints {
				if constraint.Category == catName {
					adjustedCatProj.Amount = em.applyConstraint(adjustedCatProj.Amount, constraint)
				}
			}
			
			adjustedProj.Categories[catName] = adjustedCatProj
			totalExpenses += adjustedCatProj.Amount
			
			// Update by type
			if category, exists := em.categories[catName]; exists {
				adjustedProj.ByType[category.Type] += adjustedCatProj.Amount
			}
		}
		
		adjustedProj.TotalExpenses = totalExpenses
		adjustedProjections[i] = adjustedProj
	}
	
	return adjustedProjections
}

// applyConstraint applies a constraint to an amount
func (em *ExpenseModelingHelper) applyConstraint(amount float64, constraint ExpenseConstraint) float64 {
	limit := constraint.Limit
	
	switch constraint.Type {
	case MaxConstraint:
		if amount > limit {
			return limit
		}
	case MinConstraint:
		if amount < limit {
			return limit
		}
	case TargetConstraint:
		return limit
	case GrowthCapConstraint:
		// This would need previous period data
		// For now, just return the amount
		return amount
	}
	
	return amount
}

// GenerateExpenseFormulas generates Excel formulas for expense modeling
func (em *ExpenseModelingHelper) GenerateExpenseFormulas() map[string]string {
	formulas := map[string]string{
		"headers": "A1:Expense Category, B1:Type, C1:Period 1, D1:Period 2, E1:Period 3",
		"total_row": "=SUM(C2:C20)",
		"growth_formula": "=previous_cell*(1+growth_rate)",
		"variable_formula": "=driver_value*cost_per_unit",
		"allocation_formula": "=total_cost*allocation_percentage",
	}
	
	// Generate category-specific formulas
	row := 2
	for name, category := range em.categories {
		if category.IsVariable {
			formulas[fmt.Sprintf("category_%s", name)] = fmt.Sprintf("C%d:=driver!B%d*%.2f", row, row, category.BaseAmount)
		} else {
			formulas[fmt.Sprintf("category_%s", name)] = fmt.Sprintf("C%d:=$B$%d*(1+%.2f)^(COLUMN()-2)", row, row, category.GrowthRate)
		}
		row++
	}
	
	// Metrics formulas
	formulas["opex_ratio"] = "=total_expenses/revenue"
	formulas["cogs_margin"] = "=COGS/revenue"
	formulas["sga_percent"] = "=SGA/revenue"
	formulas["variable_ratio"] = "=SUMIF(type_column,\"Variable\",amount_column)/total_expenses"
	formulas["fixed_ratio"] = "=SUMIF(type_column,\"Fixed\",amount_column)/total_expenses"
	
	return formulas
}

// CreateStandardCategories creates standard expense categories
func CreateStandardExpenseCategories() []*ExpenseCategory {
	return []*ExpenseCategory{
		{
			Name:       "Cost of Goods Sold",
			Type:       COGS,
			IsVariable: true,
			BaseAmount: 0.6, // 60% of revenue
			Driver:     "revenue",
			Formulas: map[string]string{
				"calculation": "=Revenue*0.6",
			},
		},
		{
			Name:       "Sales & Marketing",
			Type:       Marketing,
			IsVariable: false,
			BaseAmount: 1000000,
			GrowthRate: 0.15, // 15% annual growth
			Formulas: map[string]string{
				"calculation": "=Base*(1+0.15)^Period",
			},
		},
		{
			Name:       "Research & Development",
			Type:       RAndD,
			IsVariable: false,
			BaseAmount: 500000,
			GrowthRate: 0.20, // 20% annual growth
			Formulas: map[string]string{
				"calculation": "=Base*(1+0.20)^Period",
			},
		},
		{
			Name:       "General & Administrative",
			Type:       SGA,
			IsVariable: false,
			BaseAmount: 750000,
			GrowthRate: 0.10, // 10% annual growth
			Formulas: map[string]string{
				"calculation": "=Base*(1+0.10)^Period",
			},
		},
		{
			Name:       "Personnel",
			Type:       Personnel,
			IsVariable: true,
			BaseAmount: 120000, // Average salary
			Driver:     "headcount",
			Formulas: map[string]string{
				"calculation": "=Headcount*AvgSalary*(1+Benefits_Rate)",
			},
		},
	}
}