import { ChromaClient, Collection } from 'chromadb'
import { Document } from 'langchain/document'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import * as XLSX from 'xlsx'
import * as pdfParse from 'pdf-parse'
import { logger } from '../utils/logger'
import { AppError, ErrorCode } from '../utils/errors'

export enum DocumentType {
  EXCEL = 'excel',
  PDF = 'pdf',
  CSV = 'csv',
  WORD = 'word',
  TEXT = 'text'
}

export interface ChunkedDocument {
  id: string
  content: string
  metadata: {
    source: string
    type: DocumentType
    page?: number
    sheet?: string
    section?: string
    timestamp: Date
  }
}

export interface Context {
  content: string
  relevanceScore: number
  metadata: any
  source: string
}

export class ContextService {
  private chroma: ChromaClient
  private collection: Collection | null = null
  private readonly collectionName = 'gridmate_financial_docs'
  
  // Chunking parameters optimized for financial documents
  private readonly chunkSize = 1000 // chars
  private readonly chunkOverlap = 200 // chars
  
  constructor() {
    this.chroma = new ChromaClient({
      path: process.env.CHROMA_PATH || 'http://localhost:8000'
    })
    this.initialize()
  }
  
  private async initialize() {
    try {
      // Create or get collection
      this.collection = await this.chroma.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'Financial documents for Gridmate' }
      })
      logger.info('Context service initialized', { 
        collection: this.collectionName 
      })
    } catch (error) {
      logger.error('Failed to initialize context service:', error)
      throw new AppError(
        ErrorCode.SYSTEM_ERROR,
        'Failed to initialize context management system',
        500,
        true,
        error as Error
      )
    }
  }
  
  /**
   * Index a document into the vector store
   */
  async indexDocument(filePath: string, type: DocumentType): Promise<void> {
    const startTime = Date.now()
    
    try {
      logger.info('Indexing document', { filePath, type })
      
      // Extract content based on type
      const content = await this.extractContent(filePath, type)
      
      // Chunk the document
      const chunks = await this.chunkDocument(content, {
        source: filePath,
        type
      })
      
      // Generate embeddings and store
      if (this.collection) {
        await this.collection.add({
          ids: chunks.map(c => c.id),
          documents: chunks.map(c => c.content),
          metadatas: chunks.map(c => c.metadata as any)
        })
      }
      
      const duration = Date.now() - startTime
      logger.info('Document indexed successfully', { 
        filePath, 
        chunkCount: chunks.length,
        duration 
      })
    } catch (error) {
      logger.error('Failed to index document:', error)
      throw new AppError(
        ErrorCode.SYSTEM_ERROR,
        `Failed to index document: ${filePath}`,
        500,
        true,
        error as Error
      )
    }
  }
  
  /**
   * Extract content from various file types
   */
  private async extractContent(filePath: string, type: DocumentType): Promise<string> {
    switch (type) {
      case DocumentType.EXCEL:
        return this.extractExcelContent(filePath)
      
      case DocumentType.PDF:
        return this.extractPDFContent(filePath)
      
      case DocumentType.CSV:
        return this.extractCSVContent(filePath)
      
      case DocumentType.TEXT:
        const fs = await import('fs/promises')
        return fs.readFile(filePath, 'utf-8')
      
      default:
        throw new Error(`Unsupported document type: ${type}`)
    }
  }
  
  /**
   * Extract content from Excel files with structure preservation
   */
  private async extractExcelContent(filePath: string): Promise<string> {
    const workbook = XLSX.readFile(filePath)
    let content = ''
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      content += `\n\n=== Sheet: ${sheetName} ===\n`
      
      // Convert to CSV format for easier parsing
      const csv = XLSX.utils.sheet_to_csv(sheet)
      content += csv
      
      // Also extract formulas if present
      const formulaMap = new Map<string, string>()
      for (const cell in sheet) {
        if (sheet[cell].f) {
          formulaMap.set(cell, sheet[cell].f)
        }
      }
      
      if (formulaMap.size > 0) {
        content += '\n\nFormulas:\n'
        formulaMap.forEach((formula, cell) => {
          content += `${cell}: ${formula}\n`
        })
      }
    }
    
    return content
  }
  
  /**
   * Extract content from PDF files
   */
  private async extractPDFContent(filePath: string): Promise<string> {
    const fs = await import('fs/promises')
    const dataBuffer = await fs.readFile(filePath)
    const data = await pdfParse(dataBuffer)
    return data.text
  }
  
  /**
   * Extract content from CSV files
   */
  private async extractCSVContent(filePath: string): Promise<string> {
    const fs = await import('fs/promises')
    return fs.readFile(filePath, 'utf-8')
  }
  
  /**
   * Chunk documents intelligently for financial content
   */
  async chunkDocument(
    content: string, 
    metadata: any
  ): Promise<ChunkedDocument[]> {
    // Use LangChain's splitter optimized for financial documents
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      separators: [
        '\n\n===',  // Sheet separators
        '\n\n',     // Paragraphs
        '\n',       // Lines
        '. ',       // Sentences
        ', ',       // Clauses
        ' ',        // Words
        ''          // Characters
      ]
    })
    
    const docs = await splitter.createDocuments([content])
    
    return docs.map((doc, index) => ({
      id: `${metadata.source}_chunk_${index}`,
      content: doc.pageContent,
      metadata: {
        ...metadata,
        chunkIndex: index,
        timestamp: new Date()
      }
    }))
  }
  
  /**
   * Retrieve relevant context for a query
   */
  async getRelevantContext(
    query: string, 
    limit: number = 5
  ): Promise<Context[]> {
    if (!this.collection) {
      throw new AppError(
        ErrorCode.SYSTEM_ERROR,
        'Context service not initialized',
        500
      )
    }
    
    try {
      logger.debug('Retrieving context for query', { 
        query: query.substring(0, 100), 
        limit 
      })
      
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit
      })
      
      if (!results.documents[0]) {
        return []
      }
      
      return results.documents[0].map((content, index) => ({
        content: content || '',
        relevanceScore: results.distances ? 1 - results.distances[0][index] : 0,
        metadata: results.metadatas[0][index],
        source: results.metadatas[0][index]?.source || 'unknown'
      }))
    } catch (error) {
      logger.error('Failed to retrieve context:', error)
      throw new AppError(
        ErrorCode.SYSTEM_ERROR,
        'Failed to retrieve relevant context',
        500,
        true,
        error as Error
      )
    }
  }
  
  /**
   * Get current spreadsheet context
   */
  async getSpreadsheetContext(
    activeRange: any,
    workbookInfo: any
  ): Promise<Context[]> {
    const contexts: Context[] = []
    
    // Add active range context
    if (activeRange) {
      contexts.push({
        content: `Active Range: ${activeRange.address}\nValues: ${JSON.stringify(activeRange.values)}\nFormulas: ${JSON.stringify(activeRange.formulas)}`,
        relevanceScore: 1.0,
        metadata: { type: 'active_range' },
        source: 'spreadsheet'
      })
    }
    
    // Add workbook structure context
    if (workbookInfo) {
      contexts.push({
        content: `Workbook: ${workbookInfo.name}\nSheets: ${workbookInfo.sheets?.map((s: any) => s.name).join(', ')}`,
        relevanceScore: 0.8,
        metadata: { type: 'workbook_info' },
        source: 'spreadsheet'
      })
    }
    
    return contexts
  }
  
  /**
   * Clear all indexed documents
   */
  async clearIndex(): Promise<void> {
    if (this.collection) {
      await this.chroma.deleteCollection({ name: this.collectionName })
      this.collection = null
      await this.initialize()
    }
  }
  
  /**
   * Get statistics about indexed content
   */
  async getIndexStats(): Promise<{
    documentCount: number
    sources: string[]
  }> {
    if (!this.collection) {
      return { documentCount: 0, sources: [] }
    }
    
    const allDocs = await this.collection.get()
    const sources = new Set(allDocs.metadatas?.map(m => m?.source).filter(Boolean))
    
    return {
      documentCount: allDocs.documents?.length || 0,
      sources: Array.from(sources) as string[]
    }
  }
}