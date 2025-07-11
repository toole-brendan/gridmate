# SEC EDGAR API Integration Plan

## Overview
Integrate the SEC EDGAR API to allow users to search for latest earnings releases using natural language queries, ticker symbols, or company names, powered by LLM for intelligent search.

## API Analysis

### Key Endpoints
1. **Company Search**: `/edgar/search/company`
   - Search by ticker or company name
   - Returns CIK (Central Index Key) needed for filings

2. **Recent Filings**: `/edgar/browse`
   - Get recent filings by form type
   - Filter for 8-K (current reports) and 10-Q/10-K (earnings)

3. **Company Filings**: `/edgar/cik/{cik}/filings`
   - Get all filings for a specific company
   - Filter by form type and date

### Earnings-Related Forms
- **8-K**: Current reports (often contains earnings releases)
- **10-Q**: Quarterly reports
- **10-K**: Annual reports
- **8-K/EX-99.1**: Press releases (earnings announcements)

## Architecture

### 1. SEC API Service
```typescript
// src/main/services/secEdgarService.ts
class SECEdgarService {
  // Core API methods
  async searchCompany(query: string): Promise<Company[]>
  async getRecentFilings(cik: string, formTypes: string[]): Promise<Filing[]>
  async getFilingContent(accessionNumber: string): Promise<FilingContent>
  
  // Earnings-specific methods
  async getLatestEarnings(identifier: string): Promise<EarningsRelease[]>
  async getEarningsHistory(cik: string, limit: number): Promise<EarningsRelease[]>
}
```

### 2. LLM-Powered Search Resolver
```typescript
// src/main/services/companyResolver.ts
class CompanyResolver {
  // Use LLM to interpret user queries
  async resolveCompanyQuery(userInput: string): Promise<{
    ticker?: string
    companyName?: string
    cik?: string
    searchIntent: 'latest' | 'historical' | 'specific_quarter'
    dateRange?: { start: Date, end: Date }
  }>
  
  // Fuzzy match company names
  async findBestMatch(query: string, companies: Company[]): Promise<Company>
}
```

### 3. Data Flow
```
User Input → LLM Resolver → SEC API → Parser → Structured Data → UI
     ↓                                              ↓
"Apple earnings"    →    "AAPL"    →    8-K/10-Q → Earnings Data
```

## Implementation Plan

### Phase 1: Core API Integration (Week 1)

#### 1.1 SEC API Service
```typescript
interface Company {
  cik: string
  ticker: string
  name: string
  exchange: string
}

interface Filing {
  accessionNumber: string
  filingDate: Date
  formType: string
  documentUrl: string
  size: number
  items?: string[] // For 8-K item numbers
}

interface EarningsRelease {
  company: Company
  filing: Filing
  metrics: {
    revenue?: number
    eps?: number
    guidance?: string
    period: string
  }
  fullText: string
  tables: any[]
}
```

#### 1.2 Rate Limiting
SEC EDGAR has rate limits:
- 10 requests per second
- Must include User-Agent header
- Cache responses to minimize API calls

### Phase 2: LLM Integration (Week 1-2)

#### 2.1 Query Understanding
```typescript
// Example LLM prompt for query interpretation
const prompt = `
Given the user query: "${userInput}"

Extract the following information:
1. Company name or ticker symbol
2. Time period (latest, Q3 2024, last year, etc.)
3. Type of information (earnings, revenue, guidance)

Examples:
- "Apple earnings" → {ticker: "AAPL", period: "latest", type: "earnings"}
- "Microsoft Q3 results" → {ticker: "MSFT", period: "Q3 2024", type: "earnings"}
- "Tesla revenue last quarter" → {ticker: "TSLA", period: "previous_quarter", type: "revenue"}

Response in JSON format.
`
```

#### 2.2 Smart Matching
- Use embeddings to match company name variations
- Handle common aliases (e.g., "Apple" → "Apple Inc.")
- Resolve ambiguities through context

### Phase 3: Data Parsing (Week 2)

