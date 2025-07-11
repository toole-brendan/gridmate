import axios, { AxiosInstance } from 'axios'
import { logger } from '../utils/logger'
import { AppError, ErrorCode } from '../utils/errors'
import { RateLimiter } from '../utils/rateLimiter'

export interface Company {
  cik: string
  ticker: string
  name: string
  exchange?: string
  sic?: string
  stateOfIncorporation?: string
}

export interface Filing {
  accessionNumber: string
  filingDate: string
  reportDate?: string
  formType: string
  fileNumber?: string
  filmNumber?: string
  items?: string[]
  size: number
  primaryDocument?: string
  primaryDocDescription?: string
  documents?: FilingDocument[]
}

export interface FilingDocument {
  sequence: string
  filename: string
  description: string
  type: string
  size: number
  url?: string
}

export interface EarningsData {
  company: Company
  filing: Filing
  period: string
  metrics: {
    revenue?: number
    revenueYoY?: number
    netIncome?: number
    eps?: number
    epsYoY?: number
    guidance?: {
      revenue?: { low: number, high: number }
      eps?: { low: number, high: number }
    }
  }
  highlights?: string[]
  risks?: string[]
  rawText?: string
}

export class SECEdgarService {
  private readonly client: AxiosInstance
  private readonly rateLimiter: RateLimiter
  private readonly baseURL = 'https://data.sec.gov'
  private readonly searchURL = 'https://efts.sec.gov/LATEST/search-index'
  
  // Cache for company lookups
  private companyCache = new Map<string, Company>()
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
  
