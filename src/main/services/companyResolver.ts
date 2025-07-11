import { AIService } from './aiService'
import { SECEdgarService, Company } from './secEdgarService'
import { logger } from '../utils/logger'

export interface CompanySearchIntent {
  ticker?: string
  companyName?: string
  cik?: string
  searchType: 'latest' | 'historical' | 'specific_quarter' | 'comparison'
  timeframe?: {
    period?: string // "Q3 2024", "latest", "last year"
    startDate?: Date
    endDate?: Date
  }
  companies?: string[] // For comparison queries
}

export class CompanyResolver {
  constructor(
    private aiService: AIService,
    private secService: SECEdgarService
  ) {}
  
  /**
   * Use LLM to interpret user's search query
   */
  async resolveCompanyQuery(userInput: string): Promise<CompanySearchIntent> {
    const prompt = `
You are a financial data assistant. Parse the following user query about company earnings:

Query: "${userInput}"

Extract and return the following information in JSON format:
{
  "ticker": "stock ticker if mentioned (e.g., AAPL)",
  "companyName": "company name if mentioned",
  "searchType": "one of: latest, historical, specific_quarter, comparison",
  "timeframe": {
    "period": "time period mentioned (e.g., 'Q3 2024', 'latest', 'last quarter', '2023')"
  },
  "companies": ["array of companies if comparing multiple"]
}

Examples:
- "Apple earnings" → {"ticker": "AAPL", "searchType": "latest"}
- "MSFT Q3 2024 results" → {"ticker": "MSFT", "searchType": "specific_quarter", "timeframe": {"period": "Q3 2024"}}
- "Compare Apple and Microsoft earnings" → {"companies": ["AAPL", "MSFT"], "searchType": "comparison"}
- "Tesla revenue last 4 quarters" → {"ticker": "TSLA", "searchType": "historical", "timeframe": {"period": "last 4 quarters"}}

Common ticker mappings:
- Apple → AAPL
- Microsoft → MSFT
- Google/Alphabet → GOOGL
- Amazon → AMZN
- Tesla → TSLA
- Meta/Facebook → META
- Nvidia → NVDA

Only return the JSON, no explanation.`

    try {
      const response = await this.aiService.chat(prompt, { isSystemPrompt: true })
      const parsed = JSON.parse(response.content)
      
      logger.info('Resolved company query', { 
        input: userInput, 
        resolved: parsed 
      })
      
      return {
        searchType: parsed.searchType || 'latest',
        ...parsed
      }
    } catch (error) {
      logger.error('Failed to parse query with LLM', error)
      
      // Fallback to simple parsing
      return this.fallbackParse(userInput)
    }
  }
  
  /**
   * Fallback parsing without LLM
   */
  private fallbackParse(userInput: string): CompanySearchIntent {
    const input = userInput.toLowerCase()
    
    // Common patterns
    const tickerMatch = input.match(/\b([A-Z]{1,5})\b/)
    const quarterMatch = input.match(/q([1-4])\s*(\d{4})?/)
    const hasComparison = input.includes('compare') || input.includes('vs')
    
    return {
      ticker: tickerMatch ? tickerMatch[1] : undefined,
      searchType: hasComparison ? 'comparison' : 'latest',
      timeframe: quarterMatch ? {
        period: `Q${quarterMatch[1]}${quarterMatch[2] ? ' ' + quarterMatch[2] : ''}`
      } : undefined
    }
  }
  
  /**
   * Find best matching company from search results
   */
  async findBestMatch(query: string, companies: Company[]): Promise<Company | null> {
    if (companies.length === 0) return null
    if (companies.length === 1) return companies[0]
    
    // Use LLM to pick best match
    const prompt = `
Given the search query "${query}", which of these companies is the best match?

Companies:
${companies.map((c, i) => `${i + 1}. ${c.name} (${c.ticker})`).join('\n')}

Return only the number of the best match (1, 2, 3, etc).`

    try {
      const response = await this.aiService.chat(prompt, { isSystemPrompt: true })
      const index = parseInt(response.content.trim()) - 1
      
      if (index >= 0 && index < companies.length) {
        return companies[index]
      }
    } catch (error) {
      logger.error('Failed to find best match with LLM', error)
    }
    
    // Fallback: return first result
    return companies[0]
  }
  
  /**
   * Resolve a company identifier to a Company object
   */
  async resolveCompany(identifier: string): Promise<Company | null> {
    try {
      // Try direct search first
      const companies = await this.secService.searchCompany(identifier)
      
      if (companies.length === 0) {
        // Try with LLM assistance
        const intent = await this.resolveCompanyQuery(identifier)
        
        if (intent.ticker) {
          const tickerResults = await this.secService.searchCompany(intent.ticker)
          if (tickerResults.length > 0) {
            return tickerResults[0]
          }
        }
        
        if (intent.companyName) {
          const nameResults = await this.secService.searchCompany(intent.companyName)
          return this.findBestMatch(identifier, nameResults)
        }
      }
      
      return this.findBestMatch(identifier, companies)
    } catch (error) {
      logger.error('Failed to resolve company', error)
      return null
    }
  }
  
  /**
   * Get search suggestions for autocomplete
   */
  async getSuggestions(partialQuery: string): Promise<string[]> {
    // Popular companies for quick access
    const popularCompanies = [
      'Apple (AAPL)',
      'Microsoft (MSFT)',
      'Amazon (AMZN)',
      'Google (GOOGL)',
      'Tesla (TSLA)',
      'Meta (META)',
      'Nvidia (NVDA)',
      'Berkshire Hathaway (BRK.B)',
      'JPMorgan Chase (JPM)',
      'Johnson & Johnson (JNJ)'
    ]
    
    const query = partialQuery.toLowerCase()
    return popularCompanies.filter(company => 
      company.toLowerCase().includes(query)
    )
  }
}