#### 3.1 Earnings Data Extraction
```typescript
class EarningsParser {
  // Parse different filing types
  async parse8K(html: string): Promise<EarningsData>
  async parse10Q(xbrl: string): Promise<EarningsData>
  
  // Extract key metrics
  extractRevenue(content: string): number | null
  extractEPS(content: string): number | null
  extractGuidance(content: string): string | null
  
  // Handle tables and structured data
  extractTables(html: string): Table[]
}
```

#### 3.2 XBRL Processing
For 10-Q/10-K files in XBRL format:
- Parse structured financial data
- Map GAAP taxonomy elements
- Extract comparable metrics

### Phase 4: UI Components (Week 2-3)

#### 4.1 Search Component
```tsx
// Intelligent search with autocomplete
<EarningsSearch
  onSearch={handleSearch}
  suggestions={companySuggestions}
  recentSearches={recentSearches}
/>
```

#### 4.2 Results Display
```tsx
// Earnings results with key metrics
<EarningsResults
  company={company}
  earnings={earningsData}
  onAddToSpreadsheet={handleAddToSheet}
/>
```

### Phase 5: Spreadsheet Integration (Week 3)

#### 5.1 Direct Import
- Add earnings data directly to active spreadsheet
- Create formatted tables with historical comparisons
- Generate YoY/QoQ calculations

#### 5.2 Templates
- Pre-built earnings analysis templates
- Automatic formula generation for ratios
- Peer comparison tables

## Technical Considerations

### 1. API Authentication
SEC EDGAR API is public but requires:
- Proper User-Agent header: `CompanyName/Version (contact@email.com)`
- Respecting rate limits
- No API key needed

### 2. Caching Strategy
```typescript
class SECCache {
  // Cache company lookups (long TTL)
  private companyCache: Map<string, Company>
  
  // Cache recent filings (medium TTL)
  private filingsCache: Map<string, Filing[]>
  
  // Cache filing content (permanent)
  private contentCache: Map<string, FilingContent>
}
```

### 3. Error Handling
- Network failures
- Rate limit exceeded
- Parsing failures for non-standard formats
- Missing data fields

### 4. Data Quality
- Not all 8-Ks contain earnings
- Formats vary by company
- Some use PDF attachments vs inline XBRL
- Need fallback strategies

## Example User Flows

### Flow 1: Simple Ticker Search
```
User: "AAPL earnings"
→ LLM: Identifies ticker "AAPL", intent "latest earnings"
→ API: Get Apple's CIK (0000320193)
→ API: Fetch recent 8-K and 10-Q filings
→ Parser: Extract earnings data
→ UI: Display revenue, EPS, guidance
```

### Flow 2: Natural Language Query
```
User: "Show me Microsoft's latest quarterly results"
→ LLM: Identifies "Microsoft", "latest quarter"
→ Resolver: Finds MSFT/CIK 0000789019
→ API: Get most recent 10-Q
→ Parser: Extract comprehensive metrics
→ UI: Display with YoY comparisons
```

### Flow 3: Comparative Analysis
```
User: "Compare Apple and Google earnings"
→ LLM: Identifies multiple companies
→ API: Parallel fetch for both
→ Parser: Normalize data formats
→ UI: Side-by-side comparison table
→ Excel: Option to export comparison
```

## Success Metrics
- Query resolution accuracy > 95%
- Earnings data extraction accuracy > 90%
- Response time < 3 seconds
- Cache hit rate > 70%

## Future Enhancements
1. Real-time earnings call transcripts
2. Analyst estimates integration
3. Peer group automated analysis
4. Earnings surprise calculations
5. Historical trend analysis
6. Alert system for new filings

## Compliance Notes
- Include proper attribution for SEC data
- Respect rate limits to avoid blocking
- Don't redistribute raw EDGAR data
- Include disclaimers about data accuracy

This integration will make Gridmate a powerful tool for financial analysts to quickly access and analyze earnings data directly within their spreadsheet workflow.