  constructor() {
    // SEC requires a User-Agent header with contact info
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'User-Agent': 'Gridmate/1.0 (support@gridmate.app)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      },
      timeout: 30000
    })
    
    // SEC rate limit: 10 requests per second
    this.rateLimiter = new RateLimiter(10, 1000)
    
    logger.info('SEC EDGAR Service initialized')
  }
  
  /**
   * Search for companies by name or ticker
   */
  async searchCompany(query: string): Promise<Company[]> {
    try {
      await this.rateLimiter.acquire()
      
      logger.debug('Searching for company', { query })
      
      // Clean the query
      const cleanQuery = query.trim().toUpperCase()
      
      // Check cache first
      if (this.companyCache.has(cleanQuery)) {
        const cached = this.companyCache.get(cleanQuery)!
        return [cached]
      }
      
      // Search using the submissions endpoint
      const response = await this.client.get(`/submissions/CIK${cleanQuery.padStart(10, '0')}.json`)
      
      if (response.data) {
        const company: Company = {
          cik: response.data.cik,
          ticker: response.data.tickers?.[0] || '',
          name: response.data.name,
          exchange: response.data.exchanges?.[0],
          sic: response.data.sic,
          stateOfIncorporation: response.data.stateOfIncorporation
        }
        
        // Cache the result
        this.companyCache.set(cleanQuery, company)
        this.companyCache.set(company.ticker, company)
        
        return [company]
      }
      
      return []
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Try ticker search using a different approach
        return this.searchByTickerOrName(query)
      }
      
      logger.error('Failed to search company', error)
      throw new AppError(
        ErrorCode.SYSTEM_ERROR,
        `Failed to search for company: ${query}`,
        500,
        true,
        error as Error
      )
    }
  }
  
  /**
   * Alternative search method using company tickers endpoint
   */
  private async searchByTickerOrName(query: string): Promise<Company[]> {
    try {
      await this.rateLimiter.acquire()
      
      // Get all company tickers
      const response = await this.client.get('/files/company_tickers.json')
      
      const companies: Company[] = []
      const searchTerm = query.toLowerCase()
      
      // Search through all companies
      for (const [, data] of Object.entries(response.data)) {
        const companyData = data as any
        const ticker = companyData.ticker?.toLowerCase() || ''
        const name = companyData.title?.toLowerCase() || ''
        
        if (ticker === searchTerm || 
            ticker.includes(searchTerm) || 
            name.includes(searchTerm)) {
          companies.push({
            cik: String(companyData.cik_str).padStart(10, '0'),
            ticker: companyData.ticker,
            name: companyData.title
          })
        }
        
        // Limit results
        if (companies.length >= 10) break
      }
      
      return companies
    } catch (error) {
      logger.error('Failed to search by ticker/name', error)
      throw new AppError(
        ErrorCode.SYSTEM_ERROR,
        'Failed to search companies',
        500,
        true,
        error as Error
      )
    }
  }
  
  /**
   * Get recent filings for a company
   */
  async getRecentFilings(
    cik: string, 
    formTypes: string[] = ['8-K', '10-Q', '10-K'],
    limit: number = 10
  ): Promise<Filing[]> {
    try {
      await this.rateLimiter.acquire()
      
      const paddedCik = cik.padStart(10, '0')
      logger.info('Fetching recent filings', { cik: paddedCik, formTypes })
      
      const response = await this.client.get(`/submissions/CIK${paddedCik}.json`)
      
      if (!response.data.filings?.recent) {
        return []
      }
      
      const recent = response.data.filings.recent
      const filings: Filing[] = []
      
      // Process recent filings
      for (let i = 0; i < recent.form.length && filings.length < limit; i++) {
        if (formTypes.includes(recent.form[i])) {
          filings.push({
            accessionNumber: recent.accessionNumber[i],
            filingDate: recent.filingDate[i],
            reportDate: recent.reportDate[i],
            formType: recent.form[i],
            fileNumber: recent.fileNumber[i],
            filmNumber: recent.filmNumber[i],
            items: recent.items?.[i]?.split(',').map((item: string) => item.trim()),
            size: parseInt(recent.size[i]) || 0,
            primaryDocument: recent.primaryDocument[i],
            primaryDocDescription: recent.primaryDocDescription[i]
          })
        }
      }
      
      return filings
    } catch (error) {
      logger.error('Failed to get recent filings', error)
      throw new AppError(
        ErrorCode.SYSTEM_ERROR,
        'Failed to retrieve filings',
        500,
        true,
        error as Error
      )
    }
  }
  
  /**
   * Get latest earnings releases for a company
   */
  async getLatestEarnings(identifier: string): Promise<EarningsData[]> {
    try {
      // First, resolve the company
      const companies = await this.searchCompany(identifier)
      if (companies.length === 0) {
        throw new AppError(
          ErrorCode.VALIDATION_FAILED,
          `Company not found: ${identifier}`,
          404
        )
      }
      
      const company = companies[0]
      
      // Get recent 8-K and 10-Q filings
      const filings = await this.getRecentFilings(
        company.cik,
        ['8-K', '10-Q'],
        20 // Get more to filter for earnings
      )
      
      const earningsData: EarningsData[] = []
      
      for (const filing of filings) {
        // Check if 8-K contains earnings items (2.02 - Results of Operations)
        if (filing.formType === '8-K' && filing.items?.includes('2.02')) {
          const data = await this.parseEarningsFiling(company, filing)
          if (data) earningsData.push(data)
        } else if (filing.formType === '10-Q') {
          const data = await this.parseEarningsFiling(company, filing)
          if (data) earningsData.push(data)
        }
        
        // Return after finding first earnings
        if (earningsData.length > 0) break
      }
      
      return earningsData
    } catch (error) {
      logger.error('Failed to get latest earnings', error)
      throw error
    }
  }
  
  /**
   * Parse earnings data from a filing (simplified for now)
   */
  private async parseEarningsFiling(
    company: Company,
    filing: Filing
  ): Promise<EarningsData | null> {
    try {
      // For now, return structured placeholder
      // In production, would fetch and parse actual filing content
      
      const period = filing.formType === '10-Q' 
        ? `Q${this.getQuarterFromDate(filing.reportDate || filing.filingDate)} ${new Date(filing.reportDate || filing.filingDate).getFullYear()}`
        : `FY ${new Date(filing.reportDate || filing.filingDate).getFullYear()}`
      
      return {
        company,
        filing,
        period,
        metrics: {
          // These would be extracted from actual filing
          revenue: undefined,
          netIncome: undefined,
          eps: undefined,
          guidance: undefined
        },
        highlights: [
          'Earnings data extraction pending implementation',
          'Would parse XBRL or HTML content here'
        ]
      }
    } catch (error) {
      logger.error('Failed to parse earnings filing', error)
      return null
    }
  }
  
  /**
   * Get filing content/documents
   */
  async getFilingDocuments(
    cik: string,
    accessionNumber: string
  ): Promise<FilingDocument[]> {
    try {
      await this.rateLimiter.acquire()
      
      const paddedCik = cik.padStart(10, '0')
      const cleanAccession = accessionNumber.replace(/-/g, '')
      
      const url = `/Archives/edgar/data/${paddedCik}/${cleanAccession}/${accessionNumber}-index.json`
      const response = await this.client.get(url)
      
      if (!response.data.directory?.item) {
        return []
      }
      
      return response.data.directory.item.map((item: any) => ({
        sequence: item.sequence,
        filename: item.name,
        description: item.description,
        type: item.type,
        size: parseInt(item.size) || 0,
        url: `${this.baseURL}/Archives/edgar/data/${paddedCik}/${cleanAccession}/${item.name}`
      }))
    } catch (error) {
      logger.error('Failed to get filing documents', error)
      throw new AppError(
        ErrorCode.SYSTEM_ERROR,
        'Failed to retrieve filing documents',
        500,
        true,
        error as Error
      )
    }
  }
  
  /**
   * Helper to determine quarter from date
   */
  private getQuarterFromDate(dateStr: string): number {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    return Math.ceil(month / 3)
  }
  
  /**
   * Get company information by CIK
   */
  async getCompanyInfo(cik: string): Promise<Company | null> {
    try {
      await this.rateLimiter.acquire()
      
      const paddedCik = cik.padStart(10, '0')
      const response = await this.client.get(`/submissions/CIK${paddedCik}.json`)
      
      if (response.data) {
        return {
          cik: response.data.cik,
          ticker: response.data.tickers?.[0] || '',
          name: response.data.name,
          exchange: response.data.exchanges?.[0],
          sic: response.data.sic,
          stateOfIncorporation: response.data.stateOfIncorporation
        }
      }
      
      return null
    } catch (error) {
      logger.error('Failed to get company info', error)
      return null
    }
  }
}