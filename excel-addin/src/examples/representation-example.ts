/**
 * Example usage of the SpreadsheetRepresentationService
 * 
 * This demonstrates how to use the enhanced spreadsheet representation system
 * that was implemented in phases 1-5 of the plan.
 */

import { SpreadsheetRepresentationService } from '../services/integration/SpreadsheetRepresentationService'

// Initialize the service
const representationService = new SpreadsheetRepresentationService()

/**
 * Example 1: Get optimized representation for a financial analysis query
 */
async function analyzeFinancialModel() {
  try {
    const query = "Analyze the revenue growth trends and identify key drivers"
    
    // Get optimized representation
    const result = await representationService.getOptimizedRepresentation(query)
    
    console.log('Representation:', result.representation)
    console.log('Metadata:', result.metadata)
    
    // The representation will include:
    // - Spatial view (ASCII/markdown table)
    // - Semantic analysis (purpose, key metrics)
    // - Formula insights (types, dependencies, warnings)
    // - Named ranges context
    
  } catch (error) {
    console.error('Analysis failed:', error)
  }
}

/**
 * Example 2: Get semantic analysis of current selection
 */
async function getSemanticAnalysis() {
  try {
    const analysis = await representationService.getSemanticAnalysis()
    
    console.log('Semantic Regions:', analysis.regions)
    console.log('Summary:', analysis.summary)
    
    // Regions will include:
    // - Headers
    // - Data tables
    // - Input areas
    // - Calculation areas
    // - Total/summary rows
    
  } catch (error) {
    console.error('Semantic analysis failed:', error)
  }
}

/**
 * Example 3: Process LLM response with validation
 */
async function processLLMEdit() {
  try {
    // Example LLM response with edits
    const llmResponse = {
      intent: 'modify',
      operations: [
        {
          type: 'formula',
          target: 'E5',
          value: '=SUM(B5:D5)'
        },
        {
          type: 'value',
          target: 'B10',
          value: 1500
        }
      ],
      explanation: 'Added sum formula and updated input value'
    }
    
    // Process and apply edits
    const result = await representationService.processLLMResponse(llmResponse)
    
    console.log('Success:', result.success)
    console.log('Applied edits:', result.appliedEdits)
    if (result.errors.length > 0) {
      console.log('Errors:', result.errors)
    }
    
  } catch (error) {
    console.error('Failed to process LLM response:', error)
  }
}

/**
 * Example 4: Complex query with specific range
 */
async function analyzeSpecificRange() {
  try {
    await Excel.run(async (context) => {
      // Get a specific range
      const sheet = context.workbook.worksheets.getActiveWorksheet()
      const range = sheet.getRange("A1:F20")
      
      const query = "Create a forecast model based on historical data"
      
      // Get optimized representation for the specific range
      const result = await representationService.getOptimizedRepresentation(query, range)
      
      // The system will:
      // 1. Classify the query (intent: create, complexity: complex)
      // 2. Select appropriate representations (semantic, structured)
      // 3. Optimize for token budget
      // 4. Include formula analysis and patterns
      
      console.log('Token count:', result.metadata.tokenCount)
      console.log('Mode:', result.metadata.mode)
      console.log('Formula insights:', result.metadata.formulaInsights)
    })
  } catch (error) {
    console.error('Range analysis failed:', error)
  }
}

/**
 * Example 5: Using individual components directly
 */
async function useComponentsDirectly() {
  try {
    await Excel.run(async (context) => {
      // You can also use individual components directly
      const { ExcelService } = await import('../services/excel/ExcelService')
      const { GridSerializer } = await import('../services/serialization/GridSerializer')
      const { FormulaTypeDetector } = await import('../services/formula/FormulaTypeDetector')
      
      const excelService = new ExcelService()
      const range = await excelService.getSelectedRange()
      const rangeData = await excelService.getRangeData(range)
      
      // Use GridSerializer directly
      const serialized = GridSerializer.toLLMFormat(
        range,
        rangeData.values,
        rangeData.formulas || [],
        {
          format: 'hybrid',
          maxTokens: 2000,
          includeFormulas: true
        }
      )
      
      console.log('Serialized content:', serialized.content)
      console.log('Compression ratio:', serialized.metadata.compressionRatio)
      
      // Analyze formulas
      if (rangeData.formulas) {
        for (const row of rangeData.formulas) {
          for (const formula of row) {
            if (formula?.startsWith('=')) {
              const typeInfo = FormulaTypeDetector.detectFormulaType(formula)
              console.log(`Formula: ${formula}`)
              console.log(`Type: ${typeInfo.type}, Complexity: ${typeInfo.complexity}`)
            }
          }
        }
      }
    })
  } catch (error) {
    console.error('Direct component usage failed:', error)
  }
}

// Export functions for use in other modules
export {
  analyzeFinancialModel,
  getSemanticAnalysis,
  processLLMEdit,
  analyzeSpecificRange,
  useComponentsDirectly
}